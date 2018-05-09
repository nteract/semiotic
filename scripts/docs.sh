#!/usr/bin/env bash

set -e

BUILD_DIR='build'

success() {
  echo -e "\033[32;1m$1"
}

error() {
  echo -e "\033[31;1m$1"
}

npm run gh-pages

git checkout -B gh-pages
git add -f $BUILD_DIR
git commit -am "Rebuild website"
git filter-branch -f --prune-empty --subdirectory-filter $BUILD_DIR
git push -f origin gh-pages
git checkout -

success "Successfully published documentation!"
