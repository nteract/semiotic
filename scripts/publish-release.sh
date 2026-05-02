#!/usr/bin/env bash

set -e

VERSION=$(node -p -e "require('./package.json').version")
CURRENT_BRANCH="$(git symbolic-ref --short -q HEAD)"

success() {
  echo -e "\033[32;1m$1"
}

error() {
  echo -e "\033[31;1m$1"
}

if [ -z "$CURRENT_BRANCH" ]; then
  error "Not in a branch. Stopping deploy."
  exit 1
fi

if [ -z "$VERSION" ]; then
  error "Unable to get current npm version of this package"
  exit 1
fi

if [ "$CURRENT_BRANCH" != "main" ]; then
  error "Releases must be run from main. Current branch: $CURRENT_BRANCH"
  exit 1
fi

git pull --ff-only
npm install
npm run release:check
git tag -a "$VERSION" -m "release $VERSION"
npm publish
git push origin "$CURRENT_BRANCH"
git push origin "$VERSION"

success "published $VERSION to npm"
