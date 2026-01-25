import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { isGitRepo } from "./fs/repo";

function runGit(targetPath: string, args: string[]): string {
    return String(
        execFileSync("git", ["-C", targetPath, ...args], {
            stdio: ["ignore", "pipe", "ignore"],
        })
    ).trim();
}

function parseStatusPath(line: string): string | null {
    if (line.length < 4) {
        return null;
    }
    let pathPart = line.slice(3).trim();
    const renameIndex = pathPart.indexOf(" -> ");
    if (renameIndex >= 0) {
        pathPart = pathPart.slice(renameIndex + 4);
    }
    return pathPart.length > 0 ? pathPart : null;
}

export function listStatusPaths(targetPath: string): Set<string> {
    if (!isGitRepo(targetPath)) {
        return new Set();
    }
    const output = runGit(targetPath, ["status", "--porcelain"]);
    if (!output) {
        return new Set();
    }
    const paths = new Set<string>();
    for (const line of output.split("\n")) {
        const rel = parseStatusPath(line);
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
    try {
        execFileSync("git", ["-C", targetPath, "ls-files", "--error-unmatch", filePath], {
            stdio: "ignore",
        });
        return true;
    } catch {
        return false;
    }
}

export function maybeAutoCommit(
    targetPath: string,
    managedPaths: Set<string>,
    preExistingChanges: Set<string>
): void {
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
            toStage.push(filePath);
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

    execFileSync(
        "git",
        ["-C", targetPath, "commit", "-m", "chore: sync format configs [skip ci]"],
        {
            stdio: "inherit",
        }
    );
}
