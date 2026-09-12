# Network Atlas Phase 1 (NA0 + NA1)

**Status:** Kernel spike. These names are **not** public imports. No chart ships here.

**Pinned baseline:** package `3.10.0`, commit `ffd5d48fc201c4780d5437e23089814f88e9e6ab`, Volta Node `22.22.1`.

**Synthetic label:** every fixture in `fixtures/` is a design fixture inherited from the Network Atlas proposal. It is not a production analysis. Public demos must keep that label.

Admitted here: the five flagship stories and the counterexamples from the Network Atlas three-designs proposal. TypeScript `prepareNetworkAtlas` is required in Phase 1 only for `etl-snapshot-v1`. The Python checker verifies arithmetic and graph counterexamples for all of them without importing TypeScript.

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

Proposed chart names `MotifBraidChart`, `DependencyForestChart`, and `FlowCircuitChart` are **not implemented**.

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
