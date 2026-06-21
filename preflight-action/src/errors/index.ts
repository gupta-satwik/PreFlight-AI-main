export class ApiTimeoutError extends Error {
  constructor(pkg: string) {
    super(`Preflight API timed out for ${pkg}`);
    this.name = "ApiTimeoutError";
  }
}

export class ApiUnreachableError extends Error {
  constructor(url: string) {
    super(`Preflight API unreachable at ${url}`);
    this.name = "ApiUnreachableError";
  }
}

export class LockfileNotFoundError extends Error {
  constructor(path: string) {
    super(`Lockfile not found at: ${path}\nDid you forget to run 'actions/checkout' before this step, or are you using a different package manager?`);
    this.name = "LockfileNotFoundError";
  }
}

export class LockfileParseError extends Error {
  constructor(path: string, originalMessage?: string) {
    super(`Failed to parse lockfile at ${path}. Is it valid JSON? Error: ${originalMessage}`);
    this.name = "LockfileParseError";
  }
}
