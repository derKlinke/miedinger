#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"

repo_url="${FORMAT_CONFIGS_REPO:-https://github.com/derKlinke/format-configs}"
repo_ref="${FORMAT_CONFIGS_REF:-main}"

config_dir=""
tmp_dir=""

target_dir=""
force="false"
mode="detect"
interactive="false"

selected_tokens=()

usage() {
  cat <<'USAGE'
Usage: install-configs.sh [options] [target-dir]

Copies shared formatter configs into target directory (no symlinks).
Defaults to current working directory.

Options:
  --detect           Auto-detect which configs to install (default)
  --interactive      Select configs from a list
  --only LIST        Comma/space-separated presets or filenames
  --list             Show available presets and files
  --force            Overwrite existing files
  --repo URL         Override repo URL for download mode
  --ref REF          Override git ref for download mode
  -h, --help         Show help

Presets: swift, web, markdown, clang, sql
USAGE
}

list_presets() {
  cat <<'LIST'
Presets:
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
  .swiftlint.yml
LIST
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --detect)
      mode="detect"
      shift
      ;;
    --interactive)
      mode="interactive"
      interactive="true"
      shift
      ;;
    --only)
      mode="only"
      shift
      if [[ $# -eq 0 ]]; then
        echo "error: --only requires a value" >&2
        exit 1
      fi
      IFS=', ' read -r -a selected_tokens <<< "$1"
      shift
      ;;
    --list)
      list_presets
      exit 0
      ;;
    --force)
      force="true"
      shift
      ;;
    --repo)
      shift
      repo_url="$1"
      shift
      ;;
    --ref)
      shift
      repo_ref="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${target_dir}" ]]; then
        target_dir="$1"
        shift
      else
        echo "error: unexpected argument: $1" >&2
        usage
        exit 1
      fi
      ;;
  esac
done

if [[ -z "${target_dir}" ]]; then
  target_dir="$(pwd)"
fi

target_dir="$(cd "${target_dir}" && pwd)"

resolve_config_dir() {
  local local_configs="${repo_root}/configs"
  if [[ -d "${local_configs}" ]]; then
    config_dir="${local_configs}"
    return 0
  fi

  if [[ -n "${FORMAT_CONFIGS_DIR:-}" ]] && [[ -d "${FORMAT_CONFIGS_DIR}" ]]; then
    config_dir="${FORMAT_CONFIGS_DIR}"
    return 0
  fi

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "${tmp_dir}"' EXIT

  local archive="${tmp_dir}/format-configs.tgz"
  curl -fsSL "${repo_url}/archive/${repo_ref}.tar.gz" -o "${archive}"
  tar -xzf "${archive}" -C "${tmp_dir}"

  local extracted
  extracted="$(find "${tmp_dir}" -maxdepth 1 -type d -name 'format-configs-*' | head -n 1)"
  if [[ -z "${extracted}" ]]; then
    echo "error: failed to extract format-configs" >&2
    exit 1
  fi

  config_dir="${extracted}/configs"
}

resolve_config_dir

if [[ ! -d "${config_dir}" ]]; then
  echo "error: config dir not found: ${config_dir}" >&2
  exit 1
fi

presets=(swift web markdown clang sql)

preset_files_swift=(.swiftformat .swiftlint.yml)
preset_files_web=(.prettierrc.json .prettierignore)
preset_files_markdown=(.markdownlint.json .markdownlintignore)
preset_files_clang=(.clang-format)
preset_files_sql=(.sqlfluff)

all_files=(
  .clang-format
  .markdownlint.json
  .markdownlintignore
  .prettierrc.json
  .prettierignore
  .sqlfluff
  .swiftformat
  .swiftlint.yml
)

