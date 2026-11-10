import * as fs from "fs";
import * as path from "path";

export function ensureSqlfluffExclude(targetPath: string, presets: Set<string>): string[] {
    if (!presets.has("sql")) return [];
    const filePath = path.join(targetPath, ".sqlfluffignore");
    const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
    if (content.split(/\r?\n/).some((line) => line.trim() === "**/migrations/**")) return [];
    fs.writeFileSync(filePath, `${content.trimEnd()}${content.trim() ? "\n" : ""}**/migrations/**\n`);
    return [filePath];
}
