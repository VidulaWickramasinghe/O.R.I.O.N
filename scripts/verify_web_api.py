"""Read-only verification using the same owner-only session broker as Aurora."""

import json
import os
from pathlib import Path
import socket
import stat
import sys
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from core.api_auth import development_auth_socket_path, DEVELOPMENT_BROKER_REQUEST

PATHS = ("/api/health", "/api/status", "/api/settings/profile", "/api/workspaces", "/api/missions", "/api/approvals", "/api/memory", "/api/knowledge/documents", "/api/security/policy", "/api/release-candidate/status")


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise RuntimeError("API redirects are not allowed.")


def read_session():
    path = development_auth_socket_path()
    info = path.stat()
    if not stat.S_ISSOCK(info.st_mode) or info.st_mode & 0o077 or (hasattr(os, "getuid") and info.st_uid != os.getuid()):
        raise RuntimeError("Session broker is not an owner-only socket.")
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
        connection.settimeout(3)
        connection.connect(str(path))
        connection.sendall(DEVELOPMENT_BROKER_REQUEST)
        content = b""
        while True:
            block = connection.recv(4096)
            if not block:
                break
            content += block
            if len(content) > 4096:
                raise RuntimeError("Session response exceeded its limit.")
    session = json.loads(content)
    url = urlsplit(session.get("baseUrl", ""))
    if url.scheme != "http" or url.hostname not in {"127.0.0.1", "localhost"} or not url.port or url.username or url.password or url.path or url.query or url.fragment:
        raise RuntimeError("Session destination is not a loopback API.")
    if not isinstance(session.get("token"), str) or len(session["token"]) < 32:
        raise RuntimeError("Session credential is invalid.")
    return session


def main():
    try:
        session = read_session()
        opener = build_opener(ProxyHandler({}), NoRedirects())
        for path in PATHS:
            headers = {} if path == "/api/health" else {"Authorization": f"Bearer {session['token']}"}
            with opener.open(Request(session["baseUrl"] + path, headers=headers), timeout=15) as response:
                json.load(response)
                print(f"OK {response.status} {path}")
        return 0
    except Exception as error:
        # Never print the response body, request headers or session credential.
        print(f"API verification failed ({type(error).__name__}). Start the backend from this checkout and verify its terminal output.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
