# NA3 — Dependency X-Ray delivery

The next reader builds on the atlas kernel and Motif Braid. The source recipe
is `DependencyForestChart`; the interactive synthetic supplier study is at
`/examples/dependency-xray`. Flow Circuit is the next delivery gate (NA4).

## Analysis and scope

`NetworkAtlasSpec.forest.requiredPaths` optionally declares analytical `roots`
and `relationScopeId: "directed-admitted"`. Preparation computes immediate
dominators on every original directed edge. A private synthetic root admits
multiple roots without creating a factual node or edge. Unreachable vertices
remain in the scene. Incomplete node evidence downgrades required-path and
absence claims; an actual retrieved path remains an exact admitted witness.

The implementation uses reverse-postorder dominator intersection. Its algorithm
reference is Cooper, Harvey and Kennedy, *A Simple, Fast Dominance Algorithm*
([Rice University](https://hdl.handle.net/1911/96345)). Tests independently
compare against vertex-deletion reachability across 1,024 small cyclic graphs
and cover a 12,000-node chain without recursive stack growth. These establish
correctness, not the proposal's interaction performance targets.

`rooted-traversal:id-asc` and `rooted-traversal:id-desc` select an acyclic,
root-aware display backbone. Every parent is an actual edge. Older transport
display policies retain their existing behavior. Every original edge belongs
to exactly one of the backbone or residual indexes, including parallels and
self-loops. Changing display ranking cannot change dominator facts.

Recipe-local queries return required ancestors, actual bypass witnesses, and
vertices losing structural reachability after exclusion. Results carry roots,
relation scope, revisions, original-edge references and limitations. They do
not infer capacity, AND-prerequisite completion, or outage probability.

## Reader and example

Declared sections form columns; backbone order organizes each column. Residual
links retain endpoints. Required-path brackets are overlays, never pipes.
Canonical selections are bound to the analysis revision. Closing a branch
counts internal edges and retains boundary ties. The linked adjacency matrix
exposes original edge IDs, including parallel edges and self-loops. SCC
membership is computed independently of both tree relations.

The supplier story uses the independently checked fixture: 75% of current
allocation is exposed to X; under the stated no-inventory scenario, 3,000
units/week remain, shortfall is 70%, and another 4,000 independent units/week
are needed for the output target. Adding Y → A with zero usable capacity
removes X's domination of A while leaving the capacity scenario unchanged.
Changing backbone ranking preserves those facts.

Controls support selection, branch opening, bypass highlighting, ranking,
and Organize / Required paths readings. Mobile exposes the branch/bypass
inspector and matrix. Evidence JSON preserves assumptions, scope, edges and
revisions. Static SVG retains labels, scope and required-path brackets.

## Delivery boundaries and verification

Required-path types flow through the existing public `prepareNetworkAtlasAsync`
facades. The new projection, queries, layout and chart remain source recipes
for NA3, not packaged chart names or serialized configs. Only the full admitted
directed relation layer is supported. Explicit relation subsets, overview
bundles, pre/post comparison and worker/service transport remain further work.
There is no capacity simulator or AND-prerequisite solver in this phase.

Related-surface coverage includes both preparation facades, React/server SVG,
evidence/accessibility audits, collapsed-edge accounting, unknown/unreachable
vertices, multi-root cycles, hostile IDs, matrix cells, backbone invariance,
bypass deletion, and the independent Python ledger. Browser tests exercise
supplier interactions, SVG/JSON downloads and the mobile inspector in both
documentation themes.

Dedicated CSR/SSR parity fixtures compare live canvas output with the built
server SVG renderer for the supplier graph, zero-capacity bypass, collapsed
branch, and a multi-root cyclic graph with parallel edges, self-loops, a
backward section link, and unknown upstream evidence. Assertions check glyph
and edge counts, canonical edge endpoints, labels, and required-path brackets;
side-by-side snapshots record both renderers. Visual review also checked skip
links in both directions and same-section links so they cannot imply a
relationship to an intervening glyph. Collapsed self-loops are covered by the
original-edge accounting tests. Collapsing a branch preserves its required-path
claim even when the targets no longer have separate visible glyphs.

Verified on September 12, 2026:

- 110 focused atlas/example unit tests, plus the updated collapse regression.
- All four CSR/SSR cases in Chromium, Firefox, and WebKit on macOS and Linux:
  24 cases pass against the reviewed snapshots and current-output comparison.
- Both supplier browser tests, including static SVG/evidence downloads and
  mobile accessibility in both documentation themes.
- TypeScript source/test checks, focused ESLint, custom lints, file-size gate,
  production build, API surface, website build, package contracts, packed
  ESM/CJS consumers through both recipe facades, and the 13-fixture independent
  ledger.
- Task verification (14 unit assertions and six browser tests), regenerated
  task views, and adoption baseline generation/freshness checks.

Run the dedicated parity cases with
`npx playwright test integration-tests/ssr-parity.spec.ts --grep dependency-xray`.
Use `playwright.docs-examples.config.ts` with
`integration-tests/docs-examples-dependency-xray.spec.ts` for the supplier UI.
