#!/usr/bin/env node

import { parseArgs } from "./cli/args";
import { runApp } from "./app";

const repoUrlDefault =
    process.env.FORMAT_CONFIGS_REPO || "https://github.com/derKlinke/format-configs";
const repoRefDefault = process.env.FORMAT_CONFIGS_REF || "main";

const options = parseArgs(process.argv.slice(2), {
    repoUrl: repoUrlDefault,
    repoRef: repoRefDefault,
    cwd: process.cwd(),
});

runApp(options).catch((err: unknown) => {
    if (err instanceof Error) {
        console.error(err.message);
    } else {
        console.error(err);
    }
    process.exit(1);
});
