"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveConfigDir = resolveConfigDir;
exports.hasCommand = hasCommand;
exports.isGitRepo = isGitRepo;
exports.listGitFiles = listGitFiles;
exports.listGitUntrackedFiles = listGitUntrackedFiles;
exports.listFilesRecursive = listFilesRecursive;
const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process_1 = require("child_process");
function repoSlugFromUrl(repoUrl) {
    const trimmed = repoUrl.replace(/\.git$/, "");
    const parts = trimmed.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    return slug && slug.length > 0 ? slug : "miedinger";
}
function resolveConfigDir(options) {
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
    (0, child_process_1.execFileSync)("curl", ["-fsSL", url, "-o", archivePath], { stdio: "inherit" });
    (0, child_process_1.execFileSync)("tar", ["-xzf", archivePath, "-C", tmpDir], { stdio: "inherit" });
    const entries = fs
        .readdirSync(tmpDir)
        .filter((entry) => entry.startsWith(`${repoSlug}-`));
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
        }
        catch {
            // ignore cleanup errors
        }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", () => process.exit(130));
    return { dir };
}
function hasCommand(command) {
    try {
        (0, child_process_1.execFileSync)("sh", ["-c", `command -v ${command} >/dev/null 2>&1`], {
            stdio: "ignore",
        });
        return true;
    }
    catch {
        return false;
    }
}
function isGitRepo(dir) {
    try {
        const result = (0, child_process_1.execFileSync)("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
            stdio: ["ignore", "pipe", "ignore"],
        });
        return String(result).trim() === "true";
    }
    catch {
        return false;
    }
}
function listGitFiles(dir) {
    const output = (0, child_process_1.execFileSync)("git", ["-C", dir, "ls-files"], {
        stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.join(dir, file));
}
function listGitUntrackedFiles(dir) {
    const output = (0, child_process_1.execFileSync)("git", ["-C", dir, "ls-files", "--others", "--exclude-standard"], {
        stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.join(dir, file));
}
function listFilesRecursive(dir) {
    const results = [];
    const skipNames = new Set([".git", "node_modules", ".build", "DerivedData", "external"]);
    function walk(current) {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (skipNames.has(entry.name)) {
                continue;
            }
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile()) {
                results.push(fullPath);
            }
        }
    }
    walk(dir);
    return results;
}
