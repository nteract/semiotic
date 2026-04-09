#!/usr/bin/env bash
#
# Rollback a bad npm release by deprecating the version and pointing
# the dist-tag back to the previous good version.
#
# Usage:
#   ./scripts/rollback-release.sh 3.3.0            # deprecate 3.3.0, restore previous latest
#   ./scripts/rollback-release.sh 3.3.0 3.2.3      # deprecate 3.3.0, point latest → 3.2.3
#   ./scripts/rollback-release.sh 3.3.0-beta.1 --tag beta  # for prerelease tags
#
# What this does:
#   1. Deprecates the bad version with a warning message (still installable but shows warning)
#   2. Points the dist-tag back to the specified (or auto-detected) previous version
#   3. Does NOT unpublish — npm unpublish is destructive and has a 72h window
#
# Requires: NPM_TOKEN in env or npm login

set -euo pipefail

RED='\033[31;1m'
GREEN='\033[32;1m'
YELLOW='\033[33;1m'
RESET='\033[0m'

BAD_VERSION="${1:?Usage: rollback-release.sh <bad-version> [good-version] [--tag <tag>]}"
GOOD_VERSION=""
DIST_TAG="latest"

shift
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      DIST_TAG="$2"
      shift 2
      ;;
    *)
      GOOD_VERSION="$1"
      shift
      ;;
  esac
done

PACKAGE="semiotic"

# Auto-detect previous version if not specified
if [ -z "$GOOD_VERSION" ]; then
  echo "Auto-detecting previous version..."
  ALL_VERSIONS=$(npm view "$PACKAGE" versions --json 2>/dev/null)
  if [ -z "$ALL_VERSIONS" ]; then
    echo -e "${RED}Cannot fetch version list from npm${RESET}"
    exit 1
  fi
  # Find the version just before the bad one
  GOOD_VERSION=$(echo "$ALL_VERSIONS" | node -e "
    const versions = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const bad = '${BAD_VERSION}';
    const idx = versions.indexOf(bad);
    if (idx <= 0) { console.error('Cannot find version before ${BAD_VERSION}'); process.exit(1); }
    console.log(versions[idx - 1]);
  ")
  echo "Detected previous version: ${GOOD_VERSION}"
fi

echo ""
echo -e "${YELLOW}Rollback plan:${RESET}"
echo "  Package:     ${PACKAGE}"
echo "  Bad version: ${BAD_VERSION} (will be deprecated)"
echo "  Good version: ${GOOD_VERSION} (${DIST_TAG} tag will point here)"
echo ""
read -p "Proceed? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Step 1: Deprecate the bad version
echo ""
echo "Deprecating ${PACKAGE}@${BAD_VERSION}..."
npm deprecate "${PACKAGE}@${BAD_VERSION}" "This version has been rolled back. Use ${GOOD_VERSION} instead."
echo -e "${GREEN}✓ Deprecated ${BAD_VERSION}${RESET}"

# Step 2: Point dist-tag to previous good version
echo ""
echo "Setting ${DIST_TAG} tag to ${GOOD_VERSION}..."
npm dist-tag add "${PACKAGE}@${GOOD_VERSION}" "${DIST_TAG}"
echo -e "${GREEN}✓ ${DIST_TAG} now points to ${GOOD_VERSION}${RESET}"

# Step 3: Verify
echo ""
echo "Verifying..."
CURRENT=$(npm view "${PACKAGE}@${DIST_TAG}" version 2>/dev/null)
if [ "$CURRENT" = "$GOOD_VERSION" ]; then
  echo -e "${GREEN}✓ Rollback complete. ${PACKAGE}@${DIST_TAG} → ${GOOD_VERSION}${RESET}"
else
  echo -e "${RED}WARNING: ${DIST_TAG} tag shows ${CURRENT}, expected ${GOOD_VERSION}${RESET}"
  echo "  This may be a propagation delay — verify with: npm view ${PACKAGE}@${DIST_TAG} version"
fi

echo ""
echo "Next steps:"
echo "  1. Delete the git tag:  git tag -d v${BAD_VERSION} && git push origin :refs/tags/v${BAD_VERSION}"
echo "  2. Revert the version bump commit if needed"
echo "  3. If within 72h, you can also: npm unpublish ${PACKAGE}@${BAD_VERSION}"
echo "     (but deprecation is usually sufficient — unpublish breaks lockfiles)"
