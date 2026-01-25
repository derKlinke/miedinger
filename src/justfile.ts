import * as fs from "fs";
import * as path from "path";
import { JustMode } from "./types";

export function findJustfile(targetPath: string): { path: string; exists: boolean } | null {
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
        lines.push(
            "    npx --yes -p prettier -p prettier-plugin-tailwindcss -p prettier-plugin-astro prettier --write ."
        );
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

function removeFormatTargets(lines: string[]): string[] {
    let current = [...lines];
    while (true) {
        const range = findFormatTargetRange(current);
        if (!range) {
            return current;
        }
        current = [...current.slice(0, range.start), ...current.slice(range.end)];
    }
}

function updateJustfileContent(content: string, block: string[]): string | null {
    if (block.length === 0) {
        return null;
    }
    const lines = content.length ? content.split(/\r?\n/) : [];
    const withoutAlias = lines.filter((line) => !/^\s*alias\s+(fmt|f)\s*:=/.test(line));
    const existingBlock = findFormatBlockRange(withoutAlias);
    const baseLines = existingBlock
        ? [
              ...withoutAlias.slice(0, existingBlock.start),
              ...withoutAlias.slice(existingBlock.end + 1),
          ]
        : withoutAlias;
    const withoutFormats = removeFormatTargets(baseLines);

    if (withoutFormats.length === 0) {
        return block.join("\n") + "\n";
    }
    return [...withoutFormats, "", ...block].join("\n").trimEnd() + "\n";
}

export function maybeUpdateJustfile(
    targetPath: string,
    presets: Set<string>,
    justMode: JustMode
): void {
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
