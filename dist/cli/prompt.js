"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptInteractive = promptInteractive;
const readline = require("readline");
function promptInteractive(choices) {
    return new Promise((resolve) => {
        console.log("Select configs to install (space-separated numbers):");
        choices.forEach((choice, idx) => {
            console.log(`  ${idx + 1}) ${choice}`);
        });
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question("", (answer) => {
            rl.close();
            const tokens = answer
                .trim()
                .split(/[ ,]+/)
                .filter(Boolean)
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value >= 1 && value <= choices.length)
                .map((value) => choices[value - 1]);
            resolve(tokens);
        });
    });
}
