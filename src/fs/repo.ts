import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";

function repoSlugFromUrl(repoUrl: string): string {
    const trimmed = repoUrl.replace(/\.git$/, "");
    const parts = trimmed.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    return slug && slug.length > 0 ? slug : "miedinger";
}

export function resolveConfigDir(options: { repoUrl: string; repoRef: string }): { dir: string } {
    const localConfigs = path.resolve(__dirname, "..", "..", "configs");
    if (fs.existsSync(localConfigs)) {
        return { dir: localConfigs };
    }

    const envDir = process.env.FORMAT_CONFIGS_DIR;
    if (envDir && fs.existsSync(envDir)) {
        return { dir: envDir };
    }

    const repoSlug = repoSlugFromUrl(options.repoUrl);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `${repoSlug}-`));
    const archivePath = path.join(tmpDir, `${repoSlug}.tgz`);
    const url = `${options.repoUrl}/archive/${options.repoRef}.tar.gz`;

    execFileSync("curl", ["-fsSL", url, "-o", archivePath], { stdio: "inherit" });
    execFileSync("tar", ["-xzf", archivePath, "-C", tmpDir], { stdio: "inherit" });

    const entries = fs
        .readdirSync(tmpDir)
        .filter((entry: string) => entry.startsWith(`${repoSlug}-`));
    if (entries.length === 0) {
        console.error(`error: failed to extract ${repoSlug}`);
        process.exit(1);
    }

    const extracted = path.join(tmpDir, entries[0]);
    const dir = path.join(extracted, "configs");
    if (!fs.existsSync(dir)) {
        console.error(`error: config dir not found: ${dir}`);
        process.exit(1);
    }

    const cleanup = () => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup errors
        }
    };

    process.on("exit", cleanup);
    process.on("SIGINT", () => process.exit(130));

    return { dir };
}

export function hasCommand(command: string): boolean {
    try {
        execFileSync("sh", ["-c", `command -v ${command} >/dev/null 2>&1`], {
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

export function isGitRepo(dir: string): boolean {
    try {
        const result = execFileSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
            stdio: ["ignore", "pipe", "ignore"],
        });
        return String(result).trim() === "true";
    } catch {
        return false;
    }
}

export function listGitFiles(dir: string): string[] {
    const output = execFileSync("git", ["-C", dir, "ls-files"], {
        stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.join(dir, file));
}

export function listGitUntrackedFiles(dir: string): string[] {
    const output = execFileSync("git", ["-C", dir, "ls-files", "--others", "--exclude-standard"], {
        stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.join(dir, file));
}

export function listFilesRecursive(dir: string): string[] {
    const results: string[] = [];
    const skipNames = new Set([".git", "node_modules", ".build", "DerivedData", "external"]);

    function walk(current: string): void {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (skipNames.has(entry.name)) {
                continue;
            }
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile()) {
                results.push(fullPath);
            }
        }
    }

    walk(dir);
    return results;
}
