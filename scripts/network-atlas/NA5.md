# NA5 — Public reuse

The three Atlas readers now have public React imports, serialized chart names,
static renderers, machine schemas and interactive reference pages. The five
synthetic studies reproduce in an isolated installed-package consumer.

## Public contract

- `semiotic/atlas`: `MotifBraidChart`, `DependencyForestChart`,
  `FlowCircuitChart`, their props, and `DependencyMatrix`.
- `semiotic/atlas/core`: React-free preparation, projections, types, evidence
  queries, edition admission, replay readings and evidence exports.
- `semiotic/server`: the three named readers work with `renderChart` and
  `renderChartWithEvidence`, including the Node and edge server entries.
- Canonical chart specs drive JSON Schema, validation, Chart Clinic import
  guidance, capabilities and access metadata. MCP's registry imports the
  readers from their dedicated package entry.

Prepare and admit evidence upstream. Braid accepts `{ atlas }`, Dependency
accepts `{ forest }`, and Circuit accepts `{ circuit, edition, reading }`.
These are complete prepared artifacts, not inferred flat-data accessors.
Generic flat-data suggestions deliberately exclude the readers because they
cannot infer roots, supported journeys, module semantics or observed tapes.

The new Core preparation functions are synchronous. Existing lazy asynchronous
preparation and layout imports under `semiotic/recipes/core` and
`semiotic/recipes` remain compatible. `prepareNetworkAtlasAsync` is a lazy
loader, not a worker scheduler. Applications own worker placement.

Authored story builders moved to `scripts/network-atlas/stories/`, outside
the library runtime. They use public imports. The packed-consumer gate bundles
only those builders and fixture JSON; it rejects any private library source
in the consumer's input graph. ESM and CommonJS consumers reproduce analysis
identity and share theme providers with the public readers. A NodeNext fixture
also compiles all reader props and preparation imports.

## Five reproducible readings

| Study | Preserved result | Interactive reference |
| --- | --- | --- |
| Checkout A/B | Mobile loops 8% → 30%, conversion 10% → 6%; overall conversion 10% → 10.8% | `/charts/motif-braid-chart` |
| Search | 10,000 looping sessions; 6,000 catalog-eligible; purchase rates 5%, 20%, 17% | `/charts/motif-braid-chart` |
| Supplier | 75% exposure, 70% shortfall, 4,000 additional independent units/week | `/charts/dependency-forest-chart` |
| ETL | 80,000 capacity, 60,000 arrivals, 40,000 completions/s; 1.2 million queued records/min | `/charts/flow-circuit-chart` |
| Retry | 10,000 roots, 30,000 attempts, 20,000 retries/s; queue remains unmeasured | `/charts/flow-circuit-chart` |

Reference pages expose story selection, dependency bypass inspection, observed
and modeled readings, time controls, data dictionaries, JSON and SVG downloads,
theme switching, observations and grounding. Phone layouts preserve task tables
and vertex inspectors. The detailed supplier and circuit studies now use public
imports too; their private-source exception has been removed.

## Related-surface audit

Public registration exposed a data-identity gap: `includeData: false` did not
recognize Atlas artifacts, and artifact binding could classify them as ordinary
configuration. Config export and artifact identity now share the same data-prop
classification. Prepared atlas/forest/circuit/edition/reading payloads are data;
Dependency's string `reading` mode remains configuration. JSON round trips,
omission, preparation diagnostics and real rendered evidence are covered.

Client and server readers share pure prop mappers and the existing custom-chart
hosts. Static output matches the previous source recipes. Scope includes
keyboard/pointer selection, revision identity, accessible tables, theme roles,
observations, linked selection, SVG output, schemas, MCP dispatch, TypeScript,
RSC-safe Core imports and ESM/CommonJS packaging. Coverage gates now discover
the Atlas readers and their delegated layouts; no new visual burn-down entries
were added.

Publish hover with `linkedHover: { name, fields: ["nodeId"] }`. Consume it with
`selection: { name }` on Braid or `linkedSelection: { name }` on Dependency and
Circuit. Browser tests use a real Scatterplot source from another package entry,
require the target to redraw, and require the original image to return on clear.

## Measured package cost

Measurements use the production build and esbuild 0.28.2. The comparison build
was made from the merged parent on the same runner, rather than comparing source
file sizes.

| Boundary | Retained named import, gzip | Complete static entry graph, gzip |
| --- | ---: | ---: |
| `semiotic/atlas` / `MotifBraidChart` | 161.5 KiB | 272.3 KiB |
| `semiotic/atlas/core` / `prepareNetworkAtlas` | 6.3 KiB | 13.4 KiB |

