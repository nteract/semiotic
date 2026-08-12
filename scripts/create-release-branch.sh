#!/usr/bin/env bash

set -eu

BUMP_TYPE="${1:-}"
PUBLIC_NPM_REGISTRY="${SEMIOTIC_NPM_REGISTRY:-https://registry.npmjs.org}"
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

case "$BUMP_TYPE" in
  major|minor|patch) ;;
  *)
    error "Invalid bump type '$BUMP_TYPE'. Use major, minor, or patch."
    exit 1
    ;;
esac

if [ "$CURRENT_BRANCH" != "main" ]; then
  error "Release branches must be created from main. Current branch: $CURRENT_BRANCH"
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  error "Working tree is not clean. Commit or stash changes before creating a release branch."
  exit 1
fi

git pull --ff-only

CURRENT_VERSION="$(node -p "require('./package.json').version")"
VERSION="$(node -e '
  const current = process.argv[1]
  const bump = process.argv[2]
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/.exec(current)
  if (!match) throw new Error(`Unsupported current version: ${current}`)
  let [, major, minor, patch] = match.map(Number)
  if (bump === "major") { major += 1; minor = 0; patch = 0 }
  if (bump === "minor") { minor += 1; patch = 0 }
  if (bump === "patch") patch += 1
  process.stdout.write(`${major}.${minor}.${patch}`)
' "$CURRENT_VERSION" "$BUMP_TYPE")"

echo "==> Verifying CHANGELOG.md has an entry for $VERSION"
# Catches the "shipped without a changelog" mistake — npm page would otherwise
# show no notes for the new version and users have no way to see what changed.
# Use -F (fixed string) so dots in VERSION aren't treated as regex "any char".
# Otherwise "3.4.0" would match "3X4X0" and the gate could be bypassed by a
# malformed heading.
if ! grep -qF "## [$VERSION]" CHANGELOG.md; then
  # Capture before the error call so `set -e` doesn't abort if grep finds
  # nothing (e.g. an empty or malformed CHANGELOG): a non-zero inside a
  # command substitution would short-circuit the whole line.
  LATEST_CHANGELOG_ENTRY="$(grep -E "^## \[" CHANGELOG.md | head -1 || true)"
  error "CHANGELOG.md is missing a '## [$VERSION]' entry. Add one before releasing."
  error "(Existing latest entry: ${LATEST_CHANGELOG_ENTRY:-<none>})"
  exit 1
fi
success "  CHANGELOG.md has an entry for $VERSION"

echo "==> Verifying README.md identifies $VERSION as the current release"
if ! grep -qF "## What's New in $VERSION" README.md; then
  error "README.md must contain the exact heading: ## What's New in $VERSION"
  exit 1
fi
success "  README.md What's New heading identifies $VERSION"

echo "==> Running npm audit (moderate gate)"
# Block the release on any moderate/high/critical vulnerability. Low-severity
# findings are surfaced but do not block unless AUDIT_LEVEL=low is requested.
AUDIT_LEVEL="${AUDIT_LEVEL:-moderate}"
npm ci --registry="$PUBLIC_NPM_REGISTRY"

if ! npm audit --registry="$PUBLIC_NPM_REGISTRY" --audit-level="$AUDIT_LEVEL" >/dev/null 2>&1; then
  error "npm audit reports vulnerabilities at >= $AUDIT_LEVEL severity. Run 'npm audit' to inspect, then 'npm audit fix' (or 'npm audit fix --force' if a breaking bump is intended) before releasing."
  npm audit --registry="$PUBLIC_NPM_REGISTRY" --audit-level="$AUDIT_LEVEL"
  exit 1
fi
success "  npm audit clean at >= $AUDIT_LEVEL via $PUBLIC_NPM_REGISTRY"

if git show-ref --verify --quiet "refs/heads/release-$VERSION"; then
  error "Local branch release-$VERSION already exists."
  exit 1
fi
git checkout -b "release-$VERSION"

echo "==> Bumping package version to $VERSION"
ACTUAL_VERSION="$(npm version --no-git-tag-version "$BUMP_TYPE" | sed 's/^v//')"
if [ "$ACTUAL_VERSION" != "$VERSION" ]; then
  error "npm calculated $ACTUAL_VERSION, expected $VERSION"
  exit 1
fi

echo "==> Synchronizing versioned metadata and production artifacts"
node scripts/sync-release-version.mjs "$VERSION"

echo "==> Comparing visual contracts and bootstrapping missing Linux snapshots"
# The missing-only helper writes genuinely new baselines but still fails on a
# diff against every existing image. The tag workflow reruns the full suite
# with updates disabled in the same pinned Linux rendering environment.
npm run test:visual:bootstrap:docker -- \
  integration-tests/ssr-parity.spec.ts \
  --update-snapshots=missing

npm run check:website-build
npm run build:mcp
npm run docs:ai-surface
npm run docs:package-surface
npm run docs:bundle-sizes
npm run docs:cold-consumer
npm run docs:readme-dashboard
npm run docs:api-surface

# The dashboard generator writes a public docs asset after the first site
# build. Rebuild now so docs/build is fresh before the machine baseline reads
# it; otherwise the baseline collector correctly refuses stale output.
npm run check:website-build

echo "==> Comparing candidate performance before recording exact release baselines"
# The --write commands compare p50 timings against the prior committed
# baselines first and refuse to overwrite them on a measured regression. Static
# artifact drift is printed for review, then the new exact snapshots are
# committed with the release branch for the tag workflow to verify byte-for-byte.
npx playwright install chromium
npm run baseline:machine
npm run baseline:browser

echo "==> Validating the complete release branch before commit/push"
npm run release:check
git diff --check

echo "==> Committing changes"
git add --all
git commit --message "chore(release): adding $VERSION"
git push --set-upstream origin "release-$VERSION"

success "release-$VERSION branch has been pushed"
