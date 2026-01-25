import * as fs from "fs";
import * as path from "path";

function hasAstroDependency(targetPath: string): boolean {
    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        return false;
    }
    try {
        const raw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(raw) as Record<string, unknown>;
        const deps = (pkg.dependencies as Record<string, string> | undefined) ?? {};
        const devDeps = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
        return Boolean(deps.astro || devDeps.astro);
    } catch {
        return false;
    }
}

export function detectAstro(targetPath: string, files: string[]): boolean {
    const hasPkg = fs.existsSync(path.join(targetPath, "package.json"));
    if (!hasPkg) {
        return false;
    }

    let hasAstroFiles = false;
    let hasAstroConfig = false;
    for (const file of files) {
        const rel = file.toLowerCase();
        if (rel.endsWith(".astro")) {
            hasAstroFiles = true;
            continue;
        }
        if (
            rel.endsWith("/astro.config.mjs") ||
            rel.endsWith("/astro.config.cjs") ||
            rel.endsWith("/astro.config.js") ||
            rel.endsWith("/astro.config.ts")
        ) {
            hasAstroConfig = true;
        }
    }
    return hasAstroDependency(targetPath) || hasAstroConfig || hasAstroFiles;
}
