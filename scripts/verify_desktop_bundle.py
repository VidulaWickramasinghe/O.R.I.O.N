#!/usr/bin/env python3
"""Validate installer layout, packaged API isolation, and prior-schema upgrade."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import socket
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path


PLATFORM_BUNDLES = {
    "macos": ("*.app", "*.dmg"),
    "windows": ("*.msi", "*.exe"),
    "linux": ("*.deb", "*.AppImage"),
}


def tree_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    files = [path] if path.is_file() else sorted(item for item in path.rglob("*") if item.is_file())
    for item in files:
        digest.update(item.relative_to(path.parent).as_posix().encode("utf-8"))
        with item.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
    return digest.hexdigest()


def find_artifacts(root: Path, platform: str) -> list[Path]:
    artifacts: list[Path] = []
    missing: list[str] = []
    for pattern in PLATFORM_BUNDLES[platform]:
        matches = sorted(root.rglob(pattern))
        if not matches:
            missing.append(pattern)
        artifacts.extend(matches)
    if missing:
        raise RuntimeError(f"Missing {platform} desktop bundle types: {', '.join(missing)}")
    return artifacts


def extract_sidecar(root: Path, platform: str, temporary: Path) -> Path:
    if platform == "macos":
        matches = sorted(root.rglob("*.app/Contents/MacOS/orion-backend"))
    elif platform == "linux":
        packages = sorted(root.rglob("*.deb"))
        if not packages:
            raise RuntimeError("A Debian package is required for the Linux layout smoke test.")
        extracted = temporary / "deb"
        subprocess.run(["dpkg-deb", "-x", str(packages[0]), str(extracted)], check=True)
        matches = sorted(extracted.rglob("orion-backend"))
    else:
        packages = sorted(root.rglob("*.msi"))
        if not packages:
            raise RuntimeError("An MSI package is required for the Windows layout smoke test.")
        extracted = temporary / "msi"
        extracted.mkdir()
        subprocess.run(
            ["msiexec.exe", "/a", str(packages[0]), "/qn", f"TARGETDIR={extracted}"],
            check=True,
        )
        matches = sorted(extracted.rglob("orion-backend.exe"))
    if len(matches) != 1:
        raise RuntimeError(f"Expected one packaged backend sidecar, found {len(matches)}.")
    return matches[0]


def available_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def request(url: str, token: str = "") -> tuple[int, dict]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=2) as response:
            return int(response.status), json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        payload = json.loads(error.read().decode("utf-8"))
        return int(error.code), payload


def seed_prior_schema(data_dir: Path) -> None:
    data_dir.mkdir(parents=True)
    database = data_dir / "orion_memory.sqlite"
    with sqlite3.connect(database) as connection:
        connection.execute(
            """CREATE TABLE memory_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL,
            title TEXT NOT NULL, content TEXT NOT NULL, source TEXT DEFAULT 'user',
            importance INTEGER DEFAULT 3, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            )"""
        )
        connection.execute(
            """INSERT INTO memory_items
            (category, title, content, source, importance, created_at, updated_at)
            VALUES ('release', 'Packaged prior fixture', 'preserve me', 'fixture', 3, '2026-01-01', '2026-01-01')"""
        )


def smoke_sidecar(binary: Path, temporary: Path) -> dict:
    data_dir = temporary / "prior-data"
    seed_prior_schema(data_dir)
    port = available_port()
    token = "orion-package-smoke-" + "0" * 40
    environment = {
        **os.environ,
        "ORION_DATA_DIR": str(data_dir),
        "ORION_CAPABILITY_TOKEN": token,
        "ORION_BACKEND_PORT": str(port),
    }
    process = subprocess.Popen(
        [str(binary)],
        env=environment,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(240):
            if process.poll() is not None:
                details = process.stderr.read().decode("utf-8", errors="replace")[-2000:]
                raise RuntimeError(f"Packaged backend exited during startup: {details}")
            try:
                if request(f"{base}/api/health")[0] == 200:
                    break
            except (OSError, ValueError):
                pass
            time.sleep(0.25)
        else:
            raise RuntimeError("Packaged backend did not become healthy within 60 seconds.")
        unauthorized = request(f"{base}/api/memory")[0]
        authorized_status, payload = request(f"{base}/api/memory", token)
        titles = {str(item.get("title")) for item in payload.get("items", [])}
        if unauthorized != 401 or authorized_status != 200:
            raise RuntimeError("Packaged API authentication boundary failed.")
        if "Packaged prior fixture" not in titles:
            raise RuntimeError("Prior-schema data was not preserved by the packaged backend.")
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    with sqlite3.connect(data_dir / "orion_memory.sqlite") as connection:
        columns = {str(row[1]) for row in connection.execute("PRAGMA table_info(memory_items)")}
        version = int(connection.execute("PRAGMA user_version").fetchone()[0])
    required = {"workspace_id", "project_key", "sensitivity", "provenance_json"}
    if not required <= columns or version < 1:
        raise RuntimeError(
            "Packaged prior-schema migration did not reach the current contract: "
            f"missing_columns={sorted(required - columns)}, schema_version={version}."
        )
    return {
        "health": "passed",
        "unauthorized_status": unauthorized,
        "authorized_status": authorized_status,
        "prior_schema_preserved": True,
        "schema_version": version,
    }


def verify_macos_signature(root: Path, require_signature: bool, require_notarization: bool) -> dict:
    applications = sorted(root.rglob("*.app"))
    images = sorted(root.rglob("*.dmg"))
    if not applications or not images:
        raise RuntimeError("macOS application and DMG are required.")
    verification = subprocess.run(
        ["codesign", "--verify", "--deep", "--strict", str(applications[0])],
        text=True,
        capture_output=True,
    )
    details = subprocess.run(
        ["codesign", "-dv", "--verbose=4", str(applications[0])],
        text=True,
        capture_output=True,
    )
    signature_text = f"{details.stdout}\n{details.stderr}"
    production_signed = verification.returncode == 0 and "Signature=adhoc" not in signature_text
    if require_signature and not production_signed:
        raise RuntimeError("A valid non-ad-hoc macOS production signature is required.")
    notarized = False
    if require_notarization:
        stapler = subprocess.run(
            ["xcrun", "stapler", "validate", str(images[0])],
            text=True,
            capture_output=True,
        )
        notarized = stapler.returncode == 0
        if not notarized:
            raise RuntimeError("The macOS DMG does not contain a valid notarization ticket.")
    return {"production_signed": production_signed, "notarized": notarized}


def verify_windows_signature(root: Path, require_signature: bool) -> dict:
    installers = sorted(root.rglob("*.msi")) + sorted(root.rglob("*.exe"))
    statuses = []
    for installer in installers:
        command = f"(Get-AuthenticodeSignature -LiteralPath '{str(installer).replace("'", "''")}').Status"
        result = subprocess.run(
            ["powershell", "-NoProfile", "-Command", command],
            text=True,
            capture_output=True,
        )
        statuses.append(result.stdout.strip())
    production_signed = bool(statuses) and all(status == "Valid" for status in statuses)
    if require_signature and not production_signed:
        raise RuntimeError("Every Windows installer must have a valid Authenticode signature.")
    return {"production_signed": production_signed, "signature_statuses": statuses}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--platform", choices=sorted(PLATFORM_BUNDLES), required=True)
    parser.add_argument("--bundle-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--require-production-signature", action="store_true")
    parser.add_argument("--require-notarization", action="store_true")
    arguments = parser.parse_args()
    bundle_root = arguments.bundle_root.resolve()
    artifacts = find_artifacts(bundle_root, arguments.platform)
    with tempfile.TemporaryDirectory(prefix="orion-package-verify-") as directory:
        temporary = Path(directory)
        sidecar = extract_sidecar(bundle_root, arguments.platform, temporary)
        smoke = smoke_sidecar(sidecar, temporary)
    signing: dict = {"production_signed": False, "notarized": False}
    if arguments.platform == "macos":
        signing = verify_macos_signature(
            bundle_root,
            arguments.require_production_signature,
            arguments.require_notarization,
        )
    elif arguments.platform == "windows":
        signing = verify_windows_signature(bundle_root, arguments.require_production_signature)
    payload = {
        "schema_version": 1,
        "platform": arguments.platform,
        "status": "passed",
        "artifacts": [
            {
                "name": artifact.relative_to(bundle_root).as_posix(),
                "sha256": tree_sha256(artifact),
            }
            for artifact in artifacts
        ],
        "packaged_backend": smoke,
        "signing": signing,
    }
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"{arguments.platform} desktop bundle verification passed: {arguments.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
