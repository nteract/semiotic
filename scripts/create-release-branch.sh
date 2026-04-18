#!/usr/bin/env bash

set -e

BUMP_TYPE=$1

git checkout main
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

echo "==> Syncing ai/schema.json version → $VERSION"
# `ai/schema.json` is bundled in the npm package and read by the MCP server
# (ai/mcp-server.ts uses `schema.version` as its advertised version). Keeping
# it pinned to the package version means MCP doesn't lie about what's running
# the moment we ship.
node -e "
  const fs = require('fs');
  const path = 'ai/schema.json';
  const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (schema.version === '$VERSION') {
    console.log('  ai/schema.json already at $VERSION');
  } else {
    schema.version = '$VERSION';
    fs.writeFileSync(path, JSON.stringify(schema, null, 2) + '\n');
    console.log('  ai/schema.json: bumped to $VERSION');
  }
"

echo "==> Verifying CHANGELOG.md has an entry for $VERSION"
# Catches the "shipped without a changelog" mistake — npm page would otherwise
# show no notes for the new version and users have no way to see what changed.
if ! grep -qE "^## \[$VERSION\]" CHANGELOG.md; then
  # Capture before the error call so `set -e` doesn't abort if grep finds
  # nothing (e.g. an empty or malformed CHANGELOG): a non-zero inside a
  # command substitution would short-circuit the whole line.
  LATEST_CHANGELOG_ENTRY="$(grep -E "^## \[" CHANGELOG.md | head -1 || true)"
  error "CHANGELOG.md is missing a '## [$VERSION]' entry. Add one before releasing."
  error "(Existing latest entry: ${LATEST_CHANGELOG_ENTRY:-<none>})"
  exit 1
fi
success "  CHANGELOG.md has an entry for $VERSION"

echo "==> Running npm audit (moderate gate)"
# Block the release on any moderate/high/critical vulnerability. Low-severity
# findings are surfaced but don't block — most are transitive dev-only crypto
# libs reachable via the build chain that can only be cleared with `npm audit
# fix --force` and a breaking change. To clear those intentionally, edit this
# line or override the floor with AUDIT_LEVEL=low/high/critical.
AUDIT_LEVEL="${AUDIT_LEVEL:-moderate}"
if ! npm audit --audit-level="$AUDIT_LEVEL" >/dev/null 2>&1; then
  error "npm audit reports vulnerabilities at >= $AUDIT_LEVEL severity. Run 'npm audit' to inspect, then 'npm audit fix' (or 'npm audit fix --force' if a breaking bump is intended) before releasing."
  npm audit --audit-level="$AUDIT_LEVEL"
  exit 1
fi
success "  npm audit clean at >= $AUDIT_LEVEL"

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
