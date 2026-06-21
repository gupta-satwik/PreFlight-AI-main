"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LockfileParseError = exports.LockfileNotFoundError = exports.ApiUnreachableError = exports.ApiTimeoutError = void 0;
class ApiTimeoutError extends Error {
    constructor(pkg) {
        super(`Preflight API timed out for ${pkg}`);
        this.name = "ApiTimeoutError";
    }
}
exports.ApiTimeoutError = ApiTimeoutError;
class ApiUnreachableError extends Error {
    constructor(url) {
        super(`Preflight API unreachable at ${url}`);
        this.name = "ApiUnreachableError";
    }
}
exports.ApiUnreachableError = ApiUnreachableError;
class LockfileNotFoundError extends Error {
    constructor(path) {
        super(`Lockfile not found at: ${path}\nDid you forget to run 'actions/checkout' before this step, or are you using a different package manager?`);
        this.name = "LockfileNotFoundError";
    }
}
exports.LockfileNotFoundError = LockfileNotFoundError;
class LockfileParseError extends Error {
    constructor(path, originalMessage) {
        super(`Failed to parse lockfile at ${path}. Is it valid JSON? Error: ${originalMessage}`);
        this.name = "LockfileParseError";
    }
}
exports.LockfileParseError = LockfileParseError;
