# Network Resolution
## Spectral-sequence-inspired analysis and visual readers for Semiotic

**Status:** Experimental NR0–NR4 implementation; NR5 promotion remains deferred  
**Prepared for:** Elijah Meeks  
**Date:** October 2, 2026  
**Primary deliverable:** An extension to the existing Network Atlas analysis layer, two chart modes, and reusable node, component, and edge displays.  
**Implementation status:** The original proposal and supplied standalone contracts are retained below as design context. The repository now implements the NR0–NR4 sidecar, readers, evidence queries, and publication adapter under `src/components/recipes/atlas/resolution/`. See the implementation record in section 16 for actual entry points, verification, and bounded scope. The supplied `validation-results.json` remains reference evidence, not a claim that Semiotic tests ran.

> Make simplification inspectable. Show what became a component, what still crosses its boundary, what a chosen reading has suppressed, and what evidence licenses each interpretation.

## 1. Executive decision

Build **Network Resolution** on top of the existing atlas. Its main output is not another graph layout. It is a sequence of source-backed graph representations with explicit ownership, transitions, boundary ports, and preservation claims.

Ship two experimental readers of that output:

| Reader | Visual form | Question it should answer unusually well |
|---|---|---|
| **Resolution Atlas** | Aligned pages of progressively grouped networks, connected by a separate membership gutter and accompanied by a cycle-accounting strip | What changed when this network became simpler, and where did its complexity go? |
| **Boundary Loom** | An edge-first incidence display: node/component rails, one column per edge or admissible bundle, and a page-history strip above each column | Which actual connections cross these abstractions, and why are they still visible? |

A third, smaller instrument, **Component Cutaway**, is both the common inspector and an independently embeddable display. It shows a collapsed component's actual boundary endpoints and a matrix of supported entry-to-exit paths. It replaces the dangerous convention that a large metanode implicitly connects every inlet to every outlet.

Motif glyphs themselves have established precedents. [S15] The new unit of composition proposed here is an **accountable abstraction**: membership + boundary + reason + source references + explicitly limited guarantees. This should be useful in ordinary charts, tooltips, tables, static reports, Figma review surfaces, and agent inspection—not only in the two new modes.

The first release is directed, static-snapshot analysis over the currently supported atlas source. It does not require a new frame, a force simulation, community detection, persistent homology, or a new package ecosystem.

### 1.1 Refine the original analogy before implementing it

A real spectral sequence is not a succession of arbitrary graph simplifications. Its pages have algebraic structure; differentials square to zero; subsequent pages are homology. In a filtered-complex construction, the initial page is an associated graded object, not simply the original graph. Under appropriate convergence assumptions, the limiting page describes associated-graded information about the target and need not resolve extension data. [S1]

The useful design borrowing is **successive, explicitly related approximations**, not a claim that our transforms are differentials. Public UI and APIs therefore use `page`, `rule`, `witness`, `group`, and `boundary`, not `d_r`, `E_infinity`, or “homological importance.”

Also revise the earlier phrase “everything that survives is unexplained.” A surviving edge might be a vital bridge, an ordinary interdepartmental connection, a protected edge, an unsupported rule case, or work the analysis budget never reached. Those explanations must remain distinguishable. Grouping a clique does not prove that its edges were redundant.

**Product thesis:** a reader should be able to trust a simpler representation without having to forget what simplification did.

## 2. Existing implementation: extend, do not restart

Public moving-source inspection on October 2 found package version **3.12.0**, with `semiotic/atlas` and `semiotic/atlas/core` exports and network-atlas acceptance/benchmark scripts. [S2] Implementation subsequently pinned the local foundation and verified its build and acceptance tests; section 16 records that baseline and the completed checks.

The current atlas source is materially ahead of the September design documents:

| Existing surface | Reuse | Necessary extension |
|---|---|---|
| `prepareNetworkAtlas(spec, source, options)` | Validation, sections, motifs, forest, ledger, route support, revisions | Prepare a resolution sidecar from the resulting atlas; do not reverse the existing argument order [S3] |
| `PreparedNetworkAtlas`, schema `0.2` | Canonical source, completeness, provenance, comparison, required paths | An independently versioned `PreparedNetworkResolution` referring to the base revision [S4] |
| `matchMotifs`, `selectCapsules` | Existing pattern vocabulary and deterministic selection precedent | Separate structural node ownership from occurrence-capsule selection; add rule guards and rejected-candidate records [S5, S6] |
| `prepareDependencyForest`, SCC utility, `dependencyMatrix` | Original-graph structure, component discovery, retained edge IDs | Nested partitions, boundary ownership, component path support [S7] |
| `getRequiredPaths`, `getBypassWitness` | Source-relative structural questions | Edge-exclusion witnesses, component-port queries, appropriately scoped absence results [S8] |
| `containsRoute`, `followSupportedRoute` | Contiguous source node-path verification | Return matched occurrence offsets; distinguish node-route support from evidence for one parallel edge [S9] |
| `NetworkCustomLayout` | Positioned scene primitives, overlays, shared selection, restyling, frame-owned interaction/SSR | Two layout recipes and a scene adapter for semantic subtargets [S10] |

The current atlas relation contract is directed and keeps parallel edges and self-loops by ID. Its basic edge shape has only ID/source/target, and its occurrence shape contains a node path rather than an edge-resolved event trace. Rich edge semantics must therefore arrive through an explicit sidecar or a separately reviewed base-schema extension. A motif named in the catalog is not necessarily an implemented matcher: the inspected phase-two matcher list contains chains, fan-in, fan-out, and repeated-state episodes. [S4, S5]

Retain the earlier atlas requirements: independent measurement ledgers, canonical selection, no invented routes, explicit residual edges, source/analysis/rendered revisions, and browser-independent preparation. The prior readers—Motif Braid, Dependency X-Ray, and Flow Circuit—can consume resolution groups later without being rewritten. [P1, P2]

### 2.1 Source-specific integration hazards

The current custom-layout contract documents a category-color synchronization limitation; use an explicitly shared palette until a pinned integration test establishes otherwise. Browser-only HTML marks must not carry essential evidence. [S10]

Do not reuse occurrence-capsule selection as a general structural partitioner: its ownership domain is occurrences, not original graph vertices. Do not interpret a broad motif support flag as a witness that an entire entry-to-exit trajectory occurred. Query and return the contiguous source path itself. [S6, S9]

No source file inspected here establishes the complete proposed resolution engine. That is a scoped inspection result, not a claim about every branch or unpublished change.

## 3. Conceptual model and invariants

### 3.1 Three coordinates, three different operations

**Source coordinate** locates a node in a process, stage, time, or other domain dimension. Reuse atlas sections. An ordinal stage is not a duration.

**Filtration parameter** changes which evidence is admitted. For an increasing edge-birth filtration, include edge e at parameter t when `birth(e) <= t`, and ensure both endpoints are admitted no later than the edge. A confidence filtration may instead lower a threshold to admit more edges. The order and missing-value behavior must be explicit.

**Resolution page** changes how the *same admitted graph* is represented. It does not change its records or turn page index into elapsed time.

The MVP fixes the admitted graph and varies only resolution. A later filtration adapter prepares a new coherent atlas for each selected threshold; it must not merely dim excluded edges while querying the unfiltered graph. A rolling time window with deletions is not a nested filtration.

### 3.2 Page definition

Let G = (V, E) be a finite admitted directed multigraph. Each edge retains an original ID. A page r contains:

- A disjoint, exhaustive partition P_r of V into nonempty blocks.
- A boundary multigraph between blocks, retaining original edge provenance.
- Every block's internal edges, boundary ports, metrics, and explanation records.
- Non-owning annotations: overlapping motifs, source-relative dependencies, proposed groups, and supported witnesses.

Within one resolution sequence, partitions only coarsen. Every block on page r belongs to exactly one block on page r+1; the identity partition transition is allowed for an annotation-only page. Local expansion is a view operation, not a mutation of this sequence. A different grouping policy creates a separate branch/sequence with its own identity.

Default owning blocks must be weakly connected in the admitted relation graph. A disconnected authored department becomes several connected blocks with one shared department annotation. Repeated roles or overlapping communities may be displayed as sets, but are not silently turned into connected transport nodes.

### 3.3 Two ledgers, never one overloaded status field

**Ownership ledger:** each original edge is either internal to exactly one current block or belongs to exactly one boundary bundle. Self-loops are internal even on page zero. Parallel edges remain distinct.

**Presentation ledger:** independently, an edge can be drawn literally, represented by a bundle, shown inside a component, subdued by a verified reachability reading, or omitted from the current viewport under a disclosed display budget.

Being internal is not the same as being invisible. Being bundled is not the same as being redundant. Being off the selected display tree is not the same as being an exception to a scientific model.

For every page:

```text
original edge IDs
  = disjoint union of all internal edge-owner sets
  + disjoint union of all boundary-bundle edge-owner sets
```

Source metrics are queried on the original graph unless their definition explicitly names the quotient. Never recompute a node's “importance” on a smaller quotient and silently compare it with its original-graph score.

### 3.4 Exact cycle accounting: a useful mathematical core

There is an exact, inexpensive invariant that gives this design more than a metaphor.

