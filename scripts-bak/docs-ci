#!/usr/bin/env bash

set -e

# UPDATE these values for your project
GITHUB_REPO='emeeks/semiotic'
REPOSITORY=`mktemp -d /tmp/semiotic.XXXXXX`
BUILD_DIR='build'

success() {
  echo -e "\033[32;1m$1"
}

error() {
  echo -e "\033[31;1m$1"
}

if [ "$TRAVIS_BRANCH" == "master" ] && [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
  echo "Deploying documentation"
else
  success "Not building master branch. Skipping deploy."
  exit 0
fi

if [ -z "$GITHUB_TOKEN" ]; then
  error "Environment variable GITHUB_TOKEN does not exist. Stopping deploy."
  exit 1
fi

npm run gh-pages

if [ ! -d $BUILD_DIR ]; then
  error "Build directory does not exist. Stopping deploy."
  exit 1
fi

# serve index as 404 page
cp build/index.html build/404.html

echo "Cloning ${GITHUB_REPO} & applying changes"
git clone --branch gh-pages https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git $REPOSITORY
rsync -rt --del --exclude=".git" $BUILD_DIR/ $REPOSITORY
cd $REPOSITORY

if [ -z "$(git status --porcelain)" ]; then
  success "No documentation changes to publish. Skipping deploy."
  exit 0
fi

echo "Setting up git config"
git config user.name "emeeks"
git config user.email "elijahmeeks@gmail.com"
git add --all -f
git commit -m "docs(travis): publish documentation for $TRAVIS_COMMIT"
echo "Pushing up gh-pages"
git push origin $BRANCH > /dev/null 2>&1

success "Successfully published documentation for commit: $TRAVIS_COMMIT!"
