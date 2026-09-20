# Chart definition and diagnosis consolidation

The seven-chart definition pilot now includes the complete 15-chart XY,
16-chart ordinal, 10-chart network, 10-chart physics, and 6-chart realtime families,
plus two representatives from other families (59 definitions total). All five families
use generated registrations.

## Authoritative sources

- Chart specs continue to own props and capabilities. Definitions reuse them;
  they do not introduce another authored prop schema.
- `chartDefinitionsXY.ts` owns XY renderer and documentation references.
- `chartDefinitionsOrdinal.ts` owns ordinal renderer and documentation references.
- `chartDefinitionsNetwork.ts` owns network renderer and documentation references,
  including MotifBraidChart and DependencyForestChart from Atlas.
- `chartDefinitionsPhysics.ts` owns physics renderer and documentation references,
  including FlowCircuitChart from Atlas and the composite ChainReactionChart renderer.
- `chartDefinitionsRealtime.ts` owns realtime snapshot renderers, docs references,
  and explicit MCP exclusions. TemporalHistogram retains its XY MCP category.
- `chartDefinition.ts` holds the pure definition types and construction helpers.
- `chartDefinitions.ts` combines migrated families and remaining representatives.
- `scripts/lib/chart-spec-artifacts.ts` constructs the entire output set for
  both regeneration and freshness checks.

The existing schema, validation map, known chart names, and Chart Clinic
projection share that artifact builder with each family's MCP registry, server
registry, and marked category bucket in `ai/componentMetadata.cjs` (fifteen output
files total). All five families use `generateFamilyRegistrations`; the builder
checks complete family coverage and combines their metadata updates before
writing. A missing definition in a migrated family fails generation. Renderer
registrations are static imports; the rich definition registry does not enter
chart runtime bundles. The AI schema retains its existing byte representation.

Capability, SSR, and AI-surface gates share `scripts/lib/registry-source.cjs`.
It parses the registry object and follows imported spreads without executing
chart modules. An unused import cannot satisfy registration coverage; an
unknown spread fails the check. Parser regression tests run in
`check:capabilities`.

Chart Clinic now includes explicit documentation routes for every migrated chart.
MinimapChart links to the time-series brush recipe; ScatterplotMatrix's
capability source is its chart spec because it has no separate capability file.
RidgelinePlot links to the existing cookbook guide; it has no dedicated HOC prop
page. GaugeChart and LikertChart retain the specialized renderer implementations
re-exported by `serverChartConfigsOrdinal.ts`.

The network migration preserves the standard charts' `semiotic/network`
recommendation and the two Atlas readers' `semiotic/atlas` recommendation.
ChartSpec `importPath` overrides flow through definition metadata to both the
serialized schema and generated MCP imports. The generator groups imports by
module; it does not assume Atlas readers are exported by `semiotic/ai`.

The physics migration uses the existing physics renderers, the composite
ChainReactionChart renderer, and the Atlas FlowCircuitChart renderer. FlowCircuitChart
remains in the physics family while retaining its `semiotic/atlas` entry point.
PhysicsCustomChart and the other custom-layout escape hatches retain their
existing authored registrations because they are outside the chart-spec registry.

Realtime definitions distinguish public server snapshots from MCP rendering:
all six charts accept bounded data through `semiotic/server`, while MCP keeps
its existing exclusion of the five live Realtime components. TemporalHistogram
uses the existing XY renderer and shares the RealtimeHistogram documentation
page. Generated component imports never pull excluded realtime charts into MCP.

## Diagnosis operation

`ai/operations/diagnose.ts` owns usage-mode normalization, missing-data filtering,
fallback schema validation, and report status for CLI doctor and MCP diagnosis.
Adapters retain input handling, transport behavior, and prose formatting.

The operation prefers full runtime diagnosis, then runtime prop validation,
then the existing scalar schema fallback. It reports the selected mode;
schema-only success is not a rendering or data-quality assessment. Omitted
data in supported push mode is permitted, while full diagnosis still flags
`data: []` as an empty scene. Other validation errors remain visible.

The streaming audit corrected three diagnosis gaps: realtime static requests now
require data in every operation mode, schema-only diagnosis accepts omitted data
for supported push startup, and full runtime diagnosis flags explicit empty
realtime arrays. The related-surface audit added missing Heatmap, WaterfallChart,
FunnelChart, and RadarChart push contracts and removed stale CrucibleChart and
ChainReactionChart push claims (their handles control playback, not ingestion).
A drift test checks every data-prop chart with a push capability and rejects
allowlisted components without that capability. Charts with other input shapes,
such as FlowMap and BigNumber, keep their separate contracts.

