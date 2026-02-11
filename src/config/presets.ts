export const presetFiles: Record<string, string[]> = {
    swift: [".swiftformat", ".swiftlint.yml"],
    web: [".prettierrc.json"],
    markdown: [".markdownlint.json"],
    clang: [".clang-format"],
    sql: [".sqlfluff"],
};

export function expandToken(token: string): string[] {
    if (presetFiles[token]) {
        return presetFiles[token];
    }
    return [token];
}

export function derivePresets(files: Set<string>): Set<string> {
    const presets = new Set<string>();
    if (files.has(".swiftformat") || files.has(".swiftlint.yml")) {
        presets.add("swift");
    }
    if (files.has(".prettierrc.json")) {
        presets.add("web");
    }
    if (files.has(".markdownlint.json")) {
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

export function detectPresets(files: string[]): string[] {
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
