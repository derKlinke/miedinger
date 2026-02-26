const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPrekConfig } = require("../dist/prek.js");

test("buildPrekConfig includes gitleaks for non-empty presets", () => {
    const config = buildPrekConfig(new Set(["web"]));

    assert.ok(config);
    assert.match(config, /id: gitleaks/);
    assert.match(config, /entry: gitleaks git --staged --no-banner --redact/);
    assert.match(config, /pass_filenames: false/);
});

test("buildPrekConfig returns null for empty presets", () => {
    const config = buildPrekConfig(new Set());
    assert.equal(config, null);
});
