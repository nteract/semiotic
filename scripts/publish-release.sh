#!/usr/bin/env bash

set -e

VERSION=$(node -p -e "require('./package.json').version")
RELEASE_TAG="v${VERSION}"
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

if [ -n "$(git status --porcelain)" ]; then
  error "Working tree is not clean. Commit or stash changes before creating a release tag."
  exit 1
fi

git pull --ff-only
npm ci --legacy-peer-deps
npm run release:check

# GitHub Actions is the sole production publisher. It builds one immutable
# archive, validates its exact bytes from clean consumers, publishes it with
# npm provenance, and records the registry integrity before creating the
# GitHub Release. Publishing here would create a second authority/path.
git tag -a "$RELEASE_TAG" -m "release $RELEASE_TAG"
git push origin "$CURRENT_BRANCH"
git push origin "$RELEASE_TAG"

success "pushed $RELEASE_TAG; GitHub Actions will build, attest, and publish $VERSION"
