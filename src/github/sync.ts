import * as fs from "fs";
import * as path from "path";
import { isGitRepo } from "../fs/repo";

const workflowFile = "sync-format-configs.yml";
const managedHeader = "# format-configs";

function buildWorkflow(): string {
    return [
        managedHeader,
        "name: Sync format configs",
        "on:",
        "  schedule:",
        '    - cron: "0 2 * * *"',
        "  workflow_dispatch:",
        "permissions:",
        "  contents: write",
        "jobs:",
        "  sync:",
        "    runs-on: ubuntu-latest",
        "    steps:",
        "      - uses: actions/checkout@v4",
        "      - uses: derKlinke/miedinger/.github/actions/sync-format-configs@main",
        "        with:",
        "          mode: detect",
        "          force: true",
        "          commit: true",
        "          push: true",
        "",
    ].join("\n");
}

export function maybeUpdateSyncWorkflow(
    targetPath: string,
    options: { force: boolean }
): string | null {
    if (!isGitRepo(targetPath)) {
        return null;
    }

    const workflowsDir = path.join(targetPath, ".github", "workflows");
    const workflowPath = path.join(workflowsDir, workflowFile);
    const content = buildWorkflow();

    if (fs.existsSync(workflowPath) && !options.force) {
        const existing = fs.readFileSync(workflowPath, "utf8");
        const isManaged = existing.split(/\r?\n/)[0]?.trim() === managedHeader;
        if (!isManaged) {
            console.error(`skip: exists ${workflowPath} (use --force)`);
            return null;
        }
    }

    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(workflowPath, content, "utf8");
    console.log(`install: ${workflowPath}`);
    return workflowPath;
}
