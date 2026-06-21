import { ApiTimeoutError, ApiUnreachableError } from "../errors/index.js";

export interface AnalyzeRequest {
  package_name: string;
  old_version: string | null;
  new_version: string;
  repo?: string;
  pr_number?: number;
  demo?: boolean;
}

export interface SignalResult {
  flagged: boolean;
  reason: string;
  [key: string]: unknown;
}

export interface AnalyzeResponse {
  scan_id: string;
  verdict: "PASS" | "WARN" | "BLOCK";
  confidence: number;
  duration_ms: number;
  signals: {
    script_diff: SignalResult;
    ast_scan: SignalResult;
    maintainer: SignalResult;
    llm_reasoning: SignalResult & { summary: string; attack_pattern: string | null };
  };
}

export async function analyze(apiUrl: string, req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50_000);

  try {
    const res = await fetch(`${apiUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`API returned ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as AnalyzeResponse;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiTimeoutError(req.package_name);
    }
    if (err instanceof TypeError) {
      throw new ApiUnreachableError(apiUrl);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
