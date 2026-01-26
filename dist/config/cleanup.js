"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeLegacyConfigs = removeLegacyConfigs;
const fs = require("fs");
const path = require("path");
const repo_1 = require("../fs/repo");
const cleanupFilesByPreset = {
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
    clang: [".clang-format", "_clang-format", ".clang-format-ignore"],
    sql: [".sqlfluff"],
};
function buildCleanupSet(presets) {
    const names = new Set();
    for (const preset of presets) {
        const files = cleanupFilesByPreset[preset];
        if (!files)
            continue;
        files.forEach((file) => names.add(file));
    }
    return names;
}
function removeLegacyConfigs(targetPath, presets, keepFiles) {
    const cleanupNames = buildCleanupSet(presets);
    if (cleanupNames.size === 0) {
        return [];
    }
    const removed = [];
    const files = (0, repo_1.isGitRepo)(targetPath)
        ? [...(0, repo_1.listGitFiles)(targetPath), ...(0, repo_1.listGitUntrackedFiles)(targetPath)]
        : (0, repo_1.listFilesRecursive)(targetPath);
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
        }
        catch (err) {
            console.error(`warning: failed to remove ${file}`);
            if (err instanceof Error) {
                console.error(err.message);
            }
        }
    }
    return removed;
}
