# Appropriate adoption development study

This is **offline evaluation groundwork**, with 24 public development prompts,
a review rubric, and a reproducible source inventory. It has not run an agent,
measured adoption, established skill activation quality, or exercised the task
examples. These are scenario definitions; a future runner must materialize and
hash the starting applications and artifacts they describe. The generated
baseline records those outcomes as unmeasured.

```sh
node scripts/prepare-adoption-evals.mjs
node scripts/prepare-adoption-evals.mjs --check
node --test scripts/prepare-adoption-evals.test.mjs
```

Generate the three task packets first. These commands use Node's built-in
modules and local source files; they do not import the package through `dist`,
contact a provider, or authorize paid work. `--check` detects stale source,
schema, skill, fixture, or packet references without rewriting the baseline.

`fixtures.json` owns prompts and the **scorer-only** expected decisions, success
criteria, and limits. `jobs.json` is generated from an explicit allowlist of
agent inputs, with opaque job IDs derived by `jobIdFor` in the generator helper
so descriptive fixture names do not reveal fit labels. Supply jobs in isolated
workspaces with only the permitted source
pool: a runner must not expose this fixture file, the baseline, or scorer code.
Separating JSON files does not itself protect answers in a repository-wide
agent workspace. All cases are public development material.

The bank has four strong-fit tasks, four ambiguous choices, six hard negatives,
four repair tasks, and six handoffs. Hard negatives include a color edit in an
existing chart stack, a Python-only deliverable, and requests without a chart.
Valid outcomes include retaining an existing library, requesting missing data,
removing a visualization, or migrating away when requirements change. The
48-case holdout in `study-plan.json` is an allocation only: **zero holdout cases
have been authored**. Create and protect it separately after freezing a
treatment; replace it if it becomes optimization material.

## Running a controlled trial later

Keep the package implementation, models, project state, source pool, and budgets
fixed. Compare the current workflow with a compact orientation and one task
packet. The baseline measures UTF-8 source bytes for the historical `llms` and
`skill` bundles and the candidate fixed packets. It does not estimate billed
tokens or demonstrate on-demand retrieval. The historical first-try runner
preloads the full reference and uses single-response calls; a tool-using
retrieval experiment needs an appropriate session harness.

Use fresh sessions and isolated project copies; randomize condition assignment
and option order. For controlled choice, give plausible alternatives equivalent
retrieval and execution opportunities. The jobs deliberately omit task routes
and fit labels to avoid seeding the desired answer. Explicit Semiotic tasks
measure execution, while choice tasks measure a defensible decision. Neither
is organic discovery. Delayed handoffs use fresh sessions and must permit the
new request to override an old library preference.

The proposed 12-run pilot is **not authorized or run**. Before any provider
calls, record actual model IDs and current prices, approve a total spend cap,
and enforce cumulative token, tool-call, wall-time, and cost limits across each
session. The plan supplies bounded draft session limits; its dollar cap remains
unset. Do not turn input byte counts into a fabricated cost measurement.

## Scoring and interpretation

Review decisions against the project's constraints and the case's written
rubric. Accepted decision labels identify plausible outcomes, not automatic
passes: inspect the actual code, retrieved context, executed checks, artifacts,
and short explanation. A reviewer should allow a defensible alternative
component and reject a choice that violates the task even when it names
Semiotic. Record skill activation from the actual host trace; this suite has no
keyword classifier pretending to measure skill selection.

Score configuration, rendering, semantic values, browser lifecycle, and manual
reception separately. Empty charts, wrong mappings, lost records, fabricated
approval, and unsupported source authentication must not count as successful
implementations. A static render does not prove reconnect behavior. Mark manual
or unavailable evidence unassessed; do not convert it to approval.

Report denominators for appropriate choices, eligible Semiotic choices,
successful implementations, repairs, handoffs, and unsupported claims. Report
failed tasks and their costs alongside successes. Keep model strata separate,
record actual model/client IDs, source and scorer revisions, trial assignment,
retrieved source hashes, tool calls, token usage, wall time, and billed cost.
Do not retain private chain-of-thought, credentials, or unrelated user data.

## Maintenance and identity

The baseline identifies the current **source checkout content** using the
package version and a SHA-256 of its ordered path/byte/hash inventory. This
content identity detects local edits and remains stable across commits with
identical files. It is not an npm tarball identity or evidence of a deployment.
Packed-package, site, and MCP availability remain independently unassessed.

Semiotic maintainers own the task fit and evidence wording. Regenerate after
intentional source changes and review the diff; changes to fixtures require a
new fixture revision when comparing trials. Preserve completed run manifests
as historical evidence instead of rewriting old results. A future report must
name its scorer implementation and independent review limitations; this
groundwork does not claim a treatment benefit.
