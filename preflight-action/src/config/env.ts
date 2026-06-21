import * as core from "@actions/core";
import { z } from "zod";

const EnvSchema = z.object({
  apiUrl: z.string().url(),
  lockfile: z.string().min(1),
  failOnBlock: z.boolean(),
  githubToken: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const raw = {
    apiUrl: core.getInput("api_url") || process.env.PREFLIGHT_API_URL || "https://preflight-api.onrender.com",
    lockfile: core.getInput("lockfile") || "package-lock.json",
    failOnBlock: (core.getInput("fail_on_block") || "true").toLowerCase() !== "false",
    githubToken: process.env.GITHUB_TOKEN || "",
  };

  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid action configuration: ${msg}`);
  }
  return result.data;
}
