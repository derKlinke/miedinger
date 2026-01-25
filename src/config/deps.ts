import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { hasCommand } from "../fs/repo";

type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

const prettierPluginsBase = ["prettier-plugin-tailwindcss"];

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
    if (
        fs.existsSync(path.join(targetPath, "bun.lockb")) ||
        fs.existsSync(path.join(targetPath, "bun.lock"))
    ) {
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
): string[] {
    if (!presets.has("web")) {
        return [];
    }

    const prettierPlugins = options.astro
        ? [...prettierPluginsBase, "prettier-plugin-astro"]
        : prettierPluginsBase;

    const pkgPath = path.join(targetPath, "package.json");
    if (!fs.existsSync(pkgPath)) {
        console.error("warning: package.json missing; skipping prettier plugin install");
        return [];
    }

    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const devDeps = (pkg.devDependencies as Record<string, string> | undefined) ?? {};
    const deps = (pkg.dependencies as Record<string, string> | undefined) ?? {};

    const missing = prettierPlugins.filter(
        (plugin) => !devDeps[plugin] && !deps[plugin]
    );
    if (missing.length === 0) {
        return [];
    }

    const manager = detectPackageManager(targetPath, pkg);
    console.log(`install: ${missing.join(", ")} (${manager})`);
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
    return touched.map((file) => path.join(targetPath, file));
}
