import * as fs from "fs";
import * as path from "path";
import { CliOptions } from "./types";
import { promptInteractive } from "./cli/prompt";
import { detectPresets, derivePresets, expandToken } from "./config/presets";
import { resolveConfigDir, isGitRepo, listGitFiles, listFilesRecursive } from "./fs/repo";
import { maybeUpdateJustfile } from "./justfile";
import { maybeUpdatePrekConfig } from "./prek";

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

    let tokens: string[] = [];

    if (options.mode === "detect") {
        const files = isGitRepo(targetPath)
            ? listGitFiles(targetPath)
            : listFilesRecursive(targetPath);
        tokens = detectPresets(files);
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
    const selectedPresets = derivePresets(fileSet);

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

    maybeUpdateJustfile(targetPath, selectedPresets, options.justMode);
    maybeUpdatePrekConfig(targetPath, selectedPresets, {
        prekMode: options.prekMode,
        force: options.force,
    });
}
