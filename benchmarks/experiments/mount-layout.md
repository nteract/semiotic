# Mount and re-layout investigation

The downstream report concerned `semiotic@3.9.1`: four custom-layout calls for
a fixed 52-node/53-edge graph and six for a measured 6-node/5-edge graph.
This investigation uses the repository's 3.10.0 source at `e10998e4f` as its
before baseline. It does not claim to reproduce the consumer's application
or time its Sugiyama implementation.

## Reproduction and measured work

Run `npx vitest run src/components/stream/mountLayout.test.tsx`. The tests use
real frames, stable authored data, a controlled frame scheduler/clock, and
`animate={false}` for exact non-animation budgets. The same tests were also
run against a detached checkout of `e10998e4f`; 27 of the 30 regression cases
failed there, while Ordinal custom geometry and Physics custom geometry
already met their budgets.

| Surface / operation | Before | After |
| --- | ---: | ---: |
| Fixed NetworkCustomChart, 52 nodes / 53 edges, 7128 × 1152 plot | 3 calls | 1 call |
| Responsive network, 6 nodes / 5 edges, width 270 → 918 | 5 calls | 2 calls |
| Empty lower-level custom network frame | 3 calls | 1 call |
| Custom network with an initial push-mode seed | 4 calls | 1 call |
| XY / Geo custom mount | 2 calls | 1 call |
| XY / Geo custom with a synchronous initial measurement | 3 calls | 1 call |
| Ordinal custom with a synchronous initial measurement | 2 calls | 1 call |
| XY / Ordinal / Geo built-in mount | 2 scene computations | 1 computation |
| Force / Sankey / Chord / Tree / Treemap / Circlepack / Partition mount | 3 scene builds | 1 build |
| Orbit mount | 4 scene builds | 1 build |
| Ordinal custom / Physics custom mount | 1 call | 1 call |

These are deterministic work counts, not wall-clock speedup claims. Built-in
network topology solvers already ran once at mount; their extra work was
scene emission. The fixed custom layout now sees real data immediately.
Responsive layouts can still run once at the fallback size and once at the
measured size. Repeated same-size observer notifications add no work.

## Causes and changes

- The shared hydration lifecycle painted the initial CSR commit before passive
  data/config effects had run. It now waits for the commit scheduled by
  `useHydration`, still painting synchronously before the browser's first paint.
- If container measurement arrived in that commit, the canvas host's later
  passive effect invalidated the already-painted scene. Canvas invalidation
  now precedes the hydration paint. Browser counters exposed this additional
  duplicate, and synchronous-measurement tests reproduce it for XY, Ordinal,
  and Geo custom charts, including their public family entry points.
- Network's theme/size effect built before its ingestion effect, emitting an
  empty scene at mount and an intermediate scene on resize. It now follows
  ingestion and skips work already completed for that size.
- Network custom layouts now retain one successful input key, using store data
  revisions, plot dimensions, layout/config identity, resolved colors, and
  selection. This avoids comparing or serializing entire graphs. A successful
  empty result is cacheable; failures retry, clear releases the cache, and an
  explicit relayout bypasses reuse through the layout revision.
- Palette changes used to change a callback dependency of bounded ingestion.
  A stable color-sync callback now reads the current palette without rerunning
  topology solvers. Colors and theme still refresh the scene.
- Network's fallback tension transition ignored `animate={false}` on resize
  and data replacement. The explicit opt-out now disables that fallback too.
- Imperative network updates/removals used to dirty a scene immediately after
  synchronously rebuilding it. They now request only the pending repaint.
- Worker-backed force layouts retain the previous scene while waiting for
  positions. Their completion builds the new scene once. Resize does not
  launch an additional synchronous solve while the worker owns the geometry.
- Loading XY custom canvas painters used to dirty geometry, calling the
  layout again. Registration now requests only paint; missing built-in scene
  builders retain their rebuild path.
- Firefox also emitted `loadingdone` with `fontfaces: []` at mount, after
  scenes had settled. Both the canvas font subscriber and the CSS-color
  observer treated this as a font change. They now share a subscription that
  ignores empty loads. The same guard covers Pretext annotation measurement;
  actual loaded fonts and legacy events without a face list still invalidate.
- The cache shares the existing pure shallow comparison helper. Redundant
  network config copies were removed to avoid adding render-time allocations
  and keep all existing entry-graph and multi-import bundle budgets intact.

## Related-surface audit and regression coverage

`mountLayout.test.tsx` covers the public network/XY/Ordinal/Geo HOCs, direct frames,
ResizeObserver, early measurements, stable rerenders, data/config/theme changes, eight network
plugins, XY/Ordinal/Geo built-ins and custom callbacks, Physics custom layout,
StrictMode replay, push seeds/bursts, imperative mutations, empty states, and lazy
XY painters. Successful data marks and fresh SVG/HTML placement are asserted
alongside work counts.

`NetworkPipelineStore.layoutCache.test.ts` covers invalidation for both
dimensions, data replacement, mutable push/update/remove APIs, selection,
layout/config identity, palette/theme, explicit relayout, failure recovery,
clear/reload, empty results, and the selection-restyle path.

`customLayout.mount.server.test.tsx` confirms the static server entry invokes
the network callback once per render and emits two data marks with evidence.
The existing server, hydration, transition, worker, interaction, and custom
selection tests remain part of the verification scope. Server rendering and
client hydration are separate executions; the CSR budget is not a promise
about React's development replay or the number of server/client renders.
`StreamNetworkFrame.worker.test.tsx` also asserts no scene build or synchronous
solve before a worker response, one finalization/build after each response,
and correct node positions after resize.

