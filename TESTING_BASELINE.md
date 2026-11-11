# Semiotic Testing Baseline

This is orientation material for contributors and release reviewers. It is not a
live release-status ledger. For exact counts and current pass/fail status, run
the package scripts; CI and `package.json` are the source of truth.

## Overview

Semiotic v3 uses a layered testing strategy: fast unit/integration tests via
Vitest, visual regression and browser behavior tests via Playwright, plus
release guardrails for type safety, public surface consistency, SSR alignment,
AI contracts, package contents, and size budgets. Rendering is canvas-first in
the browser, with SVG used for server rendering and hydration handoff.

## Test Coverage Orientation

### Unit and Integration Tests (Vitest)

- **Framework**: Vitest with jsdom where browser APIs are needed.
- **Location**: `src/**/*.test.{ts,tsx,jsx}`.
- **Run command**: `npm test`.
- **Exact count**: emitted by the current test run; avoid hard-coding counts in
  docs.

Key test areas:

- Stream pipeline stores (`PipelineStore`, `OrdinalPipelineStore`,
  `NetworkPipelineStore`).
- Canvas renderers for points, lines, bars, wedges, boxplots, heatmaps, and
  related marks.
- Canvas hit testing across XY, ordinal, network, and geo scenes.
- HOC charts across chart families.
- Coordinated views (`LinkedCharts`, `CategoryColorProvider`, selections).
- Realtime behavior (`BinAccumulator`, decay, pulse, staleness encodings).
- Data pipeline behavior (`DataSourceAdapter`, progressive chunking).
- Validation and diagnostics (`validateProps`, `diagnoseConfig`).
- Serialization (`toConfig`/`fromConfig`, `toURL`/`fromURL`).
- Keyboard navigation, tooltips, annotations, legends, and accessibility
  helpers.
- SSR and hydration behavior for supported chart families.

### Browser and Visual Regression Tests (Playwright)

- **Framework**: Playwright.
- **Read-only run command**: `npm run test:dist` after building dist output.
- **Create missing snapshots intentionally**: `npm run test:visual:bootstrap`.
- **Update existing snapshots intentionally**: `npm run test:visual:update`.

Ordinary local and CI runs use `updateSnapshots: "none"`. A missing baseline
therefore fails without writing into the worktree. Snapshot creation is kept
behind the explicit bootstrap command so every new visual contract can be
reviewed before it is committed.

The only platform baselines are the Linux set (`*-linux.png`), rendered in the
pinned Playwright container that CI uses. There are no macOS baselines, so on a
Mac every platform-specific screenshot assertion fails as a missing snapshot.
For behavior coverage on a Mac, skip the comparisons with
`npx playwright test --ignore-snapshots`. For visual comparison, use the Docker
commands or the CI artifact procedure below. Do not run
`test:visual:bootstrap` or `test:visual:update` outside Linux: they would write
`*-darwin.png` files that nothing reads.

Representative coverage:

| Area                          | Coverage                                                           |
| ----------------------------- | ------------------------------------------------------------------ |
| XY charts                     | Line, area, scatter, bubble, hover, linked states                  |
| Ordinal charts                | Bars, pie, donut, swarm, box, violin, histogram, hover             |
| Network charts                | Force-directed, tree, treemap, circle pack, sankey, chord, hover   |
| Legends and coordinated views | Legend rendering, linked charts, category color, chart grid states |
| SSR parity                    | Server SVG and client canvas baselines for representative charts   |
| Page/load checks              | Browser smoke coverage and error detection                         |

Snapshot baselines are platform-specific, and only Linux ones exist. A change
that alters rendering fails the Ubuntu E2E job against the committed image. The
job passes again only after the Linux baseline is regenerated and committed, so
every visual change appears as an image diff in the pull request.

Regenerate baselines in the pinned container. This needs a running
Docker-compatible runtime:

```sh
# One spec, all three browsers, overwriting existing baselines
npm run test:visual:update:docker -- integration-tests/xy-frame.spec.ts

# The whole suite
npm run test:visual:update:docker -- integration-tests

# Only create baselines that do not exist yet
npm run test:visual:bootstrap:docker -- integration-tests/xy-frame.spec.ts
```

