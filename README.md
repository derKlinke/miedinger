# format-configs

Shared formatter configs for all my projects. One place to keep them tidy, easy to update, and nice to reuse.

## What’s inside

- Swift: `.swiftlint.yml`, `.swiftformat`
- C/C++/Obj-C: `.clang-format`
- Markdown: `.markdownlint.json`, `.markdownlintignore`
- Web: `.prettierrc.json`, `.prettierignore`
- SQL: `.sqlfluff`

## Quick start

### Option A: curl install (recommended)

From any project root:

```sh
curl -fsSL https://raw.githubusercontent.com/derKlinke/format-configs/main/install.sh | bash
```

Pass options via `bash -s --`:

```sh
curl -fsSL https://raw.githubusercontent.com/derKlinke/format-configs/main/install.sh | \
  bash -s -- --interactive --force
```

### Option B: clone and run

```sh
git clone https://github.com/derKlinke/format-configs.git
/Users/fabianklinke/Developer/format-configs/install.sh
```

Or pass a target directory:

```sh
/Users/fabianklinke/Developer/format-configs/install.sh /path/to/project
```

### Selection

- Auto-detect (default): `--detect`
- Interactive picker: `--interactive`
- Explicit selection: `--only swift,web`
- List presets/files: `--list`

Use `--force` to overwrite existing files.

If you need the underlying script, it’s at `scripts/install-configs.sh`.

## Updating

Re-run the install script to refresh the copied configs.

## Structure

- `configs/` — shared dotfiles
- `scripts/` — helper scripts

## License

MIT. See `LICENSE`.
