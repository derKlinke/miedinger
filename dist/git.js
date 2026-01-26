"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listStatusPaths = listStatusPaths;
exports.maybeAutoCommit = maybeAutoCommit;
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const repo_1 = require("./fs/repo");
function toGitPath(targetPath, filePath) {
    const rel = path.relative(targetPath, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        return filePath;
    }
    return rel;
}
function listStatusPaths(targetPath) {
    if (!(0, repo_1.isGitRepo)(targetPath)) {
        return new Set();
    }
    const output = String((0, child_process_1.execFileSync)("git", ["-C", targetPath, "status", "--porcelain=v1", "-z"], {
        stdio: ["ignore", "pipe", "ignore"],
    }));
    if (!output) {
        return new Set();
    }
    const paths = new Set();
    const entries = output.split("\0").filter(Boolean);
    for (let idx = 0; idx < entries.length; idx += 1) {
        const entry = entries[idx];
        if (entry.length < 3)
            continue;
        const status = entry.slice(0, 2);
        let rel = entry.slice(3);
        if ((status.includes("R") || status.includes("C")) && idx + 1 < entries.length) {
            rel = entries[idx + 1];
            idx += 1;
        }
        if (!rel)
            continue;
        paths.add(path.join(targetPath, rel));
    }
    return paths;
}
function hasStagedChanges(targetPath) {
    try {
        (0, child_process_1.execFileSync)("git", ["-C", targetPath, "diff", "--cached", "--quiet"], {
            stdio: "ignore",
        });
        return false;
    }
    catch {
        return true;
    }
}
function isDetachedHead(targetPath) {
    try {
        (0, child_process_1.execFileSync)("git", ["-C", targetPath, "symbolic-ref", "-q", "HEAD"], {
            stdio: "ignore",
        });
        return false;
    }
    catch {
        return true;
    }
}
function isTracked(targetPath, filePath) {
    const relPath = toGitPath(targetPath, filePath);
    try {
        (0, child_process_1.execFileSync)("git", ["-C", targetPath, "ls-files", "--error-unmatch", relPath], {
            stdio: "ignore",
        });
        return true;
    }
    catch {
        return false;
    }
}
function maybeAutoCommit(targetPath, managedPaths, preExistingChanges) {
    if (!(0, repo_1.isGitRepo)(targetPath)) {
        return;
    }
    if (managedPaths.size === 0) {
        return;
    }
    if (isDetachedHead(targetPath)) {
        console.error("skip: detached HEAD (auto-commit disabled)");
        return;
    }
    for (const path of managedPaths) {
        if (preExistingChanges.has(path)) {
            console.error("skip: managed files already modified before install (auto-commit disabled)");
            return;
        }
    }
    if (hasStagedChanges(targetPath)) {
        console.error("skip: staged changes present (auto-commit disabled)");
        return;
    }
    const toStage = [];
    for (const filePath of managedPaths) {
        if (fs.existsSync(filePath) || isTracked(targetPath, filePath)) {
            toStage.push(toGitPath(targetPath, filePath));
        }
    }
    if (toStage.length === 0) {
        return;
    }
    (0, child_process_1.execFileSync)("git", ["-C", targetPath, "add", "-A", "--", ...toStage], {
        stdio: "inherit",
    });
    if (!hasStagedChanges(targetPath)) {
        return;
    }
    (0, child_process_1.execFileSync)("git", ["-C", targetPath, "commit", "-m", "chore: sync format configs [skip ci]"], {
        stdio: "inherit",
    });
}