Take the underlying undirected **multigraph**: forget edge direction but keep each original edge, including parallel edges and loops. Define its cycle rank as `beta(G) = m - n + c`, where c is the number of connected components, including isolated vertices.

For a partition into connected blocks, let Q_r contain every boundary edge with its original multiplicity and no internal edges. Then:

```text
beta(G) = beta(Q_r) + sum over blocks B of beta(G[B])
```

Proof: each connected block contributes `m_B - n_B + 1`; the quotient has `m_boundary - |P_r| + c`; adding cancels the block count and yields `m - n + c`.

This is **cycle rank, not the number of simple cycles, directed feedback loops, or independent operational alternatives**. Reciprocal directed edges become two parallel edges in this specific projection. A simple-graph projection would be a different metric and must have a different name.

The charts can show a fixed total divided into “inside components” and “between components.” Complexity has moved; it has not magically vanished. This identity remains valid even when the UI subdues a transitive edge, because that edge remains in the boundary ledger. It fails as stated for disconnected blocks, which is one reason to keep owning groups connected.

Do not assign the quotient's global cycle rank to individual boundary edges or nodes. An optional cycle basis is a choice of representatives, not an intrinsic attribution of credit.

### 3.5 Summary adjacency is not route evidence

Consider `A -> x1`, `x2 -> x1`, and `x2 -> D`. The weakly connected block `{x1, x2}` creates a summary `A -> block -> D`, but there is no directed path from A to D.

An incoming port therefore names the original internal endpoint reached by an incoming edge. An outgoing port names the original internal endpoint from which an outgoing edge leaves. A component route query searches the induced original subgraph for the directed continuation between those endpoints.

For observed data, require a contiguous segment of one source occurrence, including start/end offsets. A query distinguishes `inside-only` connectivity from `boundary-context` continuation. The latter includes the exterior predecessor and successor, and can restrict the incoming/outgoing original edge sets. Matching only the interior node X cannot certify `A -> X -> D`. Two compatible-looking local snippets are not sufficient if they belong to different journeys. A node path also cannot identify which of two parallel source edges was used unless the source supplies edge-resolved evidence. Return that ambiguity rather than picking one.

A negative structural result means “no path in this admitted graph.” A negative observed result means “no matching path in this admitted observation set.” Neither claims that the route is impossible in the world. Missing or truncated evidence is unknown, not a negative result.

## 4. Analysis pipeline and rule catalog

### 4.1 Preparation pipeline

```text
existing PreparedNetworkAtlas + explicit resolution spec
                           |
         normalize ID indexes and admit relation sidecars
                           |
         source features / candidate groups / pin constraints
                           |
         deterministic rule planning and conflict records
                           |
     nested partitions + edge ownership + boundary interfaces
                           |
         page events / cycle ledger / bounded witnesses
                           |
              PreparedNetworkResolution
                  /                    \
        Resolution Atlas           Boundary Loom
                  \                    /
        Component Cutaway / glyphs / tables / agent queries
```

Feature discovery does not depend on layout. Match original structures before lossy presentation. A later rule may discover a pattern on a quotient, but must label it quotient-level and lift/validate its source support before asserting an original-graph property.

The base atlas remains immutable. Resolution preparation runs in a worker or upstream process. Layout receives a completed projection and never performs global topology work on hover.

### 4.2 First rule set

| Rule | Candidate and admission guard | What is preserved / exposed | Scope |
|---|---|---|---|
| **Parallel-edge bundling** | Same ordered endpoint pair and compatible relation/measure semantics | Every edge ID and multiplicity; no averaging of unrelated quantities | MVP presentation operation |
| **Serial interior folding** | Maximal directed chain interiors with one distinct predecessor and successor, no self-loop/cyclic-SCC membership, no protected/domain boundary crossing | Ordered members and actual boundary ports; internal lengths remain queryable | MVP owning group |
| **Pendant fan folding** | Hub plus at least two terminal leaves; each admitted leaf has only that attachment in the scoped graph | Hub interfaces remain explicit; other hub connections remain boundary edges | MVP owning group |
| **SCC containment** | An original strongly connected component compatible with existing blocks and pins | Internal directed connectivity; original members and edges remain inspectable | MVP owning group, reuse SCC utility |
| **Authored hierarchy grouping** | User-supplied nested groups; split disconnected subsets; require unions of current blocks | Semantic membership, not inferred behavioral equivalence | MVP supplied input |
| **DAG transitive reading** | Simple relation graph of SCC condensation; homogeneous reachability semantics; verified alternative of at least two component hops | Component-level reachability only; original direct edges remain in ledger | MVP opt-in annotation/subduing |
| **Undirected bridge/block-cut analysis** | Explicit undirected projection and edge-ID-safe multigraph handling | Structural cut information in that projection | Next extension, not required by two charts |
| **General motifs / communities** | Versioned supplied matches or a bounded optional algorithm | Pattern membership and algorithm assumptions | Later; not required for MVP |

SCC membership is not a statement that any particular member is unavoidable. Transitive reduction is naturally a DAG operation; the corresponding NetworkX operation requires a directed acyclic graph. Apply it to the condensation relation graph, not by arbitrarily deleting edges in a cyclic source. [S7, S11]

A transitive reading must say **“direct relation also has an indirect structural path.”** It does not license “this dependency is unnecessary,” “these edges carry the same traffic,” or “performance will be unchanged.” Direct-call, legal, financial, and other relation meanings may not admit a reachability reading at all.

### 4.3 Deterministic planning and conflict handling

Each rule declares candidate scope, required feature indexes, guard predicates, output kind, priority, and preservation claims. Each candidate includes source support and a stable key.

Process rules in authored order. Within a rule, prefer greater eligible node-count reduction, then a stable bytewise ID order. Accept nonoverlapping candidates; reject or defer others with a recorded reason. This greedy policy is a reproducible presentation choice, not an optimal compression algorithm.

Later candidates must be exact unions of existing blocks. Never expand a candidate to include unrelated members and continue calling it an exact motif or SCC. A crossing candidate remains an annotation or requires a different sequence branch. Respect anticipated authored boundaries during early folding so the default preset remains useful.

Existing motif matches remain intact whether or not selected for grouping. Match counts do not change when their glyph loses a packing conflict. Pins have distinct meanings: `keep-visible` prevents ownership merging; `keep-label` preserves a labelled portal but permits grouping. Neither changes source topology.

Stop after configured rules, at a declared fixed point for a repeated rule set, or at an explicit resource limit. Only the second is a fixed-point claim. The final configured page is not “the irreducible network.”

### 4.4 Safe transitive-edge witnesses

Build the simple condensation DAG with bundle-to-original-edge maps. Compute the reduction on the *whole* DAG, then find a witness path in the retained reduction for each subdued relation. Store paths using relation bundles, with a lazy lift to original internal/external paths.

Do not independently mark every edge that has an alternative and delete them all: parallel edges, or mutually supporting reductions in inappropriate graph classes, can invalidate those alternatives. Duplicate parallel edges are one relation class for this operation; their source IDs remain in its bundle.

A selected witness highlights actual endpoints and explicitly shared portions. Two routes are not called disjoint merely because they look separated in the drawing. Source-root dominance and exclusion queries continue to run on the original admitted graph.

### 4.5 Measures and feature descriptors

The required structural descriptors are small: source member count, internal/boundary edge counts, distinct boundary endpoints, self-loop and parallel-edge counts, cyclic-SCC membership, source-scoped required paths when requested, first internalization page for edges, and the cycle ledger.

Reuse the atlas ledger for domain quantities. Sum only compatible additive quantities. Recompute a rate from compatible numerator/denominator totals rather than averaging rates; preserve distributions or labelled sketches rather than averaging percentiles. Distinct entities require exact unions or a disclosed estimator. Weight means nothing until its semantics—cost, affinity, count, capacity, probability—are declared.

For edge e = (u, v), define `firstInternalPage(e)` as the first page where u and v have the same owner. Return null when this has not happened in the configured sequence. Self-loops return zero. This is a property of the chosen grouping policy, not statistical persistence or importance. Protection and analysis-coverage flags are separate.

## 5. Serializable data contracts

The accompanying `contracts/network-resolution.ts` specifies standalone proposed types. It does not pretend the new functions are already exported by Semiotic. Keep the current atlas schema at `0.2`; introduce resolution schema `0.1` as a sidecar.

### 5.1 Prepared representation

| Object | Required responsibilities |
|---|---|
| `ResolutionSpec` | Base relation scope, ordered rules, pins, authored groups, measure policies, resource limits, schema version |
| `PreparedNetworkResolution` | Base-atlas revision reference, spec identity, pages, transitions, feature index, set store, source fingerprint, diagnostics |
| `ResolutionPage` | Partition, boundary bundles, internal-edge owners, metrics, applied-rule coverage, prior-page map |
| `ResolutionGroup` | Canonical source node set, preceding-page children, internal edge set, port index reference, explanation references |
| `BoundaryBundle` | Ordered group endpoints, compatible relation key, disjoint original edge set, actual endpoint-pair reference |
| `ResolutionEvent` | Grouped/annotated/subdued/rejected action; before/after objects; rule/version; reason; preservation claims and witnesses |
| `PortPathResult` | Structural/observed basis, admitted scope, yes/no/unknown verdict, source path or occurrence-offset witness, completeness |
| `CanonicalSelection` | Source IDs or stable set reference, source/analysis revision, declared selection domain; never scene-node indices |

