import { readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const cacheDirectory = join(process.cwd(), ".next");
const developmentCacheDirectory = join(cacheDirectory, "dev");

async function containsEmptyManifest(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (await containsEmptyManifest(path)) return true;
      continue;
    }
    if (entry.name.includes("manifest") && (await stat(path)).size === 0) {
      return true;
    }
  }
  return false;
}

if (await containsEmptyManifest(cacheDirectory)) {
  await rm(cacheDirectory, { recursive: true, force: true });
  console.log("Removed a corrupted Next.js cache containing an empty manifest.");
} else {
  // Development route modules can remain internally inconsistent after an
  // interrupted compile even when no manifest is empty. Starting with a fresh
  // dev-only cache avoids stale ComponentMod handlers while retaining build
  // output elsewhere in .next.
  await rm(developmentCacheDirectory, { recursive: true, force: true });
}
