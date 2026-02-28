#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ---------- Usage ----------
usage() {
    echo -e "${BOLD}Usage:${NC}"
    echo "  ./scripts/publish.sh all          Publish all packages (core, adapters, plugins)"
    echo "  ./scripts/publish.sh main         Publish core + react + vue + svelte"
    echo "  ./scripts/publish.sh plugins      Publish all plugins"
    echo "  ./scripts/publish.sh angular      Publish angular only"
    echo ""
    echo "Options:"
    echo "  --dry-run      Run npm publish with --dry-run (no actual publish)"
    echo "  --skip-build   Skip the build step"
    exit 0
}

# ---------- Parse args ----------
MODE="all"
DRY_RUN=""
SKIP_BUILD=false

for arg in "$@"; do
    case "$arg" in
        main) MODE="main" ;;
        plugins) MODE="plugins" ;;
        angular) MODE="angular" ;;
        all) MODE="all" ;;
        --dry-run) DRY_RUN="--dry-run" ;;
        --skip-build) SKIP_BUILD=true ;;
        -h|--help) usage ;;
    esac
done

step() { echo -e "\n${CYAN}${BOLD}[$STEP/$TOTAL] $1${NC}"; STEP=$((STEP + 1)); }
ok() { echo -e "${GREEN} ✓ $1${NC}"; }
err() { echo -e "${RED} ✗ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW} ⚠ $1${NC}"; }

# ---------- Pre-flight checks ----------
echo -e "${BOLD}Pre-flight checks${NC}"

# Check npm login
if ! npm whoami &>/dev/null; then
    err "Not logged in to npm. Run 'npm login' first."
fi
NPM_USER=$(npm whoami)
ok "Logged in as ${BOLD}$NPM_USER${NC}"

# Check git status
if [ -z "$DRY_RUN" ] && [ -n "$(git status --porcelain)" ]; then
    warn "Working tree is not clean. Consider committing changes first."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then err "Publish aborted."; fi
fi

# ---------- Define Packages ----------
MAIN_PKGS=(core react vue svelte)
PLUGIN_DIRS=(drag keyboard-shortcuts localization sidebar)

# Function to map directory names to package names
get_plugin_package_name() {
    case "$1" in
        "drag") echo "plugin-drag" ;;
        "keyboard-shortcuts") echo "plugin-keyboard-shortcuts" ;;
        "localization") echo "plugin-localization" ;;
        "sidebar") echo "plugin-sidebar" ;;
        *) echo "plugin-$1" ;;
    esac
}

