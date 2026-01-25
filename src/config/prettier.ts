import * as fs from "fs";
import * as path from "path";

const tailwindPlugin = "prettier-plugin-tailwindcss";
const astroPlugin = "prettier-plugin-astro";
const printWidth = 100;

function uniquePlugins(plugins: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const plugin of plugins) {
        if (seen.has(plugin)) continue;
        seen.add(plugin);
        result.push(plugin);
    }
    return result;
}

function formatJson(value: unknown, indent = 0): string {
    const padding = " ".repeat(indent);
    const nextIndent = indent + 4;

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "[]";
        }
        const inline = value
            .map((item) => JSON.stringify(item))
            .join(", ");
        const inlineValue = `[${inline}]`;
        if (
            value.every((item) => typeof item === "string") &&
            padding.length + inlineValue.length <= printWidth
        ) {
            return inlineValue;
        }
        const items = value
            .map((item) => `${" ".repeat(nextIndent)}${formatJson(item, nextIndent)}`)
            .join(",\n");
        return `[\n${items}\n${padding}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>);
        if (entries.length === 0) {
            return "{}";
        }
        const items = entries
            .map(
                ([key, item]) =>
                    `${" ".repeat(nextIndent)}${JSON.stringify(key)}: ${formatJson(
                        item,
                        nextIndent
                    )}`
            )
            .join(",\n");
        return `{\n${items}\n${padding}}`;
    }

    return JSON.stringify(value);
}

function writeJsonFile(filePath: string, value: Record<string, unknown>): void {
    fs.writeFileSync(filePath, `${formatJson(value)}\n`, "utf8");
}

export function updatePrettierConfigPlugins(
    targetPath: string,
    options: { astro: boolean }
): string[] {
    const configPath = path.join(targetPath, ".prettierrc.json");
    if (!fs.existsSync(configPath)) {
        return [];
    }

    const hasPackageJson = fs.existsSync(path.join(targetPath, "package.json"));

    const raw = fs.readFileSync(configPath, "utf8");
    let config: Record<string, unknown>;
    try {
        config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
        console.error(`warning: failed to parse ${configPath}; skipping plugin update`);
        return [];
    }

    const existing = Array.isArray(config.plugins)
        ? (config.plugins as unknown[]).filter((item) => typeof item === "string").map(String)
        : [];
    let next: string[] = [];
    if (hasPackageJson) {
        const withoutAstro = existing.filter((plugin) => plugin !== astroPlugin);
        const desired = [
            tailwindPlugin,
            ...withoutAstro.filter((plugin) => plugin !== tailwindPlugin),
        ];
        if (options.astro) {
            desired.push(astroPlugin);
        }
        next = uniquePlugins(desired);
    } else {
        next = existing.filter((plugin) => plugin !== tailwindPlugin && plugin !== astroPlugin);
    }

    const same =
        existing.length === next.length && existing.every((value, index) => value === next[index]);
    if (same) {
        return [];
    }

    if (next.length === 0) {
        delete config.plugins;
    } else {
        config.plugins = next;
    }
    writeJsonFile(configPath, config);
    return [configPath];
}
