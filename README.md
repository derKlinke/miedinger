# miedinger

[![npm](https://img.shields.io/npm/v/@derklinke/miedinger)](https://www.npmjs.com/package/@derklinke/miedinger)
[![publish](https://img.shields.io/github/actions/workflow/status/derKlinke/miedinger/publish.yml?label=publish)](https://github.com/derKlinke/miedinger/actions/workflows/publish.yml)

This is my go-to collection of formatter configs that I use across all my projects. It's small, does what it says, and drops right into any repo with a single command. You get the config files, a Justfile recipe, pre-commit hooks, and even a sync workflow to keep things up to date.

Named after Max Miedinger, the designer behind Helvetica. Just like that typeface is timeless and beautiful, I'm aiming for the same kind of clean consistency in my code.

> [!ATTENTION]
> Heads up: this tool is pretty opinionated about cleaning up your repo. It'll remove alternate configs (even in subfolders), overwrite your `format` recipe in Justfile, and replace `.pre-commit-config.yaml` entirely. Only use this if you're cool with that.

## What’s inside

- **Swift**: `.swiftlint.yml`, `.swiftformat`
- **C/C++/Obj-C**: `.clang-format`
- **Markdown**: `.markdownlint.json`
- **Web**: `.prettierrc.json`
- **SQL**: `.sqlfluff`

## Getting started

Just run this and you're done:

```sh
npx @derklinke/miedinger --detect --force
```

Want it to commit the changes automatically? Add `--commit` (only works if your repo is clean).

## Picking what you need

There are a few ways to choose which configs to install:

- **Auto-detect** (default): `--detect` — looks at your repo and figures out what you need
- **Interactive menu**: `--interactive` — shows you a picker to choose manually
- **Specific presets**: `--only swift,web` — just install what you specify
- **See what's available**: `--list` — shows all presets and files

The `--force` flag will overwrite any existing config files without asking.

### How auto-detect works

When you use `--detect`, it looks at what's actually in your repo and picks the right configs for you. If you're in a git repo, it'll use `git ls-files` to scan. Otherwise, it walks the filesystem while skipping the usual suspects (`.git`, `node_modules`, `.build`, `DerivedData`, `external`).

Here's what triggers each preset:

- **Swift**: Any `.swift` files, `Package.swift`, `.xcodeproj`, or `.xcworkspace`
- **Web**: `package.json`, lockfiles, or any `.js/.ts/.jsx/.tsx/.css/.scss/.html/.vue/.svelte/.astro` files
- **Markdown**: `.md` or `.mdx` files
- **C-family**: `.c/.h/.cpp/.hpp/.m/.mm/.cc/.cxx/.hxx` files
- **SQL**: `.sql` files

### What the installer does

Behind the scenes, the installer tidies things up:

- Removes old or alternate config filenames, including duplicates hiding in subfolders
- Keeps one canonical config per tool at your repo root
- Leaves ignore files (`*.ignore`) repo-owned; miedinger does not install or overwrite them
- If you've got a `package.json`, it'll install the Tailwind Prettier plugin (and the Astro plugin if it detects Astro files)
- Auto-commits config changes only if you pass `--commit`
- Sets up SQLFluff to ignore `**/migrations/**` by default (your migrations stay untouched)
- Drops in a GitHub Actions workflow (`.github/workflows/sync-format-configs.yml`) that listens for updates from the miedinger-sync GitHub App

### Justfile integration

If you already have a `Justfile` (or `justfile`), miedinger will take over the `format` recipe and replace any `fmt`/`f` aliases with its own managed block. This way `just format` works the same way in all your repos.

Some handy flags:

- `--just` — creates a new `Justfile` if you don't have one yet
- `--no-just` — skip Justfile stuff entirely
- `--commit` — auto-commits the changes if it's safe to do so

The managed block adds:

- An alias so you can type `just fmt` instead of `just format`
- A `[group('formatting')]` tag to keep things organized
- A `format:` recipe that runs `just --fmt --unstable` before formatting your code

The recipe is smart about what's installed — it only runs the tools you actually have available. Everything's wrapped in `# format-configs` / `# /format-configs` markers so it knows what it's managing.

## Keeping configs in sync (recommended for multi-repo setups)

If you've got multiple repos and want them all to stay in sync, install the [miedinger-sync GitHub App](https://github.com/apps/miedinger-sync). It'll automatically trigger a sync on each repo whenever there's a new release.

The app sends a `repository_dispatch` event to your repos, and the workflow takes care of the rest.

### GitHub Action for syncing

Want to run this in CI? There's a composite action you can use:

```yaml
- name: Sync format configs
  uses: derKlinke/miedinger/.github/actions/sync-format-configs@main
  with:
    mode: detect
    force: "true"
    commit: "true"
    push: "true"
```

Here's what you can configure:

- `mode` — `detect` | `interactive` | `only`
- `only` — comma or space-separated presets (when using `mode: only`)
- `force` — set to `"true"` to overwrite existing files
- `target-dir` — where to install (defaults to `.`)
- `commit` — automatically commit changes
- `push` — push the commit to origin
- `commit-message` — customize the commit message
- `git-user-name`, `git-user-email` — who shows up as the commit author

## How releases work

This repo uses semantic-release to handle everything automatically:

- Figures out version numbers from your commit messages (using Conventional Commits)
- Updates `CHANGELOG.md` and `package.json`
- Tags the release
- Creates GitHub Releases
- Publishes to npm

Every push to `main` kicks off a release (no more PRs for releases).

## Pre-commit hooks

This works with `prek` (which is compatible with pre-commit). To set it up:

```bash
prek install
```

The installer will create a `.pre-commit-config.yaml` based on whichever presets you picked. The hooks are smart — they only run on files you've staged and only use the formatters that make sense for those files. If you've already got `prek` installed, the installer will run `prek install` for you automatically.

## Project structure

- `configs/` — the actual config files that get copied to your repos
- `dist/` — the built CLI (what actually runs)
- `src/` — the TypeScript source code for the CLI

## License

MIT. Check out `LICENSE` for details.
