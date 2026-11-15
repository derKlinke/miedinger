const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const cli = path.resolve(__dirname, "../dist/format-configs.js");

function setupRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "miedinger-sync-"));
    execFileSync("git", ["init", "--quiet", root]);
    fs.writeFileSync(path.join(root, "README.md"), "# Example\n");
    execFileSync("git", ["-C", root, "add", "README.md"]);
    return root;
}

test("an existing sync workflow that calls the shared action keeps its own runner and checkout", () => {
    const root = setupRepo();
    try {
        const workflowPath = path.join(root, ".github/workflows/sync-format-configs.yml");
        const custom = [
            "# format-configs",
            "jobs:",
            "    sync:",
            "        runs-on: custom-runner",
            "        steps:",
            "            - uses: example/checkout@v9",
            "            - uses: derKlinke/miedinger/.github/actions/sync-format-configs@main",
            "",
        ].join("\n");
        fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
        fs.writeFileSync(workflowPath, custom);
        execFileSync(process.execPath, [cli, "--detect", "--force", root], { stdio: "pipe" });
        assert.equal(fs.readFileSync(workflowPath, "utf8"), custom);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test("a repository without a sync workflow receives one", () => {
    const root = setupRepo();
    try {
        execFileSync(process.execPath, [cli, "--detect", "--force", root], { stdio: "pipe" });
        const workflow = fs.readFileSync(path.join(root, ".github/workflows/sync-format-configs.yml"), "utf8");
        assert.match(workflow, /derKlinke\/miedinger\/\.github\/actions\/sync-format-configs@main/);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
