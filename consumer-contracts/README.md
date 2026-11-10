# Consumer contract corpus

These small, maintainer-owned regression seeds connect a use case, portable
chart input, and observable rendering behavior. The initial attribution is
**maintainer-derived from iris-inspired regression**. It records the origin of
the regression work, not consumer endorsement or an assigned consumer owner.

Each file in `fixtures/` is an ordinary `{ "component": "…", "props": { … } }`
config with bounded, synthetic data. Attribution, source references, covered
prop paths, and expected results live separately in
[manifest.json](manifest.json). These are test contracts for specific behavior,
not a new public config format or a promise that every prop on each chart has
been verified.

| Existing fixture ID                                                            | Observable contract                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [bar-axis-exact](fixtures/bar-axis-exact.json)                                 | Three bars; exact 0–47 domain and visible endpoint/category labels              |
| [line-mixed-area](fixtures/line-mixed-area.json)                               | One area, one line, area gradient, and both series in the legend                |
| [area-semantic-gradient](fixtures/area-semantic-gradient.json)                 | Semantic gradient colors, pinned domain, warning and critical annotations       |
| [line-band](fixtures/line-band.json)                                           | Two uncertainty bands plus two lines, curved paths, expanded domain, and legend |
| [pie-start-angle](fixtures/pie-start-angle.json)                               | Three rounded wedges beginning at 45°, with category legend                     |
| [donut-start-angle](fixtures/donut-start-angle.json)                           | Three rounded wedges beginning at 90°, fixed inner radius, absent legend        |
| [swimlane-value-extent](fixtures/swimlane-value-extent.json)                   | Capacity stays on a 0–100 domain with a full track                              |
| [line-vertical-bands](fixtures/line-vertical-bands.json)                       | Catch-up interval and threshold produce both annotation labels                  |
| [line-bottom-legend-axis-gutter](fixtures/line-bottom-legend-axis-gutter.json) | Series legend sits below the Week axis label                                    |

The migration preserves the original props, IDs, and visual baselines from
[SSR parity fixtures](../integration-tests/ssr-parity-fixtures.js). Their
JavaScript factory and the source-renderer unit suite read the same JSON inputs.
Distinct variants, HOC comparisons, controls, callbacks, React nodes, and custom
layout functions remain in the existing
[iris parity tests](../src/components/server/ssr-iris-parity.test.tsx) and typed
browser fixtures. They must not be serialized by dropping functions, evaluating
strings, or replacing callbacks with made-up schema props.

The original inputs omit descriptive accessibility text. The manifest explicitly
records `MISSING_DESCRIPTION`, the two failing accessibility findings, and the
fallback SVG accessible name. The mixed-area palette also triggers
`LOW_ADJACENT_CONTRAST`. These fixtures preserve known regression inputs; they
are not examples of complete accessible applications. New contributions should
provide supported `title`, `description`, `summary`, and `accessibleTable` props
when relevant. Resolve a seed's documented limitation deliberately, with review
of the changed expectation and visual output.

## Validation

- `npm run check:consumer-contracts` checks metadata, source references,
  portable values, bounded data, and the existing chart JSON schemas. It needs
  installed development dependencies, but no `dist`, browser, or build
  artifacts.
- `npx vitest run src/components/server/consumer-contracts.test.tsx src/components/server/ssr-iris-parity.test.tsx`
  exercises source rendering, the existing static diagnosis operation,
  accessibility audit, and shared SVG and evidence assertions. A controlled
  regression removes `valueExtent` at the actual server forwarding boundary and
  must fail the domain assertion.
- `npx playwright test integration-tests/ssr-parity.spec.ts --project=chromium --grep 'line-mixed-area$'`
  is one focused browser example. The existing parity suite renders these same
  inputs through the built server and live HOCs, compares current output, and
  retains its existing snapshot names. Follow the normal integration
  build/server setup in [CONTRIBUTING.md](../CONTRIBUTING.md).

No new test project is required. Discovery checks ensure the unit corpus is
included exactly once. CI runs source validation before builds; `check:ssr` also
includes it, so existing source-release preflight runs it. Recovery against an
older tag uses that tag's existing `check:ssr` command and does not assume this
new script exists there.

## Server prop coverage