With no spec argument the Docker commands run two default specs, not the whole
suite. Review the changed images with `git diff --stat -- integration-tests`
and an image diff viewer before committing them.

### Refresh Linux Playwright baselines without Docker

macOS cannot faithfully create the Linux browser raster baselines. Docker is not
required, though: when an Ubuntu E2E run fails only because an intentional
visual change made a Linux snapshot stale, download that run's report artifacts
locally and promote their exact `*-actual.png` captures. Each browser job that
fails uploads its own artifact: `playwright-report-chromium`,
`playwright-report-firefox`, and `playwright-report-webkit`.

```sh
# Use the failed Semiotic workflow run ID, not a docs-only or CodeQL run.
RUN_ID=GITHUB_ACTIONS_RUN_ID
ARTIFACT_DIR="$(mktemp -d)"

gh run download "$RUN_ID" --dir "$ARTIFACT_DIR" \
  --name playwright-report-chromium \
  --name playwright-report-firefox \
  --name playwright-report-webkit
```

Each artifact lands in its own directory under `$ARTIFACT_DIR`. Review the
expected, actual, and diff images there first. For the SSR geo trio, promote
only the Linux actual images that correspond to the intended change:

```sh
SNAPSHOTS=integration-tests/ssr-parity.spec.ts-snapshots

for browser in chromium firefox webkit; do
  for chart in choropleth proportional-symbol geo-annotation; do
    actual="$(find "$ARTIFACT_DIR" -type f \
      -path "*SSR-baseline*${chart}-${browser}*/ssr-${chart}-actual.png" \
      -print -quit)"
    test -n "$actual"
    cp "$actual" "$SNAPSHOTS/ssr-${chart}-${browser}-linux.png"
  done
done

git diff --stat -- "$SNAPSHOTS"
```

Do not copy an image rendered on macOS into a Linux path and do not promote an
artifact containing unrelated failures. Commit the reviewed Linux images, then
let the normal Ubuntu E2E run re-verify them. This procedure is also suitable
for another narrowly scoped SSR or visual snapshot family: adjust the filename
loop only after reviewing the artifact paths.

### Release Guardrails

Use current package scripts for the definitive set. Common gates include:

```bash
npm test
npm run typescript
npm run lint
npm run check:file-size
npm run check:chart-specs
npm run check:surface
npm run check:ssr
npm run check:test-quality
npm run check:jsdoc-coverage
npm run check:ai-reference-coverage
npm run check:ai-examples-coverage
npm run check:ai-contracts
npm run check:pack
npm run size
```

## CI Pipeline

GitHub Actions is the release-confidence source. The workflow lints for hard
errors, enforces source file line limits, checks the test-quality baseline and
AI contract freshness, builds the library, builds the MCP server, runs unit
tests, checks types, validates generated/public surfaces, verifies chart and AI
contracts, builds production bundles, checks package contents, enforces bundle
size limits, and runs Playwright/browser coverage.

Treat this section as a map of the testing posture rather than a replacement for
`.github/workflows/node.js.yml`.

## Architecture Notes

- Browser charts render one or more canvas layers, usually a data canvas plus
  optional interaction canvas.
- Server rendering uses SVG output and hydration parity tests for supported
  non-streaming HOCs.
- Playwright helpers should target stable chart readiness signals rather than
  timing assumptions.
- Snapshot baselines vary by operating system and browser. The repository
  tracks the Linux set only.

## Common Commands

```bash
# Unit and integration tests
npm test
npx vitest run --reporter=verbose
npx vitest --coverage

# Browser and visual tests
npm run dist
npm run test:dist
npm run test:visual:bootstrap
npm run test:visual:update

# Benchmarks
npm run bench
npm run bench:baseline
npm run bench:compare

# Other checks
npm run typescript
npm run check:chart-specs
npm run check:surface
npm run check:ssr
npm run check:ai-reference-coverage
npm run lint
```

## Operational Notes

1. Snapshot baselines are OS-specific. macOS and Linux render slightly
   differently, so only Linux baselines exist, and they should be reviewed
   before being committed.
2. Test counts change as coverage grows. Prefer command output over stale count
   claims.