# ---------- Calculation ----------
STEP=1
case "$MODE" in
    main)    TOTAL=$(( ${#MAIN_PKGS[@]} * 2 )) ;;
    angular) TOTAL=2 ;;
    plugins) TOTAL=$(( ${#PLUGIN_DIRS[@]} * 2 )) ;;
    all)     TOTAL=$(( ${#MAIN_PKGS[@]} * 2 + ${#PLUGIN_DIRS[@]} * 2 + 2 )) ;;
esac

# ---------- Build Functions ----------
build_pkg() {
    local name=$1 # This should be the @dayflow/ package name part
    local display_path=$2
    local dir="$ROOT/$display_path"

    step "Building $display_path"
    
    # Ensure LICENSE exists
    if [ ! -f "$dir/LICENSE" ]; then
        cp "$ROOT/LICENSE" "$dir/LICENSE"
    fi

    # Do not overwrite README.md if it already exists, 
    # as they are manually managed and framework-specific.
    if [ ! -f "$dir/README.md" ]; then
        # Transform README.md: Replace relative image paths with absolute GitHub URLs
        # Example: ./assets/images/ -> https://raw.githubusercontent.com/dayflow-js/calendar/main/assets/images/
        sed 's|(\./assets/images/|(https://raw.githubusercontent.com/dayflow-js/calendar/main/assets/images/|g' "$ROOT/README.md" > "$dir/README.md"
    fi

    if ! pnpm --filter "@dayflow/$name" run build > /dev/null; then
        err "Build failed for $name"
    fi
    ok "$display_path built"
}

publish_pkg() {
    local name=$1 # This should be the @dayflow/ package name part
    local dir=$2
    step "Publishing @dayflow/$name"
    
    local version=$(node -e "console.log(require('$dir/package.json').version)")
    echo -e "  version: ${BOLD}$version${NC}"

    # Check if already published
    if npm view "@dayflow/$name@$version" version &>/dev/null; then
        warn "@dayflow/$name@$version already exists on npm — skipping"
        return 0
    fi

    # SPECIAL HANDLING FOR ANGULAR DIST
    # ng-packagr doesn't resolve workspace:* protocols and may produce incorrect
    # export conditions. We patch dist/package.json before publishing.
    if [[ "$dir" == *"packages/angular/dist" ]]; then
        local core_version=$(node -e "console.log(require('$ROOT/packages/core/package.json').version)")
        echo "  Patching Angular dist/package.json (core: $core_version)..."

        node -e "
          const fs = require('fs');
          const pkg = JSON.parse(fs.readFileSync('$dir/package.json', 'utf8'));

          // Replace workspace:* with actual core version
          for (const section of ['peerDependencies', 'dependencies', 'optionalDependencies']) {
            if (pkg[section]) {
              for (const dep of Object.keys(pkg[section])) {
                if (pkg[section][dep] === 'workspace:*') pkg[section][dep] = '$core_version';
              }
            }
          }

          // Add 'import' condition if missing (required by Vite/esbuild to resolve ESM entry)
          const dot = pkg.exports && pkg.exports['.'];
          if (dot && !dot.import && (dot.default || dot.esm2022)) {
            dot.import = dot.default || dot.esm2022;
          }

          fs.writeFileSync('$dir/package.json', JSON.stringify(pkg, null, 2) + '\n');
        "

        echo "  Detected Angular dist - using npm publish..."
        if ! (cd "$dir" && npm publish --access public $DRY_RUN); then
            err "Failed to publish @dayflow/$name from $dir"
        fi
    else
        if ! (cd "$dir" && pnpm publish --access public --no-git-checks $DRY_RUN); then
            err "Failed to publish @dayflow/$name"
        fi
    fi
    ok "@dayflow/$name published"
}

# ---------- Execution ----------

# 1. Build Phase
if [ "$SKIP_BUILD" = false ]; then
    if [[ "$MODE" == "all" || "$MODE" == "main" ]]; then
        for pkg in "${MAIN_PKGS[@]}"; do build_pkg "$pkg" "packages/$pkg"; done
    fi
    if [[ "$MODE" == "all" || "$MODE" == "plugins" ]]; then
        for dir in "${PLUGIN_DIRS[@]}"; do
            pkg_name=$(get_plugin_package_name "$dir")
            build_pkg "$pkg_name" "packages/plugins/$dir"
        done
    fi
    if [[ "$MODE" == "all" || "$MODE" == "angular" ]]; then
        build_pkg "angular" "packages/angular"
    fi
else
    warn "Skipping build (--skip-build)"
    # Fast forward step counter
    case "$MODE" in
        main)    STEP=$(( ${#MAIN_PKGS[@]} + 1 )) ;;
        angular) STEP=2 ;;
        plugins) STEP=$(( ${#PLUGIN_DIRS[@]} + 1 )) ;;
        all)     STEP=$(( ${#MAIN_PKGS[@]} + ${#PLUGIN_DIRS[@]} + 2 )) ;;
    esac
fi

# 2. Publish Phase
if [[ "$MODE" == "all" || "$MODE" == "main" ]]; then
    for pkg in "${MAIN_PKGS[@]}"; do
        publish_pkg "$pkg" "$ROOT/packages/$pkg"
    done
fi

if [[ "$MODE" == "all" || "$MODE" == "plugins" ]]; then
    for dir in "${PLUGIN_DIRS[@]}"; do
        pkg_name=$(get_plugin_package_name "$dir")
        publish_pkg "$pkg_name" "$ROOT/packages/plugins/$dir"
    done
fi

if [[ "$MODE" == "all" || "$MODE" == "angular" ]]; then
    publish_pkg "angular" "$ROOT/packages/angular/dist"
fi

echo -e "\n${GREEN}${BOLD}Done!${NC}"
if [ -n "$DRY_RUN" ]; then
    warn "This was a dry run. No actual publish occurred."
fi