Keep topology facts, presentation decisions, and evidence coverage as different fields. Avoid one enum that forces an edge to choose between “bridge” and “bundled”: both may be true.

### 5.2 IDs, membership, and storage

Use immutable original IDs. Derived content IDs include canonical membership, operation version, relation scope, and the relevant source revision. A readable sequence lineage ID may persist across revisions only through a declared matching rule; it is not the content ID.

Store source sets in a deduplicated set store. Production in-memory indexes may use sorted integer arrays or bitmaps; JSON interchange specifies an explicit codec or ordinary sorted ID arrays. Never copy every group's full transitive membership into every ancestor by default. Parent-child maps plus lazy source expansion keep nested provenance compact.

A group with identical membership and semantics can be referenced unchanged on several pages. A merge event links old IDs to a new ID; it does not repurpose one child's ID. Revision splits/merges live in a separate correspondence relation and need not obey within-sequence monotone coarsening.

### 5.3 Proposed API boundary

```tsx
// Existing API: verify against the pinned build.
const base = prepareNetworkAtlas(atlasSpec, source)
if (!base.ok) throw new Error(base.issues.map(d => d.message).join("; "))

// Proposed API. Preparation runs outside the render path.
// The host supplies edgeSemantics and authoredHierarchies.
const result = prepareNetworkResolution(base.atlas, {
  schemaVersion: "0.1",
  id: "service-structure",
  relationScopeId: "admitted-dependency",
  rules: [
    { kind: "fold-serial-interiors", version: "1" },
    { kind: "fold-pendant-fans", version: "1", minLeaves: 2 },
    { kind: "contain-scc", version: "1" },
    { kind: "group-authored", version: "1", hierarchyRef: "domains-v1" }
  ],
  pins: [],
  limits: { maxPages: 8, maxCandidates: 10000, maxWitnessEdges: 1000 }
}, { edgeSemantics, authoredHierarchies })
if (!result.ok) throw new Error(result.issues.map(d => d.message).join("; "))

<ResolutionAtlasChart resolution={result.value} selection={selection} />
<BoundaryLoomChart resolution={result.value} pageId={pageId} selection={selection} />
<ComponentCutaway resolution={result.value} groupId={groupId} pageId={pageId} />
```

This authoring sketch is intentionally small; the hosting application binds its atlas/source and evidence resolver. Proposed pure queries include:

```text
explainGroup(pageId, groupId)
listBoundaryEdges(pageId, groupId, cursor)
getEdgeHistory(originalEdgeId)
getCycleLedger(pageId)
traceComponentPort(pageId, groupId, ingressId, egressId, basis)
getEdgeAlternative(originalEdgeId, relationScopeId)
expandSourceSet(setRef, cursor)
compareResolutionPolicies(leftId, rightId, originalSelection)
```

Every query returns revisions, admitted scope, coverage/limitations, and bounded evidence. Query limits must produce `truncated` or `unknown`, not an invented negative. Host-defined callbacks may exist locally but are explicitly nonportable; worker/server recipes use registered IDs and JSON parameters.

## 6. Chart mode one: Resolution Atlas

### 6.1 Reader promise

> Show me the same system at successive levels of representation, without making me guess what each simplification swallowed.

This is the flagship explanatory chart. It should make a chain folding, a feedback region becoming a component, and a cross-component connection surviving that process readable in one static image.

The distinguishing mechanism is not animated clustering. It is the simultaneous display of **a network page, its ownership transition, and the preserved complexity account**.

### 6.2 Visual grammar

Show three or four pages side by side on desktop. Each page is a bounded network panel; the horizontal axis across panels is ordinal **representation page**, not time. Headers name the actual operation: “Original,” “Fold repeated structure,” “Contain feedback regions,” and “Group by domain.” Never label the final panel “Truth.”

Within a panel, put source sections on the vertical axis. Use explicit author order when available. Otherwise use a deterministic ordering derived from the final admitted hierarchy, with original IDs as tie-breakers; identify that ordering as layout, not a quantity.

Represent a current block as a bracketed capsule spanning its original source-row interval. The same raw-node row order is shared across pages. Contiguous member rows form one capsule even across process sections; show section membership as an attribute. Use connected, numbered fragments only where rows belonging to other groups interrupt the member interval, so a capsule never encloses unrelated nodes.

Actual graph edges are routed within their own page. Forward edges, return edges, and self-loops get separate routing channels. Boundary bundles attach to named ports; no link ends at an arbitrary capsule center when that would hide the original attachment. Internal edges are summarized in the capsule, with expansion available.

The **gutter between pages** is reserved for membership correspondence. Thin tapered connectors show which blocks became a new block. They have no arrowhead, never use throughput width, and are labelled “membership” in the legend. They must be visibly different from graph edges. With no selected group, show only changed correspondences, not a second hairball.

Under every panel, draw the **cycle-accounting strip**: one shared-scale stacked bar for internal versus between-component cycle rank. Total height or length remains fixed for the same source graph. It is a structural count under the named undirected multigraph projection, not a performance gauge. The accompanying line reports original nodes, original edges, current blocks, and boundary edge records.

```text
 ORIGINAL           FOLD STRUCTURE       CONTAIN SCCs        DOMAIN GROUPS

 r                  r                    r                   r
 |                  |                    |                   |\
 a1                 [chain]              [chain]             [left]  [right]
 a2     x           [a1,a2,a3]   x        [a1,a2,a3]   x         ||      |
 a3     y                |      y              |      y      [u,v,w]   |
 f                  [fan]                [fan]                 |       |
 l1 l2 l3           [f + leaves]          [f + leaves]           +---z---+
 u -> v -> w        u -> v -> w           [u,v,w]                    loop
 ^---------|        ^---------|

    graph edges stay inside each page; membership occupies the gutters
    cycle account: internal 1 / between 4 -> internal 2 / between 3
```

This schematic omits some fixture links for space; it is a layout specification, not a data-complete chart. The source-backed final rendering must expose every omitted edge through a declared bundle or account.

### 6.3 Capsule anatomy

At overview size, show a short label, original member count, one structural icon, and a visible boundary count. A component containing a directed cycle has a loop mark; a supplied semantic group has a folder/bracket mark, not the same icon. A tiny “+3 overlapping patterns” badge opens non-owning annotations.

At medium size, expose separate internal and boundary edge counts and a small port map. At detail size, use Component Cutaway. Do not squeeze a miniature unreadable node-link diagram into every capsule.

A protected original node can retain a labelled portal inside a group. Portals are aliases of the same source ID, clearly marked as such; they are not duplicated entities. A `keep-visible` pin instead prevents that merge altogether.

### 6.4 Layout algorithm

1. Build a reference leaf order from the final nested ownership tree. Respect section ordering first. Within sections, perform a fixed, bounded number of deterministic barycentric sweeps only when they improve a declared crossing objective. Freeze the resulting order for the sequence.
2. Assign raw row intervals. A group's geometric extent is the union of its member intervals, represented by fragments where necessary. Row spacing is an ordinal layout choice.
3. Lay out page capsules with a consistent minimum label height and stable port order. Ports sort by original endpoint row, direction, relation class, then edge ID.
4. Route page edges in dedicated channels. Group only compatible endpoint pairs. Limit visible literal edges with a disclosed bundle/viewport policy.
5. Draw membership connectors only for changed/selected groups. Their source and destination intervals come from the same membership map used by the data inspector.
6. Add shared-scale summary strips and labels from the prepared page ledger. Resizing changes geometry, not partitions or metrics.

The shared order will sometimes create more crossings than an independently optimized layout. That is an explicit tradeoff for correspondence. Offer “reorder this page” only as a labelled local view; retain a return-to-reference control. Do not claim one ordering optimizes both topology and explanation.

### 6.5 Interaction behavior

**Turn a page:** advance the selected page without recomputing analysis. Highlight its applied events and give a sentence such as “Three cyclic vertices became one component; three internal edges remain available.” In narrow layouts show the selected page and its predecessor rather than microscopic thumbnails.

**Ask why:** selecting a capsule opens its rule, exact source members, preserved properties, unpreserved properties, and rejected overlaps. “Grouped by department” and “strongly connected” must be different explanations.

**Trace an edge backward:** selecting a boundary bundle highlights its exact original edges on earlier pages, not every relationship between the same two large groups. Large source sets open a paginated inspector.

**Expand locally:** reveal a component in a reserved detail pane, keeping the main page and external ports stable. Inline expansion is permitted only when the available space keeps labels legible. This is a mixed-detail view of one page, not a new analytical page.

**Compare rule order:** display two labelled policy branches with a shared original selection. Report membership differences and source-invariant metrics; do not morph one grouping into another as though they were consecutive stages of a single coarsening.

**Inspect uncertainty:** selecting a coverage marker shows whether a pattern was unsupported, rejected, protected, truncated, or simply not selected. Do not use the same dim gray for all five.

### 6.6 Transition semantics and static edition

