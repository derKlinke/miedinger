import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { stringify } from "yaml";
import { hasCommand } from "./fs/repo";

type PrekHook = {
    id: string;
    name: string;
    entry: string;
    language: "system";
    files?: string;
    exclude?: string;
    pass_filenames?: boolean;
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
            entry: "npx --yes prettier --config .prettierrc.json --write",
            language: "system",
            files: "\\.(js|jsx|ts|tsx|json|jsonc|yaml|yml|css|scss|html|vue|svelte|astro)$",
            exclude: "^\\.pre-commit-config\\.ya?ml$",
        });
    }

    if (presets.has("markdown")) {
        addHook({
            id: "markdownlint",
            name: "markdownlint",
            entry: "npx --yes -p markdownlint-cli markdownlint --config .markdownlint.json",
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
            pass_filenames: true,
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

export function maybeUpdatePrekConfig(targetPath: string, presets: Set<string>): string | null {
    const config = buildPrekConfig(presets);
    if (!config) {
        return null;
    }

    const configPath = path.join(targetPath, ".pre-commit-config.yaml");
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
