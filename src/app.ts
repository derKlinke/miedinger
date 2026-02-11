import * as fs from "fs";
import * as path from "path";
import { CliOptions } from "./types";
import { promptInteractive } from "./cli/prompt";
import { ensurePrettierPlugins } from "./config/deps";
import { removeLegacyConfigs } from "./config/cleanup";
import { updatePrettierConfigPlugins } from "./config/prettier";
import { ensureSqlfluffExclude } from "./config/sqlfluff";
import { detectPresets, derivePresets, expandToken } from "./config/presets";
import { detectAstro } from "./config/features";
import { resolveConfigDir, isGitRepo, listGitFiles, listFilesRecursive } from "./fs/repo";
import { maybeUpdateJustfile } from "./justfile";
import { maybeUpdatePrekConfig } from "./prek";
import { listStatusPaths, maybeAutoCommit } from "./git";
import { maybeUpdateSyncWorkflow } from "./github/sync";

const unmanagedIgnoreFiles = new Set<string>([
    ".prettierignore",
    ".markdownlintignore",
    ".clang-format-ignore",
    ".sqlfluffignore",
]);

export async function runApp(options: CliOptions): Promise<void> {
    const targetPath = path.resolve(options.targetDir);
    if (!fs.existsSync(targetPath)) {
        console.error(`error: target dir not found: ${targetPath}`);
        process.exit(1);
    }

    const { dir: configDir } = resolveConfigDir({
        repoUrl: options.repoUrl,
        repoRef: options.repoRef,
    });
    if (!fs.existsSync(configDir)) {
        console.error(`error: config dir not found: ${configDir}`);
        process.exit(1);
    }

    const repoFiles = isGitRepo(targetPath)
        ? listGitFiles(targetPath)
        : listFilesRecursive(targetPath);
    const preExistingChanges =
        options.autoCommit && isGitRepo(targetPath)
            ? listStatusPaths(targetPath)
            : new Set<string>();
    const hasAstro = detectAstro(targetPath, repoFiles);
    let tokens: string[] = [];

    if (options.mode === "detect") {
        tokens = detectPresets(repoFiles);
    } else if (options.mode === "interactive") {
        const selection = await promptInteractive([
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
        } else if (selection.includes("none")) {
            tokens = [];
        } else {
            tokens = selection;
        }
    } else if (options.mode === "only") {
        tokens = options.onlyTokens;
    }

    if (tokens.length === 0) {
        console.log("no configs selected");
        return;
    }

    const fileSet = new Set<string>();
    tokens.forEach((token) => expandToken(token).forEach((file) => fileSet.add(file)));
    for (const file of unmanagedIgnoreFiles) {
        if (fileSet.delete(file)) {
            console.log(`skip: ignore file is repo-owned ${file}`);
        }
    }
    if (fileSet.size === 0) {
        console.log("no configs selected");
        return;
    }
    const selectedPresets = derivePresets(fileSet);

    const removed = removeLegacyConfigs(targetPath, selectedPresets, fileSet);
    const pluginResult = ensurePrettierPlugins(targetPath, selectedPresets, { astro: hasAstro });

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

    const prettierFiles = updatePrettierConfigPlugins(targetPath, {
        astro: hasAstro,
        pluginsAvailable: pluginResult.pluginsAvailable,
    });
    const sqlfluffFiles = ensureSqlfluffExclude(targetPath, selectedPresets);

    const justfilePath = maybeUpdateJustfile(targetPath, selectedPresets, options.justMode);
    const prekPath = maybeUpdatePrekConfig(targetPath, selectedPresets);
    const workflowPath = maybeUpdateSyncWorkflow(targetPath, {
        force: options.force,
    });

    const managedPaths = new Set<string>();
    for (const file of fileSet) {
        managedPaths.add(path.join(targetPath, file));
    }
    removed.forEach((file) => managedPaths.add(file));
    pluginResult.touchedFiles.forEach((file) => managedPaths.add(file));
    prettierFiles.forEach((file) => managedPaths.add(file));
    sqlfluffFiles.forEach((file) => managedPaths.add(file));
    if (justfilePath) managedPaths.add(justfilePath);
    if (prekPath) managedPaths.add(prekPath);
    if (workflowPath) managedPaths.add(workflowPath);

    if (options.autoCommit) {
        maybeAutoCommit(targetPath, managedPaths, preExistingChanges);
    }
}