Animation is optional. On grouping, member marks move into their owning capsule while their boundary ports remain traceable. When an edge becomes internal, it retracts into that capsule's internal-edge indicator rather than vanishing. Membership connectors do not animate as flowing traffic.

Do not promise globally fixed geometry: groups may need more space. Preserve identity and reference order first, then use a labelled transition or crossfade where geometry genuinely changes. Reduced-motion mode changes selection instantly and exposes the same event explanation.

The static edition is a complete two-to-four-page strip with operation labels, cycle account, and an evidence caption. It must answer the main task without animation or hover. A compact export may show a selected two-page transition and a textual list of the remaining page rules.

### 6.7 What this mode must prove

On the flagship fixture, a reader should identify where the feedback structure was internalized, notice the direct root-to-output relation, and recover its source edge after domain grouping. Against a conventional grouped graph plus a table, measure whether the page correspondence actually improves reconstruction and explanation—not merely whether the animation is attractive.

The mode should abstain from a full multi-page overview when the active groups exceed its readable budget. Use a selected branch/transition plus exact summary counts instead of a wall of illegible capsules.

## 7. Chart mode two: Boundary Loom

### 7.1 Reader promise

> Stop asking me to untangle a picture. Give every connection an address, show its endpoints, and show how it behaves under abstraction.

Boundary Loom makes **edges the organizing marks**. It is the diagnostic counterpart to the explanatory Resolution Atlas. Its strongest tasks are finding cross-boundary ties, parallel relations, direct-versus-indirect connections, and the source of a misleadingly simple overview.

BioFabric established node rails and edge columns; motif simplification for BioFabric is also established work, including a VIS 2025 paper. This proposal does not claim to invent either. Its experimental contribution is coupling that incidence grammar to nested ownership pages, edge internalization history, independently recorded suppression, and boundary-route witnesses. [S12, S13]

### 7.2 Visual grammar

Rows represent original nodes, grouped under the selected page's ownership brackets. In a collapsed overview, a row may represent a component; its label explicitly says so. Columns represent one original edge or one admissible boundary bundle.

An edge column is a vertical segment between its two endpoint rows. Use a disk at its source and an arrow/chevron at its target. Intermediate row crossings have no endpoint mark and mean nothing. Self-loops use a short U-shaped mark in their own column. A bundle whose endpoints collapse to one current group uses an **internal-edge cap**, not a fabricated original self-loop.

At the top of each column, add a small **resolution history**: one cell per selected page. A cell is outlined while the edge crosses blocks and filled once it becomes internal. The first filled cell gets the operation label on focus. An independent small slash/mark indicates optional transitive subduing; protection has its own icon. Do not combine these facts into one severity color.

Sort columns primarily by first internalization page, with still-boundary edges in a separate labelled region. Secondary keys are source/target ownership paths, relation class, and stable original IDs. All page cells are ordinal. The “still boundary” region is right-censored by the configured sequence, not an infinity score.

On the left, show nested brackets for the selected page and, when space permits, one finer page. The reader sees both the ownership partition and the edges that cross it. A selected block adds a boundary-only focus: incident columns stay prominent; all others become a count-labelled context area.

```text
                     e02      e10      e08/e09      e17
                     chain    cycle    left->loop  root->z
 page 0               []       []         []         []
 page 1               ##       []         []         []
 page 2               ##       ##         []         []
 page 3               ##       ##         []         []

 r             --------------------------------------o
 a1            -------o
 a2            -------v
 ...
 f             ----------------------------o
 u             ----------------o-----------v
 v             ----------------v
 ...
 z             --------------------------------------v

 [] = crosses current blocks; ## = owned inside a block
 Column position is ordering, not time, weight, or physical distance.
```

### 7.3 Bundles must not invent endpoint combinations

A literal column has one original source and one original target. A bundle may summarize several parallel edges with the same endpoints and compatible semantics. A component-level bundle can summarize multiple original endpoint pairs only if the actual pairs are retained and accessible; expanded mode shows those pairs, never their Cartesian product.

For comparison across pages, freeze column order and bundle definitions at the chosen reference view. As owners change, update endpoint attachment and history cells without rebuilding the column universe. Rebundling is an explicit view action and announces that column positions changed.

Do not imply that arbitrary dense graphs will fit in one loom. With many unique endpoint pairs, there may be little lawful bundling. Use focused boundaries, deterministic paging, and an exact count/distribution synopsis of the undisplayed columns. Pixel budget affects display coverage, not analytical coverage.

### 7.4 Layout algorithm

Create node order from the same resolution hierarchy used by the Atlas. Assign each expanded node a rail; collapsed blocks reserve one labelled rail plus counts. Record original-to-current row mapping.

Build the displayed column set from the explicit focus and relation filters. Group only by the declared compatibility key. Compute `firstInternalPage` lazily from the ownership tree or page maps; preserve a distinction between zero, a later ordinal, and null.

Sort columns deterministically and allocate fixed-width lanes with minimum endpoint hit targets. Place source/target marks from their current owner rows. Where both endpoints share a collapsed row, use an internal cap annotated with the number of source edges. Selection can expand exactly that row or open its Cutaway.

Add page-history cells using the same ownership classifications used by the accounting ledger. The selected page gets a visible header highlight. Draw nested ownership brackets behind the rails. Draw route witnesses in a separate adjacent strip rather than superimposing a second unrestricted graph.

A practical desktop starting budget is 80 expanded rails and 180 columns. Larger displays may raise it after testing. These are proposed legibility defaults, not evidence of measured limits. At mobile width use a single focused boundary and a scrollable, labelled edge list with the same history marks.

### 7.5 Witness strip: make an edge explain itself

Selecting a transitive candidate opens two aligned mini-routes: the direct edge and one verified indirect alternative. Label them **direct relation** and **alternative structural path**. Show the edge IDs, relation scope, and any common internal segments; no traffic amounts are inferred.

Selecting an apparent bridge offers the relevant scoped query. In directed graphs the default asks for a path avoiding that particular edge or node; it does not call the result an undirected bridge. A failed bounded search says unknown; an exhaustive failed search says absent in the admitted graph.

Selecting a component-level relation exposes its actual endpoint pairs. Choosing an incoming and outgoing column opens the corresponding Component Cutaway cell. This is how the loom catches the `A -> {x1,x2} -> D` false route: the expected connecting cell is explicitly negative under the admitted structural graph.

### 7.6 Why the mode is not just a matrix with a new name

An adjacency matrix allocates space to potential node pairs. Boundary Loom allocates a column to an **existing edge object or explicit bundle**, allowing direction, parallelism, provenance, and abstraction history to remain attached to that object. It can show an edge turning internal without losing its identity, and distinguish a topologically retained edge from one merely de-emphasized for a question.

This costs width and requires learning its incidence grammar. It is not intended to replace adjacency matrices for every dense-subgraph task. Its evaluation baseline should include a well-ordered BioFabric/incidence view with the same filters, not only a force-directed hairball.

### 7.7 Static and accessible behavior

A static loom includes endpoint legend, page names, bundle multiplicity, displayed-versus-total column counts, and selected witness text. Color is optional; direction, ownership, and unknown states must remain readable in monochrome.

Keyboard navigation moves by edge column, then endpoint, history cell, or witness. Provide commands labelled “source,” “target,” “owner on previous page,” and “show original edges.” Announce, for example: “Edge e17, r to z; boundary on all four configured pages; an indirect path exists; one original edge.”

The primary exported table is one row per original edge or declared bundle, with endpoints, owner history, relation semantics, witness status, and source references. It is not merely the raw source table with the chart's new information omitted.

## 8. Component, node, and edge displays

### 8.1 Component Cutaway: a component is an interface, not a dot

Render a bracketed box with labelled ingress ports on the left and egress ports on the right. A port represents a known original boundary endpoint and direction. Grouped ports show their member count and expand to exact endpoints.

The interior is a compact **entry-to-exit support matrix**, not an adjacency matrix. Local matrix/global network composition has a clear precedent in NodeTrix; this display changes what the cells mean. [S14] Rows are incoming endpoints; columns are outgoing endpoints. Each cell asks whether a path inside the induced component connects that pair, under a selected structural or observed basis. The ordinary structural matrix uses `inside-only`. An observed continuation reading uses `boundary-context`: the same occurrence must include the selected outside predecessor, the interior segment, and the selected outside successor. When an endpoint has several external neighbors, expand its incidence or report an explicitly existential result; do not reuse one endpoint-level yes for every incoming/outgoing edge combination.

Use three unmistakable states: a filled mark for a supported path, a crossed mark for an exhaustive negative within the admitted scope, and a question mark for unqueried/missing/truncated evidence. Grouped-port cells must report `supported pairs / queried pairs / total pairs`; “some pairs connect” must never look like “every pair connects.”

Compute cells lazily and cache by revision, group, endpoint pair, basis, and evidence policy. Start with at most 8 by 8 exact ports in the compact inspector; paginate or group above that. Do not eagerly create an all-pairs reachability matrix for a huge component.

Selecting a positive cell reveals its original path. For observed support, show the occurrence and offsets and maintain the contiguous context. Selecting a negative cell explains the exhaustive scope. Selecting an unknown cell states what evidence or budget is missing.

