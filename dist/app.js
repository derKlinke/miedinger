"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runApp = runApp;
const fs = require("fs");
const path = require("path");
const prompt_1 = require("./cli/prompt");
const deps_1 = require("./config/deps");
const cleanup_1 = require("./config/cleanup");
const prettier_1 = require("./config/prettier");
const sqlfluff_1 = require("./config/sqlfluff");
const presets_1 = require("./config/presets");
const features_1 = require("./config/features");
const repo_1 = require("./fs/repo");
const justfile_1 = require("./justfile");
const prek_1 = require("./prek");
const git_1 = require("./git");
const sync_1 = require("./github/sync");
async function runApp(options) {
    const targetPath = path.resolve(options.targetDir);
    if (!fs.existsSync(targetPath)) {
        console.error(`error: target dir not found: ${targetPath}`);
        process.exit(1);
    }
    const { dir: configDir } = (0, repo_1.resolveConfigDir)({
        repoUrl: options.repoUrl,
        repoRef: options.repoRef,
    });
    if (!fs.existsSync(configDir)) {
        console.error(`error: config dir not found: ${configDir}`);
        process.exit(1);
    }
    const repoFiles = (0, repo_1.isGitRepo)(targetPath)
        ? (0, repo_1.listGitFiles)(targetPath)
        : (0, repo_1.listFilesRecursive)(targetPath);
    const preExistingChanges = options.autoCommit && (0, repo_1.isGitRepo)(targetPath)
        ? (0, git_1.listStatusPaths)(targetPath)
        : new Set();
    const hasAstro = (0, features_1.detectAstro)(targetPath, repoFiles);
    let tokens = [];
    if (options.mode === "detect") {
        tokens = (0, presets_1.detectPresets)(repoFiles);
    }
    else if (options.mode === "interactive") {
        const selection = await (0, prompt_1.promptInteractive)([
            "swift",
            "web",
            "markdown",
            "clang",
            "sql",
            "all",
            "none",
        ]);
        if (selection.includes("all")) {
            tokens = ["swift", "web", "markdown", "clang", "sql"];
        }
        else if (selection.includes("none")) {
            tokens = [];
        }
        else {
            tokens = selection;
        }
    }
    else if (options.mode === "only") {
        tokens = options.onlyTokens;
    }
    if (tokens.length === 0) {
        console.log("no configs selected");
        return;
    }
    const fileSet = new Set();
    tokens.forEach((token) => (0, presets_1.expandToken)(token).forEach((file) => fileSet.add(file)));
    const selectedPresets = (0, presets_1.derivePresets)(fileSet);
    const removed = (0, cleanup_1.removeLegacyConfigs)(targetPath, selectedPresets, fileSet);
    const pluginResult = (0, deps_1.ensurePrettierPlugins)(targetPath, selectedPresets, { astro: hasAstro });
    for (const file of fileSet) {
        const src = path.join(configDir, file);
        const dst = path.join(targetPath, file);
        if (!fs.existsSync(src)) {
            console.error(`skip: missing ${src}`);
            continue;
        }
        if (fs.existsSync(dst) && !options.force) {
            console.error(`skip: exists ${dst} (use --force)`);
            continue;
        }
        fs.copyFileSync(src, dst);
        console.log(`install: ${dst}`);
    }
    const prettierFiles = (0, prettier_1.updatePrettierConfigPlugins)(targetPath, {
        astro: hasAstro,
        pluginsAvailable: pluginResult.pluginsAvailable,
    });
    const sqlfluffFiles = (0, sqlfluff_1.ensureSqlfluffExclude)(targetPath, selectedPresets);
    const justfilePath = (0, justfile_1.maybeUpdateJustfile)(targetPath, selectedPresets, options.justMode);
    const prekPath = (0, prek_1.maybeUpdatePrekConfig)(targetPath, selectedPresets);
    const workflowPath = (0, sync_1.maybeUpdateSyncWorkflow)(targetPath, {
        force: options.force,
    });
    const managedPaths = new Set();
    for (const file of fileSet) {
        managedPaths.add(path.join(targetPath, file));
    }
    removed.forEach((file) => managedPaths.add(file));
    pluginResult.touchedFiles.forEach((file) => managedPaths.add(file));
    prettierFiles.forEach((file) => managedPaths.add(file));
    sqlfluffFiles.forEach((file) => managedPaths.add(file));
    if (justfilePath)
        managedPaths.add(justfilePath);
    if (prekPath)
        managedPaths.add(prekPath);
    if (workflowPath)
        managedPaths.add(workflowPath);
    if (options.autoCommit) {
        (0, git_1.maybeAutoCommit)(targetPath, managedPaths, preExistingChanges);
    }
}
