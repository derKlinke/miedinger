const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPrekConfig } = require("../dist/prek.js");

test("buildPrekConfig includes gitleaks for non-empty presets", () => {
    const config = buildPrekConfig(new Set(["web"]));

    assert.ok(config);
    assert.match(config, /id: gitleaks/);
    assert.match(config, /entry: gitleaks git --staged --no-banner --redact/);
    assert.match(config, /pass_filenames: false/);
    assert.match(config, /priority: 10/);
});

test("buildPrekConfig includes deterministic formatter hooks", () => {
    const config = buildPrekConfig(new Set(["web", "markdown", "sql"]));

    assert.ok(config);
    assert.match(
        config,
        /entry: npx --yes prettier --log-level error --config \.prettierrc\.json --ignore-path \.prettierignore --write/
    );
    assert.match(config, /id: prettier[\s\S]*priority: 0/);
    assert.doesNotMatch(config, /markdownlint/);
    assert.equal((config.match(/id: prettier/g) || []).length, 1);
    assert.match(config, /id: sqlfluff[\s\S]*priority: 0/);
});

test("buildPrekConfig returns null for empty presets", () => {
    const config = buildPrekConfig(new Set());
    assert.equal(config, null);
});

test("Markdown-only repositories receive a Prettier hook", () => {
    const { parse } = require("yaml");
    const hooks = parse(buildPrekConfig(new Set(["markdown"]))).repos[0].hooks;
    const hook = hooks.find((hook) => hook.id === "prettier");
    assert.ok(hook);
    assert.ok(new RegExp(hook.files).test("docs/guide.md"));
    assert.ok(new RegExp(hook.files).test("docs/guide.mdx"));
    assert.equal(hooks.length, 2);
});
