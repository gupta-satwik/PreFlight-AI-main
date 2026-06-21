import * as core from "@actions/core";
import * as github from "@actions/github";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { loadEnv } from "./config/env.js";
import { analyze } from "./adapters/analysis-api.js";
import { postComment, setStatusCheck } from "./adapters/github.js";
import { parseChangedDeps } from "./services/lockfile.js";
import { ApiTimeoutError, ApiUnreachableError } from "./errors/index.js";

const MAX_PACKAGES = 3;
const INTER_PACKAGE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run(): Promise<void> {
  try {
    const env = loadEnv();
    const ctx = github.context;

    const workspace = process.env.GITHUB_WORKSPACE ?? ".";
    const lockfilePath = path.resolve(workspace, env.lockfile);
    const baseRef = ctx.payload.pull_request?.base?.ref ?? "main";

    // Fetch the base branch lockfile for accurate diff — fall back to treating all as new
    let baseLockfilePath: string | undefined;
    const tempBase = path.join(os.tmpdir(), "preflight-base-lock.json");
    try {
      execSync(`git fetch --depth=1 origin ${baseRef}`, { stdio: "pipe", cwd: workspace });
      const content = execSync(`git show FETCH_HEAD:${env.lockfile}`, { stdio: "pipe", cwd: workspace });
      fs.writeFileSync(tempBase, content);
      baseLockfilePath = tempBase;
    } catch {
      core.warning(`Could not fetch base lockfile from origin/${baseRef} — treating all changed packages as new`);
    }

    const changed = parseChangedDeps(lockfilePath, baseLockfilePath);

    if (changed.length === 0) {
      core.info("No npm dependency changes detected — skipping analysis");
      core.setOutput("verdict", "PASS");
      return;
    }

    if (changed.length > MAX_PACKAGES) {
      core.warning(
        `${changed.length} packages changed. Preflight analyzes the first ${MAX_PACKAGES} by default. ` +
        `Remaining packages skipped.`
      );
    }

    const toAnalyze = changed.slice(0, MAX_PACKAGES);
    let overallBlock = false;

    for (let i = 0; i < toAnalyze.length; i++) {
      const dep = toAnalyze[i];
      if (i > 0) await sleep(INTER_PACKAGE_DELAY_MS);

      core.info(`Analyzing ${dep.name} ${dep.oldVersion ?? "new"} → ${dep.newVersion}`);

      try {
        const result = await analyze(env.apiUrl, {
          package_name: dep.name,
          old_version: dep.oldVersion,
          new_version: dep.newVersion,
          repo: `${ctx.repo.owner}/${ctx.repo.repo}`,
          pr_number: ctx.payload.pull_request?.number,
        });

        core.info(`  Verdict: ${result.verdict} (${Math.round(result.confidence * 100)}%)`);
        core.setOutput("verdict", result.verdict);
        core.setOutput("scan_id", result.scan_id);
        core.setOutput("confidence", String(result.confidence));

        await postComment(env.githubToken, dep.name, dep.oldVersion, dep.newVersion, result, env.apiUrl);
        await setStatusCheck(env.githubToken, result.verdict, dep.name, result.scan_id, env.apiUrl);

        if (result.verdict === "BLOCK") overallBlock = true;

      } catch (err) {
        if (err instanceof ApiTimeoutError || err instanceof ApiUnreachableError) {
          core.warning(`Preflight API unreachable for ${dep.name} — failing open (WARN)`);
          core.setOutput("verdict", "WARN");
        } else {
          throw err;
        }
      }
    }

    if (overallBlock && env.failOnBlock) {
      core.setFailed("Preflight blocked one or more dependency upgrades. Review the PR comments.");
    }

  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

run();
