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

### curl install

```sh
curl -fsSL https://raw.githubusercontent.com/derKlinke/format-configs/main/install.sh | bash
```

Pass options via `bash -s --`:

```sh
curl -fsSL https://raw.githubusercontent.com/derKlinke/format-configs/main/install.sh | \
  bash -s -- --interactive --force
```

### clone and run

```sh
git clone https://github.com/derKlinke/format-configs.git
./format-configs/install.sh
```

Or pass a target directory:

```sh
./format-configs/install.sh /path/to/project
```

## Selection

- Auto-detect (default): `--detect`
- Interactive picker: `--interactive`
- Explicit selection: `--only swift,web`
- List presets/files: `--list`

Use `--force` to overwrite existing files.

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

## Updating

Re-run the installer to refresh copied configs.

## Structure

- `configs/` — shared dotfiles
- `bin/` — CLI entrypoint
- `scripts/` — helper scripts

## License

MIT. See `LICENSE`.
