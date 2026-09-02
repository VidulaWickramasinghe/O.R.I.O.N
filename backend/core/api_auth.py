"""Per-launch authentication for the local O.R.I.O.N. control API."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import socket
import stat
import tempfile
import threading
from typing import Iterable
from pathlib import Path

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp


TOKEN_ENVIRONMENT_VARIABLE = "ORION_CAPABILITY_TOKEN"
DEVELOPMENT_SOCKET_ENVIRONMENT_VARIABLE = "ORION_DEV_AUTH_SOCKET"
DISABLE_DEVELOPMENT_BROKER_ENVIRONMENT_VARIABLE = "ORION_DISABLE_DEV_AUTH_BROKER"
DEFAULT_HEALTH_PATHS = frozenset({"/api/health"})
DEVELOPMENT_BROKER_REQUEST = b"ORION_DEV_API_SESSION_V1\n"


def development_auth_socket_path() -> Path:
    """Return a short, repository-scoped path for the in-memory dev handshake."""

    configured = os.getenv(DEVELOPMENT_SOCKET_ENVIRONMENT_VARIABLE, "").strip()
    if configured:
        return Path(configured).expanduser().resolve()
    repository = Path(__file__).resolve().parents[2]
    repository_key = hashlib.sha256(str(repository).encode("utf-8")).hexdigest()[:16]
    user_key = str(getattr(os, "getuid", lambda: "user")())
    # Unix-domain socket paths are short on macOS, so deliberately avoid its
    # much longer per-user TMPDIR path. No credential is stored in this path.
    socket_root = Path(tempfile.gettempdir()) if os.name == "nt" else Path("/tmp")
    return socket_root.resolve() / f"orion-dev-{user_key}-{repository_key}.sock"


def _development_broker_enabled() -> bool:
    disabled = os.getenv(DISABLE_DEVELOPMENT_BROKER_ENVIRONMENT_VARIABLE, "").strip()
    return disabled.casefold() not in {"1", "true", "yes", "on"}


class DevelopmentApiSessionBroker:
    """Share a dev launch credential over an owner-only local socket.

    The bearer token remains in process memory. The filesystem contains only
    the socket node, never a token, JSON session file, or reusable credential.
    Packaged/Tauri launches do not create this broker because they supply
    ``ORION_CAPABILITY_TOKEN`` directly.
    """

    def __init__(self, token: str, *, base_url: str, socket_path: Path | None = None) -> None:
        self._token = token
        self._base_url = base_url
        self.socket_path = socket_path or development_auth_socket_path()
        self._listener: socket.socket | None = None
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self._socket_identity: tuple[int, int] | None = None

    def start(self) -> None:
        if self._listener is not None:
            return
        if not hasattr(socket, "AF_UNIX"):
            raise RuntimeError("Development API authentication requires local socket support.")

        self.socket_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            existing = self.socket_path.lstat()
        except FileNotFoundError:
            existing = None
        if existing is not None:
            if not stat.S_ISSOCK(existing.st_mode):
                raise RuntimeError(
                    f"Refusing to replace non-socket development auth path: {self.socket_path}"
                )
            if hasattr(os, "getuid") and existing.st_uid != os.getuid():
                raise RuntimeError("Development auth socket is owned by another user.")
            self.socket_path.unlink()

        listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        try:
            listener.bind(str(self.socket_path))
            os.chmod(self.socket_path, 0o600)
            listener.listen(8)
            listener.settimeout(0.25)
            identity = self.socket_path.stat()
        except Exception:
            listener.close()
            self._remove_own_socket()
            raise

        self._listener = listener
        self._socket_identity = (identity.st_dev, identity.st_ino)
        self._stop.clear()
        self._thread = threading.Thread(
            target=self._serve,
            name="orion-development-api-session",
            daemon=True,
        )
        self._thread.start()

    def _serve(self) -> None:
        while not self._stop.is_set():
            listener = self._listener
            if listener is None:
                return
            try:
                connection, _ = listener.accept()
            except socket.timeout:
                continue
            except OSError:
                return
            with connection:
                connection.settimeout(1.0)
                try:
                    request = connection.recv(128)
                    if not hmac.compare_digest(request, DEVELOPMENT_BROKER_REQUEST):
                        continue
                    payload = json.dumps(
                        {"baseUrl": self._base_url, "token": self._token},
                        separators=(",", ":"),
                    ).encode("utf-8")
                    connection.sendall(payload)
                except (OSError, ValueError):
                    continue

    def _remove_own_socket(self) -> None:
        try:
            current = self.socket_path.stat()
        except FileNotFoundError:
            return
        identity = (current.st_dev, current.st_ino)
        if self._socket_identity is None or identity == self._socket_identity:
            self.socket_path.unlink(missing_ok=True)

    def close(self) -> None:
        self._stop.set()
        listener, self._listener = self._listener, None
        if listener is not None:
            listener.close()
        thread, self._thread = self._thread, None
        if thread is not None:
            thread.join(timeout=1.0)
        self._remove_own_socket()
        self._socket_identity = None


class LocalApiAuthenticator:
    """Validate a launch-scoped bearer token without exposing or persisting it."""

    def __init__(self, token: str | None = None) -> None:
        environment_token = os.getenv(TOKEN_ENVIRONMENT_VARIABLE, "")
        supplied = token if token is not None else environment_token
        launch_token = supplied.strip() or secrets.token_urlsafe(32)
        if len(launch_token) < 32:
            raise ValueError("ORION_CAPABILITY_TOKEN must contain at least 32 characters.")
        encoded = launch_token.encode("utf-8")
        self._token_digest = hashlib.sha256(encoded).digest()
        self.session_id = f"local-{hashlib.sha256(encoded).hexdigest()[:24]}"
        self._development_broker: DevelopmentApiSessionBroker | None = None
        if token is None and not environment_token.strip() and _development_broker_enabled():
            port = int(os.getenv("ORION_BACKEND_PORT", "8000"))
            self._development_broker = DevelopmentApiSessionBroker(
                launch_token,
                base_url=f"http://127.0.0.1:{port}",
            )

    def authenticate(self, authorization_header: str) -> str | None:
        scheme, separator, credential = str(authorization_header or "").partition(" ")
        if separator != " " or scheme.casefold() != "bearer" or not credential:
            return None
        candidate_digest = hashlib.sha256(credential.encode("utf-8")).digest()
        if not hmac.compare_digest(candidate_digest, self._token_digest):
            return None
        return self.session_id

    def start_development_broker(self) -> None:
        if self._development_broker is not None:
            self._development_broker.start()

    def close_development_broker(self) -> None:
        if self._development_broker is not None:
            self._development_broker.close()


class LocalApiAuthenticationMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        authenticator: LocalApiAuthenticator,
        health_paths: Iterable[str] = DEFAULT_HEALTH_PATHS,
    ) -> None:
        self.app = app
        self.authenticator = authenticator
        self.health_paths = frozenset(health_paths)

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        if request.method == "OPTIONS" or request.url.path in self.health_paths:
            request.state.orion_session_id = "health-check"
            await self.app(scope, receive, send)
            return

        session_id = self.authenticator.authenticate(
            request.headers.get("authorization", "")
        )
        if session_id is None:
            response = JSONResponse(
                {"detail": "Local control API authentication required."},
                status_code=401,
                headers={
                    "Cache-Control": "no-store",
                    "WWW-Authenticate": "Bearer",
                },
            )
            await response(scope, receive, send)
            return

        request.state.orion_session_id = session_id
        await self.app(scope, receive, send)


def create_local_api_authenticator() -> LocalApiAuthenticator:
    return LocalApiAuthenticator()
