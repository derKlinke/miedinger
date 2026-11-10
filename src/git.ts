import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { isGitRepo } from "./fs/repo";

function toGitPath(targetPath: string, filePath: string): string {
    const rel = path.relative(targetPath, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        return filePath;
    }
    return rel;
}

export function listStatusPaths(targetPath: string): Set<string> {
    if (!isGitRepo(targetPath)) {
        return new Set();
    }
    const output = String(
        execFileSync("git", ["-C", targetPath, "status", "--porcelain=v1", "-z"], {
            stdio: ["ignore", "pipe", "ignore"],
        })
    );
    if (!output) {
        return new Set();
    }
    const paths = new Set<string>();
    const entries = output.split("\0").filter(Boolean);
    for (let idx = 0; idx < entries.length; idx += 1) {
        const entry = entries[idx];
        if (entry.length < 3) continue;
        const status = entry.slice(0, 2);
        let rel = entry.slice(3);
        if ((status.includes("R") || status.includes("C")) && idx + 1 < entries.length) {
            rel = entries[idx + 1];
            idx += 1;
        }
        if (!rel) continue;
        paths.add(path.join(targetPath, rel));
    }
    return paths;
}

function hasStagedChanges(targetPath: string): boolean {
    try {
        execFileSync("git", ["-C", targetPath, "diff", "--cached", "--quiet"], {
            stdio: "ignore",
        });
        return false;
    } catch {
        return true;
    }
}

function isDetachedHead(targetPath: string): boolean {
    try {
        execFileSync("git", ["-C", targetPath, "symbolic-ref", "-q", "HEAD"], {
            stdio: "ignore",
        });
        return false;
    } catch {
        return true;
    }
}

function isTracked(targetPath: string, filePath: string): boolean {
    const relPath = toGitPath(targetPath, filePath);
    try {
        execFileSync("git", ["-C", targetPath, "ls-files", "--error-unmatch", relPath], {
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

export function maybeAutoCommit(targetPath: string, managedPaths: Set<string>, preExistingChanges: Set<string>): void {
    if (!isGitRepo(targetPath)) {
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

    const toStage: string[] = [];
    for (const filePath of managedPaths) {
        if (fs.existsSync(filePath) || isTracked(targetPath, filePath)) {
            toStage.push(toGitPath(targetPath, filePath));
        }
    }
    if (toStage.length === 0) {
        return;
    }

    execFileSync("git", ["-C", targetPath, "add", "-A", "--", ...toStage], {
        stdio: "inherit",
    });

    if (!hasStagedChanges(targetPath)) {
        return;
    }

    execFileSync("git", ["-C", targetPath, "commit", "-m", "chore: sync format configs [skip ci]"], {
        stdio: "inherit",
    });
}
