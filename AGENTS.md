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
- `npm run format` (Prettier + markdownlint)
- `npm run format:check` (CI-style format gate)
- Local smoke check: `node dist/format-configs.js --help`

## Coding contracts
- Prettier settings: `configs/.prettierrc.json`  
  (`4-space` indent, semicolons, double quotes, width `100`, `LF`).
- Markdown style: `configs/.markdownlint.json`.
- Repo-owned ignore sets are part of the contract: keep `.prettierignore`, `.markdownlintignore`, `.clang-format-ignore`, `.sqlfluffignore` as shipped.
- Naming: `camelCase` identifiers, `PascalCase` types/classes, `kebab-case` filenames.

## Validation policy
- No dedicated test suite in this repo today.
- If adding business logic, add tests and a script entry (e.g., `npm run test`).
- Minimum validation: `npm run build` + `npm run format:check`.

## Workflow
- Commit format is Conventional Commits.
- Keep config-touching changes in `fix:`/`feat:`.
- If `src/` changes, include regenerated `dist/`.
- PRs should include summary + validation notes.
- Release process is automated by semantic-release; do not manually bump `package.json` version or `CHANGELOG.md`.
