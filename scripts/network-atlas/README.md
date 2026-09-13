# Network Atlas Phase 1–3 (NA0–NA3)

**Status:** Kernel, Motif Braid, and Dependency X-Ray source recipes. `prepareNetworkAtlasAsync`, `prepareMotifBraid`, `motifBraidLayout`, and their input/output types are public through `semiotic/recipes/core` and `semiotic/recipes`. Chart wrappers and the new X-Ray projection/layout/queries remain recipe-local. The supplier study is at `/examples/dependency-xray`.

**Pinned baseline:** package `3.10.0`, commit `ffd5d48fc201c4780d5437e23089814f88e9e6ab`, Volta Node `22.22.1`.

**Synthetic label:** every fixture in `fixtures/` is a design fixture inherited from the Network Atlas proposal. It is not a production analysis. Public demos must keep that label.

Admitted here: the five flagship stories and the counterexamples from the Network Atlas three-designs proposal. TypeScript `prepareNetworkAtlas` is required for `etl-snapshot-v1` (NA1) and for the checkout / search braid stories (NA2). The Python checker verifies arithmetic and graph counterexamples without importing TypeScript.

The ETL kernel conservation identity is `60 = 45 completed + 5 dead-letter + 10 queued`. `write_hot` is over capacity (25 arrivals, 20 capacity).

Performance targets from the proposal (50 ms p95 selection, 10k vertices / 50k edges) are **targets, not measurements**. NA3 verifies the small supplier reader and iterative deep-graph analysis; it does not establish those interactive performance targets.

## What already exists vs what Atlas adds

Inspected on the pinned SHA. Do not rebuild these.

| Existing surface | Verified responsibility | What Atlas adds (later phases in parentheses) |
|---|---|---|
| `ProcessSankey` | Timed edges, lane packing, real time axis, `inventoryAtTime` stock fold | Motif-aware aggregation, supported route identity, forest-constrained ordering (NA2). Atlas ledger is independent of ProcessSankey mass walks. |
| `NetworkCustomLayout` / `NetworkCustomChart` | Positioned scenes, overlays, HTML marks, cheap selection restyling | Atlas-specific layout later (NA2). `resolveColor` does **not** honor `CategoryColorProvider`; comparisons must pass a matching `colorScheme` (Phase 2 risk, not a Phase 1 fix). |
| `ProcessFlowChart` | Ordered stages, FIFO capacity, settled counts | Shared motif/forest analysis (NA4). |
| `PacketFlowChart` | Authored route geometry and packet animation | Automatic geometry from admitted structure (NA4). |
| `ChainReactionChart` | Dependency-to-lane compilation, explicit completion, blocker reach | Structural motif decomposition and cross-links (NA3–NA4). |
| Physics process kit | Geometry helpers, visit/capacity ledgers, resources, gates | Adapters from a common atlas; observed vs modeled remain separate (NA4). |
| `networkAnalysis` | Undirected adjacency, centrality, paths | Not an Atlas substrate. Atlas graphs are directed and keep parallel edges / self-loops **by ID**. |
| `analyzeNetEnsemble` | Weisfeiler–Leman fingerprints of disconnected components | A different “motif” problem. Do not unify with the typed catalog. |

`MotifBraidChart` is a recipe-local `NetworkCustomChart` wrapper. Every prefix step has a labeled rounded square aligned to its depth. Separate strands stay parallel through shared steps and branch when their prefixes diverge. Repeated vertices retain separate visits; short journeys stop at their terminal step. `DependencyForestChart` adds the sectioned forest reader; `FlowCircuitChart` is the next gate. Pass a matching `colorScheme`; `resolveColor` does not honor `CategoryColorProvider`.

## Layout

```text
fixtures/     admitted JSON (inputs + expected results)
expected/     Python checker output (stdlib-only)
independent-check.py
```

Headless TypeScript lives at `src/components/recipes/atlas/`. The public preparation and layout entry points are listed below; other analysis helpers remain internal.

## Commands

```bash
python3 scripts/network-atlas/independent-check.py
python3 scripts/network-atlas/independent-check.py --write
npm run check:network-atlas-fixtures
npx vitest run src/components/recipes/atlas/
```

## Public preparation and layout

