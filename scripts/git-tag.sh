#!/bin/bash

# Exit on error
set -e

# Path to the core package.json
CORE_PKG_JSON="packages/core/package.json"

if [ ! -f "$CORE_PKG_JSON" ]; then
  echo "Error: $CORE_PKG_JSON not found."
  exit 1
fi

# Extract version using Node.js
VERSION=$(node -p "require('./$CORE_PKG_JSON').version")

if [ -z "$VERSION" ]; then
  echo "Error: Could not extract version from $CORE_PKG_JSON."
  exit 1
fi

TAG="v$VERSION"

# Check if tag already exists locally
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally."
else
  echo "Creating tag $TAG..."
  git tag "$TAG"
fi

# Check if tag exists on remote
REMOTE_TAG_EXISTS=$(git ls-remote --tags origin "$TAG")

if [ -n "$REMOTE_TAG_EXISTS" ]; then
  echo "Tag $TAG already exists on remote 'origin'."
else
  echo "Pushing tag $TAG to origin..."
  git push origin "$TAG"
  echo "Successfully pushed $TAG to origin."
fi
