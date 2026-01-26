# miedinger

[![npm](https://img.shields.io/npm/v/@derklinke/miedinger)](https://www.npmjs.com/package/@derklinke/miedinger)
[![publish](https://img.shields.io/github/actions/workflow/status/derKlinke/miedinger/publish.yml?label=publish)](https://github.com/derKlinke/miedinger/actions/workflows/publish.yml)

Shared formatter configs for my projects. Small, predictable, and easy to drop into any repo with installer script that installs Justfiles, pre-commit hooks, and an on-demand sync workflow.

The project is named after Max Miedinger, creator of Helvetica. A timeless and beautiful font, something I'd like to achieve in my code.

> [!ATTENTION]
> Destructive by design. Installer removes alternate configs (including in subfolders), overwrites any `format` recipe in your Justfile, and always overwrites `.pre-commit-config.yaml`. Use only if that is acceptable.

## What’s inside

- Swift: `.swiftlint.yml`, `.swiftformat`
- C/C++/Obj-C: `.clang-format`
- Markdown: `.markdownlint.json`, `.markdownlintignore`
- Web: `.prettierrc.json`, `.prettierignore`
- SQL: `.sqlfluff`

## Quick start

### npx / bunx (recommended)

```sh
npx @derklinke/miedinger --detect --force
```

Add `--commit` to auto-commit managed changes when the repo is clean.

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

Installer cleanup:

- Removes legacy/alternate config filenames and duplicates in subfolders.
- Keeps a single canonical config per tool at repo root.
- If `package.json` exists, installs the Tailwind Prettier plugin, and installs the Astro plugin only when Astro files/configs are detected.
- Auto-commits managed config changes only when `--commit` is passed.
- SQLFluff config excludes `**/migrations/**` by default (preserves migrations).
- Adds a GitHub Actions sync workflow (`.github/workflows/sync-format-configs.yml`) that listens for `repository_dispatch` from the GitHub App.

### Justfile integration

If a `Justfile` (or `justfile`) exists, miedinger will replace any existing `format`
recipe and `fmt`/`f` aliases with the managed block. This keeps `just format` consistent
across repos.

Flags:

- `--just` creates a new `Justfile` if none exists.
- `--no-just` skips Justfile integration entirely.
- `--commit` auto-commits managed changes when safe.

The managed block includes:

- `alias fmt := format`
- `[group('formatting')]`
- `format:` recipe that runs `just --fmt --unstable` first

The recipe only runs tools that are available (it checks `command -v` where appropriate).
Managed blocks are wrapped in `# format-configs` / `# /format-configs` (legacy marker for compatibility).

## GitHub App sync (recommended)

For multi-repo setups, install the GitHub App so sync runs on the target repo's CI:
[miedinger-sync GitHub App](https://github.com/apps/miedinger-sync)

The app dispatches `repository_dispatch` events to installed repos on each release.

## GitHub Action (sync configs)

Use the composite action to keep configs in sync in CI (and optionally commit updates).

```yaml
- name: Sync format configs
  uses: derKlinke/miedinger/.github/actions/sync-format-configs@main
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

```bash
prek install
```

Installer always writes a `.pre-commit-config.yaml` based on selected presets.
Hooks run only on staged files and only for relevant formatters.
If `prek` is installed, the installer runs `prek install` automatically.

## Structure

- `configs/` — shared dotfiles
- `dist/` — CLI entrypoint (built)
- `src/` — CLI source

## License

MIT. See `LICENSE`.