Below the matrix, show source member/edge counts and internal cycle rank. A structural SCC should generally have positive structural connectivity between all its boundary endpoint pairs, while its observed matrix may remain sparse. This contrast is a useful demonstration of possibility versus observation. A one-node structural path of length zero is allowed when ingress and egress attach to the same internal node; observed continuation still requires the complete boundary-context observation. Exact edge identity remains unknown when the occurrence records only nodes and several parallel edges fit.

This display is also useful on ordinary tree, sankey, and network components. It should ship as a projection + renderer, not be trapped inside the new Atlas component.

### 8.2 Node resolution strip

A small strip beside a node label shows that original node's owner on each page. Owner changes produce a new bracket/segment and an accessible label; unchanged ownership continues the segment. A secondary count reports the selected owner's boundary edges, explicitly as an owner-level quantity.

A source-node pin or source-root dominator badge remains attached to the source ID, even when the node is inside a group. Its position in a strip is not an importance score. Do not assign a large component's centrality to all of its members.

Begin with two channels—ownership history and one selected structural annotation—in an approximately 96 by 24 pixel treatment. At smaller sizes use text and a single expansion icon rather than an unreadable miniature dashboard. The strip's tooltip/table is generated from the same edge/group history query as the main chart.

### 8.3 Edge witness glyph

Replace the assumption that every edge display must be a plain line. A selected edge can use a compact fork: the literal edge above and one alternative path below. Internal path segments are labelled with their source group or node identity. An unresolved alternative is a question mark, not a decorative dotted bypass.

A parallel-edge bundle uses small endpoint ticks and a multiplicity label. A component-internal edge uses an inset cap linked to its owner. A protected edge gets a pin, not a red alert. These glyphs express different facts and should not be collapsed into a single “importance” scale.

### 8.4 Cycle account glyph

Use a two-segment bar in page summaries: internal cycle rank and boundary cycle rank, with their common source total. For an individual component, show only its internal rank and a link to the page account; the global boundary rank does not belong to that component alone.

Opening a representative cycle is optional. When a cycle basis is used, label it a chosen basis and keep its seed/ordering fixed for comparison. Changing a basis cannot change the reported rank.

### 8.5 Admission by available space and purpose

Do not put every glyph on every object. Resolution Atlas defaults to capsule counts and the page cycle strip. Boundary Loom defaults to edge history and multiplicity. Component Cutaway defaults to port support. A node strip appears on selection or in a comparison task.

This keeps the new grammar learnable. A full chart with dozens of tiny support matrices would simply create a more elaborate hairball.

## 9. Reference fixtures and showcase stories

All fixtures in this bundle are authored synthetic graphs, not observations of a production system. Partitions are explicit expected inputs to the reference checker; the checker does not implement automatic motif selection or the chart layouts.

### 9.1 F01 — The complexity did not disappear

The flagship graph contains 14 vertices and 18 directed edge records: a serial interior, a pendant fan, a three-node directed cycle, a separate right-hand route, two parallel fan-to-cycle edges, a direct root-to-output edge, and an output self-loop.

The supplied pages are:

| Page | Owning transformation | Blocks | Internal edge records | Boundary edge records | Internal cycle rank | Boundary cycle rank |
|---|---|---:|---:|---:|---:|---:|
| 0 | Original singleton nodes | 14 | 1 | 17 | 1 | 4 |
| 1 | Fold chain interior and pendant fan | 9 | 6 | 12 | 1 | 4 |
| 2 | Contain the three-node SCC | 7 | 9 | 9 | 2 | 3 |
| 3 | Group compatible left/right domains | 5 | 11 | 7 | 2 | 3 |

Every row accounts for all 18 edge records and cycle rank 5. The seven final boundary edges form six endpoint-pair bundles because two are parallel. A reachability reading can subdue the direct `r -> z` relation, but it remains one of those seven records and the cycle account must not change.

**Reader story:** “The overview got smaller. The feedback cycle went inside a component; it did not stop existing. Two parallel connections still cross the left-domain boundary. The direct root-to-output relation has an alternative route, but remains a real relation.”

**Lead reader:** Resolution Atlas. **Follow-up:** select `e17` in Boundary Loom and inspect its alternative `r -> x -> y -> z`.

### 9.2 F02 — The metanode lied about a route

Source edges are `A -> x1`, `x2 -> x1`, `x2 -> D`. The group `{x1,x2}` is weakly connected. Its quotient visually suggests `A -> group -> D`, but the internal ingress-to-egress query is negative.

**Reader story:** a visually connected summary is not sufficient evidence of a directed route. Component Cutaway marks the `x1 -> x2` internal continuation absent in the admitted graph.

**Lead reader:** Boundary Loom + Component Cutaway. **Acceptance:** query the original graph and reject A-to-D while retaining the summary's actual boundary edges.

### 9.3 F03 — Two journeys do not make a third

The observed occurrences are `A -> X -> B` and `C -> X -> D`. A structural node route `A -> X -> D` exists in the combined adjacency graph, but has no matching contiguous occurrence.

**Reader story:** a component's structural support matrix and observed support matrix can disagree legitimately. No swapping of a legend or opacity should conceal this difference.

**Acceptance:** report structural yes and observed no within the complete synthetic set. Mark observed results unknown when the supplied trace set is missing, rather than synthesizing a route.

### 9.4 F04 — Parallel edges cannot all explain one another away

Two original edges both connect `p -> q`. Each one individually has a one-hop replacement if the other is retained. Deleting both removes reachability.

**Reader story:** bundling duplicates and transitively reducing a DAG are different operations. The bundle has two records and one relation; a transitive witness requires an indirect relation path, not circular reasoning among candidate deletions.

**Acceptance:** retain the relation and both source IDs; demonstrate that the naive delete-every-redundant-edge strategy fails this fixture.

### 9.5 F05 — Overlapping explanations do not double the graph

Two candidate groups share a node. The deterministic ownership planner accepts one and records the other as an overlapping annotation. A different rule priority yields a different branch of the resolution sequence.

**Reader story:** competing explanations are inspectable without assigning the same original node to two owning blocks or changing motif counts.

**Acceptance:** the selected partition is disjoint and exhaustive; the rejected candidate remains in the feature/decision index; source metrics are invariant between policy branches.

### 9.6 F06 — Unknown is not zero

Exercise missing traces, a witness search stopped before exhaustion, an unsupported rule, a node with missing semantic metadata, and a display that shows only 20 of 200 boundary columns.

**Reader story:** analysis coverage and display coverage are independent. A chart may know all 200 edges while drawing only 20, or draw every admitted edge while still lacking the observations needed for a route claim.

**Acceptance:** no truncated search returns a false-negative path result; undisplayed counts remain available; the static caption includes coverage. This bundle specifies these UI/query tests; the reference checker does not simulate the full asynchronous runtime.

### 9.7 Larger demonstration generators

After F01–F06 pass, create deterministic generators with independent truth ledgers: a 200-service dependency graph with injected chains, fans, feedback components, parallel relation classes, and bypasses; and a sectioned collaboration graph with authored departments, cross-department connectors, and overlapping non-owning roles.

Keep the ground-truth injections separate from the detector output. A detector should not receive hidden labels that the public demo claims it discovered. Include a difficult case where grouping offers little compression and a simpler chart wins.

## 10. Rendering, interaction, and integration contracts

### 10.1 Separate analysis, projection, layout, and paint

`prepareNetworkResolution` builds source-backed pages. `projectResolutionView` chooses a bounded set of groups, edges, history cells, and witnesses. The two layout functions calculate positions. The existing network rendering machinery paints and handles interaction.

A projection contains semantic marks, not just coordinates: `original-node`, `resolution-group`, `boundary-port`, `source-edge`, `bundle`, `membership-connector`, `support-cell`, and `annotation`. Every mark has a canonical selection target and accessible description.

Adapt these to current `NetworkSceneNode`/`NetworkSceneEdge` primitives where their semantics fit. A support cell must not masquerade as an original network node in an automatically generated source table. The adapter supplies a separate semantic target map and projection-aware accessible table. Verify whether the pinned renderer supports independent overlay hit targets; otherwise add that small shared capability or use existing rect marks with explicit target metadata. Do not invent a new rendering engine.

Cache geometry separately from analysis. Shared selection/restyling changes paint, not the source partition. Window resize, theme changes, and device pixel ratio must not invalidate structural analysis.

### 10.2 One selection across all readers

Selecting a component resolves to its original node set. Selecting a bundle resolves to its exact original edge set. Selecting a support cell resolves to a scoped endpoint-pair query, not the entire component. Selecting a witness resolves to the returned original path or contiguous occurrence segment.

Selections carry the base source and resolution revisions. Stale selections are remapped only through a declared correspondence; otherwise they are marked stale. Never silently broaden a vanished selection to the nearest surviving group.

Existing atlas selections and new resolution selections need an adapter, not competing stores. When a selected group contains only some of the entities/occurrences in a linked chart, the mapping must be explicitly supplied. Structural service membership does not automatically select every business record ever associated with that service.

### 10.3 Server/client and cross-surface parity

The same prepared sidecar and projection should support browser, server-rendered SVG, static reports, Figma review, and machine-readable evidence. Where output dimensions differ, geometry may differ; source counts, ownership, support states, and selected evidence must agree.

