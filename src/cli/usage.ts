export function usage(): void {
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
  --prek             Write .pre-commit-config.yaml (even without a Justfile)
  --no-prek          Skip pre-commit (prek) integration
  --repo URL         Override repo URL for download mode
  --ref REF          Override git ref for download mode
  -h, --help         Show help

Presets: swift, web, markdown, clang, sql`);
}

export function listPresets(): void {
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
