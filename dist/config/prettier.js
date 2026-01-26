"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePrettierConfigPlugins = updatePrettierConfigPlugins;
const fs = require("fs");
const path = require("path");
const tailwindPlugin = "prettier-plugin-tailwindcss";
const astroPlugin = "prettier-plugin-astro";
const printWidth = 100;
function uniquePlugins(plugins) {
    const seen = new Set();
    const result = [];
    for (const plugin of plugins) {
        if (seen.has(plugin))
            continue;
        seen.add(plugin);
        result.push(plugin);
    }
    return result;
}
function formatJson(value, indent = 0) {
    const padding = " ".repeat(indent);
    const nextIndent = indent + 4;
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return "[]";
        }
        const inline = value.map((item) => JSON.stringify(item)).join(", ");
        const inlineValue = `[${inline}]`;
        if (value.every((item) => typeof item === "string") &&
            padding.length + inlineValue.length <= printWidth) {
            return inlineValue;
        }
        const items = value
            .map((item) => `${" ".repeat(nextIndent)}${formatJson(item, nextIndent)}`)
            .join(",\n");
        return `[\n${items}\n${padding}]`;
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return "{}";
        }
        const items = entries
            .map(([key, item]) => `${" ".repeat(nextIndent)}${JSON.stringify(key)}: ${formatJson(item, nextIndent)}`)
            .join(",\n");
        return `{\n${items}\n${padding}}`;
    }
    return JSON.stringify(value);
}
function writeJsonFile(filePath, value) {
    fs.writeFileSync(filePath, `${formatJson(value)}\n`, "utf8");
}
function updatePrettierConfigPlugins(targetPath, options) {
    const configPath = path.join(targetPath, ".prettierrc.json");
    if (!fs.existsSync(configPath)) {
        return [];
    }
    const hasPackageJson = fs.existsSync(path.join(targetPath, "package.json"));
    if (hasPackageJson && !options.pluginsAvailable) {
        return [];
    }
    const raw = fs.readFileSync(configPath, "utf8");
    let config;
    try {
        config = JSON.parse(raw);
    }
    catch {
        console.error(`warning: failed to parse ${configPath}; skipping plugin update`);
        return [];
    }
    const existing = Array.isArray(config.plugins)
        ? config.plugins.filter((item) => typeof item === "string").map(String)
        : [];
    let next = [];
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
    }
    else {
        next = existing.filter((plugin) => plugin !== tailwindPlugin && plugin !== astroPlugin);
    }
    const same = existing.length === next.length && existing.every((value, index) => value === next[index]);
    if (same) {
        return [];
    }
    if (next.length === 0) {
        delete config.plugins;
    }
    else {
        config.plugins = next;
    }
    writeJsonFile(configPath, config);
    return [configPath];
}
