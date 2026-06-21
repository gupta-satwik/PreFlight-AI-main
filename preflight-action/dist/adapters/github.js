"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.postComment = postComment;
exports.setStatusCheck = setStatusCheck;
const github = __importStar(require("@actions/github"));
const VERDICT_EMOJI = {
    BLOCK: "🔴",
    WARN: "🟡",
    PASS: "🟢",
};
const SIGNAL_EMOJI = (flagged) => (flagged ? "🚨 Flagged" : "✅ Clear");
function formatComment(pkg, oldVer, newVer, result, apiUrl) {
    const emoji = VERDICT_EMOJI[result.verdict] ?? "⚪";
    const versionStr = oldVer ? `\`${oldVer} → ${newVer}\`` : `\`${newVer}\` (new dependency)`;
    const pct = Math.round(result.confidence * 100);
    const { signals } = result;
    const scanUrl = `https://preflight.dev/scans/${result.scan_id}`;
    const lines = [
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
    }
    else if (result.verdict === "WARN") {
        lines.push("", "⚠️ Review before merging · Verify the package source");
    }
    lines.push("", `[Preflight](https://preflight.dev) · [View full analysis →](${scanUrl})`);
    return lines.join("\n");
}
async function postComment(token, pkg, oldVer, newVer, result, apiUrl) {
    const octokit = github.getOctokit(token);
    const ctx = github.context;
    if (!ctx.payload.pull_request)
        return;
    const body = formatComment(pkg, oldVer, newVer, result, apiUrl);
    await octokit.rest.issues.createComment({
        owner: ctx.repo.owner,
        repo: ctx.repo.repo,
        issue_number: ctx.payload.pull_request.number,
        body,
    });
}
async function setStatusCheck(token, verdict, pkg, scanId, apiUrl) {
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
