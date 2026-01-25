import { CliOptions, JustMode, Mode, PrekMode } from "../types";
import { listPresets, usage } from "./usage";

function parseOnly(value: string): string[] {
    return value.split(/[ ,]+/).filter(Boolean);
}

export function parseArgs(
    args: string[],
    defaults: { repoUrl: string; repoRef: string; cwd: string }
): CliOptions {
    let targetDir = "";
    let force = false;
    let mode: Mode = "detect";
    let onlyTokens: string[] = [];
    let repoUrl = defaults.repoUrl;
    let repoRef = defaults.repoRef;
    let justMode: JustMode = "auto";
    let prekMode: PrekMode = "auto";

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
                listPresets();
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
            case "--prek":
                prekMode = "force";
                idx += 1;
                break;
            case "--no-prek":
                prekMode = "skip";
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
                usage();
                process.exit(0);
                break;
            default:
                if (!targetDir) {
                    targetDir = arg;
                    idx += 1;
                } else {
                    console.error(`error: unexpected argument: ${arg}`);
                    usage();
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
        prekMode,
    };
}
