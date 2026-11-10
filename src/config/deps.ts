import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { hasCommand } from "../fs/repo";

type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

const prettierPluginsBase = ["prettier-plugin-tailwindcss"];

export type PrettierPluginResult = {
    touchedFiles: string[];
    pluginsAvailable: boolean;
};

function parsePackageManagerField(value: string | undefined): PackageManager | null {
    if (!value) return null;
    const name = value.split("@")[0];
    if (name === "bun" || name === "pnpm" || name === "yarn" || name === "npm") {
        return name;
    }
    return null;
}

function detectPackageManager(targetPath: string, packageJson: Record<string, unknown>): PackageManager {
    const fromField = parsePackageManagerField(
        typeof packageJson.packageManager === "string" ? packageJson.packageManager : undefined
    );
    if (fromField) {
        return fromField;
    }
    if (fs.existsSync(path.join(targetPath, "pnpm-lock.yaml"))) return "pnpm";
    if (fs.existsSync(path.join(targetPath, "yarn.lock"))) return "yarn";
    if (fs.existsSync(path.join(targetPath, "bun.lockb")) || fs.existsSync(path.join(targetPath, "bun.lock"))) {
        return "bun";
    }
    if (fs.existsSync(path.join(targetPath, "package-lock.json"))) return "npm";
    return "bun";
}

function installDevDependencies(targetPath: string, manager: PackageManager, deps: string[]): void {
    if (!hasCommand(manager)) {
        console.error(`warning: ${manager} not found; install ${deps.join(", ")} manually`);
        return;
    }

    const argsByManager: Record<PackageManager, string[]> = {
        bun: ["add", "-d", ...deps],
        pnpm: ["add", "-D", ...deps],
        yarn: ["add", "-D", ...deps],
        npm: ["install", "-D", ...deps],
    };

    execFileSync(manager, argsByManager[manager], { cwd: targetPath, stdio: "inherit" });
}

export function ensurePrettierPlugins(
    targetPath: string,
    presets: Set<string>,
    options: { astro: boolean }
): PrettierPluginResult {
    if (!presets.has("web")) {
        return { touchedFiles: [], pluginsAvailable: false };
    }

    const prettierPlugins = options.astro ? [...prettierPluginsBase, "prettier-plugin-astro"] : prettierPluginsBase;

    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        console.error("warning: package.json missing; skipping prettier plugin install");
        return { touchedFiles: [], pluginsAvailable: false };
    }

    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const devDeps = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
    const deps = (pkg.dependencies as Record<string, string> | undefined) ?? {};

    const missing = prettierPlugins.filter((plugin) => !devDeps[plugin] && !deps[plugin]);
    if (missing.length === 0) {
        return { touchedFiles: [], pluginsAvailable: true };
    }

    const manager = detectPackageManager(targetPath, pkg);
    console.log(`install: ${missing.join(", ")} (${manager})`);
    if (!hasCommand(manager)) {
        console.error(`warning: ${manager} not found; skipping prettier plugin update`);
        return { touchedFiles: [], pluginsAvailable: false };
    }
    installDevDependencies(targetPath, manager, missing);

    const touched = ["package.json"];
    const lockCandidates = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock"];
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

export function removeMarkdownlintDependencies(targetPath: string): string[] {
    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) return [];
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const obsolete = ["markdownlint", "markdownlint-cli", "markdownlint-cli2"].filter(
        (name) => pkg.dependencies?.[name] || pkg.devDependencies?.[name]
    );
    if (!obsolete.length) return [];
    const manager = detectPackageManager(targetPath, pkg);
    if (!hasCommand(manager)) throw new Error(`${manager} is required to remove Markdownlint dependencies`);
    execFileSync(manager, [manager === "npm" ? "uninstall" : "remove", ...obsolete, "--ignore-scripts"], {
        cwd: targetPath,
        stdio: "inherit",
    });
    return ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock"]
        .map((file) => path.join(targetPath, file))
        .filter((file) => fs.existsSync(file));
}
