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
        /entry: npx --yes prettier --config \.prettierrc\.json --ignore-path \.prettierignore --write/
    );
    assert.match(
        config,
        /entry: npx --yes -p markdownlint-cli markdownlint --fix --config \.markdownlint\.json --ignore-path \.markdownlintignore/
    );
    assert.match(config, /id: prettier[\s\S]*priority: 0/);
    assert.match(config, /id: markdownlint[\s\S]*priority: 0/);
    assert.match(config, /id: sqlfluff[\s\S]*priority: 0/);
});

test("buildPrekConfig returns null for empty presets", () => {
    const config = buildPrekConfig(new Set());
    assert.equal(config, null);
});
