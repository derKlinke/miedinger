import * as readline from "readline";

export function promptInteractive(choices: string[]): Promise<string[]> {
    return new Promise((resolve) => {
        console.log("Select configs to install (space-separated numbers):");
        choices.forEach((choice, idx) => {
            console.log(`  ${idx + 1}) ${choice}`);
        });

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question("", (answer: string) => {
            rl.close();
            const tokens = answer
                .trim()
                .split(/[ ,]+/)
                .filter(Boolean)
                .map((value: string) => Number(value))
                .filter(
                    (value: number) =>
                        Number.isFinite(value) && value >= 1 && value <= choices.length
                )
                .map((value: number) => choices[value - 1]);

            resolve(tokens);
        });
    });
}
