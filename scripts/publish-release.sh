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

git checkout main
git pull
npm install
npm run build
git tag -a $VERSION -m "release $VERSION"
git push --set-upstream origin $CURRENT_BRANCH
git push --tags

npm publish

success "published $VERSION to npm"
