export type Mode = "detect" | "interactive" | "only";
export type JustMode = "auto" | "force" | "skip";
export type PrekMode = "auto" | "force" | "skip";

export interface CliOptions {
    targetDir: string;
    force: boolean;
    mode: Mode;
    onlyTokens: string[];
    repoUrl: string;
    repoRef: string;
    justMode: JustMode;
    prekMode: PrekMode;
}
