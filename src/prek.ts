import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { stringify } from "yaml";
import { hasCommand } from "./fs/repo";
import { PrekMode } from "./types";

type PrekHook = {
    id: string;
    name: string;
    entry: string;
    language: "system";
    files?: string;
    exclude?: string;
};

function buildPrekConfig(presets: Set<string>): string | null {
    if (presets.size === 0) {
        return null;
    }

    const hooks: PrekHook[] = [];
    const addHook = (hook: PrekHook): void => {
        hooks.push(hook);
    };

    if (presets.has("web")) {
        addHook({
            id: "prettier",
            name: "prettier",
            entry: "npx --yes prettier --config .prettierrc.json --ignore-path .prettierignore --write",
            language: "system",
            files: "\\.(js|jsx|ts|tsx|json|jsonc|yaml|yml|css|scss|html|vue|svelte|astro)$",
            exclude: "^\\.pre-commit-config\\.ya?ml$",
        });
    }

    if (presets.has("markdown")) {
        addHook({
            id: "markdownlint",
            name: "markdownlint",
            entry: "npx --yes -p markdownlint-cli markdownlint --config .markdownlint.json --ignore-path .markdownlintignore",
            language: "system",
            files: "\\.(md|mdx)$",
        });
    }

    if (presets.has("swift")) {
        addHook({
            id: "swiftformat",
            name: "swiftformat",
            entry: "swiftformat",
            language: "system",
            files: "\\.(swift)$",
        });
        addHook({
            id: "swiftlint",
            name: "swiftlint",
            entry: "swiftlint lint --config .swiftlint.yml --force-exclude --reporter github-actions-logging",
            language: "system",
            files: "\\.(swift)$",
        });
    }

    if (presets.has("clang")) {
        addHook({
            id: "clang-format",
            name: "clang-format",
            entry: "clang-format -i",
            language: "system",
            files: "\\.(c|cc|cpp|cxx|h|hh|hpp|hxx|m|mm)$",
        });
    }

    if (presets.has("sql")) {
        addHook({
            id: "sqlfluff",
            name: "sqlfluff",
            entry: "sqlfluff format",
            language: "system",
            files: "\\.(sql)$",
            exclude: "(^|/)migrations/",
        });
    }

    if (hooks.length === 0) {
        return null;
    }

    const config = { repos: [{ repo: "local", hooks }] };
    const yaml = stringify(config, { indent: 2, lineWidth: 0 });
    return `# format-configs\n${yaml}`;
}

export function maybeUpdatePrekConfig(
    targetPath: string,
    presets: Set<string>,
    options: { prekMode: PrekMode; force: boolean }
): string | null {
    if (options.prekMode === "skip") {
        return null;
    }

    const config = buildPrekConfig(presets);
    if (!config) {
        return null;
    }

    const configPath = path.join(targetPath, ".pre-commit-config.yaml");
    const existing = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    const isManaged = existing.split(/\r?\n/)[0]?.trim() === "# format-configs";
    if (existing && !options.force && !isManaged) {
        console.error(`skip: exists ${configPath} (use --force)`);
        return null;
    }
    fs.writeFileSync(configPath, config, "utf8");

    if (hasCommand("prek")) {
        try {
            execFileSync("prek", ["install"], { cwd: targetPath, stdio: "inherit" });
        } catch (err) {
            console.error("warning: failed to run prek install");
            if (err instanceof Error) {
                console.error(err.message);
            }
        }
    } else {
        console.error("skip: prek not installed (install via brew or cargo)");
    }
    return configPath;
}
