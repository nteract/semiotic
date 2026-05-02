# Roadmap and Maintenance Context

Last reviewed 2026-05-02.

This file name is historical. Treat this document as maintainer context for roadmap planning, release review, and future investment areas, not as a defect list. Items below are classified as compatibility direction, optional product extensions, profile-guided optimization candidates, or historical implementation notes. Do not cite an item as a current bug or release blocker unless a current release gate fails or current source inspection confirms it.

Completed release work belongs in `CHANGELOG.md`. Current release confidence comes from the package scripts and CI gates in `package.json` and `.github/workflows/node.js.yml`.

## How To Read This File

1. Release confidence and documentation correctness are ongoing guardrails.
2. Public API coherence items are compatibility design work unless explicitly labeled as blockers.
3. Rendering and visual coverage items describe the current coverage posture plus incremental fixtures that could be added.
4. Performance work should stay profile-guided and scale-justified.
5. Product extensions are useful directions, not release requirements.

---

## API and Compatibility Roadmap

### Pure utility entry points and React-flavored helpers

`semiotic/utils` and `semiotic/themes` intentionally carry stable compatibility exports today. Most exports are pure helpers (`theme` constants, formatters, color helpers, validators, `fromVegaLite`, `RingBuffer`, `IncrementalExtent`); a smaller set are React-flavored conveniences (`ThemeProvider`, `useTheme`, `useReducedMotion`, `useHighContrast`, `MultiPointTooltip`, `exportChart`).

The future-facing API design question is whether to add a clearer pure/server lane and React/client lane. In React Server Component environments, file-level `"use client"` propagation means a bundle with React-only re-exports can be treated as client-only even when a specific helper is pure. The current package shape is supported and honest about that mixed compatibility surface; a future split would make the intent easier for bundlers and agents to reason about.

Compatibility path under consideration:

- Keep the existing entry points stable during a deprecation period.
- Move React-oriented helpers into a new entry point such as `semiotic/react`, or absorb them into the main `semiotic` bundle.
- Leave `semiotic/utils` and `semiotic/themes` as pure bundles once the migration window is acceptable.
- Update docs and `semiotic-codemod` so consumers have a mechanical path if the split lands.

Decision points:

- Audit docs, examples, and known consumers for imports from `semiotic/utils` and `semiotic/themes`.
- Choose the target entry point name and migration story.
- Decide whether this is a 3.x additive migration with deprecated re-exports, or a 4.0 cleanup.

### Codemod for `nodeIDAccessor` to `nodeIdAccessor`

`ForceDirectedGraph` accepts `nodeIdAccessor` as the canonical camelCase prop name. `nodeIDAccessor` remains supported as a `@deprecated` alias until 4.0.

