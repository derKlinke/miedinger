import * as fs from "fs";
import * as path from "path";

const tailwindPlugin = "prettier-plugin-tailwindcss";
const astroPlugin = "prettier-plugin-astro";

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
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4) + "\n", "utf8");
    return [configPath];
}
