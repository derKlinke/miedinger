# format-configs

Shared formatter configs for all my projects. One place to keep them tidy, easy to update, and nice to reuse.

## What’s inside

- Swift: `.swiftlint.yml`, `.swiftformat`
- C/C++/Obj-C: `.clang-format`
- Markdown: `.markdownlint.json`, `.markdownlintignore`
- Web: `.prettierrc.json`, `.prettierignore`
- SQL: `.sqlfluff`

## Quick start

### Option A: use as a submodule

```sh
git submodule add /Users/fabianklinke/Developer/format-configs tools/format-configs
```

### Option B: clone anywhere

```sh
git clone /Users/fabianklinke/Developer/format-configs
```

### Link configs into a project

From your project root:

```sh
/Users/fabianklinke/Developer/format-configs/install.sh
```

Or pass a target directory:

```sh
/Users/fabianklinke/Developer/format-configs/install.sh /path/to/project
```

Use `--force` to replace existing files:

```sh
/Users/fabianklinke/Developer/format-configs/install.sh --force /path/to/project
```

If you prefer the underlying script, it’s at `scripts/link-configs.sh`.

## Updating

- If cloned: `git pull`
- If submodule: `git submodule update --remote`

Re-run the install script if you want to refresh symlinks after changes.

## Structure

- `configs/` — shared dotfiles
- `scripts/` — helper scripts (symlink setup)

## License

MIT. See `LICENSE`.
