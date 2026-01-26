#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const args_1 = require("./cli/args");
const app_1 = require("./app");
const repoUrlDefault =
    process.env.MIEDINGER_REPO ||
    process.env.FORMAT_CONFIGS_REPO ||
    "https://github.com/derKlinke/miedinger";
const repoRefDefault = process.env.MIEDINGER_REF || process.env.FORMAT_CONFIGS_REF || "main";
const options = (0, args_1.parseArgs)(process.argv.slice(2), {
    repoUrl: repoUrlDefault,
    repoRef: repoRefDefault,
    cwd: process.cwd(),
});
(0, app_1.runApp)(options).catch((err) => {
    if (err instanceof Error) {
        console.error(err.message);
    } else {
        console.error(err);
    }
    process.exit(1);
});
