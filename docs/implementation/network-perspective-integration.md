# Network perspective integration audit

2026-10-05. Covers the downstream lineage, transit and isometric feedback against
3.12.0. Changes are unreleased; no downstream plugin or published package was modified.

| Feedback | Resolution |
| --- | --- |
| Ground drift | Preserve affine coefficients in Ground, normalized billboards and frame transforms. Static serialization retains eight decimal places in coefficients and angles, independently of coordinate precision. Regressions cover anchors at 0, 1,592 and 16,000 pixels. |
| Unused workers and purity hints | `semioticVite()` from `semiotic/vite` prunes unreferenced Semiotic worker assets after Vite's build. Used workers keep external URLs. Vite 7 and 8 consumer tests cover helper, server/recipe and actual-worker imports. The minifier removes invalid PURE annotations using syntax-aware comment ranges while preserving valid hints and strings. |
| Upright chrome outside fit | Lineage cards declare their upright extents even without hulls. Transit custom glyphs declare the radius by default; `stationBounds(info)` supplies larger extents. Both support ground placement. |
| Wrapper identity | A private shared placement module provides the same Ground/Billboard functions across network, recipe, server and helper entries within each module format. ESM and CommonJS identity tests traverse actual recipe overlays. |
| Projection-sized canvas | `getNetworkPerspectiveSize(perspective, groundSize, bounds?)` is exported from `semiotic/network/perspective/core`. It measures scale-1 ground/thickness/declared chrome and fit padding. Keep layout ground dimensions fixed, add outer margins, and supply token radii/elevations/custom overhangs the helper cannot infer. |
| Duplicate arrowheads | `lineageDagLayout` accepts `showArrowheads: false`; default arrow behavior remains enabled. |
| Printing on the slab | Both recipes accept `chromePlacement: "upright" | "ground"`, default upright. Ground chrome and its fit bounds use the same top-plane transform. |
| SVG postprocessing | Projected edges, shadows, top surfaces, facets, guides, grids, regions and plates expose `data-perspective-part`. Node facets also carry indices. Path grammar remains standard SVG; whitespace and comma formatting are not an API. |
| Token path count | `perspective.tokenRim: "flat"` uses one uniform rim plus one top path for a circular token. Faceted shading remains the default. Canvas and SVG share the geometry. |
| Atlas charts | MotifBraidChart, DependencyForestChart and FlowCircuitChart accept perspective in React and static rendering. Flow Circuit projects its existing apparatus and tape through a network frame; `networkFrameProps` configures that view. Its flat physics view and `frameProps` remain available. Evidence reports the effective renderer. |
| Documentation and goldens | Changelog records the precision/fit/geometry changes and clarifies historical arrowheads, leftward attachment, round transit caps and noninteractive motif labels. Example prose/code is emitted into initial HTML outside noscript. |

Transit's historical deterministic-layout request is also covered: tie-breaking
uses code-point ID order, independent of ICU/host locale, with permutation and
Unicode-ID tests. Config-driven lineage hulls already existed; the audit covers
their background layer, fit bounds and Ground placement.

## Related-surface audit

Checked Ground, on-ground billboards, frame-provided transforms and serialized
SVG at coordinate precision 0, 2, 4 and default. Checked lineage cards/arrows/hulls,
transit glyphs and minimap tokens, scene projection and SVG conversion, canvas
hit testing, React and server atlas entry paths, schemas, declarations, ESM/CJS
component identity, Vite 7/8 packaging, and example pre-rendering.

Focused browser regressions hover actual nodes and routed edges, assert useful
content and nearby tooltip placement, resize charts, switch projections, change
the camera, click atlas nodes, and dismiss tooltips. The infrastructure test now
waits for the initial projection tween to settle before locating its hover target.
The new atlas fixture locates marks through their real annotation anchors and
clicks beside the annotation so the test widget cannot intercept clicks.

### Review follow-up

