import * as fs from "fs";
import * as path from "path";
import { isGitRepo, listGitFiles, listGitUntrackedFiles, listFilesRecursive } from "../fs/repo";

const cleanupFilesByPreset: Record<string, string[]> = {
    swift: [".swiftformat", ".swiftlint.yml", ".swiftlint.yaml"],
    web: [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.yml",
        ".prettierrc.yaml",
        ".prettierrc.toml",
        ".prettierrc.js",
        ".prettierrc.cjs",
        ".prettierrc.mjs",
        "prettier.config.js",
        "prettier.config.cjs",
        "prettier.config.mjs",
        "prettier.config.ts",
        ".prettierignore",
    ],
    markdown: [
        ".markdownlint",
        ".markdownlint.json",
        ".markdownlint.jsonc",
        ".markdownlint.yml",
        ".markdownlint.yaml",
        ".markdownlint.js",
        ".markdownlint.cjs",
        ".markdownlint.mjs",
        "markdownlint.config.js",
        "markdownlint.config.cjs",
        "markdownlint.config.mjs",
        "markdownlint-cli2.json",
        "markdownlint-cli2.jsonc",
        "markdownlint-cli2.yml",
        "markdownlint-cli2.yaml",
        "markdownlint-cli2.js",
        "markdownlint-cli2.cjs",
        "markdownlint-cli2.mjs",
        ".markdownlintignore",
    ],
    clang: [".clang-format", "_clang-format"],
    sql: [".sqlfluff"],
};

function buildCleanupSet(presets: Set<string>): Set<string> {
    const names = new Set<string>();
    for (const preset of presets) {
        const files = cleanupFilesByPreset[preset];
        if (!files) continue;
        files.forEach((file) => names.add(file));
    }
    return names;
}

export function removeLegacyConfigs(
    targetPath: string,
    presets: Set<string>,
    keepFiles: Set<string>
): string[] {
    const cleanupNames = buildCleanupSet(presets);
    if (cleanupNames.size === 0) {
        return [];
    }

    const removed: string[] = [];
    const files = isGitRepo(targetPath)
        ? [...listGitFiles(targetPath), ...listGitUntrackedFiles(targetPath)]
        : listFilesRecursive(targetPath);
    for (const file of files) {
        const rel = path.relative(targetPath, file);
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
            continue;
        }
        const base = path.basename(rel);
        if (!cleanupNames.has(base)) {
            continue;
        }
        const isRoot = rel === base;
        if (isRoot && keepFiles.has(base)) {
            continue;
        }
        try {
            fs.unlinkSync(file);
            removed.push(file);
            console.log(`remove: ${file}`);
        } catch (err) {
            console.error(`warning: failed to remove ${file}`);
            if (err instanceof Error) {
                console.error(err.message);
            }
        }
    }

    return removed;
}
