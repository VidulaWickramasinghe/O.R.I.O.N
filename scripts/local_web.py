"""Local web launcher. Owns only its children; never kills existing port owners."""

import argparse
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def port_number(value):
    port = int(value)
    if not 1024 <= port <= 65535:
        raise ValueError("Use an unprivileged port between 1024 and 65535.")
    return port


def require_free_port(port):
    with socket.socket() as probe:
        try:
            probe.bind(("127.0.0.1", port))
        except OSError as error:
            raise RuntimeError(f"Port {port} is already in use. Stop the existing service in its terminal or select another port. O.R.I.O.N. will not terminate an unknown process.") from error


def launch_environment(backend_port, frontend_port):
    if backend_port == frontend_port:
        raise ValueError("Backend and frontend must use different ports.")
    environment = os.environ.copy()
    environment["ORION_BACKEND_PORT"] = str(backend_port)
    environment["NEXT_PUBLIC_ORION_API_URL"] = f"http://127.0.0.1:{backend_port}"
    origins = [f"http://localhost:{frontend_port}", f"http://127.0.0.1:{frontend_port}"]
    environment["ORION_ALLOWED_ORIGINS"] = ",".join(filter(None, [environment.get("ORION_ALLOWED_ORIGINS", ""), *origins]))
    return environment


def stop_children(children):
    for child in children:
        if child.poll() is None:
            try:
                if os.name == "posix":
                    os.killpg(child.pid, signal.SIGTERM)
                else:
                    child.terminate()
            except ProcessLookupError:
                pass
    for child in children:
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            if os.name == "posix":
                os.killpg(child.pid, signal.SIGKILL)
            else:
                child.kill()
            child.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["start", "backend", "frontend"])
    parser.add_argument("--backend-port", default=os.getenv("ORION_BACKEND_PORT", "8000"), type=port_number)
    parser.add_argument("--frontend-port", default=os.getenv("ORION_FRONTEND_PORT", "3000"), type=port_number)
    args = parser.parse_args()
    children = []
    try:
        environment = launch_environment(args.backend_port, args.frontend_port)
        commands = []
        if args.mode in {"start", "backend"}:
            require_free_port(args.backend_port)
            commands.append(([sys.executable, "-m", "uvicorn", "backend.api_main:app", "--host", "127.0.0.1", "--port", str(args.backend_port)], ROOT))
        if args.mode in {"start", "frontend"}:
            require_free_port(args.frontend_port)
            npm = shutil.which("npm")
            if not npm or not (ROOT / "frontend/node_modules/next").is_dir():
                raise RuntimeError("Frontend dependencies missing. Run ./scripts/setup_orion.sh first.")
            commands.append(([npm, "run", "dev", "--", "--port", str(args.frontend_port)], ROOT / "frontend"))
        for command, directory in commands:
            children.append(subprocess.Popen(command, cwd=directory, env=environment, start_new_session=os.name == "posix"))
        print(f"Backend: http://127.0.0.1:{args.backend_port}/api/health", flush=True)
        print(f"Open Aurora OS: http://localhost:{args.frontend_port}", flush=True)
        print("Wait for Online · authenticated. Press Ctrl+C to stop services started here.", flush=True)
        while all(child.poll() is None for child in children):
            time.sleep(0.2)
        return next((child.returncode for child in children if child.returncode is not None), 1)
    except (ValueError, RuntimeError, OSError) as error:
        print(f"Cannot start O.R.I.O.N.: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 0
    finally:
        stop_children(children)


def interrupted(*_):
    raise KeyboardInterrupt


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, interrupted)
    sys.exit(main())