The codemod is a migration convenience, not a runtime gap. A jscodeshift transform in the external [`semiotic-codemod` repo](https://github.com/emeeks/semiotic-codemod) would let consumers silence IDE deprecation warnings mechanically.

Sketch:

- Transform name: `force-directed-graph-node-id`.
- Walk every `<ForceDirectedGraph ...>` JSX element.
- Rename an opening-element `nodeIDAccessor` attribute to `nodeIdAccessor`.
- Skip when `nodeIdAccessor` is already present.
- Add fixture pair under `tests/__testfixtures__/force-directed-graph-node-id.{input,output}.tsx`.
- Add to the recipe order in `bin/cli.js` after `subpath-imports`.

### Turbopack subpath resolution note

Semiotic's subpath exports resolve correctly through Node, webpack, esbuild, and Vite against the package exports map. Turbopack, Next.js's newer dev bundler, has intermittently failed to resolve subpath exports such as `semiotic/xy` from a Server Component in the SSR demo project at `~/sandbox/semiotic-ssr-demo`.

The package exports map is well-formed by spec. The practical compatibility note for Next.js users is to use webpack mode if Turbopack hits this resolver edge case:

```bash
next dev --webpack
next build --webpack
```

Follow-up path:

- Reduce the behavior to a minimal Turbopack repro and file upstream.
- If root cause points to package shape rather than the bundler, consider whether import targets should avoid the `.module.min.js` suffix and leave minification to consumer builds.
- Keep documenting the independent `file:` dependency behavior: `npm install` symlinks local packages by default, while `npm install --install-links` copies them. Copying is the reliable local demo setup for both webpack and Turbopack.

### Isomorphic SSR and hydration reference

Semiotic now supports true isomorphic charts for every non-streaming HOC: the chart renders server-side as SVG, the client hydrates that SVG without a React mismatch, and canvas plus interactivity attach in place after hydration. This section is retained as architectural context for future reviews.

**Phase 1 - landed 2026-05-01 (XY frame).** `useHydration()` and the `StreamXYFrame` SSR branch make server output match the first client render. After the first commit, `useLayoutEffect` flips `hydrated` and the canvas branch upgrades the same DOM subtree. `StreamXYFrame.hydration.test.tsx` gates the `renderToString` + `hydrateRoot` round trip with no React mismatch warnings.

**Phase 2 - landed 2026-05-01 (XY catalog).** `charts/xy/hydration.test.tsx` parametrizes the hydration contract across all 13 XY HOCs: LineChart, AreaChart, StackedAreaChart, Scatterplot, ConnectedScatterplot, BubbleChart, Heatmap, ScatterplotMatrix, QuadrantChart, MultiAxisLineChart, CandlestickChart, MinimapChart, XYCustomChart. Each passes the three-part check: no `<canvas>` in server output, no React mismatch warnings on hydrate, canvas live after the swap.

**Phase 3 - landed 2026-05-01 (ordinal, network, and geo catalogs).** `StreamOrdinalFrame`, `StreamNetworkFrame`, and `StreamGeoFrame` use the same hydration integration. Parametrized regression tests cover every shipped ordinal, network, and geo HOC. The scene primitives involved in wedges, ribbons, Sankey beziers, hierarchy rects, orbit arcs, force-directed positions, and projected feature paths round-trip through `SceneToSVG` cleanly.

The final verification matrix includes the geo catalog. That coverage is called out because it is a useful example of why the release matrix enumerates all four frame families explicitly.

**Phase 4 - landed 2026-05-01 (intro continuity).** Animations resolve correctly across the hydration boundary. `useWasHydratingFromSSR` distinguishes SSR rehydration from pure CSR mounts, and `cancelIntroAnimation` prevents the first hydrated canvas paint from replaying the intro animation after the user has already seen the server-rendered final state. Pure CSR mounts keep their intro animation, and subsequent data-change transitions still animate normally.

Result: every non-streaming HOC auto-hydrates from a React Server Component with no `"use client"` ceremony, no manual placeholder, no `next/dynamic` scaffolding, and no re-animated intro.

Streaming charts stay deliberately canvas-only. `RealtimeLineChart`, `RealtimeHistogram`, and related push-driven charts should use the documented manual placeholder pattern (`next/dynamic({ ssr: false })` plus a `semiotic/server` `renderChart` placeholder) when an SSR placeholder is useful.

---

## Visual and Rendering Coverage Posture

### HOC-level visual snapshots

Complete as of 2026-04-29: every HOC in `chartSpecs.ts` has at least one default-theme visual snapshot. The animated-HOC pass made the realtime charts and `OrbitDiagram` pixel-stable by using static data and disabling time-varying behavior where appropriate.

Operational note:

- Bootstrap Linux baselines from the CI `playwright-snapshots` artifact when new baseline families are introduced.

### Interaction-state visual snapshots

Covered interaction fixtures include hover state, `hoverHighlight`, brush selection, legend isolation, and linked-hover cross-highlight. A click-locked crosshair snapshot in `linkedHover` x-position mode would be an additional high-specificity fixture if that regression class becomes important enough to gate.

Optional expansion:

- Add a 2-step driver test and snapshot for click-locked linked-hover crosshair state.

### SSR-vs-CSR rendering gates

Structural parity landed 2026-05-01 in `src/components/server/ssr-csr-parity.test.tsx`. It exercises `renderChart` from `semiotic/server` and the in-frame SSR branch for a representative matrix: LineChart, BarChart, PieChart, SankeyDiagram, Treemap.

Pixel-level Playwright coverage landed 2026-05-01 in `integration-tests/ssr-parity.spec.ts`. It snapshots server-rendered SVG and client-rendered canvas for the same chart matrix. The two sides are intentionally baselined separately because SVG and canvas anti-aliasing differ; per-side baselines make drift reviewable without requiring byte-for-byte equivalence between renderers.

Documented expected divergence: `renderChart` emits data marks while the in-frame SSR branch includes SVGOverlay chrome such as axes and legends. The tests account for that difference, and the baselines lock both renderings as they are.

Optional expansions:

- Background and foreground graphics fixture coverage.
- Theme-matrix variants if a theme-driven SSR regression ever reaches release review.

### Animation snapshots

The screenshot harness generally avoids active animation so that visual baselines stay deterministic. Animation-specific snapshots should use mocked time or frozen progress rather than live timers.

Optional expansion:

- Snapshot representative mid-animation states for bars, wedges, lines/areas, points, network nodes, and geo points.

---

## Performance and Scale Candidates

### Hit-tester factory assessment

The canvas render-helper companion plan considered a generic `findNearestSceneNode(scene, px, py, maxDistance, typeDispatcher, pointQuadtree?, maxPointRadius?)` shared across `CanvasHitTester`, `OrdinalCanvasHitTester`, `NetworkCanvasHitTester`, and `GeoCanvasHitTester`.

Reviewed 2026-04-28. The extraction was intentionally skipped because the shared structure was too small to justify the abstraction. XY and ordinal share only a limited nearest-point shape; network and geo have materially different hit-testing flows. The current specialized implementations are the clearer design.

Re-open only if a future hit-tester scenario has at least 80% structural overlap with an existing implementation.

### Network decay style allocation

Some decay, pulse, and transition paths allocate style objects per node per frame. This is a profile-guided optimization candidate, not a known release blocker.

Investigation path:

- Profile large network streams.
- If allocation is material, mutate unique scene-node style objects in place.
- Add regression tests around style isolation before changing behavior.

### Network tension threshold

The force-layout tension threshold is empirically tuned. It can be revisited with benchmark evidence for bursty graph updates.

Investigation path:

- Build a benchmark fixture for bursty graph updates.
- Measure layout quality and frame cost across threshold values.
- Document the chosen threshold and failure modes.

### Incremental scene updates

Most stream updates use broad scene rebuilds. That keeps correctness straightforward and is a reasonable fallback. Incremental append/evict updates are a future scale optimization for simple scenes.

Investigation path:

- Prototype append/evict updates for simple point and bar scenes.
- Keep full rebuild as the correctness fallback.
- Avoid optimizing complex marks until simple scenes show a clear win.

### Large-scale rendering options

Possible long-range work:

- RingBuffer in-place iteration helpers.
- Canvas curve interpolation optimization.
- Network decay sort cache.
- WebGL renderer for 100k+ points.
- Web Worker force layout.

---

## Product Extension Ideas

### Design system research

Potential extensions:

- Curated categorical palettes that maximize neighbor contrast.
- Per-role typography tokens beyond sizes, such as title, legend, axis, and tick font families.

### Server export formats

Potential extensions:

- `renderToPDF()` using pdfkit or jsPDF.
- Verify sync `renderChart` and `renderDashboard` in Cloudflare Workers, Vercel Edge, and Deno.
- Make `transitionFrames` in GIF export perform real incremental store ingestion.
- Link Render Studio animated previews to downloadable GIF output.

### Push API undo

`remove()` and `update()` return previous values, so callers can implement undo manually today.

Potential extension:

- Add an optional operation log with inverse operations.
- Expose `ref.current.undo()` only if the memory and semantic tradeoffs are clear.

### Geo enhancements

Potential extensions:

- Anti-meridian and pole projection regression fixtures.
- Path2D hit-testing generalization.
- Bounds pre-filter for network nodes.
- Canvas grid lines.
- Geographic minimap.
- Temporal animation on cartograms.
- Richer edge encodings, including tapered and animated dashed lines.

### CodeQL re-evaluation

Security scanning is optional infrastructure for this repo, not an application-runtime feature. CodeQL workflow setup was previously removed because workflow-managed configuration produced stale-baseline warnings on PRs after language configuration changes. GitHub's default setup mode manages configuration outside the workflow file and avoids that specific drift class.

Potential extension:

- Decide whether CodeQL's value for a JS/TS canvas visualization library justifies re-enabling.
- If yes, enable default setup and verify that the resulting check name matches branch protection.
