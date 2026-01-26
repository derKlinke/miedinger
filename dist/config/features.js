"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAstro = detectAstro;
const fs = require("fs");
const path = require("path");
function hasAstroDependency(targetPath) {
    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        return false;
    }
    try {
        const raw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(raw);
        const deps = pkg.dependencies ?? {};
        const devDeps = pkg.devDependencies ?? {};
        return Boolean(deps.astro || devDeps.astro);
    } catch {
        return false;
    }
}
function detectAstro(targetPath, files) {
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
