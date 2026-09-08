**Pretext evaluation for Semiotic — September 8, 2026**

Pretext is a strong candidate for an **optional multiline text layout engine**.
Start with annotation notes, then wrapped category labels and legends. For ordinary
single-line labels, a small shared cache around native canvas measurement is the
better first improvement. Default adoption across every chart family would add
bundle cost and introduce browser/server differences that need explicit handling.

The original evaluation below added a reproducible browser experiment without
runtime or package changes. The subsequently authorized optional integration is
recorded at the end. The preceding presentation cleanup remains in the worktree.

**What was evaluated**

The experiment uses the published `@chenglou/pretext@0.0.9` package and separately
checks upstream commit
[`a28b542`](https://github.com/chenglou/pretext/commit/a28b5428912d1a8f23ad105b550148ea4b921f2f).
The package is MIT licensed, ESM, side-effect-free, and has no production
dependencies. The source checkout still declares version 0.0.9, so the two inputs
must be distinguished by their provenance.
([Package manifest](https://github.com/chenglou/pretext/blob/a28b5428912d1a8f23ad105b550148ea4b921f2f/package.json))

[pretext.ts](./pretext.ts) runs an isolated page in Chromium 149.0.7827.55,
Firefox 151.0, and Playwright WebKit 26.5 on macOS arm64, using Node 22.22.1 and
esbuild 0.28.1. Each browser compares 16 texts × 7 font configurations × 4 widths:
448 cases. The corpus includes narrow/wide Latin letters, prose, numbers, URLs,
Chinese, Japanese, Thai, Arabic, Hebrew, emoji, nonbreaking spaces, soft hyphens,
and zero-width spaces. Font configurations include normal/bold Arial, larger
Arial, Georgia, Courier New, system-ui, and sans-serif.

The reference is an actual DOM block with explicit font, 24px line height,
`white-space: normal`, and `overflow-wrap: break-word`. Emitted SVG lines are also
measured with `getComputedTextLength()`. The existing private annotation wrappers
are mirrored in the probe; this does not mount complete Semiotic charts or test
the collision solver. These deliberately difficult cases are not a sample of
production chart usage.

**Where it fits our code**

| Surface | Current approach | Recommendation |
| --- | --- | --- |
| [Annotation notes](../../src/components/Annotation.tsx), [annotation placement](../../src/components/recipes/annotationLayout.ts) | Renderer wraps at an assumed 8px per character; placement assumes 7px. Both split on whitespace. | Highest priority: share resolved lines and dimensions between painting and placement. Pretext can supply multilingual wrapping and measured widths. Keep the existing placement solver. |
| [AnnotationLabel](../../src/components/charts/shared/AnnotationLabel.tsx) | Background width uses character count × font size × 0.6. | Native cached width first; use the multiline engine when a label actually wraps. Preserve the exported estimator's compatibility. |
| [XY ticks](../../src/components/stream/xyAxisTicks.ts), [ordinal ticks](../../src/components/stream/OrdinalSVGOverlay.tsx) | Primitive labels use 6.5px per character for collision decisions; React elements have fallback sizes. | Native measurement can improve rotation and thinning. Pretext becomes worthwhile for an explicit multiline label policy. Keep number/date formatting separate from measuring its output. |
| [Legend sizing](../../src/components/legendLayout.ts), [Legend](../../src/components/Legend.tsx), [static legend](../../src/components/server/staticLegend.tsx) | Several character-count estimates, including different live/static multipliers. | Share metrics first. Pretext could enable wrapped legend items and accurately reserved gutters. |
| [Word trails](../../src/components/recipes/wordTrails.tsx), [sequence layout](../../src/components/recipes/sequenceLayout.ts), [process chrome](../../src/components/recipes/processChrome.tsx) | Character tables or estimated chip/header widths. Sequence layout already accepts a width callback. | Use actual single-line widths through existing hooks where possible. Keep packing/layout algorithms. Rich inline layout is relevant only if chips or labels need mixed-style wrapping. |
| [Funnel canvas labels](../../src/components/stream/renderers/trapezoidCanvasRenderer.ts), [bar funnel labels](../../src/components/stream/renderers/barFunnelCanvasRenderer.ts) | Already call `ctx.measureText`. | Keep native measurement; cache repeated values if profiling warrants it. Pretext preparation is extra work for this use case. |
| [FlippingTooltip](../../src/components/Tooltip/FlippingTooltip.tsx), arbitrary React tick labels, HTML notes | Real DOM content may contain nested elements, icons, images, and custom CSS. | Retain DOM sizing for arbitrary content. Plain text and controlled inline runs can use Pretext, but the general React content contract cannot. |
| [Static axes](../../src/components/server/staticSVGChrome.tsx), [static annotations](../../src/components/server/staticAnnotations.tsx), Node/edge export paths | Synchronous layout without a browser canvas. | Keep a deterministic supported path until measurement and font availability have an explicit server solution. |

The renderer and placement wrappers disagreed about line count on 10 of the 64
distinct text/width pairs, independent of font. A common layout result would remove
this inconsistency even before introducing a new measurement backend.

**Measured accuracy**

Published 0.0.9, headless browsers at device pixel ratio 1:

| Browser | Existing wrapper: DOM line-count mismatches | Pretext: DOM line-count mismatches | Existing wrapper: SVG overflow cases | Pretext: SVG overflow cases |
| --- | ---: | ---: | ---: | ---: |
| Chromium | 279 / 448 | 0 / 448 | 136 / 448 | 3 / 448 |
| Firefox | 279 / 448 | 24 / 448 | 136 / 448 | 28 / 448 |
| WebKit | 280 / 448 | 0 / 448 | 136 / 448 | 3 / 448 |

Overflow means an emitted SVG line exceeds the requested width by more than
0.75px. Equal line counts do not prove equal break positions or correct bidi
placement. The main checkout produced the same counts. A separate device pixel
ratio 2 run of the release retained these Pretext counts; the existing WebKit
wrapper had 135 overflow cases at that density.

For a simple width example, both `iiiiiiiiiiii` and `WWWWWWWWWWWW` receive a 78px
axis estimate today. In Chromium at 12px Arial their SVG widths are about **32px
and 136px**. Native canvas and Pretext both match those widths to within 0.01px.
This can materially change label rotation, background boxes, and available space.

Residual findings worth carrying into any adoption:

- Soft-hyphen input `Long\u00adterm inter\u00adnational investment increased`
  produces a rendered line about 81.37px wide in an 80px slot at 12px Arial.
  The same issue appears at 18px/120px. It reproduces across all three engines
  and the main checkout.
- Firefox's failures include URL break differences and `system-ui` metrics.
  Selecting the library's DOM-canvas fallback in an isolated probe reduced
  line-count mismatches from 24 to 13 and SVG overflows from 28 to 3; the URL
  differences remained. This is evidence about the measurement context, not a
  recommendation to disable `OffscreenCanvas` globally in an application.
- Our high-contrast theme uses `system-ui, sans-serif`; default themes use a
  generic sans-serif. Font resolution therefore matters to our shipped themes.
  Upstream documents macOS system-font and language-dependent fallback issues.
  ([Platform diagnostics](https://github.com/chenglou/pretext/blob/a28b5428912d1a8f23ad105b550148ea4b921f2f/PLATFORM_BUGS.md))

**Font loading is an integration requirement**

The probe prepares text with an initially unavailable named font falling back to
Arial, then installs that face from local Courier New. The actual width changes
from about 32px to 86.4px. Newly preparing the text without clearing Pretext's
cache still returns 32px in every browser. Clearing caches never updates old
prepared handles; those must also be replaced.

After clearing and preparing again, Chromium and Firefox recover. WebKit still
returns the old width: its existing measurement context retains stale font state,
while a fresh OffscreenCanvas measures the new font correctly. Explicitly switching
the measurement context to another font before clearing/repreparing recovers the
right width. Selecting DOM canvas alone did not solve this WebKit case. The main
checkout reproduces the stale-width behavior too.

An adapter should load fonts before first preparation and handle later font
changes explicitly. Prefer an upstream context-reset/injection facility over
depending on an incidental font-toggle workaround. Semiotic already has font and
theme invalidation plumbing in
[resolveCSSColor.ts](../../src/components/stream/renderers/resolveCSSColor.ts);
text metrics need to participate in that lifecycle. Color-only changes need not
invalidate text geometry.

Source inspection also found shared, growing segment caches and a lazily retained
measurement context. Emoji preparation can perform a cached DOM calibration; the
layout hot path avoids DOM measurement. These details matter when deciding where
preparation happens and how streaming text releases old cache entries.
([Measurement implementation](https://github.com/chenglou/pretext/blob/a28b5428912d1a8f23ad105b550148ea4b921f2f/src/measurement.ts))

**Performance and bundle cost**

Chromium release timings, microseconds per operation, median of seven warmed
batches on the 16-text corpus at 12px Arial:

| Operation | Approximate µs |
| --- | ---: |
| Cached native canvas width lookup | 0.015 |
| Native canvas width measurement | 0.265 |
| Pretext width from an existing prepared handle | 0.110 |
| Existing character-based wrapping | 0.150 |
| Pretext height/line count from prepared text | 0.120 |
| Pretext materialized lines from prepared text | 0.270 |
| Pretext prepare + width, warm segment caches | 9.15 |
| Clear caches + Pretext prepare + width | 39.33 |
| DOM text/width write followed by height read | 10.0 |

These are microbenchmarks, not chart FPS measurements. The DOM comparison
deliberately forces layout; it does not describe our existing character estimators
or tooltip observer's cost. Tiny values approach browser timer resolution.
The defensible benefit is accurate repeated layout after one preparation.
Materializing strings and repeatedly preparing text both cost more than the
current heuristic. A cached native width is already enough for most one-line
labels.

Tree-shaken standalone ESM bundles, minified with esbuild; gzip values use Node's
default compression settings:

| Imported capability | Release gzip bytes | Main checkout gzip bytes |
| --- | ---: | ---: |
| Prepare + height/line count | 15,106 | 16,620 |
| Prepare + natural width | 15,110 | 16,629 |
| Prepare + lines + natural width | 15,426 | 16,958 |
| Rich inline preparation/walking/materialization | 16,268 | 17,767 |

These are standalone costs, not measured deltas to Semiotic's final bundles.
They exclude optional fonts, polyfills, and a server canvas backend. The preceding
production size check measured the multi-family consumer at 384.7 KiB against a
386 KiB budget; adding this to the common graph would require real bundle work.
Use an optional import boundary and measure actual entry graphs before adoption.

**Features this could enable**

The API separates preparation from repeated layout and can return complete lines,
line statistics, or successive lines at different available widths. A separate
rich-inline entry handles flat runs with different fonts and atomic chips.
([API reference](https://github.com/chenglou/pretext/blob/a28b5428912d1a8f23ad105b550148ea4b921f2f/README.md))

For Semiotic, those capabilities suggest these priorities:

1. **Notes whose collision boxes match their painted lines.** Prepare title and
   body in their actual font weights; share the result with placement and SVG.
   This is the most immediate correctness improvement.
2. **Wrapped axis and legend labels with reserved space.** Compare a small set of
   layouts against a height budget before thinning or rotating categories.
   Reserve the margin from the chosen result, then materialize its lines once.
3. **Annotations that adapt to mobile space.** Evaluate candidate note widths and
   line limits cheaply while retaining our existing placement/density policies.
4. **Controlled rich notes and obstacle-aware text.** Preserve emphasis/value
   styling or vary line width beside an inset. These are later features; Pretext
   supplies line geometry, while Semiotic must still supply obstacle positions,
   collision policy, connectors, rendering, and accessibility.

**Recommended implementation sequence**

First introduce a small internal text-metrics boundary with a shared result for
lines, widths, height, and resolved font. Consolidate the annotation renderer and
placement estimator around it. Keep the existing synchronous fallback, and use
bounded native canvas width caching for browser single-line labels.

Then trial Pretext through an optional browser adapter on annotation notes with
known, loaded fonts. Cache preparation by text, resolved font/weight/size,
letter spacing, locale, and font revision; width changes reuse preparation.
Choose a layout before allocating line strings. Account for padding, line height,
baseline, and connector geometry in Semiotic. Avoid a global locale setter on
every chart render: Pretext's setter clears shared caches and leaves old handles
unchanged.

Before making that adapter a default, resolve the measured font-state and SVG
overflow cases and decide the export contract. Plain Node import succeeds, but
`prepare()` throws because Node has no DOM/OffscreenCanvas measurement context.
SSR/edge cannot silently switch to the browser algorithm. Options include a
validated server metrics backend with known fonts, or consuming an explicit
serializable layout result where a browser has already produced one. Treat either
as new work with server/browser parity tests, not an existing Pretext capability.

Browser support also needs a feature check: Pretext requires `Intl.Segmenter`,
which reached cross-browser Baseline in 2024. Semiotic's development browserslist
still includes older targets such as Firefox 90. Preserve a supported fallback
instead of adding a mandatory segmentation polyfill to every family.
([Intl.Segmenter compatibility](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter))

**Reproduction and verification**

Use the repository's existing dependencies and installed Playwright browsers.
Download the package into a temporary directory; no npm installation is needed:

```sh
mkdir -p /private/tmp/semiotic-pretext-eval
curl -fsSL https://registry.npmjs.org/@chenglou/pretext/-/pretext-0.0.9.tgz -o /private/tmp/semiotic-pretext-eval/release.tgz
tar -xzf /private/tmp/semiotic-pretext-eval/release.tgz -C /private/tmp/semiotic-pretext-eval
node --import tsx benchmarks/experiments/pretext.ts /private/tmp/semiotic-pretext-eval/package /private/tmp/semiotic-pretext-eval/results.json
```

Append `--dpr=2` for the Retina-density comparison or `--dom-canvas` to exercise
Pretext's fallback measurement context. For the pinned upstream comparison:

```sh
curl -fsSL https://codeload.github.com/chenglou/pretext/tar.gz/a28b5428912d1a8f23ad105b550148ea4b921f2f -o /private/tmp/semiotic-pretext-eval/main.tgz
tar -xzf /private/tmp/semiotic-pretext-eval/main.tgz -C /private/tmp/semiotic-pretext-eval
node --import tsx benchmarks/experiments/pretext.ts /private/tmp/semiotic-pretext-eval/pretext-a28b5428912d1a8f23ad105b550148ea4b921f2f /private/tmp/semiotic-pretext-eval/main-results.json --source
```

Completed: release probes on all three browsers at DPR 1 and 2; main source and
release DOM-canvas probes on all three at DPR 1; Node preparation probe; standalone
bundle measurements; focused ESLint and strict TypeScript checking of the harness.
The browser probes record discrepancies as findings, rather than asserting perfect
agreement. No browser was skipped on this machine.

The related-surface audit covered live/static axes, notes, annotation backgrounds,
legends, recipe estimators, canvas labels, HTML/React tooltips, font/theme lifecycle,
and Node/edge rendering. The harness covers the two annotation heuristics and
candidate text engine directly. Full chart integration, Windows/Linux fonts,
headed/real-device browsers, workers, variable-font features, arbitrary HTML,
and real web-font downloads were not tested. Font loading was exercised through
`FontFace` with a local font. No production build/release suite was rerun for this
evaluation-only change.

**Optional integration follow-up**

Implemented `usePretextAnnotations` and `PretextAnnotationOptions` through the
isolated `semiotic/text` entry, with `@chenglou/pretext@0.0.9` as an optional peer.
The interactive `/annotations/text-layout` page compares ordinary and measured
wrapping with language, typography, width, text, and automatic-placement controls.
The adapter is about 1.5 KiB gzip excluding Pretext; existing entry and multi-import
budgets pass without increases. Packed ESM/CJS graphs guard peer isolation.

The implementation prepares and caches text by font, reuses preparation across
width changes, measures titles separately, and shares rendered lines and dimensions
with callout/label placement. Bracket notes wrap but retain authored placement.
Whole-run DOM-canvas validation addresses the observed overflow cases; font-load
invalidation also resets WebKit's retained canvas font state. The adapter provides
the SVG typography attributes so the common renderer has no Pretext dependency.

The related-surface audit covers all five supported note types in live and static
rendering, mobile replacement text, visible provenance before placement, font
loading/failure, missing segmentation/canvas support, SSR fallback, and disabled
measurement. It found and corrected a placement mismatch where visible provenance
was appended after the note box had been measured. SVG note, subject, connector,
and threshold rendering also share more code and allocate fewer temporary arrays;
threshold endpoint tests preserve their geometry.

Verification completed: 148 focused tests (132 annotation/rendering and 16 bundle
measurement tests), 12 Playwright checks across Chromium/Firefox/WebKit, source and
test TypeScript checks, focused ESLint, custom lint and file-size gates, production
build, size gates, API/package-surface checks, cold-consumer measurement, clean
package-consumer smoke, full website build, and AI/reference mirror checks. Browser
coverage includes light/dark previews, control accessibility, 360px layout,
multilingual wrapping, soft hyphens, typography changes, automatic placement,
disabling, and the real late-font regression.

This remains a React/browser option. First hydration, serialized configurations,
and standalone Node/edge rendering retain ordinary wrapping. Exported browser SVG
keeps the measured lines. Axes, legends, HTML tooltips, arbitrary CSS typography,
and server font measurement are outside this integration. Real-font checks used
macOS local fonts; Windows/Linux font behavior was not evaluated in this follow-up.