The CLI loads a small generated CommonJS operation bundle so schema fallback
continues to work when library bundles are unavailable. `build:mcp` generates
both this bundle and the MCP executable, and `check:mcp-bundle` checks both.

## Workflow and remaining scope

Use `npm run docs:chart-specs:schema -- --list` to inspect generation entry
inputs, outputs, and consumer build order. Use `--check` for a read-only byte
comparison or `npm run check:chart-specs` for the broader contract checks.
The entry-input list includes transitive imports by reference; it is not a
repository-wide dependency graph or an incremental build scheduler.

Geo and value families retain authored registration lists and can
migrate one family at a time. Runtime chart entry points, the public component API, and
other CLI/MCP operations are outside this migration. The remaining large
pipeline stores need behavior-specific extraction work rather than moving
their code solely to satisfy line limits.

Focused coverage exercises definition/schema parity, actual renderer identity,
changed renderer references, authored-region preservation, all diagnosis modes,
and CLI/MCP agreement over real subprocess transports. Existing rendering and
package checks remain the guards against wider regressions.

Validation for the initial XY/diagnosis migration: 372 focused Vitest tests passed, including
server rendering and transport parity; the five registry/capability parser
tests passed. Production library and MCP builds, TypeScript checks, targeted
ESLint, custom lints, chart-spec/schema/AI documentation checks, SSR and surface
checks, API snapshots, bundle limits, and installed-package smoke tests passed.
The file-size gate retains the existing NetworkPipelineStore review-ceiling
warning. The full release and browser visual suites were not run.

Ordinal follow-up validation: 332 focused contract/rendering tests and 24
selected CLI/MCP tests passed. Coverage includes every ordinal chart's actual
MCP component identity and nonempty server render evidence, plus XY regression
coverage. TypeScript, targeted ESLint, custom lints, family registration and SSR
gates, AI/schema documentation checks, production builds, bundle freshness,
public API snapshots, size limits, and the installed-package smoke test passed.
The serialized schema, validation map, and known-chart names are unchanged.
The existing file-size warning remains; full release/browser visual suites
were not run for this follow-up.

Network follow-up validation: 413 focused contract/rendering tests and 24
selected CLI/MCP tests passed. Coverage includes all ten network component
identities and nonempty server renders, real prepared Atlas inputs, Atlas
nested-schema rejection tests, and existing network/geo SSR and interaction
tests. TypeScript, targeted ESLint, custom lints, registration and SSR gates,
AI/schema documentation checks, production builds, bundle freshness, API
snapshots, size limits, and the installed-package smoke test passed. The
serialized schema, validation map, and known-chart names remain unchanged.
The existing file-size warning remains; full release/browser visual suites
were not run for this follow-up.

Physics follow-up validation: 389 focused contract/rendering tests and 24
selected CLI/MCP tests passed. Coverage includes all ten physics component
identities and nonempty server renders, prepared Flow Circuit inputs, physics
static chrome, Crucible ledgers, Chain Reaction snapshots/replay, Unit Pile
accounting, and ordinal/network registration regressions. TypeScript for source,
tests, and MCP, targeted ESLint, custom lints, registration and SSR gates,
AI/schema documentation checks, production builds, bundle freshness, all 37
public API snapshots, size limits, and the installed-package smoke test passed.
All thirteen generated artifacts are current. The serialized schema, validation
map, and known-chart names remain unchanged. The existing registry typing and
file-size warnings remain; full release/browser visual suites were not run.

Streaming follow-up validation: the 42-file streaming/lifecycle suite passed
569 tests, and the final focused definition/diagnosis/registration suite passed
373 tests. All 106 CLI/MCP tests passed with local HTTP port access; the rebuilt
production bundles also passed all 36 diagnosis transport/fallback cases.
Chromium passed 26 realtime and cross-family streaming regressions, covering
event-time batches, live updates, colors, legends, tooltips, render stability,
and runtime errors. Public APIs and serialized schemas remain unchanged.
Source/test/MCP TypeScript, targeted ESLint, custom lints, artifact freshness,
capability/SSR/surface gates, AI schema/docs checks, production and MCP builds,
all 37 API snapshots, bundle limits, and the installed-package smoke test passed.
The 42 task-packet tests passed; regenerated packaged/public task views now
carry current source fingerprints. All fifteen chart artifacts are current.
The existing registry typing and NetworkPipelineStore size warnings remain.
The full release suite and Firefox/WebKit/visual snapshot suites were not run.