The canvas setup, CSS-color observer, and Pretext tests assert that an empty
font-load event does not notify subscribers, invalidate caches, or replace
the text measurer. Nonempty font-load events still refresh text, and listener
cleanup remains covered. The Firefox browser test exercises its native empty
event without suppressing it in the fixture.

`integration-tests/mount-layout.spec.ts` exercises the built network family
entry in a real browser. It asserts one fixed mount call, at most two distinct
responsive mount sizes, no calls for a stable rerender, one call on resize,
and the actual canvas pixel at the resized node position. Existing responsive
overlay alignment, glyph hit-testing, and visual baseline tests cover the
shared first-paint change. Mount counters also cover the fixed and responsive
XY custom fixtures, rejecting repeated layouts at the same measured width.

No public prop shapes or serialized chart formats changed. Schema/spec
definitions remain unchanged; the API snapshot generator correction described
below requires regenerating snapshots. Empty lower-level or unseeded push-mode
layouts remain supported because they can emit decorations;
the high-level explicit-empty state still skips layout. Layout inputs must
remain immutable, with new references for changed authored values.

The cache logic lives in its own helper instead of growing the store's layout
branch. The file-size gate passes; the grandfathered NetworkPipelineStore
still carries a one-line warning above its reviewed ceiling. No work-count
ceilings or size thresholds were loosened.

## Verification completed

- `npx vitest run src/components`: 658 files, 8,681 tests passed, including the
  new mount, cache, worker, and static-render regression coverage.
- `npx playwright test integration-tests/mount-layout.spec.ts`: all three
  browser projects passed (Chromium, Firefox, WebKit).
- `npx playwright test integration-tests/custom-layout.spec.ts --project=chromium`:
  both existing overlay-alignment and glyph/visual-baseline tests passed.
- `npm run typescript` and `npm run typescript:tests`: passed; the test
  typecheck reported no errors.
- Targeted ESLint across changed source/test TypeScript files and
  `npm run check:custom-lints`: passed, with zero lint findings.
- `npm run dist:prod`, `npm run size`, and `npm run check:file-size`: passed,
  with the nonblocking file-size warning described above.
- `npm run check:website-build:from-dist`: passed, including documentation
  generation, prerendering, route checks, asset budgets, and protected boundaries.
- `git diff --check`: passed.

The same mount suite intentionally fails 27 of 30 cases against the before
checkout, confirming the new budgets detect the original extra work. The full
release/publish suite and the downstream consumer's own application were not run.

## Generated artifacts and CI follow-up

The lifecycle JSDoc exposed an existing API snapshot generator defect:
parameters of imported callable types were read at their definition's offsets
in the exporting file. Comments could therefore turn `ctx` into unrelated text
or an empty name. The generator now reads the parameter's own declaration file.
An audit of all 37 stable entries corrected names in 11 snapshots, including
recipe layouts and React frame components. Public types remain unchanged.
Regression coverage verifies imported generic, overloaded, optional/rest, and
destructured parameters across re-exports, stability after documentation-only
edits, and continued detection of a real parameter contract change. The new
fixture fails against the original generator.

The cold-consumer input-count change is intentional: `semiotic/text` now imports
the shared 77-byte `hasLoadedFontFaces` chunk. This retains the empty-font-event
mount fix without importing the canvas infrastructure. Compared with the
committed measurement, its bundled import grows by 52 raw bytes / 22 gzip bytes;
the measured network import shrinks by 943 raw bytes / 147 gzip bytes. The
owning generator refreshed the measurements and README after graph review.
All existing bundle budgets and measurement tolerances remain unchanged.

Task identities include a digest of production source, so the mount fixes also
invalidated their recorded evidence. Task verification was rerun and all three
JSON/Markdown packets and website mirrors were regenerated with current hashes
and observed passing results. An initial browser run encountered stale Vite
dependency responses (HTTP 504); restarting the local docs server resolved it
without changing assertions or application code.

The adoption baseline inventories the README and generated task packets, so
`npm run prepare:adoption-evals` must follow their final refresh. Regenerating
it updated only source hashes; the 24 development jobs and measurement values
were unchanged. No other generated outputs consume this baseline.

Follow-up checks completed successfully:

- `npm run docs:api-surface`, `npm run check:api-surface`, and
  `npm run check:api-compat` (compatible with the published v3.10.0 artifact).
- `node --test scripts/api-compatibility.test.mjs`: 8 tests passed.
- `npm run dist:prod`, `npm run docs:cold-consumer`,
  `npm run check:cold-consumer` (37 exports), `npm run check:bundle-sizes`,
  `npm run size`, and `npm run check:pack`.
- `npx vitest run scripts/lib/cold-consumer-measurement.test.js src/components/stream/mountLayout.test.tsx src/components/stream/NetworkPipelineStore.layoutCache.test.ts`:
  59 tests passed, preserving the mount and cache budgets above.
- `npm run verify:ai-tasks`: 14 unit tests and 6 Chromium tests passed;
  `npm run docs:ai-tasks` and `npm run check:ai-tasks`: 42 generator tests passed,
  with current task identities and matching mirrors.
- `npm run test:adoption-evals`: 6 tests passed;
  `npm run check:adoption-evals` and a subsequent `npm run check:ai-tasks` passed.
- The remaining commands in CI's AI/SSR/documentation step passed: TypeScript
  checks for `scripts/ai-tasks`, `scripts/superpersuasion`, and
  `scripts/jobs-report`; `check:ssr`, `check:jsdoc-coverage`,
  `check:ai-examples-coverage`, and `check:protected-doc-boundaries`.
- Targeted ESLint for both changed scripts and `git diff --check` passed.

This follow-up used macOS/arm64, Node v22.22.1, and esbuild 0.28.2. The full
release suite and the Linux CI runner were not rerun locally.
