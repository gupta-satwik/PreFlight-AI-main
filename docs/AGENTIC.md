# Preflight — Agentic Workflows (Next Phase)

**Full implementation plan**: `C:\Users\DELL\.claude\plans\glowing-hatching-bubble.md`

The goal: protect against AI coding agents (Devin, Claude Code in agentic mode, Copilot Workspace)
that autonomously bump npm deps with no human in the loop. The current GitHub Action catches it at
merge time. The gap: by then the agent has already written the code, committed, and pushed.

**Status**: Planned, not yet built.

---

## Deliverable 1: MCP Server (`preflight-mcp/`)

A Claude Code tool. An agent calls `preflight_analyze` *before* touching `package.json`.
The agent learns of the BLOCK verdict mid-session and refuses to install. Zero-PR attack surface.

### New files

**`preflight-mcp/package.json`**
```json
{
  "name": "preflight-mcp",
  "version": "1.0.0",
  "type": "module",
  "description": "Claude Code MCP server for npm supply chain security",
  "bin": { "preflight-mcp": "./index.js" },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0"
  }
}
```

**`preflight-mcp/index.js`** (~90 lines) — wraps `POST /analyze`, returns markdown verdict table.

Tool registered: `preflight_analyze(package_name, old_version?, new_version)`

### Wire-up

```bash
claude mcp add preflight node /full/path/to/preflight-mcp/index.js
```

Or manually in `~/.claude.json`:
```json
{
  "mcpServers": {
    "preflight": {
      "command": "node",
      "args": ["C:/Users/DELL/desktop/NMIT_HACKS/preflight-ai/preflight-mcp/index.js"]
    }
  }
}
```

### Demo script

```
User: Update axios to version 1.7.10 in my project
Claude Code: [calls preflight_analyze("axios", "1.7.9", "1.7.10")]
→ ## Preflight: BLOCK · 94% confidence
→ ❌ DO NOT INSTALL — npm_account_hijack_rat_deployment.
Claude Code: I cannot install this package. Preflight has flagged it as a supply chain attack.
```

---

## Deliverable 2: Agent PR Badge (GitHub Action)

When Preflight's GitHub Action detects the PR was authored by an AI agent, it prepends a
visible warning banner to the PR comment.

### Detection (in `preflight-action/src/index.ts`)

```typescript
const prAuthor = github.context.payload.pull_request?.user?.login ?? "";
const AGENT_RE = /^(devin-ai|sweep-|dependabot|github-actions\[bot\]|renovate|snyk-bot|mend-|copilot-workspace|app\/github-actions)/i;
const isAgentPR = AGENT_RE.test(prAuthor);
```

### Banner (in `preflight-action/src/adapters/github.ts`)

```typescript
const agentBanner = isAgentPR
  ? `> ⚠️ **Agent-authored PR** — \`${prAuthor}\` made this change autonomously. No human reviewed this dependency upgrade.\n\n`
  : "";
```

### Build step after changes

```bash
cd preflight-action && npm run build
git add dist/index.js src/index.ts src/adapters/github.ts
```