Flow Circuit now normalizes top-level `bodyId` annotations to `pointId` before
passing them to the projected network view. The shared atlas server adapter
forwards those mapped annotations, preserving frame-level overrides. Regression
coverage compares the same text, label and widget annotations against explicit
point anchors in flat/projected React SSR and static SVG, checks rendered annotation
evidence, retains explicit `pointId` precedence, and verifies input immutability.
The related-surface audit covers all three atlas readers' annotation overrides
and the existing physics alias normalizer. Live network widgets now accept the
shared `pointId` anchor, with precedence over the existing `nodeId` alias. They
reuse the existing node-center helper, including the drawn center of glyphs,
instead of duplicating geometry calculations. Tests check camera-adjusted
position and activation callbacks. The live projected Flow Circuit fixture now
uses a `bodyId` widget to locate marks for hover/resize/camera checks.

`getNetworkPerspectiveSize` now requires `fit: "contain"` (the default) for
projected views and throws `RangeError` for `fit: "none"`. Origin-based placement
cannot promise containment from the projected span alone; some origins place
content outside every possible positive canvas size. Flat views still return
their ground dimensions. Tests cover rejection for all five projection presets
and verify that the wide `[1800, 120]` contain-fit example stays within its
returned canvas at scale 1, including decoration extents. The public JSDoc,
perspective guide, AI reference and changelog describe this requirement.

Follow-up verification passed: 350 unit tests across 34 files; three atlas browser
tests against the production build (hover, selection, dismissal, resize and camera);
source/test TypeScript, targeted ESLint, custom lint, file-size and API-surface
checks; production build and size gates with unchanged limits; public ESM/CJS
sizing probes; documentation build and AI/schema/reference consistency checks.

## Package cost

Measured a clean HEAD archive and the final implementation with identical local
dependencies and `npm run dist:prod`. No production dependency or lockfile changed.
The requested new renderer, fit/precision behavior and shared component identity
have a small whole-facade cost:

| Eager ESM graph | HEAD gzip KiB | Updated gzip KiB |
| --- | ---: | ---: |
| Root | 387.8 | 388.2 |
| Network | 168.1 | 168.5 |
| Server | 262.4 | 264.4 |
| Atlas | 292.1 | 293.1 |

Artifact's schema graph grows 33 bytes. Facade budgets record these explicit
feature costs with narrow headroom. The existing pictogram entry and its 4 KiB
budget are unchanged. Sizing/placement helpers have a separate entry to avoid
widening that graph. The measured named multi-import consumer grows less than 0.1 KiB
(about 315,240 to 315,260 gzip bytes), retaining its existing 308 KiB budget. The Vite
cleanup plugin recognizes standard Semiotic worker names, optionally hashed;
custom asset naming must preserve those names.

## Verification

- 396 tests in the atlas, lineage, transit, directed-recipe and static-render suites.
- 167 tests in the focused perspective, atlas integration and Vite-plugin suites.
  These runs overlap; counts are not additive.
- Three atlas browser regressions and two infrastructure browser regressions.
- Production build; Vite 7 and 8 consumer checks; minifier/retained-import tests;
  ESM/CommonJS wrapper identity and packed-consumer smoke checks.
- Source/test type checks, lint, custom lint, file-size checks, public API and
  package-surface checks, schema/spec/AI documentation checks, and website build.

The Vite 7 test uses a separately cached Vite 7.3.2 installation via
`SEMIOTIC_TEST_VITE`; the ordinary package regression uses the installed Vite 8.
Browser runs used isolated local ports because an existing docs server had stale
module URLs. Initial sandbox attempts could not bind a port or install temporary
consumer dependencies; the corresponding checks were rerun with those permissions.

### CI follow-up

The full browser matrix found stale SSR/CSR baselines for lineage hulls, Mermaid,
and packed clusters after preserving the ground transform's full precision.
Reviewed the CI captures, regenerated all nine browser baselines in the pinned
Playwright 1.61.1 Noble image, and verified them against a production build with
snapshot updates disabled. All nine passed, including current SSR/CSR parity
assertions. The related-surface audit found the same three cases in Chromium,
Firefox, and WebKit; the other 643–644 tests in each CI browser passed.

The docs direct-label test also read positions before the updated frame scales
were published. It now polls for the same exact position array after changing
numeric units, retaining the original assertion. Ten consecutive runs passed in
the pinned Linux image. The projected-tooltip visibility assertion has an inline
test-quality annotation because content, placement, selection, and dismissal are
checked immediately afterward; no assertions or gate limits were removed.
