import * as github from "@actions/github";
import type { AnalyzeResponse } from "./analysis-api.js";

const VERDICT_EMOJI: Record<string, string> = {
  BLOCK: "🔴",
  WARN: "🟡",
  PASS: "🟢",
};

const SIGNAL_EMOJI = (flagged: boolean) => (flagged ? "🚨 Flagged" : "✅ Clear");

function formatComment(pkg: string, oldVer: string | null, newVer: string, result: AnalyzeResponse, apiUrl: string): string {
  const emoji = VERDICT_EMOJI[result.verdict] ?? "⚪";
  const versionStr = oldVer ? `\`${oldVer} → ${newVer}\`` : `\`${newVer}\` (new dependency)`;
  const pct = Math.round(result.confidence * 100);
  const { signals } = result;
  const scanUrl = `https://preflight.dev/scans/${result.scan_id}`;

  const lines: string[] = [
    `## ${emoji} Preflight: ${result.verdict} — Dependency Update Intercepted`,
    "",
    `**\`${pkg}\`** ${versionStr} · Confidence: **${pct}%** · ${(result.duration_ms / 1000).toFixed(2)}s`,
    "",
    `> ${signals.llm_reasoning.summary}`,
    "",
    "| Signal | Status | Detail |",
    "|--------|--------|--------|",
    `| Script diff | ${SIGNAL_EMOJI(signals.script_diff.flagged)} | ${signals.script_diff.reason} |`,
    `| AST scan | ${SIGNAL_EMOJI(signals.ast_scan.flagged)} | ${signals.ast_scan.reason} |`,
    `| Maintainer | ${SIGNAL_EMOJI(signals.maintainer.flagged)} | ${signals.maintainer.reason} |`,
    `| Gemini AI | ${SIGNAL_EMOJI(signals.llm_reasoning.verdict !== "PASS")} | ${signals.llm_reasoning.summary.split(".")[0]} |`,
  ];

  if (signals.llm_reasoning.attack_pattern) {
    lines.push("", `Attack pattern: \`${signals.llm_reasoning.attack_pattern}\``);
  }

  if (result.verdict === "BLOCK") {
    lines.push("", "❌ Do NOT merge · 🔍 Review manually · 📢 Report to npm security");
  } else if (result.verdict === "WARN") {
    lines.push("", "⚠️ Review before merging · Verify the package source");
  }

  lines.push("", `[Preflight](https://preflight.dev) · [View full analysis →](${scanUrl})`);
  return lines.join("\n");
}

export async function postComment(
  token: string,
  pkg: string,
  oldVer: string | null,
  newVer: string,
  result: AnalyzeResponse,
  apiUrl: string
): Promise<void> {
  const octokit = github.getOctokit(token);
  const ctx = github.context;
  if (!ctx.payload.pull_request) return;

  const body = formatComment(pkg, oldVer, newVer, result, apiUrl);
  await octokit.rest.issues.createComment({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    issue_number: ctx.payload.pull_request.number,
    body,
  });
}

export async function setStatusCheck(
  token: string,
  verdict: "PASS" | "WARN" | "BLOCK",
  pkg: string,
  scanId: string,
  apiUrl: string
): Promise<void> {
  const octokit = github.getOctokit(token);
  const ctx = github.context;
  const sha = ctx.payload.pull_request?.head.sha ?? ctx.sha;
  const scanUrl = `https://preflight.dev/scans/${scanId}`;

  const state = verdict === "BLOCK" ? "failure" : verdict === "WARN" ? "pending" : "success";
  await octokit.rest.repos.createCommitStatus({
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
    sha,
    state,
    context: `Preflight / ${pkg}`,
    description: `Preflight verdict: ${verdict}`,
    target_url: scanUrl,
  });
}
