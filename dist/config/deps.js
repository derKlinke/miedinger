"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePrettierPlugins = ensurePrettierPlugins;
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const repo_1 = require("../fs/repo");
const prettierPluginsBase = ["prettier-plugin-tailwindcss"];
function parsePackageManagerField(value) {
    if (!value) return null;
    const name = value.split("@")[0];
    if (name === "bun" || name === "pnpm" || name === "yarn" || name === "npm") {
        return name;
    }
    return null;
}
function detectPackageManager(targetPath, packageJson) {
    const fromField = parsePackageManagerField(
        typeof packageJson.packageManager === "string" ? packageJson.packageManager : undefined
    );
    if (fromField) {
        return fromField;
    }
    if (fs.existsSync(path.join(targetPath, "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(targetPath, "yarn.lock"))) return "yarn";
    if (
        fs.existsSync(path.join(targetPath, "bun.lockb")) ||
        fs.existsSync(path.join(targetPath, "bun.lock"))
    ) {
        return "bun";
    }
    if (fs.existsSync(path.join(targetPath, "package-lock.json"))) return "npm";
    return "bun";
}
function installDevDependencies(targetPath, manager, deps) {
    if (!(0, repo_1.hasCommand)(manager)) {
        console.error(`warning: ${manager} not found; install ${deps.join(", ")} manually`);
        return;
    }
    const argsByManager = {
        bun: ["add", "-d", ...deps],
        pnpm: ["add", "-D", ...deps],
        yarn: ["add", "-D", ...deps],
        npm: ["install", "-D", ...deps],
    };
    (0, child_process_1.execFileSync)(manager, argsByManager[manager], {
        cwd: targetPath,
        stdio: "inherit",
    });
}
function ensurePrettierPlugins(targetPath, presets, options) {
    if (!presets.has("web")) {
        return { touchedFiles: [], pluginsAvailable: false };
    }
    const prettierPlugins = options.astro
        ? [...prettierPluginsBase, "prettier-plugin-astro"]
        : prettierPluginsBase;
    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        console.error("warning: package.json missing; skipping prettier plugin install");
        return { touchedFiles: [], pluginsAvailable: false };
    }
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    const devDeps = pkg.devDependencies ?? {};
    const deps = pkg.dependencies ?? {};
    const missing = prettierPlugins.filter((plugin) => !devDeps[plugin] && !deps[plugin]);
    if (missing.length === 0) {
        return { touchedFiles: [], pluginsAvailable: true };
    }
    const manager = detectPackageManager(targetPath, pkg);
    console.log(`install: ${missing.join(", ")} (${manager})`);
    if (!(0, repo_1.hasCommand)(manager)) {
        console.error(`warning: ${manager} not found; skipping prettier plugin update`);
        return { touchedFiles: [], pluginsAvailable: false };
    }
    installDevDependencies(targetPath, manager, missing);
    const touched = ["package.json"];
    const lockCandidates = [
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "bun.lockb",
        "bun.lock",
    ];
    for (const lockfile of lockCandidates) {
        const full = path.join(targetPath, lockfile);
        if (fs.existsSync(full)) {
            touched.push(lockfile);
        }
    }
    return {
        touchedFiles: touched.map((file) => path.join(targetPath, file)),
        pluginsAvailable: true,
    };
}
