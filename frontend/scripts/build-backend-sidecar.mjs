import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(frontendDir, "..");
const tauriDir = join(frontendDir, "src-tauri");
const binariesDir = join(tauriDir, "binaries");
const buildRoot = join(repository, "tmp", "pyinstaller-orion-backend");

function findPython() {
  const candidates = [
    process.env.ORION_PYTHON,
    process.platform === "win32"
      ? join(repository, ".venv", "Scripts", "python.exe")
      : join(repository, ".venv", "bin", "python"),
  ].filter(Boolean);
  const python = candidates.find((candidate) => existsSync(candidate));
  if (!python) {
    throw new Error("A project .venv is required. Run scripts/setup_orion.sh first or set ORION_PYTHON.");
  }
  return python;
}

const rustcOutput = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
const targetTriple = rustcOutput.match(/^host:\s+(.+)$/m)?.[1]?.trim();
if (!targetTriple) throw new Error("Unable to determine the Rust target triple.");
const extension = process.platform === "win32" ? ".exe" : "";
const targetBinary = join(binariesDir, `orion-backend-${targetTriple}${extension}`);
if (process.env.ORION_SKIP_SIDECAR_BUILD === "1" && existsSync(targetBinary)) {
  console.log(`Reusing existing backend sidecar: ${targetBinary}`);
  process.exit(0);
}

const python = findPython();

rmSync(buildRoot, { recursive: true, force: true });
mkdirSync(buildRoot, { recursive: true });
mkdirSync(binariesDir, { recursive: true });

const pyInstallerArguments = [
  "-m", "PyInstaller",
  "--noconfirm",
  "--clean",
  "--onefile",
  "--name", "orion-backend",
  "--paths", join(repository, "backend"),
  "--collect-all", "agents",
  "--collect-all", "openai",
  "--hidden-import", "uvicorn.logging",
  "--hidden-import", "uvicorn.loops.auto",
  "--hidden-import", "uvicorn.protocols.http.auto",
  "--hidden-import", "uvicorn.protocols.websockets.auto",
  "--distpath", join(buildRoot, "dist"),
  "--workpath", join(buildRoot, "work"),
  "--specpath", join(buildRoot, "spec"),
];
if (process.platform === "darwin") {
  pyInstallerArguments.push(
    "--osx-entitlements-file",
    join(tauriDir, "Entitlements.plist"),
  );
}
pyInstallerArguments.push(join(repository, "backend", "desktop_entry.py"));

execFileSync(python, pyInstallerArguments, {
  cwd: repository,
  stdio: "inherit",
  env: { ...process.env, PYINSTALLER_CONFIG_DIR: join(buildRoot, "config") },
});

const builtBinary = join(buildRoot, "dist", `orion-backend${extension}`);
copyFileSync(builtBinary, targetBinary);
console.log(`Prepared authenticated backend sidecar: ${targetBinary}`);