Each example ships a browser edition and a static edition generated from the same fixture/revision. Review the static edition before tuning animation. Export a concise evidence packet containing the selected rule, group membership, edge ownership, witness scope, cycle convention, and limitations. This is the natural EDD feedback surface: review the claims and boundary behavior cheaply before the interactive mode is promoted.

A reduced-motion reader gets immediate state changes plus the full transition explanation. An accessible table includes derived information such as owner history, not only raw input. Avoid essential distinctions carried by color, tiny marks, or hover-only text.

### 10.4 Resource and revision behavior

All asynchronous messages include request ID, generation, base revision, spec hash, and evidence-policy ID. A superseded worker result cannot publish. Cancelled or budget-exhausted analysis publishes either no new revision or a coherent partial revision with explicit coverage; never mix new groups with old witnesses.

For a snapshot change, the MVP recomputes relevant global indexes. Incremental SCCs, dominance, and historical matching are not prerequisites. A single edge deletion can change a global structural claim; do not pretend every update is local to the nearest drawn group.

Changing a display budget does not change partitions, source records, or ledger totals. Changing an analysis budget can change coverage and must change the analysis identity. A negative witness result is cacheable only with its exact completeness and admitted scope.

### 10.5 Security and malformed input

Validate duplicate/missing IDs, dangling endpoints, non-finite numeric metadata, invalid rule versions, nonnested supplied groups, invalid set codecs, and stale source references before preparing pages. Preserve arbitrary valid string IDs safely in maps or own-property dictionaries; do not allow prototype-like keys to corrupt indexes.

Evidence authorization applies at retrieval and export, not only at label rendering. A redacted endpoint remains redacted in source-set expansion and witness paths. If redaction prevents a claim from being verified, downgrade the claim instead of providing an apparently complete certificate.

## 11. Performance design

Let n be original vertices, m original edge records, R pages, K emitted candidate support size, and W returned witness size. These bounds describe the proposed straightforward algorithms, not measured Semiotic performance.

| Work | Initial implementation and cost | Limit / fallback |
|---|---|---|
| ID/adjacency indexing | O(n + m) time and storage | Worker or server for large inputs |
| SCC discovery | Reuse linear graph traversal utility; O(n + m) | Recompute on topology revision |
| Chain/pendant-fan candidates | Adjacency scan plus emitted memberships | Count neighbor identities separately from parallel edges |
| Ownership and cycle account | Simple O(R(n + m)) baseline | Later incremental block accounting only after profiling |
| Candidate conflict planning | Deterministic sort + claimed-member checks | Bound emitted support K; disclose truncation |
| One structural witness | BFS/DFS O(n + m), returned path O(W) | Query-specific exploration and output caps |
| Transitive witnesses | DAG reduction plus retained-path queries; naive per-relation searches can be O(m(n + m)) | Small/selected condensation scopes initially |
| Observed contiguous route | Scan/index occurrence paths; cost follows retained occurrence length | Offset indexes after measurement |
| All port pairs | Potentially quadratic pair count plus searches | Lazy cells; never unconditional all-pairs preparation |
| Layout | Scales with displayed groups, columns, edges, and labels | Explicit projection budgets, not source filtering |

Do not advertise a universal linear motif engine. Large fans can be represented as one aggregate template instance rather than enumerating all leaf combinations. Unconstrained cliques, bicliques, and cycles can explode in output size and are not MVP obligations.

Initial targets, to be measured on pinned hardware/runtime: prepare the basic four-page structure of a 10k-node/50k-edge graph in a worker within 2 seconds p95 after the base atlas is ready, excluding optional expensive witness batches; p95 selection update below 50 ms on a bounded view; page changes do no source analysis. Record preparation time, peak memory, output size, and main-thread blocking separately. Do not turn an unmeasured target into a release claim.

Use one concrete benchmark machine and browser version in the benchmark report. Compare the new sidecar against current atlas preparation, and report incremental cost rather than concealing it in the whole application startup.

## 12. Implementation plan and file map

The paths below are proposals under the existing recipe area. Reconcile them with the pinned repository before coding. They are logical seams, not a request for a dozen new packages.

```text
src/components/recipes/atlas/resolution/
  types.ts                 serializable sidecar and semantic targets
  validate.ts              source/spec/partition/codec checks
  prepare.ts               page orchestration and publication result
  indexGraph.ts            compact source identity/adjacency adapter
  rules.ts                 registered MVP rule catalog and guards
  plan.ts                  candidate ordering, conflicts, pins
  ownership.ts             groups, bundles, disjoint source coverage
  cycles.ts                multigraph cycle-rank account
  ports.ts                 boundary endpoints and scoped path queries
  history.ts               page events and edge internalization history
  witnesses.ts             alternative routes and reduction certificates
  project.ts               bounded view projections, tables, descriptions
  resolutionAtlasLayout.ts aligned page geometry
  boundaryLoomLayout.ts    incidence geometry and history headers
  componentCutaway.ts      support-cell projection and geometry
  glyphs.ts                node strips, edge witnesses, cycle account
  worker.ts                versioned messages/cancellation adapter
```

Add chart recipes/HOCs to the existing chart organization only after the projection contract is exercised by both readers. Export headless functions from `semiotic/atlas/core` only after package-surface review; export visual readers through `semiotic/atlas`. These proposed additions must not drag React or chart renderers into the headless entry.

### 12.1 Vertical delivery gates

| Gate | Implement | Exit evidence |
|---|---|---|
| **NR0 — Pin the foundation** | Pin commit/build, inspect atlas exports, reproduce baseline acceptance tests, admit this bundle's fixtures | Source baseline recorded; existing tests run; new names clearly proposed |
| **NR1 — Accountable pages** | Parallel bundles, chain/fan candidates, SCC containment, authored groups, nested ownership, cycle ledger | F01–F05 invariants pass; every original edge recoverable; no new renderer |
| **NR2 — Resolution Atlas** | Page projection/layout, membership gutters, cycle strip, static edition, group explanations | F01 static story works; source-edge reconstruction works; resize does not alter facts |
| **NR3 — Boundary Loom + Cutaway** | Edge histories, incidence geometry, boundary selection, lazy port matrix, scoped witnesses | F02/F03 ghost routes exposed; F04 parallel relation retained; column omissions disclosed |
| **NR4 — Semantics and portability** | Optional DAG transitive reading, registered specs, shared selection, SSR/CSR/table/evidence parity | Same revision and claims across browser/static/agent surfaces; stale worker results rejected |
| **NR5 — Earn promotion** | Larger generators, reader study, capability/schema registration, bundle/performance tests | Both modes beat appropriate baselines on their target tasks without new semantic errors |

Do not begin with a general spectral-sequence engine. Do not hold NR2 hostage to all future motif discovery or global community detection. Conversely, do not ship a visual page scrubber before NR1 can explain and reverse its abstractions.

## 13. Acceptance tests and evaluation

### 13.1 Mandatory mathematical/data tests

Every page partitions admitted original vertices exactly once. Every original edge has exactly one owner, including self-loops and parallel edges. Later owning blocks are unions of earlier blocks. Default owning blocks are connected in the declared weak projection. Nested content references expand to the expected source IDs.

Verify the cycle-account identity on fixtures and many small generated graphs/connected partitions. Verify independence of source counts and metrics from layout ordering, viewport limits, label pins, color, and frame rate. A change of analytical scope or relation filter must change the result identity.

Positive witnesses must replay against original endpoints and edge IDs. Negative results require exhaustive search in their declared finite scope. Transitive witnesses must exist in the retained DAG reading, not only in the pre-reduction graph. Observed witnesses must preserve one occurrence and contiguous offsets. Missing edge-level trajectory data cannot identify a particular parallel edge.

### 13.2 Mandatory adversarial/UI tests

Test the false directed quotient route, mixed observed journeys, repeated visits to the same semantic state, empty graphs, isolated vertices, a single self-loop, two opposite directed edges, multiple parallel edges, overlapping groups, incompatible hierarchy levels, protected nodes, missing attributes, unknown rule versions, disclosure restrictions, worker revision races, and long labels.

A failed candidate leaves the previous page valid and a diagnostic visible. A budget-limited result never describes the network as fully simplified. A blank support cell never ambiguously means both unqueried and absent. A grouped component does not become an original-node row in exported data.

An annotation-only page may change presentation but cannot change ownership counts or first-internalization history. Expanding one component may change geometry but cannot change the selected page's analytical identity.

### 13.3 Reader evaluation

Use tasks with independently known answers, not “which chart do you like?”

**Resolution Atlas tasks:** identify which rule hid a chosen edge; recover its original endpoints; distinguish a feedback region being contained from disappearing; compare two grouping policies; explain why the final page is not necessarily an irreducible graph.

**Boundary Loom tasks:** find cross-domain connections; distinguish parallel edges from two independent routes; locate an indirect alternative without asserting capacity equivalence; detect the false component continuation; identify an unknown support result.

Compare against strong baselines with equal evidence access and training: grouped node-link + tree/table for Atlas; incidence/BioFabric or an ordered adjacency view + edge table for Loom; ordinary component expansion for Cutaway. Include the current Dependency X-Ray where available, not just a deliberately bad hairball.

