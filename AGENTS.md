# Repository Guidelines

## Scope

- TypeScript CLI that generates and ships formatter config files.
- `src/`: CLI logic and config generators.
- `configs/`: source formatter presets and config templates.
- `dist/`: compiled CLI artifact (`dist/format-configs.js`), updated from `src/` changes.
- `README.md`, `CHANGELOG.md`, `LICENSE`: package and release docs.

## Package + build flow

- Package manager: `npm`.
- `npm install`
- `npm run build` (compile TS, ensure CLI executable bits)
- `npm run format` (Prettier)
- `npm run format:check` (CI-style format gate)
- Local smoke check: `node dist/format-configs.js --help`

## Coding contracts

- Prettier settings: `configs/.prettierrc.json`  
  (`4-space` indent, semicolons, double quotes, width `120`, `LF`).
- Markdown style: Prettier with two-space indentation and wrapped prose.
- Repo-owned ignore sets are part of the contract: keep `.prettierignore`, `.clang-format-ignore`, `.sqlfluffignore` as
  shipped.
- Naming: `camelCase` identifiers, `PascalCase` types/classes, `kebab-case` filenames.

## Workflow

- Commit format is Conventional Commits.
- Keep config-touching changes in `fix:`/`feat:`.
- If `src/` changes, include regenerated `dist/`.
- PRs should include summary notes.
- Release process is automated by semantic-release; do not manually bump `package.json` version or `CHANGELOG.md`.
