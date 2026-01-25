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

This repo uses Release Please to:
- infer versions from Conventional Commits
- open a release PR
- tag releases
- create GitHub Releases

Publishing to npm happens on release publish (`release` event). If you prefer manual tagging, run the publish workflow directly.

## Structure

- `configs/` — shared dotfiles
- `bin/` — CLI entrypoint

## License

MIT. See `LICENSE`.
