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
exports.parseChangedDeps = parseChangedDeps;
const fs = __importStar(require("fs"));
const index_js_1 = require("../errors/index.js");
function parseChangedDeps(lockfilePath, baseLockfilePath) {
    if (!fs.existsSync(lockfilePath)) {
        throw new index_js_1.LockfileNotFoundError(lockfilePath);
    }
    let current;
    try {
        current = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
    }
    catch (err) {
        throw new index_js_1.LockfileParseError(lockfilePath, err instanceof Error ? err.message : String(err));
    }
    // When running inside GitHub Actions, the base lockfile comes from git diff.
    // If no base is provided, treat every direct dep as new.
    let base = null;
    if (baseLockfilePath && fs.existsSync(baseLockfilePath)) {
        try {
            base = JSON.parse(fs.readFileSync(baseLockfilePath, "utf8"));
        }
        catch {
            base = null;
        }
    }
    const changed = [];
    const currentPkgs = current.packages ?? {};
    const basePkgs = base?.packages ?? {};
    for (const [key, entry] of Object.entries(currentPkgs)) {
        // Only direct dependencies: key is "node_modules/<name>" (no nested slash after node_modules/)
        if (!key.startsWith("node_modules/"))
            continue;
        const nameAfter = key.slice("node_modules/".length);
        if (nameAfter.includes("/node_modules/"))
            continue; // transitive — skip
        const name = nameAfter;
        const newVersion = entry.version;
        const oldEntry = basePkgs[key];
        const oldVersion = oldEntry?.version ?? null;
        if (newVersion !== oldVersion) {
            changed.push({ name, oldVersion, newVersion });
        }
    }
    return changed;
}
