const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("Markdown migration preserves custom ignores and is repeatable", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "miedinger-markdown-"));
    try {
        fs.writeFileSync(path.join(root, "README.md"), "# Example\n");
        fs.writeFileSync(path.join(root, ".markdownlint.json"), "{}");
        fs.writeFileSync(path.join(root, ".markdownlintignore"), "custom-output/\n");
        fs.writeFileSync(path.join(root, ".prettierignore"), "**/*.md\nrepo-output/\n");
        const run = () =>
            execFileSync(
                process.execPath,
                [path.resolve(__dirname, "../dist/format-configs.js"), "--detect", "--force", "--just", root],
                { env: { ...process.env, PATH: "/usr/bin:/bin" }, stdio: "pipe" }
            );
        run();
        const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
        assert.equal(fs.existsSync(path.join(root, ".markdownlint.json")), false);
        assert.equal(fs.existsSync(path.join(root, ".markdownlintignore")), false);
        assert.match(read(".prettierignore"), /custom-output\//);
        assert.match(read(".prettierignore"), /repo-output\//);
        assert.ok(!read(".prettierignore").includes("**/*.md"));
        assert.equal(JSON.parse(read(".prettierrc.json")).proseWrap, "always");
        assert.match(read("Justfile"), /prettier/);
        assert.doesNotMatch(read("Justfile"), /markdownlint/);
        assert.equal((read(".pre-commit-config.yaml").match(/id: prettier/g) || []).length, 1);
        const before = read("Justfile") + read(".pre-commit-config.yaml") + read(".prettierignore");
        run();
        assert.equal(read("Justfile") + read(".pre-commit-config.yaml") + read(".prettierignore"), before);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