Pass a `NetworkAtlasSpec` and `NetworkAtlasSource` to `await prepareNetworkAtlasAsync(spec, source)` and
check the returned `ok` discriminant before using `atlas`. Pass that atlas to
`await prepareMotifBraid(atlas)` to obtain a `MotifBraidProjection`. Render with
`NetworkCustomChart` using `nodes={braid.sceneSeeds.nodes}`,
`edges={braid.sceneSeeds.edges}`, `layout={motifBraidLayout}`, and
`layoutConfig={{ braid }}`. The same props work with `renderChart` from
`semiotic/server`. Both public preparation functions load their analysis code on demand; layout
remains synchronous. All three are available from the core entry; the chart wrapper is local to this recipe.

For changing traffic, supply `stepEntityCounts` on a source occurrence, with one
finite, nonnegative count for each `nodePath` entry:

```ts
{ id: "checkout", entityId: "cohort", entityCount: 100,
  nodePath: ["home", "catalog", "cart", "done"],
  stepEntityCounts: [100, 80, 50, 10], complete: true }
```

Widths interpolate between adjacent step counts. The largest visible count maps
to 10 px; positive traffic has a 1 px visibility floor, and zero maps to zero.
Omitted arrays retain constant `entityCount` widths. Arrays must match the path
length; malformed counts are fatal validation issues. `entityCount` remains the
cohort weight for motif/profile analysis. Projection ribbons expose source-step
traffic as `entityCount` and destination traffic as optional `toEntityCount`.
Lane positions use peak widths so different rates of loss do not create bends
before a split. Both comparison panels use the same traffic scale and glyph
sizes, excluding hidden partitions.

Repeated-state episodes cover the first through second visit of each repeated
state, with completion anchored to the second visit's section. Profiles count an
entity once per cell across episodes and occurrences. Non-comparison profiles
use the global ledger measure named by `motifs.denominatorRef`. Capsule IDs refer
to occurrences; capsule expansion is not implemented or exposed as a chart option.
Trajectory and prefix identifiers escape `%` and `>` within state IDs before
joining segments with `>`; route queries compare actual consecutive states.

Review regression coverage includes episode completion/intersection queries,
partitioned and unpartitioned counts, duplicate entities, reference ordering,
separator-containing state IDs, hidden-panel geometry, analysis revisions, both
public recipe facades, and React/server SVG rendering.

The `network-custom-motif-braid` SSR/CSR screenshot covers six synthetic journeys
in two partitions: a shared run, nested branches, repeated vertices, an early
ending, a separate root, and traffic falling to zero. The related-surface audit
covers constant-count callers, projection ribbons, async preparation through
both recipe facades, packed ESM/CJS consumers, and SVG/canvas rendering. Canvas
edge tests cover suppressed strokes for curved, line, bezier, and ribbon edges;
zero-width or `none` strokes must not acquire a stray canvas outline.

## Dependency X-Ray (NA3)

Set `forest.requiredPaths` to `{ roots: ["world"], relationScopeId:
"directed-admitted" }` before preparation. `atlas.requiredPaths` contains the
original-graph dominator relation and explicit unreachable nodes. Use
`rooted-traversal:id-asc` or `rooted-traversal:id-desc` for a true display tree;
all other original edges stay residual. Dominators are derived ancestry, not
transport edges, capacity claims or AND prerequisites.

The source-only `prepareDependencyForest` projection feeds
`DependencyForestChart`, `dependencyForestLayout`, and `DependencyMatrix`.
Queries in `dependencyQueries.ts` carry scope and revisions. The shared
`supplierStory.ts` adapter uses the frozen supplier fixture for React, SVG,
browser interactions and tests. See
[`NA3.md`](NA3.md)
for delivery scope and the related-surface audit.

## Flow Circuit (NA4)

The source-only `prepareFlowCircuit` compiler binds motif roles and explicitly
declared process rules to canonical module nodes and original-edge ports.
`FlowCircuitChart` uses the existing `PhysicsCustomChart` and process kit.
`flowCircuitTape.ts` admits observed or separately identified modeled editions;
snapshot and replay hold supplied aggregate readings instead of simulating
unobserved completions. Direction particles never count analytical jobs.

The interactive `/examples/flow-circuit` reader includes the ETL and retry
studies, model guardrails, a module grammar with joins and dependencies,
original-edge inspection, accessible tables, reduced motion and evidence/SVG
exports. The interval fixture adds independent ETL queue and retry arithmetic.
See [`NA4.md`](NA4.md) for delivery boundaries and CSR/SSR verification. Public
recipe imports and serialized configurations are planned for NA5.
