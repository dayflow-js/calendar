#!/bin/bash

# Exit on error
set -e

# Get root directory
ROOT_DIR=$(pwd)

# Function for interactive menu
select_option() {
  local options=("$@")
  local cursor=0
  local count=${#options[@]}
  local ESC=$(printf "\033")

  # Hide cursor
  printf "\033[?25l" >&2

  while true; do
    # Render menu to stderr
    for i in "${!options[@]}"; do
      if [ $i -eq $cursor ]; then
        printf "  \033[32m>\033[0m %s\n" "${options[$i]}" >&2
      else
        printf "    %s\n" "${options[$i]}" >&2
      fi
    done

    # Read key
    IFS= read -rsn1 key < /dev/tty
    if [[ "$key" == "$ESC" ]]; then
      read -rsn2 key < /dev/tty
      if [[ "$key" == "[A" ]]; then # Up
        ((cursor--))
        [ $cursor -lt 0 ] && cursor=$((count - 1))
      elif [[ "$key" == "[B" ]]; then # Down
        ((cursor++))
        [ $cursor -ge $count ] && cursor=0
      fi
    elif [[ "$key" == "" ]]; then # Enter
      break
    fi

    # Move cursor back up to redraw (to stderr)
    printf "\033[%dA" "$count" >&2
  done

  # Show cursor
  printf "\033[?25h" >&2

  # Return result to stdout
  echo "$cursor"
}

echo "------------------------------------------"
echo "Please choose the installation option (Use arrow keys):"

OPTIONS=("Install Core, React only" "Install All")
choice_index=$(select_option "${OPTIONS[@]}")
choice=$(( choice_index + 1 ))

echo "Selected choice: $choice"
echo "------------------------------------------"

PACK_DIRS=()
BUILD_FILTER_STAGE1="--filter @dayflow/ui-context-menu --filter @dayflow/ui-range-picker --filter @dayflow/core"
BUILD_FILTER_STAGE2=""

case $choice in
  1)
    echo "Selected: Core, React only"
    BUILD_FILTER_STAGE2="--filter @dayflow/react"
    PACK_DIRS=(
      "packages/ui/context-menu"
      "packages/ui/range-picker"
      "packages/core"
      "packages/react"
    )
    ;;
  2)
    echo "Selected: Install All"
    BUILD_FILTER_STAGE2="--filter @dayflow/react --filter @dayflow/angular --filter @dayflow/svelte --filter @dayflow/vue --filter @dayflow/plugin-drag --filter @dayflow/plugin-keyboard-shortcuts --filter @dayflow/plugin-localization --filter @dayflow/plugin-sidebar --filter @dayflow/plugin-board"
    PACK_DIRS=(
      "packages/ui/context-menu"
      "packages/ui/range-picker"
      "packages/core"
      "packages/react"
      "packages/angular"
      "packages/svelte"
      "packages/vue"
      "packages/plugins/drag"
      "packages/plugins/keyboard-shortcuts"
      "packages/plugins/localization"
      "packages/plugins/sidebar"
      "packages/plugins/board"
    )
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo "🚀 Building packages with pnpm workspace..."
pnpm $BUILD_FILTER_STAGE1 $BUILD_FILTER_STAGE2 --workspace-concurrency=4 run build

echo "📦 Packing selected packages in parallel..."
PACKS_DIR="$ROOT_DIR/temp/packs"
rm -rf "$PACKS_DIR"
mkdir -p "$PACKS_DIR"

for dir in "${PACK_DIRS[@]}"; do
  (
    if [ -d "$dir" ]; then
      echo "Packing $dir..."
      cd "$ROOT_DIR/$dir"
      pnpm pack --silent
      mv *.tgz "$PACKS_DIR/"
    else
      echo "⚠️ Warning: Directory $dir not found"
    fi
  ) &
done
wait

echo "🧹 Cleaning up website directory..."
cd "$ROOT_DIR/website"
rm -rf node_modules package-lock.json

# Function to find the exact .tgz path (resolving wildcards, picking the latest version)
find_tgz() {
  local pattern=$1
  # Use ls -v for natural version sorting if available, or sort -V
  local tgz=$(ls "$PACKS_DIR"/$pattern 2>/dev/null | sort -V | tail -n 1)
  if [ -n "$tgz" ]; then
    echo "$tgz"
  fi
}

add_to_install_list() {
  local path=$(find_tgz "$1")
  if [ -n "$path" ]; then
    INSTALL_LIST+=("$path")
  else
    echo "⚠️ Warning: No package found matching $1"
  fi
}

INSTALL_LIST=()
case $choice in
  1)
    # UI packages must be installed before core (core depends on them)
    add_to_install_list "dayflow-ui-context-menu-*.tgz"
    add_to_install_list "dayflow-ui-range-picker-*.tgz"
    add_to_install_list "dayflow-core-*.tgz"
    add_to_install_list "dayflow-react-*.tgz"
    ;;
  2)
    # UI packages must be installed before core (core depends on them)
    add_to_install_list "dayflow-ui-context-menu-*.tgz"
    add_to_install_list "dayflow-ui-range-picker-*.tgz"
    # Core and Frameworks
    add_to_install_list "dayflow-core-*.tgz"
    add_to_install_list "dayflow-react-*.tgz"
    add_to_install_list "dayflow-angular-*.tgz"
    add_to_install_list "dayflow-svelte-*.tgz"
    add_to_install_list "dayflow-vue-*.tgz"

    # Plugins
    add_to_install_list "dayflow-plugin-drag-*.tgz"
    add_to_install_list "dayflow-plugin-keyboard-shortcuts-*.tgz"
    add_to_install_list "dayflow-plugin-localization-*.tgz"
    add_to_install_list "dayflow-plugin-sidebar-*.tgz"
    add_to_install_list "dayflow-plugin-board-*.tgz"
    ;;
esac

# Clean up empty values
CLEAN_INSTALL_LIST=()
for item in "${INSTALL_LIST[@]}"; do
  if [ -n "$item" ]; then
    CLEAN_INSTALL_LIST+=("$item")
  fi
done

echo "📥 Installing website dependencies (using npm)..."
# The website uses npm (not part of the pnpm workspace). Using npm install
# ensures a flat node_modules where all transitive deps (e.g. zod required by
# fumadocs-mdx) are directly resolvable — pnpm's non-flat layout breaks this.
npm install

# Install the local .tgz packages on top
if [ ${#CLEAN_INSTALL_LIST[@]} -gt 0 ]; then
  echo "📥 Installing local packages: ${CLEAN_INSTALL_LIST[*]}"
  npm install "${CLEAN_INSTALL_LIST[@]}"
else
  echo "⚠️ Warning: No local packages to install"
fi

echo "✅ Setup complete! You can now run 'npm run dev' inside the website directory."
