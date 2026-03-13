# Semiotic Testing Baseline

## Overview

Semiotic v3 uses a two-tier testing strategy: fast unit/integration tests via Vitest, and visual regression E2E tests via Playwright. All rendering is canvas-based (not SVG), with each chart rendering a data canvas and sometimes a separate interaction canvas.

## Current Test Status

### Unit & Integration Tests (Vitest) — 1318 tests, 83 suites

- **Framework**: Vitest (with jsdom environment)
- **Test Suites**: 83 passing
- **Total Tests**: 1318 passing, 0 failing
- **Location**: `src/**/*.test.{ts,tsx,jsx}`
- **Run command**: `npm test`

Key test areas:
- Stream pipeline stores (PipelineStore, OrdinalPipelineStore, NetworkPipelineStore)
- Canvas renderers (point, line, bar, wedge, boxplot, heatmap)
- Canvas hit testing (CanvasHitTester, OrdinalCanvasHitTester, NetworkCanvasHitTester)
- HOC charts (all chart types render without error)
- Coordinated views (LinkedCharts, CategoryColorProvider, selections)
- Realtime (BinAccumulator, decay, pulse, staleness encodings)
- Data pipeline (DataSourceAdapter, progressive chunking)
- Validation (validateProps, diagnoseConfig)
- Serialization (toConfig/fromConfig, toURL/fromURL)
- Keyboard navigation, tooltips, annotations, legends

### E2E Visual Regression Tests (Playwright) — 47 tests

- **Framework**: Playwright (Chromium only)
- **Total Tests**: 47
- **Run command**: `npm run test:dist` (builds dist first)
- **Update snapshots**: `npx playwright test --update-snapshots`

Test specs:
| Spec File | Tests | Coverage |
|-----------|-------|----------|
| `xy-frame.spec.ts` | 7 | Line, area, scatter, bubble charts + hover |
| `ordinal-frame.spec.ts` | 11 | Bars (vertical/horizontal/stacked/grouped), pie, donut, swarm, box, violin, histogram + hover |
| `network-frame.spec.ts` | 7 | Force-directed, tree, treemap, circle pack, sankey, chord + hover |
| `hoc-legend.spec.ts` | 10 | Legend rendering for all chart types, showLegend prop, category count, positioning |
| `coordinated-views.spec.ts` | 8 | LinkedCharts, CategoryColorProvider, ChartGrid emphasis, empty state, three-way linked |
| `debug-canvas-scatter.spec.ts` | 1 | Canvas rendering smoke test |
| `page-load-test.spec.ts` | 1 | Page load error detection |

### CI Pipeline

GitHub Actions workflow (`.github/workflows/node.js.yml`):

**`testing` job:**
1. Build library (`npm run dist`)
2. Build MCP server (`npm run build:mcp`)
3. Run unit tests (`npm test`)
4. TypeScript type check (`npm run typescript`)
5. Schema freshness check (`npm run check:schema`)

**`e2e` job** (depends on `testing`):
1. Install Playwright Chromium
2. Build library
3. Run E2E tests with snapshot update
4. Upload snapshot baselines as artifacts (30-day retention)
5. Upload failure artifacts on error (7-day retention)

## Architecture Notes

- Each chart renders 1–2 canvas elements (data canvas + optional interaction canvas)
- Playwright `waitForVisualization` helpers must use `locator("canvas").first()` to avoid strict mode failures
- Snapshot baselines are platform-specific (`*-chromium-darwin.png` vs `*-chromium-linux.png`)
- CI runs `--update-snapshots` to auto-generate Linux baselines; download from artifacts to commit

## Build System

- **Bundler**: Rollup (via `scripts/build.mjs`)
- **Output**: Tree-shakeable ESM + CJS bundles per entry point
- **Entry points**: `semiotic`, `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/ai`, `semiotic/data`, `semiotic/server`
- **TypeScript**: `strict: true`, declarations generated
- **Build command**: `npm run dist` (dev) / `npm run dist:prod` (minified)

## Commands

```bash
# Unit tests
npm test                          # run all
npx vitest run --reporter=verbose # verbose output
npx vitest --coverage             # with coverage

# E2E tests
npm run dist                      # build first
npm run test:dist                 # run Playwright
npx playwright test --update-snapshots  # regenerate baselines

# Benchmarks
npm run bench                     # run benchmarks
npm run bench:baseline            # save baseline
npm run bench:compare             # compare against baseline

# Other checks
npm run typescript                # type check
npm run check:schema              # verify schema/CLAUDE.md/validateProps sync
npm run lint                      # ESLint
```

## Known Issues

1. **Snapshot baselines are OS-specific** — macOS and Linux render slightly differently. CI generates Linux baselines; commit them from the artifacts if needed.
2. **`quick-canvas-test.spec.ts`** — debug test hardcoded to port 1235, fails when not running standalone. Should be removed.
3. **`viz-examples.spec.ts`** — looks for `svg.visualization-layer` (v2 architecture). Should be removed.
