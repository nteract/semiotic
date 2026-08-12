#!/usr/bin/env bash

set -eu

CURRENT_BRANCH="$(git symbolic-ref --short -q HEAD)"
PUBLIC_NPM_REGISTRY="${SEMIOTIC_NPM_REGISTRY:-https://registry.npmjs.org}"

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

if [ "$CURRENT_BRANCH" != "main" ]; then
  error "Releases must be run from main. Current branch: $CURRENT_BRANCH"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  error "Working tree is not clean. Commit or stash changes before creating a release tag."
  exit 1
fi

git pull --ff-only
VERSION=$(node -p -e "require('./package.json').version")
RELEASE_TAG="v${VERSION}"
if [ -z "$VERSION" ]; then
  error "Unable to get current npm version of this package"
  exit 1
fi
npm ci --registry="$PUBLIC_NPM_REGISTRY"
npm audit --registry="$PUBLIC_NPM_REGISTRY" --audit-level=moderate
npm run check:mcp-registry-live -- --allow-stale-remote
npm run release:check

if [ -n "$(git status --porcelain)" ]; then
  error "Release validation changed the working tree. Commit regenerated artifacts before tagging."
  git status --short
  exit 1
fi

if ! grep -qF "## [$VERSION]" CHANGELOG.md; then
  error "CHANGELOG.md is missing a '## [$VERSION]' entry."
  exit 1
fi

if git rev-parse --verify --quiet "refs/tags/$RELEASE_TAG" >/dev/null; then
  error "Local tag $RELEASE_TAG already exists."
  exit 1
fi

if [ -n "$(git ls-remote --tags origin "refs/tags/$RELEASE_TAG")" ]; then
  error "Remote tag $RELEASE_TAG already exists."
  exit 1
fi

# GitHub Actions is the sole production publisher. It builds one immutable
# archive, validates its exact bytes from clean consumers, publishes it with
# npm provenance, and records the registry integrity before creating the
# GitHub Release. Publishing here would create a second authority/path.
git tag -a "$RELEASE_TAG" -m "release $RELEASE_TAG"
git push origin "$CURRENT_BRANCH"
git push origin "$RELEASE_TAG"

success "pushed $RELEASE_TAG; GitHub Actions will build, attest, and publish $VERSION"
