"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = analyze;
const index_js_1 = require("../errors/index.js");
async function analyze(apiUrl, req) {
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
        return (await res.json());
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            throw new index_js_1.ApiTimeoutError(req.package_name);
        }
        if (err instanceof TypeError) {
            throw new index_js_1.ApiUnreachableError(apiUrl);
        }
        throw err;
    }
    finally {
        clearTimeout(timeout);
    }
}
