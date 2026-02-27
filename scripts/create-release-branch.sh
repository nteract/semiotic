#!/usr/bin/env bash

set -e

BUMP_TYPE=$1

git checkout master
git pull
npm install

CURRENT_BRANCH="$(git symbolic-ref --short -q HEAD)"

success() {
  echo -e "\033[32;1m$1"
}

error() {
  echo -e "\033[31;1m$1"
}

if [ -z "$CURRENT_BRANCH" ]; then
  error "Not in a branch. Stopping release."
  exit 1
fi

if [ -z "$BUMP_TYPE" ]; then
  error "Bump type is required. Usage: create-release-branch.sh <major|minor|patch>"
  exit 1
fi

echo "==> Bumping version"
VERSION="$(npm version --no-git-tag-version $BUMP_TYPE | sed 's/v//g')"

echo "==> Cleaning Build directory"
rm -rf ./dist

echo "==> Creating build files"
npm run build

echo "==> Committing changes"

git checkout -b "release-$VERSION"
git add --all
git commit --message "chore(release): adding $VERSION"
git push --set-upstream origin "release-$VERSION"

success "release-$VERSION branch has been pushed"
