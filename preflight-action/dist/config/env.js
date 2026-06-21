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
exports.loadEnv = loadEnv;
const core = __importStar(require("@actions/core"));
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    apiUrl: zod_1.z.string().url(),
    lockfile: zod_1.z.string().min(1),
    failOnBlock: zod_1.z.boolean(),
    githubToken: zod_1.z.string().min(1),
});
function loadEnv() {
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
