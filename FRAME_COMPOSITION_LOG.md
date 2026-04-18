# Frame Composition Hook — Extraction Log

**Status**: in progress
**Branch**: `frame-composition-hook`
**Started**: 2026-04-17
**Goal**: Reduce maintenance burden by pulling shared concerns out of the four
Stream Frames (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`,
`StreamGeoFrame`) into a single composition hook (`useFrame`).

This is the file the user reads to (a) understand what was changed, (b) know
where the regression risk lives, (c) decide what to click-test manually after
the unit/integration suites pass.

---

## Approach (the rules I'm following)

1. **One concern at a time.** No "while I'm here" expansions. Each extraction
   is its own commit with its own tests.
2. **Smallest blast radius first.** Stateless utilities before lifecycle
   wiring before pointer event handling.
3. **Tests precede migration.** A concern doesn't move until I've added a
   unit test that asserts the behavior in the new location.
4. **One frame migrates first.** Pick the one that exercises the concern most
   completely. Run the full test suite. Only then migrate the other three.
5. **No commit moves to the next concern until all four frames migrated.**
   Half-migrations rot.
6. **Test gate per commit:** `npm run typescript` + `npm run test` (vitest) +
   `npm run dist` build pass. Full Playwright suite at end of each concern.
7. **Behaviors I can't unit-test** (timing, paint order, browser-only quirks)
   get flagged in this doc as "click-testing recommended" so the user knows
   what to manually verify before merge.

---

## Investigation summary

The four Stream Frames total **5,416 LoC**: XY 1,468; Network 1,431; Geo 1,361;
Ordinal 1,156. Each opens with 100–200 lines of "setup boilerplate" that's
~80% identical across frames; they then diverge into family-specific pipelines,
hit testers, renderers, and SVG overlays.

Concerns identified are sorted into four tiers by blast radius:

- **Tier A — drop-in substitutions.** Pure utility patterns that already
  duplicate identically. Risk: trivial (typecheck catches drift).
- **Tier B — small hook-shaped utilities.** Have a tiny amount of state
  (refs, useState pairs) but no event coupling. Risk: low.
- **Tier C — lifecycle + event handling.** Real behavior, real timing,
  real risk. Includes hover-handler refs, rAF-coalesced pointermove, SSR
  early-return path, accessibility wiring. Risk: medium-high.
- **Tier D — deliberately frame-specific.** Listed below for clarity but
  NOT extracted. Pipelines, hit testers, family-specific layouts, brushes,
  force-tick loops, projection/zoom, layout plugins.

The full catalog (Tiers A–C) follows below. Tier D is in
**"Concerns deliberately left in place"** at the bottom.

---

## Concerns to extract — catalog

Each entry: `[tier] description → from where → why share → extraction order`.

### Tier A — drop-in substitutions (work through these first)

1. **`resolveAnimateConfig(animate, transitionProp)`** — 1 line per frame,
   identical call. The most trivial possible extraction.
2. **`useReducedMotion()` + ref-mirror pattern** — 3 lines per frame, identical.
3. **`useResponsiveSize(sizeProp, responsiveWidth, responsiveHeight)` →
   `[responsiveRef, size]`** — 1 line per frame, identical.
4. **`adjustedWidth` / `adjustedHeight` derivation** — 2 lines per frame,
   identical formula `size[0] - margin.left - margin.right`.
5. **`resolvedForeground` / `resolvedBackground`** — 3-line function-or-node
   resolution pattern, identical.
6. **`useThemeSelector((s) => s.theme)` → `currentTheme`** — 1 line per
   frame, identical selector.
7. **`tableId = `semiotic-table-${React.useId()}\``** — 1 line, currently
   declared in 2/4 frames at top and 2/4 frames at render-time. Standardize.

### Tier B — small hook-shaped utilities

8. **rAF-coalesced `scheduleRender`** — `rafRef` + `useCallback` that bails
   if rAF already scheduled. ~5 lines per frame, identical pattern.
9. **Theme-change effect** — `useEffect` watching `currentTheme` that calls
   `clearCSSColorCache(canvas)` + `scheduleRender()`. ~5 lines per frame,
   identical pattern (with slight Network variant — Network has no canvas
   ref to pass to clearCSSColorCache, calls it without args).
10. **Shared canvas refs cluster** — `canvasRef`, `dirtyRef`, `rafRef`,
    `hoverRef`, `renderFnRef`. Mechanical grouping; the values stay frame-owned
    but the ref creation can be one helper call returning the ref bundle.
11. **Shared `useState` declarations** — `[hoverPoint, setHoverPoint]`,
    `[currentScales, setCurrentScales]`, `[annotationFrame, setAnnotationFrame]`.
    Same caveat: mechanical grouping; behavior unchanged.
12. **Margin defaults + merge** — pattern is `{ ...DEFAULT_MARGIN, ...userMargin }`
    but `DEFAULT_MARGIN` differs per frame and Network has a `CENTERED_MARGIN`
    branch. Extract takes a frame-supplied default.

### Tier C — lifecycle + event handling

13. **`AccessibleDataTable` + `SkipToTableLink` wiring** — 2 lines at the
    top of the rendered tree, identical placement, but the table component
    differs per family (Network uses `NetworkAccessibleDataTable`; XY/Ordinal/Geo
    use `AccessibleDataTable`). Extract takes a family-supplied table renderer.
14. **`DataSourceAdapter` lifecycle (XY + Ordinal only)** — adapter creation,
    onChangeset wiring, `clear()` on unmount. 2 of 4 frames; extract scoped
    to those two.
15. **`AriaLiveTooltip` + `ScreenReaderSummary` wiring** — 2 lines per frame,
    identical placement.
16. **Hover handler ref + rAF-coalesced pointermove** — the highest-risk
    one. The `HoverPointerCoords` type was just standardized; the rAF
    coalescing was added in 3.4.x. Same pattern across all 4 but each frame
    constructs a slightly different `HoverData` shape inside.
17. **SSR early-return path** — `if (isServerEnvironment) { ...return JSX
    with SVG instead of canvas... }`. Same shape across all 4, but the
    inner SVG content is family-specific. Extract takes a render-svg
    callback from the family frame.
18. **Keyboard navigation + `FocusRing`** — `extractXYNavPoints` /
    `extractOrdinalNavPoints` / `extractNetworkNavPoints` /
    `extractGeoNavPoints` are family-specific, but the wiring (state,
    arrow-key handlers, FocusRing render) is identical. Extract the wiring;
    each family supplies the extract function.

### Extraction order (commit-by-commit)

Smallest blast radius first; each entry is one commit.

| # | Concern | Tier | Est. LoC delta | Files touched |
|---|---|---|---|---|
| 1 | Scaffold `useFrame.ts` + skeleton tests | — | +120 | 2 new |
| 2 | `resolveAnimateConfig` extraction | A | -4, +1 | 5 |
| 3 | `useReducedMotion` + ref consolidation | A | -12, +4 | 5 |
| 4 | `useResponsiveSize` consolidation | A | -4, +1 | 5 |
| 5 | `currentTheme` selector consolidation | A | -4, +1 | 5 |
| 6 | `tableId` standardization | A | -2, +1 | 5 |
| 7 | `resolvedForeground`/`Background` extraction | A | -28, +8 | 5 |
| 8 | `adjustedWidth`/`adjustedHeight` derivation | A | -8, +2 | 5 |
| 9 | Margin merge (with frame-supplied default) | A | -16, +4 | 5 |
| 10 | Common state cluster (`hoverPoint`, `currentScales`, `annotationFrame`) | B | -12, +6 | 5 |
| 11 | Common refs cluster (`canvasRef`, `rafRef`, `dirtyRef`, `hoverRef`, `renderFnRef`) | B | -20, +8 | 5 |
| 12 | `scheduleRender` (rAF coalesce) | B | -20, +6 | 5 |
| 13 | Theme-change effect (clearCSSColorCache + scheduleRender) | B | -20, +8 | 5 |
| 14 | `AriaLiveTooltip` + `ScreenReaderSummary` placement | C | -16, +6 | 5 |
| 15 | `AccessibleDataTable` + `SkipToTableLink` wiring (with frame-supplied table) | C | -16, +12 | 5 |
| 16 | `DataSourceAdapter` lifecycle (XY + Ordinal only) | C | -40, +20 | 3 |
| 17 | SSR early-return path (with frame-supplied SVG renderer) | C | -200, +50 | 5 |
| 18 | Keyboard nav + `FocusRing` wiring (with frame-supplied extract) | C | -100, +40 | 5 |
| 19 | Hover handler ref + rAF-coalesced pointermove | C | -80, +30 | 5 |

After 19: full Playwright + visual regression sweep. Then Task #62.

---

## Per-concern extraction log

### 1. Scaffold + Tier A (group A bundle)

- **Category**: scaffold + multiple Tier A concerns extracted together.
- **What it bundles**: animate-config resolution, reduced-motion + ref-mirror, responsive sizing, theme selector, tableId, foreground/background graphics resolution, adjustedWidth/Height derivation, margin merge.
- **Why grouped**: the hook can't usefully exist with just one concern; each concern is a single-line drop-in. Migration into the four frames is still split per-frame so blast radius stays bounded.
- **What changed in behavior**: nothing. Each piece is the same function/value as before, just sourced from one hook.
- **Risk if wrong**: low. Type system catches drift; per-concern unit tests assert behavior.
- **Existing tests**: implicitly via every existing frame test that exercises sizing, margins, theme rendering, intro animation.
- **New tests added**: `src/components/stream/useFrame.test.ts` — 21 tests covering each Tier A concern's contract (sizing, margin merge, graphics resolution, theme tracking, animate, reduced motion, table id).
- **Click-testing recommended**: none for the scaffold itself. Migrations of each frame are where click-testing applies; see entries 2–5.
- **Complexity**: hook is 175 LoC (heavy on doc comments); test file is 200 LoC. No frame migration yet.
- **Status**: extracted, 4/4 frames migrated.
- **Commit**: b37784db (scaffold), ac1a283d (Ordinal), 73e78764 (XY/Network/Geo bundle).
- **Per-frame notes**:
  - **Ordinal**: clean migration. `dirtyRef = useRef(true)` left untouched per investigation note #3.
  - **XY**: had a complication — XY post-mutates `margin` for marginalGraphics expansion (auto-expands any side with a configured marginal to ≥60px). The hook returns a memoized margin object; mutating it would corrupt the next render's "same" reference. Fix: XY destructures `frame.margin` as the starting point, and when marginalGraphics needs expansion, copies it into a frame-local `margin` and re-resolves `resolvedForeground`/`Background` against the expanded margin. Behavior preserved: function-form graphics callbacks still see the post-expanded margin, same as before.
  - **Network**: clean migration. `CENTERED_TYPES.has(chartType) ? CENTERED_MARGIN : DEFAULT_MARGIN` is computed inline and passed to useFrame as `marginDefault` — the hook stays family-agnostic.
  - **Geo**: clean migration. Geo also accepts legacy `width`/`height` props as fallback; resolved before passing to useFrame so the hook's input contract stays a single `[number, number]`.
- **Click-testing recommended** (one canonical chart per family is enough — the migration is structurally identical):
  1. Theme switch (light → dark → tufte): bar chart, scatter, force graph, choropleth — each should redraw with new palette.
  2. Responsive resize: drag a window narrower with a `responsiveWidth` chart in any family; size should track without flicker.
  3. Intro animation: `<BarChart animate>` first mount — bars should grow from baseline.
  4. Reduced motion: toggle OS pref, reload — `animate` should be ignored.
  5. Marginal graphics (XY-specific): scatter with `marginalGraphics={{ top: ..., right: ... }}` — margins should auto-expand to ≥60px on configured sides.
  6. Accessible data table: any chart with `accessibleTable` (default true) — tab should focus the SkipToTableLink and reach the table.

### 2. `scheduleRender` + rAF cancel-on-unmount (Tier B)

- **Category**: lifecycle + event-handling — render scheduling and cleanup.
- **Pulled from**: ~5 lines in each of XY (575–580), Ordinal (429–434), Network (527–537), Geo (322–327) for `scheduleRender`. Plus 1 line per frame in the unmount effect for the rAF cancel (XY 1111, Ordinal 843, Network 1191, Geo 856).
- **What it does**: coalesces render requests into one rAF-per-frame; cancels any pending rAF on unmount so a render closure can't fire after the component is gone.
- **Why share**: identical pattern across 3 frames; Network's variant accepted an `isContinuous` flag whose effect was provably equivalent to the simple version (the inner `if (!rafRef.current)` guard makes the outer `&& !isContinuous` dead code). Documented in the migration commit so the equivalence is on record.
- **What changed in behavior**: nothing. The hook's scheduleRender uses the simple semantics that all four frames had effectively. The unmount cancel happens in the hook's own useEffect cleanup; the frames' previous unmount-effect cancellations are removed (would have been redundant but harmless).
- **Risk if wrong**: medium. Render coalescing failures show up as either (a) doubled paints (if the bail check breaks), or (b) silent hangs if scheduleRender stops scheduling. Cleanup failures show up as console errors after unmount in StrictMode — which IS exercised by the existing tests.
- **Existing tests**: every existing render-cycle test in the four frame test suites — they all rely on this path implicitly.
- **New tests added**: 8 in `useFrame.test.ts` under "scheduleRender (rAF coalescing)" — single-rAF queue, coalescing, latest-renderFnRef, requeue-after-reset, cancel-on-unmount, no-op-cancel-when-empty, ref identity stability, callback identity stability.
- **Click-testing recommended**: rapid streaming push (RealtimeLineChart with high-frequency push) — should remain fluid, no flicker. Mount-then-immediately-unmount (e.g., dashboard tab switch during streaming) — no console errors after the unmount.
- **Complexity**: 4 frames × ~6 LoC removed for scheduleRender; 4 frames × 1 LoC removed for cleanup; +25 LoC in useFrame. Net -4 LoC, but more importantly: one source of truth for rAF coalescing.
- **Status**: extracted, 4/4 frames migrated, 33 hook tests + 3033 total vitest green.
- **Commit**: c5345b6a

### 3. Theme-change effect (Tier B)

- **Category**: lifecycle — invalidate canvas color cache + force redraw on theme change.
- **Pulled from**: ~5 lines in each of XY (588–594), Ordinal (438–445), Network (548–553), Geo (328–333). Identical body modulo the `clearCSSColorCache(canvasRef.current)` vs `clearCSSColorCache()` call shape.
- **What it does**: when `currentTheme` changes (or on mount), calls `clearCSSColorCache()`, sets `dirtyRef.current = true`, and queues a render. Without this, canvas paint keeps drawing with the old theme's colors until the next data-driven repaint.
- **Why share**: identical pattern. Investigation found the canvas-arg vs argless distinction was cosmetic — `clearCSSColorCache`'s parameter is `_canvas?` (underscore-prefixed = unused; the cache is global, keyed on a version counter). Both call shapes reduce to the same global counter bump.
- **What changed in behavior**: nothing. The hook installs the effect with the same dependency array (`[currentTheme, scheduleRender, themeDirtyRef]`). Frames pass their own `dirtyRef` to preserve the per-family initial value (XY/Geo init `false`; Ordinal/Network init `true`).
- **Risk if wrong**: medium. Theme switch failures are visible — chart keeps drawing in old palette. The themed-charts visual snapshot suite (5 themes × 6 charts = 30 baselines) catches palette drift directly.
- **Existing tests**: themed-charts.spec.ts (Playwright, 30 chromium-darwin baselines), unit tests for `resolveCSSColor` cache invalidation.
- **New tests added**: 4 in `useFrame.test.ts` under "theme-change effect" — opt-in (no install when `themeDirtyRef` not provided), mount-time invocation (sets dirty + queues render), preserves initial-value-true behavior, no re-fire on irrelevant rerender.
- **Click-testing recommended**: switch ThemeProvider theme on a live chart in any family — chart should immediately repaint with the new palette/background. Specifically test: light → dark → tufte → bi-tool-dark → light cycle on at least one chart per family.
- **Complexity**: 4 frames × ~6 LoC removed; +25 LoC in useFrame (mostly comments). Required moving `dirtyRef` declaration above the `useFrame` call in each frame so it can be passed in (mechanical).
- **Status**: extracted, 4/4 frames migrated, 37 hook tests + 3037 total vitest green.
- **Commit**: pending

---

## Per-concern extraction template

When a concern is extracted, an entry is added below using this format:

### N. <Concern Name>

- **Category**: lifecycle | event-handling | theming | accessibility | observation | animation | layout | rendering | api | sizing | identity
- **Pulled from**: paths and approximate line ranges in each frame
- **What it does**: 1-2 sentences
- **Why share**: why this is shared in spirit even when duplicated by accident
- **What changed in behavior**: nothing, by design — but if anything subtle did, called out here
- **Risk if wrong**: severity (low/medium/high) + concrete failure modes
- **Existing tests**: tests that already cover this behavior (vitest + integration)
- **New tests added**: paths + what they assert
- **Click-testing recommended**: behaviors that aren't easily unit-testable and benefit from a real-browser sanity check
- **Complexity**: lines moved + number of touch sites + how subtle the timing is
- **Status**: extracted (in useFrame) | migrated (N/4 frames) | verified (full suite passes)
- **Commit**: SHA

---

## Risks identified during investigation (separate from per-concern risks)

These are hazards I noticed reading the four frames that don't belong to any
single concern but apply to the migration as a whole.

1. **Slightly divergent margin defaults.** Network has both `DEFAULT_MARGIN`
   and `CENTERED_MARGIN`, switched on `chartType`. Ordinal/Geo's defaults
   differ. The margin-merge extraction must accept a frame-supplied default,
   not own one.
2. **`clearCSSColorCache` signature.** XY/Ordinal/Geo call it with the
   canvas ref; Network calls it with no args (because Network's renderers
   don't read theme via canvas getComputedStyle the same way). The
   theme-change effect extraction must respect this — pass canvas if the
   frame opts in, otherwise call argless.
3. **`dirtyRef` initial value.** XY/Geo init it to `false`; Ordinal inits
   to `true` (forces a first paint). Don't unify the initial value
   without checking — it's load-bearing for first-paint timing in Ordinal.
4. **`isStale` only exists in XY + Ordinal.** Network/Geo don't track
   staleness. The state-cluster extraction must make this opt-in.
5. **`isStreaming` formula varies.** XY: `runtimeMode === "streaming" ||
   ["bar", "swarm", "waterfall"].includes(chartType)`. Ordinal: just
   `runtimeMode === "streaming"`. Network/Geo: don't use the concept the
   same way. Don't extract `isStreaming` calculation; let frames compute
   their own.
6. **`renderFnRef` is a forward-declared closure pattern.** Each frame
   defines `renderFnRef.current = () => {...}` later in the body, with
   the closure capturing local state. The extraction can give you the
   ref but the assignment stays frame-local — and in the frame body's
   bottom half, not the top.
7. **StrictMode double-invocation.** The 3.4.x `DataSourceAdapter.clear()`
   on unmount fix was specifically about double-mount cleanup. Any
   extraction that rewrites the cleanup ordering must preserve the same
   semantics. Add a regression test that asserts adapter.clear() is
   called once per real unmount.
8. **The hover-handler contract was just standardized** in 3.4.x as
   `HoverPointerCoords` (the "PR Review 3" pass). The rAF-coalesced
   pointermove relies on it. The extraction must not regress that contract.
9. **SSR detection branch is at different points** in each frame's
   render body (XY at line 1206, Ordinal 894, Network 1227, Geo 1104),
   not always early. Some refs / state are set up before it. The
   extraction must produce the same observable behavior — i.e. SSR
   environment must still take the SVG path even if hooks have already
   run.
10. **AccessibleDataTable component differs by family.** Network uses
    `NetworkAccessibleDataTable` (scene + edges); the others use
    `AccessibleDataTable` (single scene). The extraction must accept a
    family-supplied table renderer, not assume one component.

---

## Frames not migrated / concerns deliberately left in place

These were considered and deliberately kept frame-specific. Listed here so
future readers know it was a decision, not an oversight.

- **Pipeline stores** (`PipelineStore`, `OrdinalPipelineStore`,
  `NetworkPipelineStore`, `GeoPipelineStore`) — different APIs by design;
  a network store thinks in nodes/edges, a geo store in projections. No
  abstraction worth the constraint.
- **Hit testers** (`CanvasHitTester`, `OrdinalCanvasHitTester`,
  `NetworkCanvasHitTester`, `GeoCanvasHitTester`) — same story; geometry
  differs (point lookup vs. polygon hit vs. node-and-edge tree).
- **Scene-node renderers** (`pointCanvasRenderer`, `barCanvasRenderer`,
  `wedgeCanvasRenderer`, etc.) — already extracted as pure functions; no
  shared frame-level wiring needed.
- **Family-specific layout** — XY scale resolution (linear/log/time),
  ordinal projection (radial vs linear), force-tick loop (Network),
  projection + zoom + drag-rotate (Geo). All resist generalization.
- **Brushes** — XY linkedBrush (XY/Y/X), Ordinal linkedBrush (R-axis only),
  Geo zoom-as-brush. Three different abstractions; no shared shape.
- **Linked crosshair** — XY only.
- **Tile basemap** — Geo only (Mercator-only constraint).
- **Force animation loop** — Network only.
- **Layout plugins** (`sankeyLayoutPlugin`, `chordLayoutPlugin`,
  `treeLayoutPlugin`) — Network only. Vendor-adjacent code.
- **`SVGOverlay`** — each family has its own (`StreamNetworkFrame`'s
  `NetworkSVGOverlay`, `StreamOrdinalFrame`'s `OrdinalSVGOverlay`, etc.)
  because axes / radial labels / projection chrome are family-specific
  enough that generalizing would create more wrapper than it eliminates.

---

## Final test gate

To be filled in at the end:

- [ ] `npm run typescript` clean
- [ ] `npm run test` (vitest, 3000+ tests)
- [ ] `npm run dist` + `npm run dist:prod` clean
- [ ] `npm run test:dist` (Playwright) green on chromium-darwin
- [ ] Visual snapshot suite green (no diffs beyond tolerance)
- [ ] Click-testing checklist (below) reviewed

## Click-testing checklist

Items the user should manually verify in a real browser before merging:

(Filled in as concerns get migrated. Each item links back to its per-concern
entry above.)
