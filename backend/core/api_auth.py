"""Per-launch authentication for the local O.R.I.O.N. control API."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from typing import Iterable

from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp


TOKEN_ENVIRONMENT_VARIABLE = "ORION_CAPABILITY_TOKEN"
DEFAULT_HEALTH_PATHS = frozenset({"/api/health"})


class LocalApiAuthenticator:
    """Validate a launch-scoped bearer token without exposing or persisting it."""

    def __init__(self, token: str | None = None) -> None:
        supplied = token if token is not None else os.getenv(TOKEN_ENVIRONMENT_VARIABLE, "")
        launch_token = supplied.strip() or secrets.token_urlsafe(32)
        if len(launch_token) < 32:
            raise ValueError("ORION_CAPABILITY_TOKEN must contain at least 32 characters.")
        encoded = launch_token.encode("utf-8")
        self._token_digest = hashlib.sha256(encoded).digest()
        self.session_id = f"local-{hashlib.sha256(encoded).hexdigest()[:24]}"

    def authenticate(self, authorization_header: str) -> str | None:
        scheme, separator, credential = str(authorization_header or "").partition(" ")
        if separator != " " or scheme.casefold() != "bearer" or not credential:
            return None
        candidate_digest = hashlib.sha256(credential.encode("utf-8")).digest()
        if not hmac.compare_digest(candidate_digest, self._token_digest):
            return None
        return self.session_id


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
