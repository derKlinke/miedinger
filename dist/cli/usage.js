"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usage = usage;
exports.listPresets = listPresets;
function usage() {
    console.log(`Usage: miedinger [options] [target-dir]

Copies shared formatter configs into target directory (no symlinks).
Defaults to current working directory.

Options:
  --detect           Auto-detect which configs to install (default)
  --interactive      Select configs from a list
  --only LIST        Comma/space-separated presets or filenames
  --list             Show available presets and files
  --force            Overwrite existing files
  --just             Create a Justfile if missing and add format recipe
  --no-just          Skip Justfile integration
  --commit           Auto-commit managed changes when safe
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
  clang     -> .clang-format, .clang-format-ignore
  sql       -> .sqlfluff

Files:
  .clang-format
  .clang-format-ignore
  .markdownlint.json
  .markdownlintignore
  .prettierrc.json
  .prettierignore
  .sqlfluff
  .swiftformat
  .swiftlint.yml`);
}
