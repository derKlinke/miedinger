#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import * as readline from "readline";

const repoUrlDefault =
    process.env.FORMAT_CONFIGS_REPO || "https://github.com/derKlinke/format-configs";
const repoRefDefault = process.env.FORMAT_CONFIGS_REF || "main";

const args = process.argv.slice(2);
let targetDir = "";
let force = false;
let mode: "detect" | "interactive" | "only" = "detect";
let onlyTokens: string[] = [];
let repoUrl = repoUrlDefault;
let repoRef = repoRefDefault;
let justMode: "auto" | "force" | "skip" = "auto";

function usage(): void {
    console.log(`Usage: format-configs [options] [target-dir]

Copies shared formatter configs into target directory (no symlinks).
Defaults to current working directory.

Options:
  --detect           Auto-detect which configs to install (default)
  --interactive      Select configs from a list
  --only LIST        Comma/space-separated presets or filenames
  --list             Show available presets and files
  --force            Overwrite existing files
  --just             Create a Justfile if missing and add format recipe
  --no-just          Skip Justfile integration
  --repo URL         Override repo URL for download mode
  --ref REF          Override git ref for download mode
  -h, --help         Show help

Presets: swift, web, markdown, clang, sql`);
}

function listPresets(): void {
    console.log(`Presets:
  swift     -> .swiftformat, .swiftlint.yml
  web       -> .prettierrc.json, .prettierignore
  markdown  -> .markdownlint.json, .markdownlintignore
  clang     -> .clang-format
  sql       -> .sqlfluff

Files:
  .clang-format
  .markdownlint.json
  .markdownlintignore
  .prettierrc.json
  .prettierignore
  .sqlfluff
  .swiftformat
  .swiftlint.yml`);
}

function parseOnly(value: string): string[] {
    return value.split(/[ ,]+/).filter(Boolean);
}

let i = 0;
while (i < args.length) {
    const arg = args[i];
    switch (arg) {
        case "--detect":
            mode = "detect";
            i += 1;
            break;
        case "--interactive":
            mode = "interactive";
            i += 1;
            break;
        case "--only":
            mode = "only";
            i += 1;
            if (i >= args.length) {
                console.error("error: --only requires a value");
                process.exit(1);
            }
            onlyTokens = parseOnly(args[i]);
            i += 1;
            break;
        case "--list":
            listPresets();
            process.exit(0);
            break;
        case "--force":
            force = true;
            i += 1;
            break;
        case "--just":
            justMode = "force";
            i += 1;
            break;
        case "--no-just":
            justMode = "skip";
            i += 1;
            break;
        case "--repo":
            i += 1;
            if (i >= args.length) {
                console.error("error: --repo requires a value");
                process.exit(1);
            }
            repoUrl = args[i];
            i += 1;
            break;
        case "--ref":
            i += 1;
            if (i >= args.length) {
                console.error("error: --ref requires a value");
                process.exit(1);
            }
            repoRef = args[i];
            i += 1;
            break;
        case "-h":
        case "--help":
            usage();
            process.exit(0);
            break;
        default:
            if (!targetDir) {
                targetDir = arg;
                i += 1;
            } else {
                console.error(`error: unexpected argument: ${arg}`);
                usage();
                process.exit(1);
            }
            break;
    }
}

if (!targetDir) {
    targetDir = process.cwd();
}

