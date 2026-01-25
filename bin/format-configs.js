#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const cp = require("child_process");

const repoUrlDefault = process.env.FORMAT_CONFIGS_REPO || "https://github.com/derKlinke/format-configs";
const repoRefDefault = process.env.FORMAT_CONFIGS_REF || "main";

const args = process.argv.slice(2);
let targetDir = "";
let force = false;
let mode = "detect";
let interactive = false;
let onlyTokens = [];
let repoUrl = repoUrlDefault;
let repoRef = repoRefDefault;

function usage() {
  console.log(`Usage: format-configs [options] [target-dir]

Copies shared formatter configs into target directory (no symlinks).
Defaults to current working directory.

Options:
  --detect           Auto-detect which configs to install (default)
  --interactive      Select configs from a list
  --only LIST        Comma/space-separated presets or filenames
  --list             Show available presets and files
  --force            Overwrite existing files
  --repo URL         Override repo URL for download mode
  --ref REF          Override git ref for download mode
  -h, --help         Show help

Presets: swift, web, markdown, clang, sql`);
}

function listPresets() {
  console.log(`Presets:
  swift     -> .swiftformat, .swiftlint.yml
  web       -> .prettierrc.json, .prettierignore
  markdown  -> .markdownlint.json, .markdownlintignore
  clang     -> .clang-format
  sql       -> .sqlfluff

Files:
  .clang-format
  .markdownlint.json
  .markdownlintignore
  .prettierrc.json
  .prettierignore
  .sqlfluff
  .swiftformat
  .swiftlint.yml`);
}

function parseOnly(value) {
  const raw = value.split(/[ ,]+/).filter(Boolean);
  return raw;
}

let i = 0;
while (i < args.length) {
  const arg = args[i];
  switch (arg) {
    case "--detect":
      mode = "detect";
      i += 1;
      break;
    case "--interactive":
      mode = "interactive";
      interactive = true;
      i += 1;
      break;
    case "--only":
      mode = "only";
      i += 1;
      if (i >= args.length) {
        console.error("error: --only requires a value");
        process.exit(1);
      }
      onlyTokens = parseOnly(args[i]);
      i += 1;
      break;
    case "--list":
      listPresets();
      process.exit(0);
      break;
    case "--force":
      force = true;
      i += 1;
      break;
    case "--repo":
      i += 1;
      if (i >= args.length) {
        console.error("error: --repo requires a value");
        process.exit(1);
      }
      repoUrl = args[i];
      i += 1;
      break;
    case "--ref":
      i += 1;
      if (i >= args.length) {
        console.error("error: --ref requires a value");
        process.exit(1);
      }
      repoRef = args[i];
      i += 1;
      break;
    case "-h":
    case "--help":
      usage();
      process.exit(0);
      break;
    default:
      if (!targetDir) {
        targetDir = arg;
        i += 1;
      } else {
        console.error(`error: unexpected argument: ${arg}`);
        usage();
        process.exit(1);
      }
      break;
  }
}

if (!targetDir) {
  targetDir = process.cwd();
}

function resolveConfigDir() {
  const localConfigs = path.resolve(__dirname, "..", "configs");
  if (fs.existsSync(localConfigs)) {
    return { dir: localConfigs, cleanup: null };
  }

  if (process.env.FORMAT_CONFIGS_DIR && fs.existsSync(process.env.FORMAT_CONFIGS_DIR)) {
    return { dir: process.env.FORMAT_CONFIGS_DIR, cleanup: null };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "format-configs-"));
  const archivePath = path.join(tmpDir, "format-configs.tgz");
  const url = `${repoUrl}/archive/${repoRef}.tar.gz`;

  cp.execFileSync("curl", ["-fsSL", url, "-o", archivePath], { stdio: "inherit" });
  cp.execFileSync("tar", ["-xzf", archivePath, "-C", tmpDir], { stdio: "inherit" });

  const entries = fs.readdirSync(tmpDir).filter((entry) => entry.startsWith("format-configs-"));
  if (entries.length === 0) {
    console.error("error: failed to extract format-configs");
    process.exit(1);
  }

  const extracted = path.join(tmpDir, entries[0]);
  const dir = path.join(extracted, "configs");
  if (!fs.existsSync(dir)) {
    console.error(`error: config dir not found: ${dir}`);
    process.exit(1);
  }

  const cleanup = () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", () => process.exit(130));

  return { dir, cleanup };
}