collect_detected_presets() {
  local has_swift="false"
  local has_web="false"
  local has_markdown="false"
  local has_clang="false"
  local has_sql="false"

  local list_cmd
  if git -C "${target_dir}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    list_cmd=(git -C "${target_dir}" ls-files)
  else
    list_cmd=(find "${target_dir}" -type f)
  fi

  while IFS= read -r file; do
    case "${file}" in
      *.swift|*/Package.swift|*.xcodeproj/*|*.xcworkspace/*)
        has_swift="true"
        ;;
      package.json|pnpm-lock.yaml|yarn.lock|bun.lockb|deno.json|deno.jsonc|*.js|*.ts|*.jsx|*.tsx|*.css|*.scss|*.html|*.vue|*.svelte|*.astro)
        has_web="true"
        ;;
      *.md|*.mdx)
        has_markdown="true"
        ;;
      *.c|*.h|*.cpp|*.hpp|*.m|*.mm|*.cc|*.cxx|*.hxx)
        has_clang="true"
        ;;
      *.sql)
        has_sql="true"
        ;;
    esac
  done < <("${list_cmd[@]}")

  detected_presets=()
  if [[ "${has_swift}" == "true" ]]; then detected_presets+=(swift); fi
  if [[ "${has_web}" == "true" ]]; then detected_presets+=(web); fi
  if [[ "${has_markdown}" == "true" ]]; then detected_presets+=(markdown); fi
  if [[ "${has_clang}" == "true" ]]; then detected_presets+=(clang); fi
  if [[ "${has_sql}" == "true" ]]; then detected_presets+=(sql); fi
}

interactive_select() {
  local choices=(swift web markdown clang sql all none)
  echo "Select configs to install (space-separated numbers):"
  local i=1
  for preset in "${choices[@]}"; do
    printf "  %d) %s\n" "${i}" "${preset}"
    i=$((i + 1))
  done
  read -r selection

  local selected=()
  for token in ${selection}; do
    if [[ "${token}" =~ ^[0-9]+$ ]] && (( token >= 1 && token <= ${#choices[@]} )); then
      selected+=("${choices[$((token-1))]}")
    fi
  done

  if [[ " ${selected[*]} " == *" all "* ]]; then
    selected_tokens=(swift web markdown clang sql)
    return 0
  fi

  if [[ " ${selected[*]} " == *" none "* ]]; then
    selected_tokens=()
    return 0
  fi

  selected_tokens=("${selected[@]}")
}

selected_files=()

add_file() {
  local file="$1"
  if [[ -z "${file}" ]]; then
    return 0
  fi
  selected_files+=("${file}")
}

expand_preset() {
  local preset="$1"
  case "${preset}" in
    swift)
      for f in "${preset_files_swift[@]}"; do add_file "${f}"; done
      ;;
    web)
      for f in "${preset_files_web[@]}"; do add_file "${f}"; done
      ;;
    markdown)
      for f in "${preset_files_markdown[@]}"; do add_file "${f}"; done
      ;;
    clang)
      for f in "${preset_files_clang[@]}"; do add_file "${f}"; done
      ;;
    sql)
      for f in "${preset_files_sql[@]}"; do add_file "${f}"; done
      ;;
    *)
      add_file "${preset}"
      ;;
  esac
}

if [[ "${mode}" == "detect" ]]; then
  collect_detected_presets
  for preset in "${detected_presets[@]}"; do
    expand_preset "${preset}"
  done
elif [[ "${mode}" == "interactive" ]]; then
  interactive_select
  for token in "${selected_tokens[@]}"; do
    expand_preset "${token}"
  done
elif [[ "${mode}" == "only" ]]; then
  for token in "${selected_tokens[@]}"; do
    expand_preset "${token}"
  done
fi

if [[ ${#selected_files[@]} -eq 0 ]]; then
  echo "no configs selected"
  exit 0
fi

# Deduplicate (bash 3.2 compatible)
unique_files=()
for file in "${selected_files[@]}"; do
  exists="false"
  for existing in "${unique_files[@]:-}"; do
    if [[ "${existing}" == "${file}" ]]; then
      exists="true"
      break
    fi
  done
  if [[ "${exists}" == "false" ]]; then
    unique_files+=("${file}")
  fi
done

for file in "${unique_files[@]}"; do
  src="${config_dir}/${file}"
  dst="${target_dir}/${file}"

  if [[ ! -e "${src}" ]]; then
    echo "skip: missing ${src}" >&2
    continue
  fi

  if [[ -e "${dst}" ]] && [[ "${force}" != "true" ]]; then
    echo "skip: exists ${dst} (use --force)" >&2
    continue
  fi

  cp -f "${src}" "${dst}"
  echo "install: ${dst}"
done
