"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSqlfluffExclude = ensureSqlfluffExclude;
const fs = require("fs");
const path = require("path");
const migrationsExclude = "**/migrations/**";
function hasExclude(content) {
    return /^\s*exclude_paths\s*=.*migrations/im.test(content);
}
function ensureSqlfluffExclude(targetPath, presets) {
    if (!presets.has("sql")) {
        return [];
    }
    const filePath = path.join(targetPath, ".sqlfluff");
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const content = fs.readFileSync(filePath, "utf8");
    if (hasExclude(content)) {
        return [];
    }
    const lines = content.split(/\r?\n/);
    const sectionHeader = "[sqlfluff]";
    const start = lines.findIndex((line) => line.trim().toLowerCase() === sectionHeader);
    if (start === -1) {
        const trimmed = content.trimEnd();
        const suffix = trimmed.length ? "\n\n" : "";
        const updated = `${trimmed}${suffix}${sectionHeader}\nexclude_paths = ${migrationsExclude}\n`;
        fs.writeFileSync(filePath, updated, "utf8");
        return [filePath];
    }
    let end = lines.length;
    for (let idx = start + 1; idx < lines.length; idx += 1) {
        const line = lines[idx].trim();
        if (line.startsWith("[") && line.endsWith("]")) {
            end = idx;
            break;
        }
    }
    lines.splice(end, 0, `exclude_paths = ${migrationsExclude}`);
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    return [filePath];
}