`npm run check:ssr` also runs the source-only
[server prop inventory](../scripts/check-server-prop-coverage.ts). It enumerates
the canonical chart specs and generated schema, including declared nested
fields, array items, and props omitted from JSON. Reviewed children of the open
`frameProps` object are checked against the actual Stream Frame types. Custom
layouts and recipes without canonical chart specs retain the existing registry
and consumer tests; this inventory does not claim to enumerate their function
or recipe-specific configuration.

[server-props.ts](server-props.ts) is the reviewed coverage map. Each behavior
contract names its component, exact prop paths, seed fixture where applicable,
and observable result. The ordinary Vitest suite executes every corresponding
function in [server-prop-assertions.tsx](server-prop-assertions.tsx). Some cases
derive variants of a seed for related components; callbacks and React content
stay in TypeScript. Adding a prop name to source, a fixture, or the old wiring
checks does not establish tested behavior.

The initial contracts cover mixed areas and opacity, bands and semantic
gradients, pie/donut rotation and legends, bar/swimlane extents, rounded tips
and padding, frame axis overrides, axis labels and formatting, gauge readouts,
and accessibility text with populated and empty data. Controls check omitted,
disabled, explicit default, callback, and interacting values where relevant.
Frame overrides intentionally win over mode-resolved axis defaults. Gauge
`valueFormat` formats the value; the default range caption retains its numeric
range. These are specific output expectations, not a requirement that every
prop change the full SVG string.

Classifications are per component and path:

- `server-behavior-tested`: linked to an executable observable contract.
- `intentionally-client-only`: a reviewed static exclusion with a reason.
- `runtime-callback-only`: a function-only interaction callback with a reason;
  this does **not** exempt mixed string/function accessors or server formatters.
- `unclassified`: an acknowledged gap, never a claim of server support or
  non-support. Unsupported charts have separate chart-level reasons.

[server-props-legacy.json](server-props-legacy.json) freezes the unclassified
paths present at adoption (2026-11-10). It is a coverage-debt inventory, not a
performance budget or unsupported-prop allowlist. **Do not add paths to it or
regenerate it from a newer catalog.** Remove a path when classifying it or
removing it from the canonical surface. New supported paths fail until they
have a behavior contract or a justified exclusion; losing a reviewed contract
also fails. The default report shows the gaps per component. To inspect every
path and its classification:

```sh
node --import tsx scripts/check-server-prop-coverage.ts --json
npx vitest run scripts/server-prop-coverage.test.ts src/components/server/server-prop-contracts.test.tsx
```

The source suite validates metadata, nested paths, exclusions, missing
assertions, and the new-prop gate, including a checkout with no `dist` or browser
artifacts. Renderer mutations drop real `band`, `rExtent` (the `valueExtent`
mapping), and `roundedTop` forwarding and must fail the relevant observable.
Existing iris, portable consumer, registry, and scene serializer checks remain
in place. No SVG or visual baselines are replaced by this coverage inventory.

## Contributing a case

1. Start with a concrete public regression or consumer use case. Use synthetic
   data or sanitize real input before committing it; exclude private repository
   links, credentials, identifiers, and proprietary records. Record a public
   source or an honest maintainer attribution. Never invent endorsement or an
   owner. Consumer CODEOWNERS entries require actual collaborators' acceptance.
2. Add a JSON config with real, bounded `data` (1–1000 rows for this seed
   corpus). Run schema validation. Callback accessors, React content, and custom
   layout functions belong in typed fixtures in the existing harness instead.
   The exported `assertPortable`/`validatePortableConfig` guards can check an
   in-memory input **before** serialization would hide functions or undefined
   values.
3. Add a unique ID and file to the manifest, an honest use case and attribution,
   source paths with text references that exist, and covered prop paths that
   actually occur in the input. List only behavior tested by the expectations;
   presence in a config is not evidence that a prop works. Explain known gaps.
4. Specify meaningful marks, domains, legend/annotation text, accessible name,
   and diagnostics. Reuse [assertions.ts](assertions.ts) in both suites; add a
   focused observable when needed. Do not snapshot random IDs, entire SVG
   strings, or unrelated defaults. Prove the assertion fails for the targeted
   regression.
5. Register the same JSON input in the existing parity fixture factory. Its Vite
   adapter supports the `consumerSeedN` JSON imports used there. Keep fixture
   IDs stable and review snapshot changes rather than resetting baselines. Run
   the focused unit and browser cases as well as source validation.
