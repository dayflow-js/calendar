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
    echo "  ./scripts/publish.sh all          Publish all packages"
    echo "  ./scripts/publish.sh main         Publish core + react + vue + svelte"
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

# ---------- Calculation ----------
STEP=1
case "$MODE" in
    main)    TOTAL=$(( ${#MAIN_PKGS[@]} * 2 )) ;;
    angular) TOTAL=2 ;;
    all)     TOTAL=$(( ${#MAIN_PKGS[@]} * 2 + 2 )) ;;
esac

# ---------- Build Functions ----------
build_pkg() {
    local name=$1
    step "Building packages/$name"
    if ! pnpm --filter "@dayflow/$name" run build > /dev/null; then
        err "Build failed for $name"
    fi
    ok "packages/$name built"
}

publish_pkg() {
    local name=$1
    local dir=$2
    step "Publishing @dayflow/$name"
    
    local version=$(node -e "console.log(require('$dir/package.json').version)")
    echo -e "  version: ${BOLD}$version${NC}"

    # Check if already published
    if [ -z "$DRY_RUN" ] && npm view "@dayflow/$name@$version" version &>/dev/null; then
        warn "@dayflow/$name@$version already exists on npm — skipping"
        return 0
    fi

    if ! (cd "$dir" && npm publish --access public $DRY_RUN); then
        err "Failed to publish @dayflow/$name"
    fi
    ok "@dayflow/$name published"
}

# ---------- Execution ----------

# 1. Build Phase
if [ "$SKIP_BUILD" = false ]; then
    if [[ "$MODE" == "all" || "$MODE" == "main" ]]; then
        for pkg in "${MAIN_PKGS[@]}"; do build_pkg "$pkg"; done
    fi
    if [[ "$MODE" == "all" || "$MODE" == "angular" ]]; then
        build_pkg "angular"
    fi
else
    warn "Skipping build (--skip-build)"
    # Fast forward step counter
    case "$MODE" in
        main) STEP=$(( ${#MAIN_PKGS[@]} + 1 )) ;;
        angular) STEP=2 ;;
        all) STEP=$(( ${#MAIN_PKGS[@]} + 2 )) ;;
    esac
fi

# 2. Publish Phase
if [[ "$MODE" == "all" || "$MODE" == "main" ]]; then
    for pkg in "${MAIN_PKGS[@]}"; do
        publish_pkg "$pkg" "$ROOT/packages/$pkg"
    done
fi

if [[ "$MODE" == "all" || "$MODE" == "angular" ]]; then
    publish_pkg "angular" "$ROOT/packages/angular/dist"
fi

# ---------- Git Tagging ----------
if [ -z "$DRY_RUN" ] && [ "$MODE" == "all" ]; then
    VERSION=$(node -e "console.log(require('$ROOT/packages/core/package.json').version)")
    if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
        echo -e "\n${YELLOW}🏷️  Creating git tag v$VERSION...${NC}"
        git tag "v$VERSION"
        ok "Tag v$VERSION created"
    fi
fi

echo -e "\n${GREEN}${BOLD}Done!${NC}"
if [ -n "$DRY_RUN" ]; then
    warn "This was a dry run. No actual publish occurred."
fi