function resolveConfigDir(): { dir: string } {
    const localConfigs = path.resolve(__dirname, "..", "configs");
    if (fs.existsSync(localConfigs)) {
        return { dir: localConfigs };
    }

    const envDir = process.env.FORMAT_CONFIGS_DIR;
    if (envDir && fs.existsSync(envDir)) {
        return { dir: envDir };
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "format-configs-"));
    const archivePath = path.join(tmpDir, "format-configs.tgz");
    const url = `${repoUrl}/archive/${repoRef}.tar.gz`;

    execFileSync("curl", ["-fsSL", url, "-o", archivePath], { stdio: "inherit" });
    execFileSync("tar", ["-xzf", archivePath, "-C", tmpDir], { stdio: "inherit" });

    const entries = fs
        .readdirSync(tmpDir)
        .filter((entry: string) => entry.startsWith("format-configs-"));
    if (entries.length === 0) {
        console.error("error: failed to extract format-configs");
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

function isGitRepo(dir: string): boolean {
    try {
        const result = execFileSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
            stdio: ["ignore", "pipe", "ignore"],
        });
        return String(result).trim() === "true";
    } catch {
        return false;
    }
}

function listGitFiles(dir: string): string[] {
    const output = execFileSync("git", ["-C", dir, "ls-files"], {
        stdio: ["ignore", "pipe", "ignore"],
    });
    return String(output)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((file) => path.join(dir, file));
}

function listFilesRecursive(dir: string): string[] {
    const results: string[] = [];
    const skipNames = new Set([".git", "node_modules", ".build", "DerivedData", "external"]);

    function walk(current: string): void {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const entry of entries) {
            if (skipNames.has(entry.name)) {
                continue;
            }
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.isFile()) {
                results.push(full);
            }
        }
    }

    walk(dir);
    return results;
}

function detectPresets(files: string[]): string[] {
    let hasSwift = false;
    let hasWeb = false;
    let hasMarkdown = false;
    let hasClang = false;
    let hasSql = false;

    for (const file of files) {
        const rel = file.toLowerCase();
        if (
            rel.endsWith(".swift") ||
            rel.endsWith("/package.swift") ||
            rel.includes(".xcodeproj/") ||
            rel.includes(".xcworkspace/")
        ) {
            hasSwift = true;
        }
        if (
            rel.endsWith(".js") ||
            rel.endsWith(".ts") ||
            rel.endsWith(".jsx") ||
            rel.endsWith(".tsx") ||
            rel.endsWith(".css") ||
            rel.endsWith(".scss") ||
            rel.endsWith(".html") ||
            rel.endsWith(".vue") ||
            rel.endsWith(".svelte") ||
            rel.endsWith(".astro") ||
            rel.endsWith("/package.json") ||
            rel.endsWith("/pnpm-lock.yaml") ||
            rel.endsWith("/yarn.lock") ||
            rel.endsWith("/bun.lockb") ||
            rel.endsWith("/deno.json") ||
            rel.endsWith("/deno.jsonc")
        ) {
            hasWeb = true;
        }
        if (rel.endsWith(".md") || rel.endsWith(".mdx")) {
            hasMarkdown = true;
        }
        if (
            rel.endsWith(".c") ||
            rel.endsWith(".h") ||
            rel.endsWith(".cpp") ||
            rel.endsWith(".hpp") ||
            rel.endsWith(".m") ||
            rel.endsWith(".mm") ||
            rel.endsWith(".cc") ||
            rel.endsWith(".cxx") ||
            rel.endsWith(".hxx")
        ) {
            hasClang = true;
        }
        if (rel.endsWith(".sql")) {
            hasSql = true;
        }
    }

    const presets: string[] = [];
    if (hasSwift) presets.push("swift");
    if (hasWeb) presets.push("web");
    if (hasMarkdown) presets.push("markdown");
    if (hasClang) presets.push("clang");
    if (hasSql) presets.push("sql");

    return presets;
}

function promptInteractive(choices: string[]): Promise<string[]> {
    return new Promise((resolve) => {
        console.log("Select configs to install (space-separated numbers):");
        choices.forEach((choice, idx) => {
            console.log(`  ${idx + 1}) ${choice}`);
        });

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question("", (answer: string) => {
            rl.close();
            const tokens = answer
                .trim()
                .split(/[ ,]+/)
                .filter(Boolean)
                .map((value: string) => Number(value))
                .filter(
                    (value: number) =>
                        Number.isFinite(value) && value >= 1 && value <= choices.length
                )
                .map((value: number) => choices[value - 1]);

            resolve(tokens);
        });
    });
}