Existing chart-family named imports retain identical raw and gzip bytes. Atlas
reuses the canonical network/physics hosts and selection store in its own ESM
group, avoiding changes to those families' shared chunks. New entry budgets are
275 KiB and 15 KiB. The combined AI/family consumer is 389.5 KiB within its
unchanged 390 KiB budget.

Named static rendering intentionally gains the Atlas layouts. Shared tooling
adds roughly 0.2 KiB for the new chart metadata and data-identity contract.
The artifact graph moves from 121.0 to 121.2 KiB (ceiling 121 → 121.5 KiB).
Sharing the newly registered static layouts repartitions the complete recipes
graph by 292 gzip bytes (ceiling 102 → 102.5 KiB); its retained `waffleLayout`
consumer changes by only +1 gzip byte / −1 raw byte. These measured adjustments
do not change chart-family, server, AI or combined-import limits.

## Verification

- 427 focused tests across Atlas, artifact identity, config export, MCP rendering
  and documentation integrity passed. Source, test and MCP TypeScript checks,
  ESLint and custom lints passed.
- Twelve Atlas documentation browser tests passed, covering keyboard selection,
  replay, theme/observation integration, mobile axe checks and downloads.
- All 39 CSR/SSR cases passed in Chromium, Firefox and WebKit on macOS and
  pinned Linux Playwright. New checkout/search sheets join the existing complex
  Braid, dependency and circuit topology cases. Reviewed sheet headers now name
  the public components; geometry/count assertions and tolerances are preserved.
- Nine linked-hover cases also passed on each platform. The final 48-case
  run per platform passed without snapshot updates, including restoration
  after the source hover clears.
- Packed consumers, API snapshots and compatibility against 3.10.0 passed.
  The independent Python checker passed all 14 evidence fixtures.
- Canonical schema, capability, artifact, docs, Context7, agent-skill and
  public-entry checks passed. The documentation build prerendered 319 routes
  and 32 blog entries within existing asset budgets.
- Cold-consumer measurements cover all 37 stable exports. Task receipt
  verification ran 14 source assertions and six browser tests; adoption
  preparation describes 24 jobs and makes no model or adoption-outcome claim.

Automated accessibility checks do not establish a manual assistive-technology
review. These synthetic studies establish fixture, reuse and rendering
contracts; they do not establish the proposal's reader-benefit or large-graph
latency targets. No full release suite was run.

## Review follow-up: prepared input boundaries

The reference dependency inspector now preserves a selected vertex only when
the next bypass projection contains it. Removing selected Y clears the filter
and restores all six baseline rows; A remains selected in both directions.
The related selection audit covered story switches, the detailed Dependency
X-Ray page and the Flow Circuit page. Those pages already reset or resolve
selection against the current topology.

The schema audit covered all three public readers and their shared prepared
atlas, dependency projection, circuit modules, current tape entry, edition
history and model provenance. Required properties now carry structural schemas,
including nested arrays, dictionaries, node readings, flows and totals. The
current reading and history reuse one tape-entry contract. Unmeasured values
remain nullable; missing fields and malformed objects are rejected by JSON
Schema validation. Core preparation and admission still enforce graph identity,
coverage and relationships between artifacts; the shallow React prop validator
does not perform this nested JSON Schema validation.

Verification for this follow-up:

- `npx vitest run src/components/recipes/atlas/atlas.schema.test.ts src/components/recipes/atlas/atlas.public.test.tsx`:
  75 passed, including malformed inputs, nullable observed/modeled editions,
  serialized public imports, React SSR and SVG rendering with evidence.
- `npx playwright test --config playwright.docs-examples.config.ts integration-tests/docs-examples-atlas-readers.spec.ts`:
  three passed, including mobile selection recovery and axe checks.
- Focused MCP protocol schema resource/getSchema tests: four passed.
- Source and test TypeScript, touched-file ESLint, custom lints, chart-spec
  round trips, JSON Schema validity, AI contracts/instructions/surface,
  reference/example coverage, agent skill, Context7, llms and MCP bundle checks
  passed.
- `npm run verify:ai-tasks`: 14 source and six browser tests passed; regenerated
  the task packets and verification receipt. Adoption preparation and both
  generated-artifact freshness checks passed.
- `npm run check:website-build:from-dist`: 350 pages prerendered; route checks,
  documentation asset budgets and protected boundaries passed.

No chart renderer changed. The full release and multi-browser screenshot suites
were not rerun for this follow-up.