function isGitRepo(dir) {
  try {
    const result = cp.execFileSync("git", ["-C", dir, "rev-parse", "--is-inside-work-tree"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    return String(result).trim() === "true";
  } catch {
    return false;
  }
}

function listGitFiles(dir) {
  const output = cp.execFileSync("git", ["-C", dir, "ls-files"], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(output)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((file) => path.join(dir, file));
}

function listFilesRecursive(dir) {
  const results = [];
  const skipNames = new Set([".git", "node_modules", ".build", "DerivedData", "external"]);

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skipNames.has(entry.name)) {
        continue;
      }
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

function detectPresets(files) {
  let hasSwift = false;
  let hasWeb = false;
  let hasMarkdown = false;
  let hasClang = false;
  let hasSql = false;

  for (const file of files) {
    const rel = file.toLowerCase();
    if (rel.endsWith(".swift") || rel.endsWith("/package.swift") || rel.includes(".xcodeproj/") || rel.includes(".xcworkspace/")) {
      hasSwift = true;
    }
    if (
      rel.endsWith(".js") ||
      rel.endsWith(".ts") ||
      rel.endsWith(".jsx") ||
      rel.endsWith(".tsx") ||
      rel.endsWith(".css") ||
      rel.endsWith(".scss") ||
      rel.endsWith(".html") ||
      rel.endsWith(".vue") ||
      rel.endsWith(".svelte") ||
      rel.endsWith(".astro") ||
      rel.endsWith("/package.json") ||
      rel.endsWith("/pnpm-lock.yaml") ||
      rel.endsWith("/yarn.lock") ||
      rel.endsWith("/bun.lockb") ||
      rel.endsWith("/deno.json") ||
      rel.endsWith("/deno.jsonc")
    ) {
      hasWeb = true;
    }
    if (rel.endsWith(".md") || rel.endsWith(".mdx")) {
      hasMarkdown = true;
    }
    if (
      rel.endsWith(".c") ||
      rel.endsWith(".h") ||
      rel.endsWith(".cpp") ||
      rel.endsWith(".hpp") ||
      rel.endsWith(".m") ||
      rel.endsWith(".mm") ||
      rel.endsWith(".cc") ||
      rel.endsWith(".cxx") ||
      rel.endsWith(".hxx")
    ) {
      hasClang = true;
    }
    if (rel.endsWith(".sql")) {
      hasSql = true;
    }
  }

  const presets = [];
  if (hasSwift) presets.push("swift");
  if (hasWeb) presets.push("web");
  if (hasMarkdown) presets.push("markdown");
  if (hasClang) presets.push("clang");
  if (hasSql) presets.push("sql");

  return presets;
}

function promptInteractive(choices) {
  return new Promise((resolve) => {
    const readline = require("readline");
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

const presetFiles = {
  swift: [".swiftformat", ".swiftlint.yml"],
  web: [".prettierrc.json", ".prettierignore"],
  markdown: [".markdownlint.json", ".markdownlintignore"],
  clang: [".clang-format"],
  sql: [".sqlfluff"],
};

function expandToken(token) {
  if (presetFiles[token]) {
    return presetFiles[token];
  }
  return [token];
}

async function main() {
  const targetPath = path.resolve(targetDir);
  if (!fs.existsSync(targetPath)) {
    console.error(`error: target dir not found: ${targetPath}`);
    process.exit(1);
  }

  const { dir: configDir } = resolveConfigDir();
  if (!fs.existsSync(configDir)) {
    console.error(`error: config dir not found: ${configDir}`);
    process.exit(1);
  }

  let tokens = [];

  if (mode === "detect") {
    const files = isGitRepo(targetPath) ? listGitFiles(targetPath) : listFilesRecursive(targetPath);
    tokens = detectPresets(files);
  } else if (mode === "interactive") {
    const selection = await promptInteractive(["swift", "web", "markdown", "clang", "sql", "all", "none"]);
    if (selection.includes("all")) {
      tokens = ["swift", "web", "markdown", "clang", "sql"];
    } else if (selection.includes("none")) {
      tokens = [];
    } else {
      tokens = selection;
    }
  } else if (mode === "only") {
    tokens = onlyTokens;
  }

  if (tokens.length === 0) {
    console.log("no configs selected");
    return;
  }

  const fileSet = new Set();
  tokens.forEach((token) => expandToken(token).forEach((file) => fileSet.add(file)));

  for (const file of fileSet) {
    const src = path.join(configDir, file);
    const dst = path.join(targetPath, file);

    if (!fs.existsSync(src)) {
      console.error(`skip: missing ${src}`);
      continue;
    }

    if (fs.existsSync(dst) && !force) {
      console.error(`skip: exists ${dst} (use --force)`);
      continue;
    }

    fs.copyFileSync(src, dst);
    console.log(`install: ${dst}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
