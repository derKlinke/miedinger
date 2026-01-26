"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeUpdatePrekConfig = maybeUpdatePrekConfig;
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const yaml_1 = require("yaml");
const repo_1 = require("./fs/repo");
function buildPrekConfig(presets) {
    if (presets.size === 0) {
        return null;
    }
    const hooks = [];
    const addHook = (hook) => {
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
    const yaml = (0, yaml_1.stringify)(config, { indent: 2, lineWidth: 0 });
    return `# format-configs\n${yaml}`;
}
function maybeUpdatePrekConfig(targetPath, presets) {
    const config = buildPrekConfig(presets);
    if (!config) {
        return null;
    }
    const configPath = path.join(targetPath, ".pre-commit-config.yaml");
    fs.writeFileSync(configPath, config, "utf8");
    if ((0, repo_1.hasCommand)("prek")) {
        try {
            (0, child_process_1.execFileSync)("prek", ["install"], {
                cwd: targetPath,
                stdio: "inherit",
            });
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