const presetFiles: Record<string, string[]> = {
    swift: [".swiftformat", ".swiftlint.yml"],
    web: [".prettierrc.json", ".prettierignore"],
    markdown: [".markdownlint.json", ".markdownlintignore"],
    clang: [".clang-format"],
    sql: [".sqlfluff"],
};

function expandToken(token: string): string[] {
    if (presetFiles[token]) {
        return presetFiles[token];
    }
    return [token];
}

function derivePresets(files: Set<string>): Set<string> {
    const presets = new Set<string>();
    if (files.has(".swiftformat") || files.has(".swiftlint.yml")) {
        presets.add("swift");
    }
    if (files.has(".prettierrc.json") || files.has(".prettierignore")) {
        presets.add("web");
    }
    if (files.has(".markdownlint.json") || files.has(".markdownlintignore")) {
        presets.add("markdown");
    }
    if (files.has(".clang-format")) {
        presets.add("clang");
    }
    if (files.has(".sqlfluff")) {
        presets.add("sql");
    }
    return presets;
}

function findJustfile(targetPath: string): { path: string; exists: boolean } | null {
    const candidates = ["Justfile", "justfile"];
    for (const name of candidates) {
        const candidate = path.join(targetPath, name);
        if (fs.existsSync(candidate)) {
            return { path: candidate, exists: true };
        }
    }
    return null;
}

function formatRecipeLines(presets: Set<string>): string[] {
    if (presets.size === 0) {
        return [];
    }
    const lines: string[] = [];
    lines.push("format:");
    lines.push("    just --fmt --unstable");
    if (presets.has("swift")) {
        lines.push("    if command -v swiftformat >/dev/null; then swiftformat .; fi");
        lines.push(
            "    if command -v swiftlint >/dev/null; then swiftlint --config .swiftlint.yml --force-exclude --reporter github-actions-logging; fi"
        );
    }
    if (presets.has("web")) {
        lines.push("    npx --yes prettier --write .");
    }
    if (presets.has("markdown")) {
        lines.push(
            '    npx --yes -p markdownlint-cli markdownlint --config .markdownlint.json --ignore-path .markdownlintignore "**/*.md"'
        );
    }
    if (presets.has("clang")) {
        const clangLine =
            "    if command -v clang-format >/dev/null; then if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git ls-files -z '*.c' '*.cc' '*.cpp' '*.cxx' '*.h' '*.hh' '*.hpp' '*.hxx' '*.m' '*.mm' | xargs -0 clang-format -i; else find . -type f \\(" +
            " -name '*.c' -o -name '*.cc' -o -name '*.cpp' -o -name '*.cxx' -o -name '*.h' -o -name '*.hh' -o -name '*.hpp' -o -name '*.hxx' -o -name '*.m' -o -name '*.mm' \\) -print0 | xargs -0 clang-format -i; fi; fi";
        lines.push(clangLine);
    }
    if (presets.has("sql")) {
        lines.push("    if command -v sqlfluff >/dev/null; then sqlfluff format .; fi");
    }
    return lines;
}

function buildFormatBlock(presets: Set<string>): string[] {
    const recipe = formatRecipeLines(presets);
    if (recipe.length === 0) {
        return [];
    }
    return [
        "# format-configs",
        "alias fmt := format",
        "alias f := format",
        "[group('formatting')]",
        ...recipe,
        "# /format-configs",
    ];
}

function findFormatBlockRange(lines: string[]): { start: number; end: number } | null {
    let start = -1;
    let end = -1;
    for (let idx = 0; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (line.trim() === "# format-configs") {
            start = idx;
        }
        if (line.trim() === "# /format-configs") {
            end = idx;
            break;
        }
    }
    if (start >= 0 && end >= start) {
        return { start, end };
    }
    return null;
}

