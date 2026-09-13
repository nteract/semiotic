# NA4 — Flow Circuit delivery

Flow Circuit adds a source recipe over `PhysicsCustomChart` and the existing
process kit. The interactive reader is `/examples/flow-circuit`, with the
hot-partition ETL study, retry incident, and an inspectable module grammar.
Public recipe exports and serialized chart configurations remain the NA5 gate.

## Compiler and accounting

`prepareFlowCircuit` consumes a prepared atlas and explicit node semantics.
Role-centered capsules own each canonical work node once. A deterministic
priority selects a role match while preserving the complete overlap index.
Neighboring roles remain references through original-edge ports, rather than
duplicate analytical jobs. Every original edge survives, including parallel
edges, self-loops, cross-links and returns. Display-backbone ranking changes
placement and route classification, never source facts or ledger values.

Declared FIFO, routing, retry, all-member, first-success and dependency rules
select module forms. A plain diamond remains an unclassified junction. The
grammar fixture exposes these rules interactively; completed members, winning
alternatives, cancellations and blocked work remain unmeasured when absent.
A return edge alone does not establish a retry episode. Dependency declarations
are annotations beside the work channel, not invented transport edges.

One geometry object supplies module regions, queue bounds, sensor bounds,
original-edge paths and static chrome. Fixed apparatus bodies use the existing
physics frame; direction particles are optional SVG cues. Neither collisions
nor particle counts determine process completion. No new physics engine,
production dependency, scheduling engine or public chart name is introduced.

## Editions and flagship results

An admitted edition contains explicit node readings, original-edge rates,
totals, observation times, provenance and assumptions. Missing measurements use
`null`; zero remains an actual value. Admission checks revision identity, tape
order, original-edge coverage, declared units and finite nonnegative counts.
Exports reattach the admitted tape event, retaining original edges, matches,
scope, required paths and model assumptions alongside the selected reading.

Observed snapshot and observed replay read the same tape. Playback holds the
preceding observation between samples. The synthetic fixture supplies aggregate
observations every ten seconds, **not individual service/routing timestamps**.
Unknown timing is not filled by physical simulation. Modeled scenarios have
separate IDs, upstream calculations, explicit assumptions and outcome guardrails;
they retain a reference to the unchanged observed edition.

- ETL: 80,000 records/s installed capacity, 60,000 arrivals/s, 40,000
  completions/s and 1.2 million queued records after one minute. A four/four
  partition split admits 7,500 records/s per partition and clears the capacity
  constraint under the model. Ordering, state, duplicates and outputs still
  require validation. Two hot-key partitions leave 600,000 queued records.
- Retry: the external boundary remains 10,000 roots/s as offered attempts rise
  from 10,000 to 20,000 to 30,000/s. Final repeated work is 20,000 attempts/s.
  Observed queue growth, successes and errors are unmeasured. The explicit
  budget model assumes 80% initial success and 50% success per retry: budgets
  0/1/2 yield 8,000/9,000/9,500 successful roots/s with
  10,000/12,000/13,000 offered attempts/s. Only budget 2 passes the declared
  95% outcome guardrail; latency and cancellation behavior remain unverified.

The authored interval input and dictionary live in
`fixtures/flow-circuit-intervals-v1.json`. `independent-check.py` checks its ETL
stocks and retry arithmetic independently of the TypeScript adapters.

## Interactive and static readers

The page supports mode selection, seeking, replay/pause, conditional model
controls, module clicks and keyboard selection, original-neighborhood matrix
inspection, original-edge highlighting, particle budget/seed, reduced motion,
backbone ranking, and evidence/SVG downloads. Observed/model tables compare rates
and stocks explicitly; full-width chart editions retain legible modules.
Selection updates the module history, and unmeasured intervals break its line.
At narrow viewports the table and inspector provide the task view.

Pipe width encodes transferred volume/s in explicitly labeled record, root or
attempt units. Completions and installed capacity are separate module readouts.
Queue bars encode stock relative to the largest visible queue. Rate labels use
the less crowded endpoint, keeping a shared output manifold readable.

The docs integrity gate recognizes exact NA3/NA4 page-to-recipe import pairs,
with tests rejecting unrelated private modules or pages. Both atlas pages are
visibly marked as source previews. This limited boundary is removed when NA5
provides public imports; it does not exempt ordinary examples from the gate.

## Related-surface audit and verification

The accessibility audit previously omitted the executable text contract of
`PhysicsCustomChart`. It now recognizes its title, description and summary.
The related audit covers direct text on all five custom chart families, blank
text rejection, React/server SVG rendering, evidence and accessibility findings.

Six dedicated CSR/SSR fixtures cover ETL observed/modeled, retry observed/replay/
modeled, and the module multigraph. Both sides use the built public renderer
with the shared source layout. Assertions require original IDs and endpoints,
per-edge units/rates, module forms, queue readings, edition/time, visible labels,
nonempty evidence and deterministic server SVG. Current SVG/canvas comparison
and reviewed side-by-side snapshots run in Chromium, Firefox and WebKit on macOS
and Linux; existing comparison tolerances are unchanged.

Focused unit coverage exercises independent arithmetic, all replay sample
boundaries, multiple frame rates, budgets/seeds/reduced motion, resize, backbone
invariance, original multigraph coverage, missing data, revision/mode rejection,
admitted export values and gaps in module histories. Browser tests exercise both
stories and all grammar forms, pointer/keyboard inspection, pause/seek, model
guardrails, SVG/JSON downloads, and mobile accessibility in both docs themes.

Reproduce with:

```sh
npx vitest run src/components/recipes/atlas/ src/components/charts/shared/auditAccessibilityText.test.ts scripts/check-docs-example-integrity.test.js
npm run check:network-atlas-fixtures
npm run test:examples:source -- integration-tests/docs-examples-flow-circuit.spec.ts
npx playwright test integration-tests/ssr-parity.spec.ts --grep flow-circuit
```

Verified September 12, 2026: 131 focused unit assertions; six atlas documentation
browser tests; all 36 dedicated CSR/SSR cases against reviewed snapshots; the
14-fixture independent checker; source/test TypeScript, focused ESLint, custom
lints, file-size and docs-integrity gates; production and documentation builds;
unchanged API surface, bundle/size budgets, 35 cold-consumer exports and packed
ESM/CJS consumers. Task verification ran its 14 unit assertions and six browser
tests, regenerated the task views, and passed freshness checks. Adoption output
was regenerated and passed its six tests and freshness check. No full release
suite or reader-benefit study was run.

NA5 still owns packaged reuse across the five stories, machine schemas and
independent public consumers. These tests establish the admitted fixture and
renderer contracts, not reader-benefit or performance claims.