Run ablations: pages without provenance, pages without cycle account, loom without history, and component port labels without the support matrix. Measure task accuracy, unsupported-route assertions, time, source recovery, and learning burden separately. More attractive motion is not the success criterion.

Use a formative study first to discover grammar mistakes. Only set a quantitative promotion threshold after task variance is understood; a reasonable preregistered candidate is a 20% median time reduction on the primary task with no loss of route/numerical accuracy. That is a proposed decision criterion, not a predicted result.

### 13.4 Bundle verification scope

In the supplied run, all 16 named checks passed: exhaustive enumeration covered 76 simple graphs through four vertices and 499 connected partitions; seeded directed multigraph tests covered 200 graphs and 715 partition states. See `reference/validation-results.json`. These are reference results, not Semiotic test results.

The provided standard-library checker validates the authored page ledgers, cycle-rank identity, original-edge ownership, nested coarsening, selected directed/observed path counterexamples, parallel-edge deletion trap, overlap behavior, and exhaustive small undirected graph/connected-partition cycle accounts. It does not run Semiotic, validate browser rendering, measure performance, or implement the automatic candidate planner.

The TypeScript file is a checked declaration of the proposed contract shape, not a working library. Its successful type check establishes local type consistency only.

## 14. Decisions intentionally deferred

**Literal spectral sequences or persistent homology.** A later adapter may accept actual filtered complexes, field coefficients, page groups, differentials, and source representative maps from a topology backend. It must be a separately named mathematical capability. Ordinary graph-only filtrations do not supply the two-dimensional cells that would fill graph cycles; choosing a clique complex or other construction changes the question. This is not a prerequisite for the practical cycle ledger. [S1]

**Community detection as explanation.** A supplied or computed community can be a useful grouping, but its algorithm/seed/resolution must be recorded. Group stability under several chosen parameters is not a confidence interval or a universal significance score.

**Incremental global analysis.** Begin with coherent snapshot recomputation; add incremental algorithms only where benchmarked workloads justify their complexity.

**An all-purpose importance number.** There is no MVP “spectral importance.” Boundary depth, bridge status, source-root dominance, traffic, and domain importance answer different questions. Let an author foreground a supported finding without laundering those differences into a magical rank.

**Automated operational recommendations.** The visualization can expose a direct edge with an indirect alternative. It does not tell an operator to delete a dependency. Such a recommendation needs an admitted domain model and a separate verification action.

## 15. Recommended first demonstration

Build F01 as a static four-page Resolution Atlas over the current custom-network layout contract, with the cycle account and one recoverable selected edge. Then add the Boundary Loom view over the *same prepared sidecar*, and use F02 to make its Cutaway show why the apparent route is false.

That pair earns the new abstraction: one chart explains where complexity went; the other interrogates what the resulting overview is allowed to claim.

The intended contribution is not “networks, but spectral.” It is **a network representation that can account for its own simplifications**.

---

## Sources and inspection notes

Public sources were inspected October 2, 2026. Repository references below point to moving `main`; the implementation must pin a commit and run its build/tests. Source inspection is not runtime verification. Prior design files are the user's Library documents; their proposal status is retained. Mathematical derivations and proposed chart behavior are distinguished from claims about existing code.

**P1.** `semiotic-foliated-networks-design.md`, September 11, 2026. Prior requirements for source-backed sections, route-preserving ports, independent ledgers, coherent revisions, and headless preparation. Library file `file_00000000766c81fda58ea00cf3b643f6`, version 1.

**P2.** `semiotic-network-atlas-three-designs.md`, September 11, 2026. Prior Motif Braid, Dependency X-Ray, and Flow Circuit design; overlapping motifs versus ownership; preserved residual edges; static/browser parity. Library file `file_00000000264881fd8e09694477c94dad`, version 1.

**S1.** The Stacks Project, Section 12.24, “Spectral sequences: filtered complexes,” tag 012K. Mathematical boundary of the analogy. `https://stacks.math.columbia.edu/tag/012K`

**S2.** Semiotic package manifest, public version/export/script declarations. `https://raw.githubusercontent.com/nteract/semiotic/main/package.json`

**S3.** Atlas preparation implementation and argument order. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/prepare.ts`

**S4.** Atlas types, schema version, supported relation/source shapes, motif matcher declarations. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/types.ts`

**S5.** Atlas motif implementation. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/motifs.ts`

**S6.** Occurrence-oriented capsule selection. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/capsules.ts`

**S7.** Dependency projection and SCC utility. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/dependencyForest.ts` and `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/directedGraph.ts`

**S8.** Existing original-graph dependency/witness queries. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/dependencyQueries.ts`

**S9.** Contiguous path support and query wrappers. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/support.ts` and `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/recipes/atlas/queries.ts`

**S10.** Network custom-layout contract, frame responsibilities, selection, and documented color limitation. `https://raw.githubusercontent.com/nteract/semiotic/main/src/components/stream/networkCustomLayout.ts`

**S11.** NetworkX, `transitive_reduction` documentation. DAG scope and definition; reference/oracle, not a browser dependency. `https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.dag.transitive_reduction.html`

**S12.** Longabaugh (2012), “Combing the hairball with BioFabric: a new approach for visualization of large networks,” BMC Bioinformatics 13:275. Precedent for node rails and edge columns. `https://link.springer.com/article/10.1186/1471-2105-13-275`

**S13.** Fuchs et al., “Motif Simplification for BioFabric Network Visualizations: Improving Pattern Recognition and Interpretation,” IEEE VIS 2025 program/author abstract. Precedent for motif glyphs in the incidence grammar; this document makes no global novelty claim. `https://ieeevis.org/year/2025/program/paper_e14aa8da-3794-45ba-9dd7-5e0ced3449c7.html`

**S14.** Henry, Fekete, and McGuffin (2007), “NodeTrix: Hybrid Representation for Analyzing Social Networks.” Precedent for local matrix/global network composition. Component Cutaway instead specifies a port-path-support matrix, not merely adjacency. `https://arxiv.org/abs/0705.0599`

**S15.** Dunne and Shneiderman (2013), “Motif simplification: improving network visualization readability with fan, connector, and clique glyphs.” General motif-glyph precedent; bibliographic record inspected, not the full paywalled paper. `https://dl.acm.org/doi/10.1145/2470654.2466444`

## 16. NR0–NR4 implementation record

The foundation was pinned to commit `01bd7270fe81b33d5b98834318584d6d40e24044`,
package 3.12.0. Before changes, `npm run check:network-atlas-acceptance` passed
252 tests across 22 files, the atlas fixture checker, and its TypeScript gate.
The supplied Python checker and original fixture source files were not present.
`scripts/network-resolution/reference-results.json` preserves the supplied report;
`fixtures.ts` explicitly reconstructs F01 from its description and edge ledger.
The authored reference pages reproduce all four supplied cycle/ownership ledgers.
Automatic detection also folds the eligible x–y serial interior on its first
folding page, so its intermediate counts differ from the authored partitions.
Its final domain view still has five blocks, seven boundary records, six
compatible bundles, and total cycle rank five. This distinction is tested.

The runtime is deliberately opt-in:

```tsx
import { prepareNetworkAtlas } from "semiotic/atlas/core"
import {
  prepareNetworkResolution,
  defaultResolutionView,
  traceComponentPort,
  exportResolutionEvidence
} from "semiotic/experimental/network-resolution"
import {
  ResolutionAtlasChart,
  BoundaryLoomChart,
  ComponentCutaway,
  NodeResolutionStrip,
  EdgeWitnessGlyph,
  resolutionChartProps
} from "semiotic/experimental/network-resolution/react"
```

Package review found that eager additions to `semiotic/atlas` and
`semiotic/atlas/core` exceeded their existing bundle budgets. The two experimental
entry points isolate that cost and keep stable imports within their existing
limits. No dependency or lockfile changed. Capability registration, stable chart
names in the server/MCP registry, and promotion remain NR5 work. For static SVG
and render evidence now, use `renderChartWithEvidence("NetworkCustomChart",
resolutionChartProps(props, "resolution-atlas"))`; the corresponding mode is
`"boundary-loom"`. The React readers add projection-aware tables and inspectors.

Contract refinements relative to the supplied standalone TypeScript:

- `pageRuleCounts` optionally batches consecutive rules into a displayed page;
  the counts must sum to `rules.length`. The default is one rule per page.
- `set-union/v1` references child sets without copying full membership into each
  ancestor. Expansion validates codecs, reference domains, and cycles.
- The sidecar retains an independent admitted source snapshot, section order,
  edge semantics, and observation coverage so it survives JSON/worker transport.
- Evidence queries return revision/scope/coverage envelopes. `getEdgeHistory`
  returns its history under `value`.
- Missing edge semantics keep records separate. Transitive subduing requires
  homogeneous semantics explicitly allowing the reachability reading. Witnesses
  replay through retained condensation relations; subdued edges remain owned.
- Views disclose projected records and exact per-page literal/component/omitted
  edge sets. Original-edge columns are the initial Loom format; parallel bundles
  remain available in the analytical ledger with exact endpoint pairs.
- Cutaway's `offset` selects an 8-by-8 matrix tile, traversing every egress tile
  before advancing the ingress tile. Missing, unqueried, ambiguous restricted
  parallel-edge evidence, and exhausted budgets remain unknown.
