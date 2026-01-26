"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseArgs = parseArgs;
const usage_1 = require("./usage");
function parseOnly(value) {
    return value.split(/[ ,]+/).filter(Boolean);
}
function parseArgs(args, defaults) {
    let targetDir = "";
    let force = false;
    let mode = "detect";
    let onlyTokens = [];
    let repoUrl = defaults.repoUrl;
    let repoRef = defaults.repoRef;
    let justMode = "auto";
    let autoCommit = false;
    let idx = 0;
    while (idx < args.length) {
        const arg = args[idx];
        switch (arg) {
            case "--detect":
                mode = "detect";
                idx += 1;
                break;
            case "--interactive":
                mode = "interactive";
                idx += 1;
                break;
            case "--only":
                mode = "only";
                idx += 1;
                if (idx >= args.length) {
                    console.error("error: --only requires a value");
                    process.exit(1);
                }
                onlyTokens = parseOnly(args[idx]);
                idx += 1;
                break;
            case "--list":
                (0, usage_1.listPresets)();
                process.exit(0);
                break;
            case "--force":
                force = true;
                idx += 1;
                break;
            case "--just":
                justMode = "force";
                idx += 1;
                break;
            case "--no-just":
                justMode = "skip";
                idx += 1;
                break;
            case "--commit":
                autoCommit = true;
                idx += 1;
                break;
            case "--repo":
                idx += 1;
                if (idx >= args.length) {
                    console.error("error: --repo requires a value");
                    process.exit(1);
                }
                repoUrl = args[idx];
                idx += 1;
                break;
            case "--ref":
                idx += 1;
                if (idx >= args.length) {
                    console.error("error: --ref requires a value");
                    process.exit(1);
                }
                repoRef = args[idx];
                idx += 1;
                break;
            case "-h":
            case "--help":
                (0, usage_1.usage)();
                process.exit(0);
                break;
            default:
                if (!targetDir) {
                    targetDir = arg;
                    idx += 1;
                } else {
                    console.error(`error: unexpected argument: ${arg}`);
                    (0, usage_1.usage)();
                    process.exit(1);
                }
                break;
        }
    }
    if (!targetDir) {
        targetDir = defaults.cwd;
    }
    return {
        targetDir,
        force,
        mode,
        onlyTokens,
        repoUrl,
        repoRef,
        justMode,
        autoCommit,
    };
}
