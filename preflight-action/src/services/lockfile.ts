import * as fs from "fs";
import { LockfileParseError, LockfileNotFoundError } from "../errors/index.js";

export interface ChangedDep {
  name: string;
  oldVersion: string | null;
  newVersion: string;
}

interface LockV2 {
  lockfileVersion: number;
  packages?: Record<string, { version: string }>;
}

export function parseChangedDeps(lockfilePath: string, baseLockfilePath?: string): ChangedDep[] {
  if (!fs.existsSync(lockfilePath)) {
    throw new LockfileNotFoundError(lockfilePath);
  }

  let current: LockV2;
  try {
    current = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
  } catch (err) {
    throw new LockfileParseError(lockfilePath, err instanceof Error ? err.message : String(err));
  }

  // When running inside GitHub Actions, the base lockfile comes from git diff.
  // If no base is provided, treat every direct dep as new.
  let base: LockV2 | null = null;
  if (baseLockfilePath && fs.existsSync(baseLockfilePath)) {
    try {
      base = JSON.parse(fs.readFileSync(baseLockfilePath, "utf8"));
    } catch {
      base = null;
    }
  }

  const changed: ChangedDep[] = [];
  const currentPkgs = current.packages ?? {};
  const basePkgs = base?.packages ?? {};

  for (const [key, entry] of Object.entries(currentPkgs)) {
    // Only direct dependencies: key is "node_modules/<name>" (no nested slash after node_modules/)
    if (!key.startsWith("node_modules/")) continue;
    const nameAfter = key.slice("node_modules/".length);
    if (nameAfter.includes("/node_modules/")) continue; // transitive — skip

    const name = nameAfter;
    const newVersion = entry.version;
    const oldEntry = basePkgs[key];
    const oldVersion = oldEntry?.version ?? null;

    if (newVersion !== oldVersion) {
      changed.push({ name, oldVersion, newVersion });
    }
  }

  return changed;
}