- Cutaway draws original internal connections and outside neighbors above the
  support result. One pair uses a compact verdict; multiple pairs use cells no
  larger than 34 by 32 pixels. Selecting a pair highlights its entry, exit, and
  exact witness edges. The evidence control switches between structural paths
  and observed journeys; changing the component resets the selection and tile.
  The drawing admits at most 32 nodes and 64 edges, discloses omissions, and never
  changes the scope of the support queries. Ambiguous observed edge identities
  highlight the known nodes without claiming specific parallel edges.
- Atlas groups with contiguous member rows use one capsule across section
  boundaries. Section membership appears in the label and tooltip. Gaps occupied
  by other groups require numbered parts with one canonical selection. Each part
  reports its local members; hover matches complete membership across generations.

The contiguous-section layout correction was checked in the shared React/static
Atlas renderer and the Novel Network Lab's Editorial view. Editorial has one
capsule with five members, eight internal edges, and Editing/Review attributes;
original boundary edges, self-loops, source selections, and cross-generation
highlighting are retained. Interrupted member rows still require separate spans.
Verification passed 52 focused unit tests, eight browser tests (including real
hover and selection after resize), source/docs type checks, targeted lint, and
the production library/documentation build.

Preparation is synchronous and browser-independent. Hosts can call
`handleResolutionRequest` in their existing worker or upstream process. Requests
and replies carry request ID, generation, source/base revisions, spec/input
hashes, and evidence-policy ID. Begin/cancel/publish functions prevent superseded
or cancelled replies from replacing the last coherent sidecar. Cancellation
prevents publication; hosts terminate their worker when they need to interrupt
CPU work. The library does not create a worker or fetch evidence automatically.
Only admitted/authorized source data belongs in the base atlas; evidence export
also accepts an authorization callback and refuses denied source records.

The source separation is analysis (`prepare`, `rules`, `plan`, `ownership`,
`cycles`), queries (`ports`, `witnesses`, `queries`), projection (`project`,
`glyphs`), geometry (the three layouts), and React readers. Layouts reuse existing
network scene primitives, pointer handling, selection provenance, and SSR.
Source metrics are never recalculated on resized geometry. Label pins expose
original-node portals, and local component inspection opens a separate Cutaway.
History tables retain original edge identity and classify each page's ownership.

Run the focused acceptance checks with:

```sh
npx tsc -p scripts/network-resolution/tsconfig.json
npx vitest run src/components/recipes/atlas/resolution
npm run check:network-atlas-acceptance
CI=1 npx playwright test integration-tests/network-resolution.spec.ts --project=chromium --workers=1
node --test scripts/network-resolution/package.test.mjs
node --import tsx scripts/network-resolution/render-editions.ts
```

The edition generator writes two SVGs, render/accessibility evidence packets,
and a reviewable HTML page to `/private/tmp/semiotic-network-resolution` by
default; an explicit output directory may be passed. The browser fixture is
`/network-resolution-examples/` on the integration Vite server, with `?mode=loom`
for the incidence reader. Both editions use the same prepared synthetic source.

The interactive documentation now includes **Charts → Network → Resolution
Atlas** at `/charts/resolution-atlas-chart` and **Boundary Loom** at
`/charts/boundary-loom-chart`. Run `npm run docs:dev` to explore them on port 3000.
Both pages expose representation selection, compact/zoomed views, original-edge
and group inspectors, single-pair and multiport Cutaways, structural/observed
comparisons, a missing-journey example, and JSON/SVG exports. Native
controls and source tables remain available alongside horizontally scrollable
drawings on phones.

The Cutaway/fragment review covers both documentation pages, the Novel Network
Lab's Editorial group, shared client/static layouts, canonical source selections,
the existing theme/appearance roles, and the ESM/CommonJS experimental entry
points. Regression coverage includes original node/edge hover, cell selection,
resize placement, unknown evidence, and numbered-part highlighting. Browser
verification also exposed pointer tooltips reopening after Escape; frame
keyboard dismissal now cancels queued pointer updates in network, XY, ordinal,
and geographic readers. Physics uses its separate semantic pointer handling.

This follow-up passed the 240-test resolution/lab/frame suite, the additional
20-test geographic/keyboard suite, and all 11 documentation browser tests. The
three new Cutaway/Editorial browser tests also passed three consecutive runs.
Source, test, and focused documentation type checks, targeted ESLint, custom
lints, the file-size gate, both package-entry tests, the production library
build, and the production documentation build completed successfully. The
file-size gate retains non-blocking warnings for existing large files. The
documentation build prerendered 326 routes and checked 1,138 JavaScript assets.

Verification includes exact edge ownership and nested transitions, prototype-like
IDs, malformed/stale inputs, 76 exhaustive small graphs / 499 connected
partitions, false quotient routes, mixed journeys, repeated occurrence offsets,
parallel-edge ambiguity, retained-DAG certificates, 20-of-200 projection coverage,
all Cutaway matrix tiles, JSON round trips, worker races/cancellation, static
render evidence and accessibility, real node/edge hover, tooltip placement after
resize and zoom/pan, and tooltip dismissal. No reader study, production-data
performance claim, or NR5 promotion follows from these checks. Large-scale
performance tuning, optimized crossings, and automatic worker scheduling remain
outside this implementation pass.

Completed verification for this implementation:

- The expanded network-atlas acceptance suite passed 284 tests across 26 files,
  its fixture checker, and TypeScript gate. The 32 resolution tests were also
  rerun after the final coverage change.
- Two Chromium tests passed against the built package imports, including real
  mark hover, tooltip placement and dismissal after resize and camera changes,
  original-edge inspection, and unsupported endpoint routes.
- Three documentation browser tests passed for both navigation paths, real
  mark hover after layout/camera changes, source-edge inspection, Cutaway scope,
  JSON/SVG exports, phone overflow, and automated accessibility. The documentation
  build, prerendered HTML, route metadata, sitemap entries, asset budgets, and
  protected-source checks passed via `npm run check:website-build:from-dist`.
  Focused page type checks and lint passed. This audit covers both readers and
  their shared demo, including the static and tabular export paths.
- Library and focused TypeScript checks, targeted ESLint, custom lints,
  file-size checks, chart-spec checks, and the production build passed.
- Stable API checks, package-surface checks, package smoke tests, two resolution
  export/bundle tests, existing bundle budgets, and the cold-consumer check passed.
  The cold-consumer helper's 21 tests passed; its generated report changed only
  the experimental export exclusions.
- The static edition generator completed successfully. Both editions contain
  data marks, retain all 18 projected edge records, and have no critical failures
  in the configuration accessibility audit. Manual accessibility checks remain
  unverified; this is not an accessibility certification.

The original Python reference checker could not be rerun because its code and
fixture sources were absent. The supplied report is preserved, and reconstructed
fixture comparisons are explicitly scoped above. NR5 checks and the full release
suite were outside the requested scope.

### Atlas hover and shared appearance follow-up

Atlas component hover now matches original node membership across all displayed
pages, including split visual fragments. Earlier components are matched directly
to the hovered members; later unions do not broaden the match back into unrelated
earlier components. Hover uses the frame restyle channel and does not rebuild
geometry or analysis. Leaving a mark restores its styles, including pre-existing
subdued edge opacity and linked selection provenance.

`ResolutionAppearance` supplies generation palettes, per-role styles or callbacks,
label styles, and selection opacity for both readers, Cutaway, and compact glyphs.
Generation colors use absolute ordinals and the full analysis domain retained in
the projection. Scheme names inherit `ThemeProvider.colors.sequential` (blues by
default); arrays and callbacks are explicit overrides. Text, surfaces, semantic
marks, and selection dimming use existing theme tokens. The network layout context
now forwards sequential and selection-opacity tokens in browser and static paths;
its optional type additions are reflected in generated API snapshots.

The related-surface audit covered Atlas, Loom, embedded and standalone Cutaway,
both glyphs, React/server SVG rendering, linked selection, palette changes, and
light/dark/high-contrast themes. Both documentation pages now use the documentation
theme, and Atlas includes a generation-palette control. Verification passed 81
focused unit tests across nine files, four documentation browser tests (including
canvas fill samples, real hover, dismissal, resize/zoom, and phone accessibility),
two package export tests, TypeScript, lint/custom lints, the production and
documentation builds, API snapshots, and existing bundle budgets.

### Boundary Loom connection colors

Loom now colors connections by endpoint ownership on the selected page: theme
secondary for intra-group edges and primary for inter-group edges. The same colors
apply to endpoint marks, self-loops, collapsed-group caps, and the legend. History
cells retain the classification for their own page. Tooltips report the applicable
page and classification. `appearance.edgeColors` overrides the two colors; the
shared override also applies to Atlas boundary edges and true self-loops.

The related-surface audit covered expanded/collapsed Loom geometry, all generations,
parallel edges, self-loops, history cells, selection restyling, Atlas edge marks,
and static SVG. Verification passed all 44 resolution unit tests, five documentation
browser tests (including sampled endpoint colors and real hover in both themes),
library/focused/documentation TypeScript, targeted ESLint, the custom lint gate,
and the production and documentation builds. No analysis rules or counts changed.
