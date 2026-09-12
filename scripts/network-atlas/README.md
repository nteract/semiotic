# Network Atlas Phase 1–2 (NA0–NA2)

**Status:** Kernel spike plus Motif Braid recipe. `prepareNetworkAtlasAsync`, `prepareMotifBraid`, `motifBraidLayout`, and their input/output types are public through `semiotic/recipes/core` and `semiotic/recipes`. `MotifBraidChart` remains recipe-local.

**Pinned baseline:** package `3.10.0`, commit `ffd5d48fc201c4780d5437e23089814f88e9e6ab`, Volta Node `22.22.1`.

**Synthetic label:** every fixture in `fixtures/` is a design fixture inherited from the Network Atlas proposal. It is not a production analysis. Public demos must keep that label.

Admitted here: the five flagship stories and the counterexamples from the Network Atlas three-designs proposal. TypeScript `prepareNetworkAtlas` is required for `etl-snapshot-v1` (NA1) and for the checkout / search braid stories (NA2). The Python checker verifies arithmetic and graph counterexamples without importing TypeScript.

The ETL kernel conservation identity is `60 = 45 completed + 5 dead-letter + 10 queued`. `write_hot` is over capacity (25 arrivals, 20 capacity).

Performance targets from the proposal (50 ms p95 selection, 10k vertices / 50k edges) are **targets, not measurements**. Phase 1 has no overview renderer, so those benchmarks are out of scope.

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

`MotifBraidChart` is a recipe-local `NetworkCustomChart` wrapper: a stepped dendrogram of journey types with a hidden false root, parallel offset tracks on shared steps, and per-strand stroke width. `DependencyForestChart` and `FlowCircuitChart` are not implemented. Pass a matching `colorScheme`; `resolveColor` does not honor `CategoryColorProvider`.

## Layout

```text
fixtures/     admitted JSON (inputs + expected results)
expected/     Python checker output (stdlib-only)
independent-check.py
```

Headless TypeScript lives at `src/components/recipes/atlas/` and is **not** re-exported from `semiotic/recipes` or any other public barrel.

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