function findFormatTargetRange(lines: string[]): { start: number; end: number } | null {
    const isAttribute = (line: string): boolean => /^\s*\[.*\]\s*$/.test(line);
    const isRecipe = (line: string): boolean =>
        /^\s*[^#\s].*:$/.test(line.trimEnd()) && !isAttribute(line);
    let start = -1;
    for (let idx = 0; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (/^\s*format\b.*:$/.test(line.trimEnd())) {
            start = idx;
            break;
        }
    }
    if (start === -1) {
        return null;
    }
    let adjustedStart = start;
    for (let idx = start - 1; idx >= 0; idx -= 1) {
        if (isAttribute(lines[idx])) {
            adjustedStart = idx;
            continue;
        }
        break;
    }
    start = adjustedStart;

    let end = lines.length;
    for (let idx = start + 1; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (isAttribute(line) || isRecipe(line)) {
            end = idx;
            break;
        }
    }
    return { start, end };
}

function updateJustfileContent(content: string, block: string[]): string | null {
    if (block.length === 0) {
        return null;
    }
    const lines = content.length ? content.split(/\r?\n/) : [];
    const withoutAlias = lines.filter((line) => !/^\s*alias\s+(fmt|f)\s*:=/.test(line));
    const existingBlock = findFormatBlockRange(withoutAlias);
    if (existingBlock) {
        const before = withoutAlias.slice(0, existingBlock.start);
        const after = withoutAlias.slice(existingBlock.end + 1);
        return [...before, ...block, ...after].join("\n").trimEnd() + "\n";
    }

    const existingTarget = findFormatTargetRange(withoutAlias);
    if (existingTarget) {
        const before = withoutAlias.slice(0, existingTarget.start);
        const after = withoutAlias.slice(existingTarget.end);
        return [...before, ...block, ...after].join("\n").trimEnd() + "\n";
    }

    if (withoutAlias.length === 0) {
        return block.join("\n") + "\n";
    }
    return [...withoutAlias, "", ...block].join("\n").trimEnd() + "\n";
}

function maybeUpdateJustfile(targetPath: string, presets: Set<string>): void {
    if (justMode === "skip") {
        return;
    }

    const recipe = formatRecipeLines(presets);
    if (recipe.length === 0) {
        return;
    }

    const existing = findJustfile(targetPath);
    if (!existing && justMode !== "force") {
        return;
    }

    const justfilePath = existing?.path ?? path.join(targetPath, "Justfile");
    const content = fs.existsSync(justfilePath) ? fs.readFileSync(justfilePath, "utf8") : "";
    const block = buildFormatBlock(presets);
    const updated = updateJustfileContent(content, block);
    if (updated === null) {
        return;
    }
    fs.writeFileSync(justfilePath, updated, "utf8");
}

async function main(): Promise<void> {
    const targetPath = path.resolve(targetDir);
    if (!fs.existsSync(targetPath)) {
        console.error(`error: target dir not found: ${targetPath}`);
        process.exit(1);
    }

    const { dir: configDir } = resolveConfigDir();
    if (!fs.existsSync(configDir)) {
        console.error(`error: config dir not found: ${configDir}`);
        process.exit(1);
    }

    let tokens: string[] = [];

    if (mode === "detect") {
        const files = isGitRepo(targetPath)
            ? listGitFiles(targetPath)
            : listFilesRecursive(targetPath);
        tokens = detectPresets(files);
    } else if (mode === "interactive") {
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
    } else if (mode === "only") {
        tokens = onlyTokens;
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

        if (fs.existsSync(dst) && !force) {
            console.error(`skip: exists ${dst} (use --force)`);
            continue;
        }

        fs.copyFileSync(src, dst);
        console.log(`install: ${dst}`);
    }

    maybeUpdateJustfile(targetPath, selectedPresets);
}

main().catch((err: unknown) => {
    if (err instanceof Error) {
        console.error(err.message);
    } else {
        console.error(err);
    }
    process.exit(1);
});
