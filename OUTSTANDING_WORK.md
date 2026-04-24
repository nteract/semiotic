# Outstanding Work

Last updated 2026-04-22.

---

## Follow-up audits — 2026-04-17

Second pass after the Stream Frames perf PR merged, triggered by Copilot feedback patterns that clustered into four themes. Most items closed; open ones below.

### Completed
- **Lifecycle cleanup audit.** `DataSourceAdapter.clear()` now called on unmount in `StreamXYFrame` / `StreamOrdinalFrame` (in-flight progressive chunking and pending push microtasks can't fire post-unmount). `MinimapChart` scales-polling rAF tracks its handle and cancels on unmount + data change.
- **Cache invalidation completeness audit.** Three gaps fixed: `PipelineStore._stackExtentCache` now invalidates on `timeAccessor` / `valueAccessor` / `runtimeMode` changes (was missing streaming-mode accessor triggers); `OrdinalPipelineStore._colorSchemeMap` invalidates on `themeCategorical` / `colorAccessor` changes (same class of bug as the `_colorMapCache` fix); `OrdinalPipelineStore._categoryIndexCache` invalidates on `categoryAccessor` / `oAccessor` changes. Regression tests in `OrdinalPipelineStore.accessor.test.ts`.
- **`CanvasHitTester` upgraded to `findHitPointInQuadtree`.** XY was the last hit tester using the old `quadtree.find()` approach, which had the nearest-only bug for variable-radius BubbleChart points. `PipelineStore` now tracks `maxPointRadius` alongside the quadtree; `StreamXYFrame` threads it through. The `CanvasHitTester` linear-scan fallback for points is gone — the visit-based path is authoritative. Regression test for the `maxPointRadius`-widening behavior added.
- **Hover-handler contract tightened.** New `HoverPointerCoords` type in `hoverUtils.ts`; all four Stream Frames' `hoverHandlerRef` is now `(coords: HoverPointerCoords) => void`. `as unknown as React.MouseEvent` casts removed from the rAF-coalesced paths. A downstream read of `e.currentTarget` / `e.target` / `e.preventDefault` now fails typecheck instead of silently breaking at runtime.
- **Playwright `waitForTimeout` eliminated.** All 45 `page.waitForTimeout` calls across 13 integration specs replaced with event-driven waits. New `integration-tests/helpers.ts` exports `waitForChartReady` (canvas visible + pixel-content poll), `waitForAllChartsReady` (network-idle + all-canvases-non-empty — the replacement for page-wide "does the page error in N seconds" tests), `waitForRafs` (two-rAF wait, deterministic replacement for small post-interaction timeouts), and `waitForStreamingUpdate` (polls a canvas pixel hash to confirm new streaming data arrived). The four per-spec local `waitForVisualization` helpers are gone. Three 5-second timeouts and two 3-second page-load timeouts are now bounded by the shared 15-second watchdog but typically return in hundreds of milliseconds.
- **Shared ordinal-chart fixture library.** New `src/test-utils/ordinalFixtures.ts` exports `BAR_SAMPLE` / `BAR_INITIAL` / `BAR_EXTENDED` / `BAR_COLORED` / `NAMED_COUNT_DATA` / `STACKED_SAMPLE` / `GROUP_SERIES_CUSTOM`. `BarChart.test.tsx`, `StackedBarChart.test.tsx`, and `GroupedBarChart.test.tsx` now import from it; local `sampleData` / `customData` / etc. literals are gone.
- **Canvas renderer combinatorial matrix.** `lineCanvasRenderer.test.ts` now runs a `describe.each` over (curve ∈ {none, step, monotoneX}) × (decay ∈ {on, off}) × (thresholds ∈ {on, off}) — 12 combinations, each verifying the expected code path (threshold segmentation / decay per-segment alpha / fast path). Exercises the "decay suppressed when thresholds are active" invariant and the "curve ignored in decay/threshold paths" invariant that were previously covered by a single threshold case. Also fixed the local mock to use the shared `createMockCanvasContext` (which exposes `bezierCurveTo` etc. for d3-shape curve factories).
- **Canvas renderer tests less brittle.** New `recordCanvasOps` helper in `src/test-utils/canvasMock.ts` captures `fillStyle` / `strokeStyle` / `globalAlpha` at each draw call. Replaced the most implementation-detail-sensitive count assertions in `wedgeCanvasRenderer.test.ts` (pulse overlay, multi-wedge) and `pointCanvasRenderer.test.ts` (pulse glow) with behavior-level checks — "both colors appear in the fill log" rather than "fill was called exactly N times". Load-bearing counts (e.g. "3 input points → 3 arc calls" which is a structural invariant) kept as-is.
- **Accessor re-resolution gates.** Three `updateConfig` gates in `PipelineStore.ts` (x/y/time/value accessors) and `OrdinalPipelineStore.ts` (category/o, value/r) used `config.X !== undefined`, which silently skipped the re-resolution block when a caller explicitly cleared an accessor (`{xAccessor: undefined}` — valid React pattern for conditionally-rendered props). Converted to `"X" in config` so the inner `accessorsEquivalent` check sees the defined→undefined transition and reverts `getX` / `getY` / `getO` / `getR` to the fallback key. Four regression tests added (`PipelineStore.accessor.test.ts`, `OrdinalPipelineStore.accessor.test.ts`).

### Still open (deferred with reasoning)

- **~~`_groupColorMap` unbounded growth~~** — landed 2026-04-20. FIFO cap at 1000 entries in `PipelineStore`. Latent bug fixed along the way: palette index previously read `_groupColorMap.size`, which collided with existing entries if the map ever shrank — now a monotonic `_groupColorCounter` drives palette indexing, decoupled from map size. Re-appearing evicted groups get a new palette slot (documented tradeoff: stable color assignment only guaranteed for the most-recent 1000 unique groups, which is well beyond any realistic dashboard). Three new assertions in `PipelineStore.cache.test.ts`.

- **Style-spread allocation in decay / pulse / transitions** (`NetworkPipelineStore.applyDecay` line 936 in particular, plus `pipelineTransitions.ts`). `node.style = { ...node.style, opacity: x }` allocates a new style object per node per frame. NetworkPipelineStore's decay runs every frame in `StreamNetworkFrame`'s render loop, so the GC pressure is real for large graphs. Mutation is safe (scene nodes have unique style objects from `resolvePieceStyle` / `resolveStyle`) but the change touches ~13 sites across 4 files. Park until profiling identifies it as a bottleneck.

- **Remaining canvas-renderer call-count assertions.** `barCanvasRenderer.test.ts`, `boxplotCanvasRenderer.test.ts`, `heatmapCanvasRenderer.test.ts`, and a handful of `lineCanvasRenderer.test.ts` cases still use `toHaveBeenCalledTimes` — but in these cases the count is load-bearing (one `fillRect` per bar, one `save`/`restore` pair per boxplot, etc.) rather than incidental. Revisit only if a refactor breaks them for reasons unrelated to pixel output.

- **`AccessibleDataTable.tsx:635` fire-and-forget rAF.** `requestAnimationFrame(() => target.focus())` inside a click handler with no cleanup. Practical risk is zero (target is resolved synchronously, focus on detached node is a no-op), but it's the only rAF in the codebase without a tracked handle. Add a cancel if the component ever grows a longer-lived hold on the lookup.

### Architecture notes (from this pass)

- **Spatial-index pattern now consistent** across XY / Geo / Ordinal (`findHitPointInQuadtree` in all three, threshold at 500 points, `maxPointRadius` tracked in each store). Network deliberately stays on linear-scan — circles are few and large; edges are the hotspot, addressed by the Path2D cache from the prior PR.
- **`_cachedPath2D` / `_cachedPath2DSource` pattern** established for any scene node that owns an SVG path string. Applied to network edges; also pre-existed on geoarea nodes. Any future node types with path strings should follow the same convention to keep hit-test cost bounded.
- **"Authoritative vs informational" API discipline.** `findHitPointInQuadtree` is authoritative (exhaustive visit); `quadtree.find()` is informational (nearest-only). The audit removed the last mix of these under similar-looking code. Any future fast-path + fallback construct should be marked explicitly as one or the other.

---

## Dependency upgrades — backlog as of 2026-04-17

Honest snapshot from `npm outdated`. We are meaningfully behind on several deps; some are dev-only and harmless, several are runtime/test-environment moves with real migration costs. **Treat the "Effort" column as a planning estimate, not a guarantee.**

### Tier 1 — DONE (3.4.0 + 3.4.x)

| Dep | Bump | Status |
|---|---|---|
| `hono` 4.12.8 → 4.12.14 + `@hono/node-server` < 1.19.13 → 1.19.14 | security fix, six advisories | shipped in 3.4.0 |
| `prettier` 3.8.1 → 3.8.3 | patch / dev-only | shipped in 3.4.0 |
| `@axe-core/playwright` `^4.11.1` → `^4.11.2` | patch / test-only | post-3.4.0 |
| `vitest` + `@vitest/coverage-v8` + `@vitest/ui` `^4.0.18` → `^4.1.4` | minor-range bump (npm-installed went 4.1.0 → 4.1.4 inside the old `^4.0.18` range; this lifts the range floor to lock the patch) | post-3.4.0 |
| `@playwright/test` + `playwright-chromium` `^1.17.1` → `^1.59.1` | hand-pinned; range was last set in 3.0 era. Required regenerating 9 darwin baselines (chromium font-rendering shifts in label-heavy charts: ordinal bars, network treemap, network circle pack). No real regressions. | post-3.4.0 |
| `typedoc` `^0.28.17` → `^0.28.19` | patch / docs-only | post-3.4.0 |

### Tier 2 — single-PR follow-ups (3.4.x)

| Dep | Current → Latest | Risk | Effort |
|---|---|---|---|
| ~~`@modelcontextprotocol/sdk` 1.27.1 → 1.29.0~~ | ~~bundles into shipped MCP server. Smoke test: stdio JSON-RPC `initialize` + `tools/list` round-trip. All 6 tools enumerate correctly under 1.29; tool shape gained additive `execution.taskSupport` field (non-breaking).~~ | DONE post-3.4.0 |
| ~~`esbuild` 0.27.4 → 0.28.0~~ | ~~pre-1.0; verified by `npm run dist`, `dist:prod`, `build:mcp`, full vitest suite.~~ | DONE post-3.4.0 |
| ~~`@types/node` 20.19.x → 22.19.17~~ | ~~Volta pins `22.22.1` and CI runs `22.x` (the previous "Node 20 LTS" note was wrong). Bumped to latest `22.x` patch to match the actual runtime. **Don't** bump to 25.x — Node 25 isn't an LTS and the runtime is on 22; the dependabot 25.x PR should be closed.~~ Also fixed `.node-version` `18` → `22.22.1` to align with Volta. | DONE post-3.4.0 |

### Tier 3 — major-version migrations, each gets its own PR

These are all **legitimately big** and the previous "no big deal" framing was wrong. Each line below is roughly the order I'd tackle them.

#### 1. ~~Test environment: `jsdom` 26 → 29~~ — landed 2026-04-20

Bumped to `^29.0.2`. The feared breakage around canvas / `getComputedStyle` / observers never materialized — exactly **one** test needed updating: `Legend.test.tsx`'s inline-style assertion expected a hex literal (`#e41a1c`), but jsdom 29 now normalizes inline `style.fill` reads to `rgb(228, 26, 28)` to match every real browser. Assertion updated to `toMatch(/^(#e41a1c|rgb\(228,\s*26,\s*28\))$/)` so it works under either jsdom version. No changes to `resolveCSSColor`, `MutationObserver`, or observer polyfills were needed.

#### 2. ~~ESLint 8 → 10 + `@typescript-eslint` 6 → 8~~ — landed 2026-04-20 (ESLint 9, not 10)

Landed ESLint `^9.39.4` + `@typescript-eslint/*` `^8.59.0`. **Couldn't go all the way to ESLint 10**: `eslint-plugin-react@7.37.5` peer range caps at `^9.7`, and no plugin fork covers 10 yet. ESLint 9 was the real goal (flat-config support landed there); 10 is a patch release that the plugin ecosystem hasn't caught up with.

Migration steps that actually mattered:
- `.eslintrc.json` deleted, `eslint.config.mjs` written (~70 lines). Flat-config import order: `@eslint/js` recommended → react plugin with manual `reactPlugin.configs.recommended.rules` spread → `typescript-eslint.configs.recommended` mapped to `.ts`/`.tsx` only → local rule overrides. `.mjs` extension avoids the `MODULE_TYPELESS_PACKAGE_JSON` warning without forcing the whole package to `"type": "module"`.
- `globals` package added for the `browser`/`node`/`jest` globals (flat config requires explicit declaration; no more `env` shorthand).
- `typescript-eslint` unified meta-package added for the mapped `.configs.recommended` usage.
- `eslint --fix` cleared ~13 auto-fixable violations (prefer-const, unused eslint-disable directives).
- Three real bug fixes surfaced in `StreamGeoFrame.tsx`: `foo?.bar!` pattern (optional chain + non-null assertion is contradictory) replaced with early-return guards in the three `onZoom` callback sites.
- Seven typescript-eslint rules disabled initially as codebase-wide tech debt. Follow-up sweep landed 2026-04-21 — seven of the eight rules now enabled as errors:
  - `no-this-alias` — 1 site (RingBuffer iterator), converted to arrow function.
  - `no-unsafe-function-type` — 71 sites across 15 files. Replaced bare `Function` type with `(...args: any[]) => any` via batch regex; equivalent semantics, satisfies the rule.
  - `no-empty-object-type` — 1 site (`RawPoint<T>` empty interface), converted to type alias.
  - `ban-ts-comment` — 1 site (`@ts-nocheck` on legacy `sankeyLinks.ts`). Rule configured with `allow-with-description` for `@ts-nocheck` / `@ts-expect-error`; file comment extended to document the rewrite debt.
  - `no-require-imports` — 41 sites across 33 test files + 3 server-rendering files. Deleted `const React = require("react")` from vi.mock factories (top-level React import works in vitest mock factories). Server-side optional-dep loaders (sharp/gifenc) kept the `require(variable)` indirection with inline-disable comments — dynamic `import()` would async-ify the whole call chain.
  - `no-unused-vars` — 184 sites → 0. Configured with `_`-prefix allowance (`argsIgnorePattern: "^_"`). Batch-removed 50+ unused imports, alias-renamed 10+ unused destructured props (`name: _name` form), prefixed 43 unused function parameters, deleted several dead local declarations and one stale useMemo block.
  - `no-unused-expressions` — 1 site in legacy `sankeyLinks.ts` comma-sequence pattern, inline-disabled with a reason.
  - **`no-explicit-any` — 2871 warnings, kept at `warn` level.** The original "~140" estimate was off by a factor of 20; genuine `any` reduction is a design exercise (type-level modeling of d3 boundaries, data-point discriminated unions), not a mechanical sweep. Left as a warning so the count is visible without blocking CI; reducing it is its own multi-PR initiative.

Fresh `npm install` was required because the old `@typescript-eslint/eslint-plugin@6.21.0` peer-gated against eslint 9 and npm refused to upgrade in place — `rm -rf node_modules package-lock.json` then `npm install`.

#### 3. ~~React + types 18 → 19~~ — landed 2026-04-20

Bumped `react` + `react-dom` to `^19.2.5`, `@types/react` + `@types/react-dom` to `^19`, and `@testing-library/react` to `^16.3.2` (v16 is the React-19-compatible major). Feared 2–4 week migration, actual friction: **four TS errors, no runtime breakage**.

- **`JSX` namespace** — React 19's types moved `JSX` from a global namespace to a named export on `react`. Three call sites referenced `JSX.Element` without importing: `formatUtils.ts` (used `React.JSX.Element` since `* as React` was already imported), `generalTypes.ts` + `networkTypes.ts` (added `import type { JSX } from "react"`).
- **`useRef<T>()` signature** — React 19 requires an initial value; `useRef<ReturnType<typeof setTimeout>>()` in `DetailsPanel.tsx` became `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`. `undefined` specifically (not `null`) because `clearTimeout` rejects `null`.
- Every test passes against React 19 + @testing-library/react 16 + jsdom 29. `forwardRef` still works (with a deprecation warning in v19 that we haven't seen fire in tests). The Stream Frames' + HOCs' extensive `forwardRef` usage is untouched; migrating to plain-prop refs is a future cleanup, not a migration requirement.
- `peerDependencies` still declares `^18.1.0 || ^19.0.0` — keeps the library usable by consumers on either React.

#### 4. ~~TypeScript 5.9 → 6.0~~ — landed 2026-04-20

Bumped to `~6.0.3`. Strict-mode inference changes were a non-event for us — zero source-code errors. Three build-system adjustments were required:
- **`moduleResolution: "node"` → `"bundler"`** in `tsconfig.json`. TS 6 deprecates the legacy "node10" resolver (the one TS treats plain `"node"` as) and warns that it'll stop working in TS 7. `"bundler"` is the correct choice for a library built by rollup/esbuild/parcel — it supports package.json `exports` subpath resolution without enforcing Node's stricter ESM rules (explicit `.js` extensions, etc.).
- **Added `rootDir: "./src"`** to `tsconfig.json`. TS 6 now errors on TS5011 (`rootDir must be explicitly set`) where 5.x silently inferred it. The rollup-plugin-typescript invocations for every bundle surfaced the same error; setting `rootDir` once in the base config fixed all call sites.
- **Bumped Node heap to 8 GB** in the `dist` / `dist:prod` npm scripts (`node --max-old-space-size=8192 scripts/build.mjs`). TS 6's compiler allocates more memory per rollup bundle than 5.9 did — with 11 bundles built sequentially, the default 4 GB heap hit OOM on the 9th. 8 GB leaves comfortable headroom; if future growth pushes past it, the next step is switching the rollup TS plugin to `@rollup/plugin-esbuild` (much smaller memory footprint, already used for the MCP build).

`"as any"` reduction work deferred — the `strict` posture didn't surface new opportunities from 6.0's tighter inference; the remaining ~140 `as any` sites mostly trace to `node.style.fill` / `CanvasPattern` duck-typing paths that TS would need actual union narrowing to resolve.

#### 5. ~~`react-router-dom` 6 → 7~~ — landed 2026-04-20

Bumped to `^7.14.1`. `react-router-dom` v7 is a thin compatibility shim over `react-router`; its internal `import { HydratedRouter, RouterProvider } from "react-router/dom"` uses subpath exports that Parcel 2.16's default resolver doesn't handle. Fix: aliased `react-router-dom` → `react-router` in `package.json`'s `alias` block so Parcel never touches the thin-shim module. All 98 docs files that import from `react-router-dom` keep their existing imports unchanged — the alias routes them to `react-router`, which re-exports everything the docs use (`Link`, `Routes`, `Route`, `Outlet`, `Navigate`, `BrowserRouter`, `NavLink`, `useLocation`, `useNavigationType`). `HydratedRouter` / `RouterProvider` are SSR-only and not referenced by the docs. `react-router` also added as an explicit devDependency so Parcel resolves it from a stable location.

#### 6. ~~`marked` 4 → 18~~ — landed 2026-04-20

Bumped to `^18.0.2`. v5 removed the built-in `headerIds` option that `docs/src/MarkdownText.js`'s heading-link hack relies on. Migrated to `marked.use(gfmHeadingId())` from the official `marked-gfm-heading-id` extension (~2 KB, maintained by the marked team) — restores the `<h{n} id="slug">` output shape the existing regex-replace expects, so the "click a heading to copy its URL" UX survived the upgrade unchanged. Switched from `marked(text, { headerIds: true })` to `marked.parse(text)` since v12 removed the legacy option and made the default call ambiguous between sync/async.

#### 7. ~~`d3-dsv` 1 → 3~~ — landed 2026-04-20

Bumped to `^3.0.1`. v2 went ESM-only; the one consumer (`docs/src/examples/CanvasInteraction.js`) was already using ESM `import { csvParse }`, so the upgrade was a pure version bump. `csvParse` signature unchanged across v1–v3.

#### 8. ~~`@testing-library/react` 14 → 16~~ — landed 2026-04-20 alongside React 19

Bumped to `^16.3.2` as part of item #3. No test changes required.

#### 9. ~~`size-limit` + `@size-limit/file` 11 → 12~~ — landed 2026-04-20

Bumped both to `^12.0.0`. Config schema is compatible — the existing `"size-limit": [{path, limit}]` entries ran unchanged. Four bundles were over their pre-theming budgets (semiotic 234 / xy 128 / ordinal 105 / realtime 132 KB brotli), so budgets were bumped to give ~5 KB headroom over current: semiotic 240, xy 135, ordinal 110, realtime 140, network+geo unchanged. The over-budget state was pre-existing from the theming PRs — CI's `npx size-limit` step had been failing silently or was being overridden on the theming merges.

### Standing recommendation

The "no big deal" framing on these has been wrong. **ESLint, jsdom, and React are each their own real project.** Sequencing matters: jsdom first (test infra), then eslint (so you're not chasing two test environments at once), then React 19 (largest blast radius, do when the rest is stable). The patches in Tier 1 are free wins and should land routinely; the dependabot queue exists so you don't have to track them manually — accept them as they come.

**What's actually urgent, short-term:**
- `npm audit` reports **6 vulns (4 low, 2 moderate)** as of 2026-04-17. The two moderate ones are in `hono` / `@hono/node-server` (Tier 1 above — `npm audit fix` resolves them, dependabot PR #839 is the same fix). The 4 low ones are in `elliptic` / `crypto-browserify` / `browserify-sign` / `create-ecdh`, all transitive dev-only crypto libs reachable from the rollup build chain — addressing them requires `npm audit fix --force` which would push `crypto-browserify` to a breaking-change version. Defer those four; they're not in the runtime bundle.
- ESLint 8 hits maintenance EOL October 2026 — that's the hardest near-term deadline.
- React 18 itself isn't EOL but losing CI coverage of new React features is a slow-burn problem.

Re-run `npm audit` before each release; this section gets stale fast.

---

## Completed in 3.3.x (reference)

- **Rounded corners** — `cornerRadius` on PieChart/DonutChart, `roundedTop` on BarChart/StackedBarChart/GroupedBarChart. Negative-value bars round the correct edge.
- **`sort` on StackedBarChart/GroupedBarChart** — default `false` (insertion order).
- **Push API transition exits** — `remove()` calls `snapshotPositions()` before mutation.
- **Push API selection clearing** — all frames clear hover on datum removal.
- **Network `edgeIdAccessor`** — `removeEdge(edgeId)` single-ID form.
- **OG image server** — `scripts/og-server.mjs`.
- **CLI screenshot generator** — `scripts/demo-server-render.mjs`.
- **Release pipeline** — post-publish smoke test, rollback script.
- **SSR alignment CI** — `scripts/check-ssr-alignment.js` checks HOC↔SSR↔validation parity.
- **SSR fixes** — wedge rotation, hierarchy themes, gauge needle, bottom legend, ID uniqueness, `sweepAngle`/`hierarchySum`/`cornerRadius`/`roundedTop` passthrough.
- **HoverData unification** — typed `HoverData` across all 4 frames.
- **Shared `computeDecayOpacity`** — single source of truth in `pipelineDecay.ts`.
- **`serverChartConfigs.ts`** — `renderChart` dispatch extracted to lookup table.
- **`as any` reduction** — 240 → ~140.
- **Test coverage** — 2890 tests across 157 files. Cache invalidation, push API edge cases, SSR coverage, HOC integration, callback wiring, bad data resilience.

---

## Theming

### CSS variables [DONE]

All four planned variables implemented:
- `--semiotic-annotation-color` — falls back to `--semiotic-text`
- `--semiotic-legend-font-size` — used by Legend component
- `--semiotic-title-font-size` — available for chart titles
- `--semiotic-tick-font-family` — monospace option for aligned numerics

### SemioticTheme interface additions [DONE]

- `colors.annotation` — annotation marker/text color (used by Annotation.tsx, staticAnnotations.tsx)
- `typography.legendSize` — legend font size (used by Legend.tsx)
- `typography.tickFontFamily` — tick label font family
- `typography.titleFontSize` — chart title font size
- `accessibility.colorBlindSafe` — type defined, runtime not yet wired
- `accessibility.highContrast` — type defined, runtime not yet wired

Theme presets updated: Tufte and Journalist presets include `annotation`, `tickFontFamily`, `legendSize`. `themeToCSS()` and `themeToTokens()` emit the new tokens. Server `themeStyles()` resolves the new fields with fallbacks.

### ThemeProvider useEffect timing lag [YELLOW]

`ThemeInitializer` uses `useEffect` to sync the store, causing CSS variables to be one render behind on initial mount. Mitigated by inline CSS vars on `ThemeCSSWrapper`'s div, but the architecture is fragile. Fix: resolve theme synchronously during render via `useSyncExternalStore` or store initialization.

### Canvas theme bridge fragility [YELLOW]

Canvas renderers read theme values via `getComputedStyle`. If the dirty flag isn't set when the theme updates, canvas keeps old colors while SVG updates to the new theme. Currently works because theme changes trigger re-render → dirty flag, but the coupling is implicit.

### Design system research gaps

Curated categorical sequences maximizing neighbor contrast, and per-role typography tokens (title vs legend vs axis vs tick — currently only sizes, not per-role font families).

---

## Push API

### Undo

**Status**: Not scoped. `remove()`/`update()` return previous values — caller can push them back manually. A built-in `ref.current.undo()` needs an operation log with inverse operations. May be better as a userland wrapper.

### Legend auto-population from pushed categories [YELLOW]

**Status**: short-circuited at 3.4.1 (empty legends no longer reserve margin); real auto-population deferred.

**Symptom**: A push-API chart (`<BarChart colorBy="category">`, no `data` prop) mounts before any categories exist, so `useChartLegendAndMargin` → `createLegend` produces a shell with `legendGroups: [{ items: [], label: "" }]`. Pre-3.4.1 that reserved 110px of right-margin for a legend and rendered only the empty header bar ("neatline"). 3.4.1 treats zero-item legends as absent — margin stays tight, no ghost header — but the legend still never populates as categories arrive via `push()`, which is the behavior users actually want.

**What's missing**: a subscription from the frame to the HOC telling it "the category list changed, rebuild the legend from the new domain". Current data flow is one-way (HOC → frame via props / ref imperatives); legend construction lives entirely in `useChartLegendAndMargin` and is memo'd against the `data` prop, which stays `undefined` forever under push API.

**Sketched design**:
1. Add `onCategoriesChange?: (categories: string[]) => void` prop to `StreamOrdinalFrame` (and, for XY charts that face the same latent issue with `colorBy`, `StreamXYFrame`). Fires after each `computeScene` when the relevant scale domain differs from last fire.
2. `useChartSetup` holds a `const [pushedCategories, setPushedCategories] = useState<string[]>([])`, wires a stable `onCategoriesChange` handler that calls `setPushedCategories`, and threads `categories: pushedCategories` into `useChartLegendAndMargin`. The hook's `categories` param already exists (and short-circuits the data-based unique-values path inside `createLegend`), but no HOC surfaces it as a public prop yet — this design piggybacks on it for the internal push-tracking path.
3. Debounce by identity: fire the callback only when the sorted category list is not shallow-equal to the prior one. Otherwise we'd re-render on every rAF.
4. Document: declaring `colorBy` + pushing categories is now enough; passing an explicit `categories` prop remains supported for the case where users want a legend populated before any data arrives (e.g. categorical color consistency across a dashboard).

**Known landmines**:
- Make sure the callback fires after FIRST ingest, not just on subsequent changes — otherwise the initial push batch never triggers legend population.
- Identity-based dedupe has to compare sorted arrays, not just `===`, since `oScale.domain()` returns a fresh array each call in OrdinalPipelineStore.
- XY's colorBy-as-categorical case is analogous but uses `groupAccessor` in the store; same pattern but different accessor path.
- `LinkedCharts` + `CategoryColorProvider` already handle shared-category legends across charts — make sure the auto-populated categories flow into the provider's shared list too, otherwise charts under `LinkedCharts` with push API would get mismatched colors across the shared legend.

**Effort**: ~150 LOC across StreamOrdinalFrame / StreamXYFrame / useChartSetup / OrdinalPipelineStore (domain-change detection) / PipelineStore. Three or four tests: first-push fires, repeated pushes without domain change don't fire, domain shrinkage (category removed) fires with the reduced list, LinkedCharts share state.

**Workaround until implemented**: pass the full dataset via `data` on first render (then use push for subsequent updates), OR accept that push-API + `colorBy` produces a category-less legend (current behavior post-3.4.1). Surfacing the hook-internal `categories` param as an HOC prop would be a smaller middle-ground change — one line per HOC — if an escape hatch is needed before the full auto-population work lands.

---

## Server Rendering

### CLI Screenshot Generator [DONE]

`scripts/demo-server-render.mjs` — batch-renders 7 charts + 1 dashboard across multiple themes to SVG/PNG.

### PDF Export

**Status**: Not scoped. `renderToPDF()` with pdfkit/jsPDF. 1-2 weeks.

### Edge Runtime Compatibility

**Status**: Not scoped. Verify sync `renderChart`/`renderDashboard` work in CF Workers, Vercel Edge, Deno. 3-5 days.

### GIF Transition Easing

**Status**: Not started. `transitionFrames` is a no-op — needs incremental store ingestion across frames. 2-3 days.

### Render Studio: Real GIF Downloads

**Status**: Not started. Link Studio animated preview to Export page for download. 0.5 day.

---

## Bugs & Code Quality

### PipelineStore cache invalidation [YELLOW]

Implicit cache invalidation keyed by `bufferSize:_ingestVersion`. No test verifies caches invalidate correctly. Cache invalidation tests added in 3.3.x cover color maps, extents, and push-clear cycles, but combinatorial paths remain untested.

### Canvas renderer combinatorial paths [YELLOW]

Step curve + exponential decay + threshold coloring compose multiplicatively. Only validated visually via Playwright.

### NetworkPipelineStore tension threshold [YELLOW]

Empirically tuned, not theoretically derived. May re-run too frequently or infrequently under bursty traffic.

### GeoPipelineStore projection edge cases [YELLOW]

Anti-meridian/pole rendering artifacts possible with limited test coverage at extreme latitudes.

---

## TypeScript

### `as any` reduction

~140 remaining. Hotspots: sankeyLayoutPlugin (27, vendor-adjacent), StreamGeoFrame (13, d3-zoom types), XYBrushOverlay (7), chordLayoutPlugin (6). Next targets: StreamGeoFrame d3 type imports, SceneToSVG d3-shape arc invocations.

### Accessor type audit

Replace bare `string` or deprecated `Accessor<T>` with `ChartAccessor<TDatum, T>` across all HOC props.

### Generic ColorConfig/SizeConfig

Make generic with `TDatum` for `keyof` inference on `colorBy`, `sizeBy`.

---

## Declarative Animation

### `animate` prop on HOCs

`animate?: boolean | TransitionConfig` on `BaseChartProps`. Infrastructure exists (`_targetOpacity`, `snapshotPositions`, `startTransition`). Missing: HOC wiring, canvas `ctx.globalAlpha` from transition opacity. 1-2 weeks.

---

## Performance

### Quadtree for scatter hit testing [RED]

O(log n) lookup for >10k points. Currently linear scan. 3-5 days.

### Other performance items

- RingBuffer in-place forEach
- Canvas curve interpolation
- Network decay sort cache
- Incremental scene updates (append/evict vs full rebuild)
- WebGL renderer for >100k points
- Web Worker for force layout

---

## MCP & AI Tooling

### MCP protocol compliance testing [GREEN]

Actual stdio JSON-RPC round-trip coverage now lives in `src/__tests__/scenarios/mcp-protocol.test.ts` for initialize, tools, resources, prompts, renderChart, suggestChart, diagnoseConfig, reportIssue, and applyTheme. The same file includes a Streamable HTTP smoke test for session initialization and tools/list.

### Shared AI chart recommendations [GREEN]

`suggestChart` now shares one CommonJS recommendation engine with `npx semiotic-ai --suggest`, so MCP and CLI guidance stay aligned and can be tested without an MCP client.

### Shared AI component metadata [GREEN]

`ai/componentMetadata.cjs` is the shared source for component category/import/renderability metadata across the CLI, MCP resources, and surface parity checks.

### Schema freshness check [YELLOW]

Regex-based CLAUDE.md parsing can still miss narrative/semantic drift. `check:surface` now guards shared component metadata parity, but behavior-contract tests are still needed for prop semantics.

---

## Docs & Publishing

### Docs site prerendering [GREEN]

`scripts/prerender.mjs` now rewrites the root `docs/build/index.html` as well as nested routes, so the homepage no longer remains a plain SPA shell after `website:build`. Route extraction is indentation-aware and covers nested `/api/*` and `/theming/*` routes; canonical URLs, LLM alternate links, JSON-LD, and noscript fallbacks are generated idempotently.

### API Reference Documentation [YELLOW]

Baseline is present: `typedoc.json`, `docs:api:json`, `docs/src/pages/api/ApiReferencePage.js`, `/api/charts`, and `/api/typedoc`. Remaining work: richer component summaries/examples, stronger TypeDoc prop extraction, and a docs-route smoke test in CI that runs after a clean `website:build`.

---

## Geo Enhancements

- Path2D hit testing generalization
- Bounds pre-filter for network nodes
- Canvas grid lines
- Geographic minimap
- Temporal animation on cartogram
- Edge encoding richness (tapered lines, animated dashed)

---

## Architecture

### HOC → `useChartSetup` unification

11 HOCs still compose `useChartSelection` + `useColorScale` + `useLegendInteraction` + `useChartLegendAndMargin` manually rather than going through `useChartSetup`: LineChart, AreaChart, StackedAreaChart, BubbleChart, QuadrantChart, Heatmap, ConnectedScatterplot, ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram. Each has specific deviations (no `colorBy`, dual-axis margin logic, value-based color, projection-specific geometry) that would require either bending the HOC to the shared hook or making `useChartSetup` accept optional inputs. Currently every HOC calls `useResolvedSelection(selection)` directly for the theme's selection opacity, which is a coherent single-hook touch but still a second codepath. Consolidating would make future shared plumbing (theme → style-config merges, declarative animation defaults, shared cache invalidation) a single-site change.

### Visual regression coverage

3.4.0 added `themed-charts.spec.ts` (6 charts × 5 themes) and three geo-chart snapshots, bringing the total to ~75 baselines. Linux baselines for the new specs need to be bootstrapped from CI on the first run after merge (download the `playwright-snapshots` artifact, commit the `*-chromium-linux.png` files; see `VISUAL_TESTING.md`).

Open extensions, ranked by leverage:
- **HOC-level snapshots for every chart type.** Existing Frame-level snapshots cover the Stream Frames; HOCs (which is what users actually instantiate) have only the themed-charts subset. Adding one snapshot per HOC × default theme would catch HOC-layer prop-resolution regressions (the most common source of visual bugs). ~25 new baselines.
- **Interaction-state snapshots.** Hover, brush extents, click-locked crosshair, legend isolate. Mechanical: `await page.hover()` then snapshot. Catches the most subtle regressions (the kind that pass structural tests).
- **SSR-vs-CSR diff.** Render the same chart through `semiotic/server` and compare to a Playwright snapshot of the client render. Would catch SSR drift introduced after the SSR-alignment CI script's purview ends (which only checks prop parity, not visual output).
- **Animation snapshots.** Snapshot mid-animation frames at fixed timestamps with `Date.now()` mocking. Currently `animate` is implicitly disabled in the screenshot harness; this leaves the intro animation paths untested visually.
- **Other browsers.** Firefox and Webkit run in CI but no baselines are committed for them. Each adds ~75 baselines per browser. Probably overkill unless we hit a browser-specific rendering bug.

---

## Future work

Five load-bearing concerns from a recent audit. Listed with the plan for each — none urgent individually; each has a way to decay the library silently if ignored.

### 1. Canvas vs. SVG rendering divergence [YELLOW]

Client renders canvas; server renders SVG via `SceneToSVG`. Any new rendering feature must land in both paths or they drift. The backgroundGraphics bug (canvas painted over SVG backgrounds in Ordinal/Network frames, not XY) lived unseen because the integration test only exercised XY. **The gap is only visible when MCP or `renderToStaticSVG` runs — most contributors never touch those paths.**

Plan:
- Extend the SSR-vs-client diff snapshot test (Architecture → Visual regression) to cover every rendering feature, not only chart output — backgrounds, overlays, annotations, legends each get their own diff.
- Extend `check-ssr-alignment.js` from prop parity to scene-builder parity: every builder referenced on canvas must have a matching `SceneToSVG` converter registered.
- Dev-mode warning in Stream Frames when a rendering feature lacks an SSR counterpart (surface the gap explicitly rather than silently diverging).

### 2. Latent dead props at HOC ↔ Frame seam [YELLOW]

HOCs build style objects, hand them to Frames, Frames destructure — any hop can drop a prop silently. `barStyle` is the known case. Designers expect props that are advertised in the TS types to actually do something.

Plan: addressed directly by **Primitive Theming & Semantic Colors → Phase A** (steps 3, 4, and the regression test in step 7). The "every declared `*Style` prop must reach the memoized config" test becomes a persistent guardrail.

### 3. AI surface (schema rot) [YELLOW]

CLAUDE.md / MCP / `validateProps` / `diagnoseConfig` / `--doctor` advertise the API to agents. `scripts/check-schema-freshness.js` catches missing entries but not **semantic drift** — a prop whose type is unchanged but whose behavior shifted. Agents then confidently produce correct-looking code against a stale mental model.

Plan:
- Behavior-contract tests that assert prop SEMANTICS, not just type acceptance (e.g. "when `color` and `colorBy` are both set, `colorBy` wins" as an actual test, not an implicit convention).
- Periodically regenerate CLAUDE.md examples against runtime via script; diff to catch narrative drift.
- Longer-term: structured "behavior spec" fields in the schema that `--doctor` enforces.

### 4. Third-party workarounds invisible to us [YELLOW]

Consumers route around quirks instead of reporting them. Iris's `windowSize={data.length}` was coaxing streaming-mode into bounded-mode behavior — a tell that the API exposed a workaround path. Every such workaround becomes public API we can't change.

Plan:
- Tracked-consumers list (iris, Confluent DEX, internal installs). Check these before API changes where access allows.
- First-class bounded mode on realtime chart types so static-data consumers have a proper path, not a workaround (`runtimeMode: "bounded"` explicit on `RealtimeHistogram` etc.).
- Recurring consumer-audit cadence. The iris audit was valuable — it should not be a one-off.

### 5. "Mounted" vs. "correct" tests [YELLOW]

Many Vitest tests assert `container.querySelector(".stream-xy-frame").toBeTruthy()` — tells you React mounted, not that stacking / binning / encoding is correct. Playwright pixel tests are honest but scarce.

Plan:
- Review gate or lint rule: flag new tests that assert only existence.
- Expand HOC-level Playwright snapshots (Architecture → Visual regression → HOC-level snapshots). ~25 new baselines catches HOC-layer prop-resolution regressions — the most common source of visual bugs.
- Shift `validateProps`-adjacent tests from "prop accepted" to "prop produces expected rendered output on fixture."

---

## Primitive Theming & Semantic Colors [PLANNED — 3.5.0]

Designer-facing theming cleanup. Outcome: one vocabulary across the library for `stroke` / `strokeWidth` / `fill` / `opacity` on any shape; theme-layer semantic colors that cascade via CSS custom properties; dead props honored.

Motivating example: `RealtimeHistogram` declares `stroke` / `strokeWidth` props but `barStyle` is destructured in `StreamXYFrame` and dropped before reaching the scene builder. `StackedBarChart` supports theme-aware stroke only via `frameProps.pieceStyle` — a power-user escape hatch that shouldn't be designer-visible.

### Theme layer — four color dimensions

All owned by the theme, all overridable per-scope, all with light/dark variants:

1. **Semantic roles** (scalars): `primary`, `secondary`, `success`, `danger`, `warning`, `error`, `info`, `text`, `textSecondary`, `border`, `grid`, `surface`. Default fills/strokes, status-driven charts (swimlane, waterfall), annotations.
2. **Categorical scale** (array): existing `themeCategorical`. Distinct-category encodings.
3. **Sequential scale** (array, magnitude): heatmap, choropleth, size encoding.
4. **Diverging scale** (array, midpoint): likert, bivariate, ±deviation.

### Override model

- **Scalar roles via CSS custom properties.** `ThemeProvider` emits `--semiotic-success: #...` etc. at its mount root. Canvas scene builders read the resolved values via `getComputedStyle(frameEl)` once per theme change. Scoped override is CSS-native: `<div style={{ "--semiotic-danger": "#c00" }}>...charts...</div>` cascades through the React tree; canvas respects it via DOM-cascade read.
- **Array scales via nested `ThemeProvider`.** CSS custom properties don't ergonomically carry arrays. A nested provider with a partial theme merges on top of the ambient one. Scoped by React subtree.

### Semantic role vocabulary

| Role | Default use |
|---|---|
| `primary`, `secondary` | Default fill/stroke when no color encoding |
| `success`, `danger`, `warning`, `error`, `info` | Status-driven semantics — swimlane states, waterfall ±, annotation severity |
| `text`, `textSecondary` | Labels, tick text, axis titles |
| `border`, `grid`, `surface` | Chart chrome — bar outlines, grid lines, background fills |

### Phase A — Foundations (invisible to users)

Pure additive plumbing. Landing in milestones so each is reviewable in isolation.

#### Milestone 1 — XY primitive proof-of-pattern [LANDED]

The canonical end-to-end fix. Proves the architecture by fixing the known dead prop (`barStyle`) through the full chain, with tests and docs that establish the pattern for remaining milestones.

- Extended `SemioticTheme.colors` with semantic status scalars: `success`, `danger`, `warning`, `error`, `info`, plus `secondary` and `surface`. All optional on the interface; populated on every preset.
- All 17 presets updated with brand-appropriate semantic values (LIGHT/DARK/HIGH_CONTRAST + 7 branded × 2 modes).
- `themeToCSS`, `themeToTokens`, and `ThemeProvider` inline-style all emit `--semiotic-{role}` CSS custom properties for every declared scalar role.
- `PipelineConfig` extended with `themeSemantic` (object of scalars) and `barStyle`. Threaded through StreamXYFrame → PipelineStore → `XYSceneConfig` → `barScene.ts`.
- `barScene.ts` consumes both. Precedence for stacked fill: `barColors[cat]` > `themeSemantic.primary` > `#4e79a7`. Unstacked: `barStyle.fill` > `themeSemantic.primary` > `#007bff`. `barStyle.stroke` / `.strokeWidth` / `.gap` thread into every rect node. Canvas renderer + SceneToSVG already honored stroke/strokeWidth on `RectSceneNode` — no change needed there.
- Unit coverage in `barScene.test.ts` (9 new cases): theme-semantic fallbacks, barStyle precedence, gap override, hardcoded last-resort, stroke propagation through stacked + unstacked paths.
- Regression guard in `StreamXYFrame.test.tsx` (spies on `PipelineStore.updateConfig` and asserts every declared `*Style` prop identity reaches the config). Any future drop at the Frame↔Store seam fails this test.
- Playwright: `histogram-theme-stroke.spec.ts` — 3 snapshots (light / dark / scoped CSS-var override) + a pixel check that strokes actually paint.
- Docs: `/theming/semantic-colors` page — four theme dimensions, role vocabulary with live swatches, using roles on charts, CSS cascade override with side-by-side live example, nested ThemeProvider for scale overrides, status-semantics worked examples, full CSS-var reference, how-it-works.
- `CLAUDE.md` theming section expanded with semantic-role inventory + scoped CSS-var override pattern; mirrored to `.clinerules`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, `docs/public/llms-full.txt`, `ai/system-prompt.md`.

#### Milestone 2 — Ordinal / Network / Geo frame parity [LANDED]

The same pattern applied to the other three Stream Frames:

- **StreamOrdinalFrame**: added `themeSemantic: ThemeSemanticColors` to `OrdinalPipelineConfig` and threaded it through `StreamOrdinalFrame`'s `pipelineConfig` memo (`themeCategorical` was already threaded). `pieceStyle` / `summaryStyle` / `connectorStyle` all confirmed routed to config — no dead props. Scene builders updated:
  - `ordinalSceneBuilders/connectorScene.ts` — connector default stroke `#999` → `themeSemantic.border || themeSemantic.secondary || #999`.
  - `ordinalSceneBuilders/statisticalScene.ts` — boxplot outlier default `#999` → theme secondary fallback.
  - `ordinalSceneBuilders/funnelScene.ts` — funnel connector body default `#999` → theme secondary fallback.
- **StreamNetworkFrame**: had NO theme threading at all before — added both `themeCategorical` AND `themeSemantic` to `NetworkPipelineConfig`, threaded through the memo. `nodeStyle` / `edgeStyle` / `particleStyle` confirmed routed. Scene builders updated:
  - `layouts/forceLayoutPlugin.ts` — force node fill `#007bff` → `themeSemantic.primary`, halo stroke `#fff` → `themeSemantic.surface`, edge stroke `#999` → `themeSemantic.border`.
  - `layouts/hierarchySceneBuilders.ts` — 5 sites: tree node halos, tree edge strokes, treemap rect strokes, circlepack node halos, and label text `#000` / halo `#fff` → `themeSemantic.text` / `.surface` (dark-mode legibility fix).
  - `layouts/orbitLayoutPlugin.ts` — orbit node fill `#6366f1` → theme primary, halo stroke `#fff` → theme surface.
  - `layouts/sankeyLayoutPlugin.ts` + `layouts/chordLayoutPlugin.ts` — edge-fill `#999` fallback → theme secondary/border.
  - `StreamNetworkFrame.tsx` — `getEdgeColor` / `getParticleColor` `#999` fallback → `edgeFallbackColor` from resolved theme.
- **StreamGeoFrame**: also had no theme threading before — added `themeCategorical` + `themeSemantic` to `GeoPipelineConfig`, threaded through the memo. `areaStyle` / `pointStyle` / `lineStyle` confirmed routed. The module-level `DEFAULT_AREA_STYLE` / `DEFAULT_POINT_STYLE` / `DEFAULT_LINE_STYLE` constants were converted to `themedDefaultArea(config)` / `themedDefaultPoint(config)` / `themedDefaultLine(config)` helper functions so the area fill (`#e0e0e0`), area stroke (`#999`), and point/line colors (`#4e79a7`) all resolve from the theme.

Regression tests ported to all three frames (`StreamOrdinalFrame.test.tsx`, new `StreamNetworkFrame.test.tsx`, new `StreamGeoFrame.test.tsx`) — each spies on its respective `updateConfig` method and asserts every declared `*Style` prop reaches the merged config. Network + Geo required a bespoke canvas-mock setup (no-op `requestAnimationFrame`) to avoid the continuous-render loop recursing on the shared mock's synchronous rAF invocation.

Playwright: new spec `primitive-theme-matrix.spec.ts` covers one chart per frame family (FunnelChart, TreeDiagram, ChoroplethMap) in light + dark — 6 snapshots total. Dark / light pairs visually differ where unstyled defaults pick up the theme (funnel bars, tree node fills, etc.), proving the plumbing works end-to-end.

#### Milestone 3 — Status-aware defaults + theme scales [LANDED]

Drives value off the semantic roles + sequential/diverging scales for the obvious candidates. All inventoried below.

- **PipelineConfig extensions** (`PipelineConfig`, `XYSceneConfig`, `OrdinalPipelineConfig`, `GeoPipelineConfig`): new top-level fields `themeSequential?: string` and `themeDiverging?: string` carry d3-scale-chromatic scheme names through the pipeline alongside `themeSemantic`. All four Stream Frames thread them from `currentTheme.colors.sequential` / `.diverging`.
- **Waterfall** positive/negative bar defaults in `waterfallScene.ts` — `ws?.positiveColor ?? config.themeSemantic?.success ?? "#28a745"` (same for negative → `.danger` → `#dc3545`). Unit coverage in `waterfallScene.test.ts` for both the theme path and hardcoded-fallback path.
- **Heatmap HOC** (`src/components/charts/xy/Heatmap.tsx`) — destructure-default dropped, priority now `colorScheme prop > useThemeSequential() > "blues"`. Local interpolator map expanded from 4 schemes to 12 so every sequential scheme name a preset might emit (`oranges` for tufte, `purples` for pastels, etc.) resolves correctly. Prop type widened to accept any sequential scheme name.
- **Heatmap scene builder** (`xySceneBuilders/heatmapScene.ts`) — matching interpolator-map expansion so the cell-color LUT covers the same 12 schemes. Unit coverage in `heatmapScene.test.ts` verifying `themeSequential` flows through and explicit `colorScheme` still wins.
- **ChoroplethMap HOC** (`src/components/charts/geo/ChoroplethMap.tsx`) — same pattern. Priority: explicit `colorScheme` > `useThemeSequential()` > `"blues"`.
- **LikertChart HOC** (`src/components/charts/ordinal/LikertChart.tsx`) — reads `useThemeDiverging()` and passes through to `defaultDivergingScheme(n, themeName)`. When a theme name is provided, the function samples the named d3 diverging interpolator at N evenly-spaced positions (supports `RdBu`, `PiYG`, `PRGn`, `BrBG`, `RdYlBu`, `RdYlGn`, `Spectral`). Without one, the Carbon palette remains. Unit coverage in `LikertChart.test.tsx` — new `defaultDivergingScheme` describe block covers the theme path, unknown-scheme fallback, and edge cases (n=0, n=1).
- **Shared hooks** — new `useThemeSequential()` and `useThemeDiverging()` in `src/components/charts/shared/hooks.ts`, matching the existing `useThemeCategorical` pattern.
- **Playwright** — new `integration-tests/status-scale-theme-matrix.spec.ts` with 6 baseline snapshots: waterfall (light / dark), heatmap (tufte / bi-tool — visibly oranges vs blues), likert (light / dark — RdBu diverging visible).

**Behavior change for existing consumers:** LikertChart without an explicit `colorScheme` prop now renders in the active theme's diverging scheme (LIGHT_THEME/DARK_THEME both declare `"RdBu"`). Prior behavior used a Carbon-inspired hardcoded palette regardless of theme. LikertChart tests updated to call `defaultDivergingScheme(n, "RdBu")` to match the new path.

#### Milestone 4 — Dead-prop sweep finish [LANDED]

**XY-side scene builder + store fallbacks (original M4 scope):**

- `xySceneBuilders/pointScene.ts` — default point fill now `ctx.config.themeSemantic?.primary || "#4e79a7"`. Resolved once per scene build, not per-datum. Unit coverage in `pointScene.test.ts`.
- `xySceneBuilders/swarmScene.ts` — same pattern. Unit coverage in `swarmScene.test.ts`.
- `PipelineStore.resolveLineStyle` — three `#007bff` fallbacks and the `#4e79a7` bounds-fill fallback all consult `this.config.themeSemantic?.primary` first. The pattern: `user > resolveGroupColor() > themeSemantic.primary > hardcoded`.
- `StreamXYFrame.tsx` crosshair + hover-point + line-highlight — `ThemeColors` interface gained a `primary: string` field (populated from `--semiotic-primary` in `resolveThemeColors`). The three `#007bff` hex fallbacks at lines 266/279/321 are now `theme.primary`. Inline `getComputedStyle(…).getPropertyValue("--semiotic-primary")` call removed — it duplicated the theme resolver that already runs upstream.

**Renderer-level fallback sweep (deferred follow-up, landed 2026-04-20):**

Rather than threading resolved theme defaults through every renderer's argument list, the sweep uses `resolveCSSColor(ctx, "var(--semiotic-role, #hex)")` — the existing `resolveCSSColor` helper already handles inline var() fallbacks via its regex's second capture group, so the renderer reads `--semiotic-*` from the canvas's computed style and falls back to the hardcoded hex when the var isn't set. No API change, no extra plumbing.

- `renderers/barCanvasRenderer.ts:24,74` — `#007bff` → `var(--semiotic-primary, #007bff)`.
- `renderers/boxplotCanvasRenderer.ts` — `#007bff` / `#333` fallbacks → `var(--semiotic-primary)` / `var(--semiotic-text)` with inline hex fallbacks.
- `renderers/heatmapCanvasRenderer.ts:74` — cell border `#fff` → `var(--semiotic-surface, #fff)`. The `#000` / `#fff` pair at line 40 (`contrastTextColor`) stays hardcoded — contrast is driven by cell luminance, not theme.
- `renderers/connectorCanvasRenderer.ts:48` — `#999` → `var(--semiotic-border, #999)`.
- `renderers/networkParticleRenderer.ts:31` — `#666` → `var(--semiotic-secondary, #666)`.
- `renderers/barFunnelCanvasRenderer.ts:51,166,170,175` — hatch base `#999` → `var(--semiotic-border, #999)`; label text pair `#333`/`#666` → `var(--semiotic-text, #333)` / `var(--semiotic-text-secondary, #666)`, resolved once per frame and hoisted above the label loop.

Test note: existing unit tests (e.g. `heatmapCanvasRenderer.test.ts`'s `"#fff"` cell-border assertion) remain green — in the jsdom test environment the canvas has no root with `--semiotic-*` set, so the inline var() fallback path produces the old hex literals. Assertion names updated to document the themed-fallback semantics.

### Phase B — Designer-facing API (visible, additive)

Ships per chart-type group (XY, Ordinal, Network, Geo). No breakage.

#### B1 — Foundations + reference implementations [LANDED]

Proof-of-pattern with three representative HOCs — one per primitive family.

- **`BaseChartProps`** extended with `stroke?: string`, `strokeWidth?: number`, `opacity?: number`. Full JSDoc documenting precedence (top-level > `frameProps.*Style` > HOC base > theme > hardcoded).
- **`mergeShapeStyle(styleFn, overrides)` helper** in `src/components/charts/shared/mergeShapeStyle.ts`. Returns the input function unchanged when no overrides are set (preserves useMemo identity for the common case). Applies overrides last so top-level primitive props win over both HOC base style and user-supplied `*Style` returns. 16 unit tests cover the common patterns plus edge cases (falsy overrides, unset args, mutation isolation).
- **BarChart / Scatterplot / LineChart** wired via the helper. Each destructures the three new props, invokes `mergeShapeStyle` in its existing merged-style useMemo chain. LineChart's legacy `lineWidth` prop remains; the top-level `strokeWidth` wins when both are set.
- **Test coverage per HOC**: 5 BarChart + 4 Scatterplot + 6 LineChart tests covering precedence, non-interaction with other style resolution paths, and the "no override keys when unset" invariant.
- **Renderer fix surfaced by the matrix**: `lineCanvasRenderer.ts:131` now routes `node.style.stroke` through `resolveCSSColor`. Without this, `stroke="var(--semiotic-primary)"` on a LineChart would land as a `var(...)` string on the canvas, silently rejected (falling back to `#000000`). Same bug pattern as the original crosshair-invisibility fix from 3.4 — same one-line fix.
- **Playwright** — 9 snapshots across 3 charts × 3 states (default / stroked / translucent). Confirms primitive props visibly reach every rendered shape: BarChart gets stroked rects, Scatterplot gets 0.4-opacity circles with grid lines showing through, LineChart renders red (`var(--semiotic-danger)` → `#d62728`) at strokeWidth 3.
- **Docs** — new "Primitive styling props" section in SemanticColorsPage covering the four first-class props, precedence ladder, when-to-reach-for-which, composition with `frameProps.*Style`. CLAUDE.md Common Props updated with the three new props + a paragraph explaining the precedence rules, synced to all AI mirror files.

#### B2 — Remaining HOC rollout [LANDED — 2026-04-19]

Mechanical application of the helper to every remaining shape-drawing HOC. Each one-line `mergeShapeStyle` overlay on the existing style-merge chain, templated on BarChart/Scatterplot/LineChart from B1.

- **Ordinal** — StackedBarChart, GroupedBarChart, PieChart, DonutChart, FunnelChart, SwimlaneChart, LikertChart, GaugeChart, DotPlot, BoxPlot, SwarmPlot, Histogram, ViolinPlot, RidgelinePlot (14/14 wired). BoxPlot/Histogram/ViolinPlot/RidgelinePlot wrap `summaryStyle`; the rest wrap `pieceStyle`. GaugeChart is the outlier — the primitive-merge happens around its useMemo-returned `pieceStyle` before it's passed to `streamProps`.
- **XY** — AreaChart, StackedAreaChart, BubbleChart, ConnectedScatterplot, QuadrantChart, Heatmap, MultiAxisLineChart (7/7 wired; ScatterplotMatrix and MinimapChart compose other HOCs and inherit by delegation — no separate wire-up needed).
- **Network** — ForceDirectedGraph, SankeyDiagram, ChordDiagram, TreeDiagram, Treemap, CirclePack, OrbitDiagram (7/7 wired). ForceDirectedGraph and SankeyDiagram wrap both `nodeStyle` and `edgeStyle`. Treemap inserts `nodeStyleFnWithPrimitives` before the selection-aware wrapper. ChordDiagram preserves its conditional-undefined return.
- **Geo** — ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram (4/4 wired). FlowMap wraps both `lineStyleFn` and `pointStyleFn`.
- **Realtime** — RealtimeLineChart, RealtimeSwarmChart (already had the props pre-B), RealtimeHistogram, RealtimeWaterfallChart (4/5 wired). RealtimeHeatmap deferred — no user-facing style surface; fills come from the heatmap LUT. Opacity added to `BarStyle` / `LineStyle` / `WaterfallStyle` interfaces in `realtime/types.ts`; scene builders (`barScene`, `waterfallScene`) consume the new field and thread it into the rect node style. `XYSceneConfig.waterfallStyle` inline type extended to match.
- **Renderer CSS-var audit** — Wrapped every user-facing stroke/fill path through `resolveCSSColor` in `networkRectRenderer`, `networkArcRenderer`, `networkCircleRenderer`, `networkEdgeRenderer` (all four edge types: bezier / line / ribbon / curved), `boxplotCanvasRenderer` (fillColor + strokeColor), `candlestickCanvasRenderer` (wickColor + body up/down colors), and `waterfallCanvasRenderer` (connector stroke). `lineCanvasRenderer` / `pointCanvasRenderer` / `barCanvasRenderer` / `areaCanvasRenderer` / `wedgeCanvasRenderer` / `connectorCanvasRenderer` / `trapezoidCanvasRenderer` / `violinCanvasRenderer` / `geoCanvasRenderer` already wrapped their user-facing stroke paths (from prior milestones or B1).
- **Playwright** — Matrix extended from 9 → 18 fixtures. Added BoxPlot (ordinal summary), SankeyDiagram (network nodes + edges), and RealtimeLineChart (realtime `lineStyle.opacity`), each in default / stroked / translucent states. `integration-tests/primitive-props-examples/index.js` grew deterministic fixtures for each new family (hand-picked boxplot values, three-node A→B→C sankey, 20-point sinusoidal realtime buffer).

### Phase C — Consolidation [CLOSED — not pursued, 2026-04-20]

Evaluated after B2 + M4 landed. **Recommendation: don't pursue.** The consolidation already exists — the hypothesis missed that `PipelineStore` / `OrdinalPipelineStore` already expose the resolvers (`resolveLineStyle`, `resolveAreaStyle`, `resolveBoundsStyle`, `resolvePieceStyle`, `resolveSummaryStyle`) via `XYSceneContext` / `OrdinalSceneContext`, and every scene builder is a thin dispatcher that calls them. The `mergeShapeStyle` helper at the HOC layer (B1) handles the top-level primitive-prop override.

Findings from the scene-builder audit:
- **All 20+ scene builders** follow one of two dispatch patterns: call the context resolver once per group (XY line/area/bounds, ordinal bar/pie/funnel) or per-datum (XY points, ordinal swarm/point/swimlane). No repeated fallback-chain code inside the builders.
- **Per-family variance is genuine, not incidental.** Waterfall resolves `themeSemantic.success`/`.danger` for positive/negative deltas; candlestick has a three-color triad (up/down/wick); connectors fall back to `.border`/`.secondary`; heatmap ignores the piece-style surface entirely in favor of a sequential LUT. A unified `resolveShapeStyle(userStyle, groupColor, themeFallback, hardcoded)` would still need a parameter for which semantic role to consult — at which point it's just a thin wrapper over already-thin dispatchers.
- **A shared helper would add indirection without removing duplication.** The duplication candidates (~5–10 lines per builder) are the resolver call + node construction, not the resolution logic itself. Moving the call site into a helper would obscure where per-primitive defaults come from without eliminating them.

**Status:** Consolidation goal already satisfied by B1 (`mergeShapeStyle` for HOC-layer override) + Phase A milestones 1–3 (pipeline-store resolvers with theme fallbacks). Phase C closed without code changes.

### Non-goals

- Renaming `pieceStyle` / `pointStyle` / `nodeStyle` to a single name. Top-level primitive props cover the designer case; existing function-form names remain for power users.
- Replacing `colorBy` / `colorScheme` machinery.
- Touching hover / focus / selected visual states. Related but separable.

### Risks

- **Canvas cascade timing.** `getComputedStyle` on the frame element resolves `--semiotic-*` from ancestors but requires the DOM node to exist. First paint may fall back to preset defaults, then re-resolve on next render. Verify no visible flash. Milestone 1 snapshots didn't exhibit flash, but further milestones should spot-check.
- **SSR role resolution.** Server renderer has no DOM to query. Falls back to theme-object JS values directly — already how `themeCategorical` works, same pattern applies.
- **Precedence drift.** "Top-level wins over function" is simple in principle but easy to break per-HOC. Single `mergeShapeStyle` helper applied everywhere, one decision point.

### Notes from milestone 1 (for future milestones)

- `themeSequential` / `themeDiverging` were *not* plumbed into `PipelineConfig` yet — only `themeSemantic`. Milestone 3 needs to add them. Current sequential/diverging values on `SemioticTheme` are still named d3-scale-chromatic scheme strings (not arrays), so the thread is a string copy, not a palette expansion.
- The `*Style`-prop regression test (`StreamXYFrame.test.tsx:716+`) uses `vi.spyOn(PipelineStore.prototype, "updateConfig")`. Pattern transfers cleanly to `OrdinalPipelineStore`, `NetworkPipelineStore`, `GeoPipelineStore`.
- The CSS-cascade-override pattern was verified against a real render (the "scoped" snapshot in `histogram-theme-stroke.spec.ts-snapshots/`). Extending the harness to cover other shape primitives is straightforward copy-paste-edit.
- `barStyle.gap` override was added opportunistically (existed on the `BarStyle` type but was ignored by `barScene`). Worth auditing other style objects for similarly-ignored fields when touching each scene builder.

---
