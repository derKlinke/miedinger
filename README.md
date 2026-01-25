# format-configs

[![npm](https://img.shields.io/npm/v/@derklinke/format-configs)](https://www.npmjs.com/package/@derklinke/format-configs)
[![license](https://img.shields.io/npm/l/@derklinke/format-configs)](LICENSE)
[![release](https://img.shields.io/github/actions/workflow/status/derKlinke/format-configs/publish.yml?label=publish)](https://github.com/derKlinke/format-configs/actions/workflows/publish.yml)

Shared formatter configs for my projects. Small, predictable, and easy to drop into any repo.

## What’s inside

- Swift: `.swiftlint.yml`, `.swiftformat`
- C/C++/Obj-C: `.clang-format`
- Markdown: `.markdownlint.json`, `.markdownlintignore`
- Web: `.prettierrc.json`, `.prettierignore`
- SQL: `.sqlfluff`

## Quick start

### npx / bunx (recommended)

```sh
npx @derklinke/format-configs --detect --force
# or
bunx @derklinke/format-configs --detect --force
```

## Selection

- Auto-detect (default): `--detect`
- Interactive picker: `--interactive`
- Explicit selection: `--only swift,web`
- List presets/files: `--list`

Use `--force` to overwrite existing files.

### Detect mode (how it decides)

Detect looks at your repo and picks presets based on file types it finds.
If the directory is a git repo, it uses `git ls-files`. Otherwise it scans the
filesystem and skips common heavy folders (`.git`, `node_modules`, `.build`,
`DerivedData`, `external`).

Rules:

- **Swift**: `.swift`, `Package.swift`, `.xcodeproj`, `.xcworkspace`
- **Web**: `package.json`, lockfiles, `.js/.ts/.jsx/.tsx`, `.css/.scss`,
  `.html`, `.vue`, `.svelte`, `.astro`
- **Markdown**: `.md`, `.mdx`
- **C-family**: `.c/.h/.cpp/.hpp/.m/.mm/.cc/.cxx/.hxx`
- **SQL**: `.sql`

### Justfile integration

If a `Justfile` (or `justfile`) exists, format-configs will add a standard `format` recipe
when missing, and will update existing `format` recipes to the latest managed block.
This keeps `just format` consistent across repos.

Flags:

- `--just` creates a new `Justfile` if none exists.
- `--no-just` skips Justfile integration entirely.

The managed block includes:

- `alias fmt := format`
- `[group('formatting')]`
- `format:` recipe that runs `just --fmt --unstable` first

The recipe only runs tools that are available (it checks `command -v` where appropriate).
Managed blocks are wrapped in `# format-configs` / `# /format-configs` so updates are safe.

## GitHub Action (sync configs)

Use the composite action to keep configs in sync in CI (and optionally commit updates).

```yaml
- name: Sync format configs
  uses: derKlinke/format-configs/.github/actions/sync-format-configs@main
  with:
    mode: detect
    force: "true"
    commit: "true"
    push: "true"
```

Inputs:

- `mode`: `detect` | `interactive` | `only`
- `only`: comma/space-separated presets or filenames (used with `mode: only`)
- `force`: overwrite existing files
- `target-dir`: default `.`
- `commit`: commit changes if any
- `push`: push commit to origin
- `commit-message`: custom commit message
- `git-user-name`, `git-user-email`: author identity

## Release flow

This repo uses semantic-release to:

- infer versions from Conventional Commits
- update `CHANGELOG.md` and `package.json`
- tag releases
- create GitHub Releases
- publish to npm

Release runs on every push to `main` (and no longer opens release PRs).

## Pre-commit

This repo supports `prek` (pre-commit compatible). To enable:

```
prek install
```

It runs `npm run format` on commit (Prettier + markdownlint).

## Structure

- `configs/` — shared dotfiles
- `dist/` — CLI entrypoint (built)
- `src/` — CLI source

## License

MIT. See `LICENSE`.
