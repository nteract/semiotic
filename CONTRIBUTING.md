# Contributing to Semiotic

Semiotic is a React data visualization library with canvas-first chart rendering, server-side SVG rendering, AI/MCP tooling, and a Vite-powered documentation site. This guide describes the current repository workflow; package scripts and CI are the source of truth.

## Getting Started

```bash
git clone https://github.com/nteract/semiotic.git
cd semiotic
npm install
npm run dist:prod
npm run build:mcp
npm test
npm run typescript
```

Build the library and MCP bundles before running `npm test`: the MCP protocol
suites spawn the bundled server, which resolves `semiotic/*` entry points from
`dist/`. Source and artifact fingerprints reject missing or stale builds in
local runs and CI. Rebuild after changing library or MCP runtime source.

The package browser suite also requires both builds: its widget regression
loads the shipped MCP executable during test collection. Local
`npm run test:dist` starts `serve-examples`, which builds the library and MCP
artifacts before serving. If reusing an existing server, rebuild with
`npm run dist && npm run build:mcp` before running Playwright. The Linux
snapshot bootstrap builds production library and MCP artifacts explicitly. Pull
request CI builds the production library once (`production-build`) and the
package and browser jobs download that build; the docs example suite runs as
three Playwright shards.

Visual baselines exist for Linux only (`*-linux.png`). See
[TESTING_BASELINE.md](TESTING_BASELINE.md) for running the browser suite on
another platform.

The repo pins the development Node version in `.node-version` and Volta in
`package.json`. Use that version for the current toolchain; historical story
rebuilds retain the runtime versions documented with each edition.

## Project Structure

```text
src/
  components/
    stream/       # Stream Frames, pipeline stores, canvas renderers, workers
    charts/
      xy/         # LineChart, AreaChart, Scatterplot, etc.
      ordinal/    # BarChart, StackedBarChart, PieChart, etc.
      network/    # ForceDirectedGraph, SankeyDiagram, TreeDiagram, etc.
      geo/        # ChoroplethMap, FlowMap, DistanceCartogram, etc.
      realtime/   # push-driven realtime charts
      physics/    # Galton, pile, process, gauntlet, etc.
      value/      # BigNumber
      shared/     # shared HOC helpers, validation, metadata
    server/       # static SVG, image, dashboard, and export utilities
    recipes/      # pure custom-layout kit + decoration helpers
    ai/           # suggestCharts, describe, navigation, provenance
    data/         # transforms, portability, adapters
  vendor/         # vendored third-party (e.g. sankey-plus)
ai/               # schema, MCP server, CLI, prompts, examples, metadata
docs/             # documentation site source (Vite)
integration-tests/# Playwright fixtures and specs
consumer-contracts/# portable regression inputs and observable contracts
scripts/          # build, release, validation, and generated-doc scripts
benchmarks/       # vitest bench suites
```

## Development Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run the narrow tests or checks that cover your change.
4. Run broader release checks for shared behavior, public API changes, SSR, AI contracts, or docs changes.
5. Open a PR against `main` with the checks you ran.

For consumer-inspired rendering regressions, reuse the
[consumer contract corpus](consumer-contracts/README.md). It shares portable
inputs between source-renderer tests and browser parity, with explicit
provenance and observable expectations.

## Toolchain

- **tsup / esbuild** via `scripts/build.mjs` for library bundles (ESM + CJS). Browser worker offload uses the ESM entry so bundlers can discover worker assets through `import.meta.url`. The CommonJS fallback resolves sibling files from the real Node module filename; browser builds that replace `__filename` with a mock path fall back to synchronous execution.
- **Vite 8** for the docs website and integration-example server.
- **TypeScript 6** for type checking and declarations (`tsconfig.declarations.json`).
- **Vitest** for unit, integration, and benchmark tests.
- **Playwright** for browser and visual regression coverage.
- **esbuild** (via `scripts/build-mcp.mjs`) for the bundled MCP server.
- **Chunk-aware cold-consumer checks** for bundle budgets; facade files are
  intentionally tiny re-export shells and are not a useful size signal.
  Consumer checks bundle one named import with code splitting and count the
  initial-load (eager) graph separately from on-demand chunks.

## Common Commands

### Choose the smallest useful check

Start with the smallest useful check before running the full release suite:

1. **Focused:** `npx vitest run path/to/changed.test.tsx` (and targeted ESLint
   for source edits). Run this while implementing.
2. **Fast shared gate:** `npm run check:fast` when a change crosses component,
   schema, or generated-surface boundaries.
3. **Release preflight:** `npm run check:release-preflight` checks the dependency
   audit and source/generated contracts before building or running browsers.
   It reports all failed checks together. The tag workflow runs it before types
   and browser jobs, including when manually recovering an older tag.
4. **Release gate:** `npm run release:check` only for a release candidate or a
   shared/public-surface change that needs the complete contract matrix. It
   runs the release preflight first, and `prepublishOnly` delegates to it.

Production builds check entry-graph size budgets as soon as their ESM output is
finalized, before the remaining CommonJS and worker builds. `npm run size` also
checks those budgets first when validating existing artifacts.

The size gate writes `dist/entry-graph-report.json`, including final raw/gzip
bytes, static dependencies and the entries that share each chunk. Builds also
write `dist/bundle-inputs.json` for source attribution across every ESM group.
On failure, the gate lists the largest reachable chunks and their contributing
modules; CI retains both reports even when the early build gate fails.

To explain growth between two builds, save the first report outside `dist/`
(builds clean that directory), then compare the second build:

```bash
node scripts/check-entry-graph-size.mjs --report /tmp/semiotic-entry-before.json
# Make the change and run npm run dist:prod again.
node scripts/check-entry-graph-size.mjs --compare /tmp/semiotic-entry-before.json
```

Use `--details` to inspect passing graphs too. Comparisons match uniquely
identifiable hashed chunks by their contributing modules; splits and merges
remain added/removed chunks. Source byte contributions describe esbuild output
before post-processing, not additive per-module gzip costs. Budget decisions
always use the final compressed files; these reports do not adjust limits.

### New-chart checklist

Before calling a chart public, complete every relevant item:

- Add the HOC and its focused behavior tests.
- Add the chart spec; `scripts/check-chart-specs.ts` is the source of truth
  for the schema/capability contract.
- For XY, ordinal, network, physics, and realtime charts, add renderer and docs references in
  `src/components/charts/shared/chartDefinitions{XY,Ordinal,Network,Physics,Realtime}.ts`.
  The generator owns
  their MCP registry, server registry, and metadata category. Other families
  still use authored registrations.
- Regenerate and check schema/surface artifacts when the spec changes.
- Add capability metadata, a documentation page/example, and one focused
  Playwright visual snapshot.
- Cover SSR or explicitly mark the chart HOC-SSR-only/non-renderable with a
  reason; validate the corresponding `renderChart` path.
- Run the focused tests plus `npm run check:chart-specs`, and use the checks
  listed in the repository instructions for AI, docs, or package-surface work.

### Chart artifact ownership

`npm run docs:chart-specs:schema -- --list` lists the generation entry inputs,
all fifteen outputs, and consumer build order. Their transitive imports also
affect those outputs. Edit the chart specs for props/capabilities and chart
definitions for migrated registration/docs references, then run:

```bash
npm run docs:chart-specs:schema
npm run check:chart-specs
npm run dist:prod
npm run build:mcp
npm run check:mcp-bundle
```

Regeneration and freshness checks share one projection in
`scripts/lib/chart-spec-artifacts.ts`. Use
`npm run docs:chart-specs:schema -- --check` for a read-only artifact check;
`check:chart-specs` also checks public prop contracts and registration sets.
Do not edit generated registry files or the marked XY/ordinal/network/physics/realtime regions in
`ai/componentMetadata.cjs`.
ChartSpec `importPath` overrides also control generated MCP imports, preserving
the Atlas readers' separate `semiotic/atlas` entry.
Definition `mcp` references can declare rendering exclusions or category overrides
independently of server support. Realtime charts support bounded server snapshots;
MCP registers only TemporalHistogram, retaining its existing XY category.

CLI `--doctor` and MCP `diagnoseConfig` share the typed operation in
`ai/operations/diagnose.ts`. Keep transport parsing and output formatting in
their adapters. Change usage-mode filtering or fallback validation in the
operation and test both transports. `build:mcp` owns both tracked bundles in
`ai/dist/`; `check:mcp-bundle` verifies both. Schema-only CLI diagnosis must
remain usable without library bundles and explicitly report its limited mode.

```bash
# Core checks
npm test
npm run typescript
npm run typescript:mcp
npm run lint
npm run check:file-size   # hard line limits (see scripts/file-size-policy.json)

# Builds
npm run dist          # unminified library bundles (tests / local)
npm run dist:prod     # minified production bundles
npm run build:mcp

# Browser and visual tests
npm run test:dist
npm run test:visual:update

# Docs
npm run docs:dev
npm run website:build
npm run docs:api:json
npm run check:docs-routes

# AI and public-surface contracts
npm run check:chart-specs
npm run check:ai-schema
npm run check:ai-reference-coverage
npm run check:ai-examples-coverage
npm run check:ai-contracts
npm run check:ai-instructions
npm run check:agent-skill
npm run check:context7
npm run check:llms
npm run check:mcp-registry
npm run check:surface
npm run check:typedoc

# Release-oriented checks
npm run check:ssr
npm run check:test-quality
npm run check:jsdoc-coverage
npm run size
npm run check:pack
npm run check:consumer-compatibility
npm run release:check
```

After finalizing source and documentation edits, refresh generated task packets.
The command also refreshes the adoption inventory after writing its packet inputs:

```bash
npm run docs:ai-tasks
npm run check:ai-tasks
npm run check:adoption-evals
```

Commit the generated outputs with their inputs. Task packets fingerprint
`package.json` and `package-lock.json`, so dependency-only fixes require this
refresh too. The adoption inventory includes
the complete `README.md`, so even a README-only edit requires
`npm run prepare:adoption-evals` after the edit.

`check:consumer-compatibility` installs the built package in a temporary consumer
with the exact compiler versions in `scripts/consumer-compatibility/toolchain.json`.
It checks all public JavaScript entries in their browser or server targets with
webpack, Rspack, and Vite in development and production. Unexpected compiler warnings,
browser console warnings/errors, failed requests, missing chart paint, failed
worker responses, failed optional peer simulations, and invalid SSR evidence fail
the gate. Matter and Rapier are loaded through their named public helpers from
installed npm packages; each must simulate gravity, including Rapier's WASM
initialization. The generic native-import helper has a separate URL probe.
The synthetic API census retains every export; transfer-size budgets remain
owned by `npm run size`.
The only permitted module diagnostic is Vite/Rolldown's `MODULE_LEVEL_DIRECTIVE`
warning for Semiotic's own `"use client"` directives: these are required for RSC
consumers, and the plain browser fixture has no RSC boundaries to preserve.
Every occurrence is recorded in the report; other directives, other packages,
and all other module diagnostics still fail. The named-import Vite application
uses code splitting with the default size warning threshold intact.
The full-engine peer probes run from the library-sized API census, which also
gets loaded in the browser. The census's packed `semiotic/server/edge` namespace
also executes in Chromium in each bundler/mode: the probe verifies real SVG
marks and domains, geometry precision, custom React annotations and legends,
accessible text, and local GeoJSON rendering. Reference geography is checked
separately: synchronous rendering rejects an unresolved `world-110m` string;
the probe awaits `semiotic/geo.resolveReferenceGeography` with the installed
`world-atlas` peer and renders the returned features. Edge rendering does not
load named geographies synchronously. The report's `edgeRenderer` field records
these checks separately from live charts, workers, optional peers and Node SSR.
This probe runs after the census loads and adds no renderer import to the
ordinary chart application. Consumers supply no Node dependency aliases or
`react-dom/server` shims.

Rapier 0.19.3 emits a deprecation warning inside its
own public `init()` implementation, even without Semiotic. The gate records a
single occurrence of that exact warning only during the Rapier probe and only
for that version; other console warnings/errors still fail. Revisit this
exception when upgrading Rapier. Peer versions and expected warnings are
included in the compatibility report.
Install Chromium first with `npx playwright install chromium` when running locally.

Use `-- --tarball /path/to/semiotic.tgz` to check an existing archive,
`-- --bundler rspack` for a focused run, or `-- --latest` to check the newest
compiler releases without modifying the pins. The JSON report under
`test-results/consumer-compatibility/` records compiler versions, archive SHA-512,
covered entries, and failures. Failed temporary consumers are retained for
diagnosis. PR CI requires the pinned matrix, release CI checks the exact archive
before publication, and a weekly workflow checks newer compiler versions.

## Confirmed-defect related-surface audit

When a user-visible defect is confirmed, do not close it once only the minimal
reproduction passes. Trace its contract through parallel renderers and entry
points, generated artifacts and schemas, serialized formats, and relevant
public API paths. Fix or add regression coverage for every same-class issue
found, then record the audit scope, negative results, and verification in the
issue or PR. This additional audit is not required for a transient CI or
infrastructure failure unless it also demonstrates a product behavior failure.

TypeDoc treats warnings as errors. Its validation intentionally skips only the
"referenced but not exported" category: Semiotic's entry-point declarations
use structural types from internal modules, while the checked-in API snapshots
and clean packed-consumer compilation are the authoritative export-resolution
gates. Invalid links, paths, and all non-validation warnings remain fatal;
third-party React lifecycle links are mapped explicitly in `typedoc.json`.

Use the `docs:api`, `docs:api:json`, and `check:typedoc` npm scripts for TypeDoc.
They load a scoped compatibility adapter for TypeDoc 0.28's directory walker,
which still calls the `matchOne` method removed in minimatch 11. The adapter
uses the patched matcher's public partial-match API without modifying installed
packages. Its file-discovery regressions run with `node --test scripts/typedoc-compat.test.mjs`.

### Public signature type audit

`npm run check:api-surface` builds declarations, runs the signature-type audit,
then verifies the existing API snapshots. The audit follows the bound
TypeScript declaration graph from every JavaScript package entry with a types
target, including experimental entries. It resolves imports/re-exports,
overloads, callback signatures, generic arguments and constraints, recursive
types, and namespace exports. Transparent type aliases also supply importable
names; specialized generic aliases do not name every instantiation of their
underlying type. Private class members are excluded. External definitions
(React, GeoJSON, DOM, and other dependencies) are recorded as boundaries;
package-owned arguments to external generic types are still inspected.

The generated `dist/public-signature-types.json` contains every reachable named
type, its declaring file/line, public import paths, direct reference sites, and
review classification. Names containing a dot represent namespace-qualified
access, such as `import("package").layouts.Input`. The report is retained as a
CI artifact and excluded by the npm package's existing file allowlist.

The reviewed set lives in
[scripts/public-signature-types.json](scripts/public-signature-types.json).
Only its `author-facing` import requirements block regressions. `internal`
entries need an explicit reason; remaining package types without public imports
are reported as `unreviewed`, not automatically classified as defects. A useful
inferred structural type does not require a new export. Reviews fail if their
declaration disappears, their metadata is invalid, or a required family/core
import is lost, even when another public path survives. API snapshots and
release compatibility checks continue to protect the broader public surface.

The initial composition audit confirmed missing `FrameGraphicsContext` and
`FrameGraphicsProp` exports in `semiotic/xy`, `semiotic/ordinal`,
`semiotic/network`, and `semiotic/geo`. These are type-only exports of the
existing scale-aware callbacks. The related physics path exports its own
existing `FrameGraphicsProp`, whose callback receives size and margin without
scales. The network scene/layout types, interactive-graphics types, annotation
and hover contexts, and `TransitDiagramConfig` were already public and now have
reviewed import coverage. Normalized `RealtimeNode`/`RealtimeEdge` inputs include
store bookkeeping; helpers can name their shapes through
`NetworkLayoutContext["nodes"][number]` and `["edges"][number]`, while authors
construct the public scene-node/edge types as layout results.

[The packed composition fixture](scripts/fixtures/packed-typescript-consumer/src/composition-types.tsx)
implements these callbacks and layouts using public imports, including recipe
station rendering and generic ordinal interactive graphics. `check:pack`
compiles it with NodeNext against an installed tarball; no source aliases or
deep `semiotic/dist/*` imports are used. The consumer installs React and D3
scale/projection typings explicitly, since those external definitions are not
package-owned. Invalid-input assertions guard against silently losing callback
types to `any`. To inspect the audit locally:

```sh
npm run build:declarations
npm run check:public-signature-types
node --import tsx scripts/check-public-signature-types.ts --json
```

This declaration-dependent check belongs after declaration generation, not in
source-only release preflight. Add reviewed types deliberately with a consumer
example and a reason; do not export every transitive helper to clear the report.

## Architecture

Semiotic has three main user-facing layers:

| Layer | Purpose | Example |
| --- | --- | --- |
| **HOC charts** | Focused chart APIs with sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Stream Frames** | Lower-level rendering, interaction, streaming, and SSR behavior | `<StreamXYFrame ... />` |
| **Utilities and AI tooling** | Validation, serialization, themes, server rendering, MCP, and assistant contracts | `validateProps`, `renderChart`, `semiotic-ai` |

HOC charts wrap Stream Frames. Every HOC accepts `frameProps` for advanced pass-through behavior.

Prefer **subpath imports** in application code (`semiotic/xy`, `semiotic/ordinal`, …) so consumers do not pull the full library. The root `semiotic` entry and `semiotic/ai` are convenience / tooling surfaces.

### Lifecycle ownership

Use a local discriminated union when flags describe mutually exclusive phases.
Keep independent lifecycles separate: simulation pause/visibility, worker
execution, pending frames, and host mutation acknowledgements have different
transition rules. Existing reducers and small ownership guards do not need a
general state-machine dependency.

| Owner | States and commit boundary |
| --- | --- |
| Physics worker run | `sync`, `starting`, `active`, `failed`; the active run owns its pending frame and deferred render request. |
| Network layout request | A request owns cancellation and publication; publish `ready` only after geometry or an empty topology is committed. |
| Data ingestion replacement | One replacement owns history chunks, pushes, and its queued flush. Publication is `Idle`, `Publishing`, or `FlushRequested`; a reentrant flush cannot overtake the active callback. Frame effect cleanup disconnects delivery; Strict Mode reconnection retains queued rows. Only clear/replacement discards them. |
| Details panel | `closed`, `opening`, `open`, `closing`; only closing retains content for exit animation, and its timer owns that particular close. |
| MCP operation runner | `idle`, `listening`, `closed`; shutdown rejects new work immediately, while child process slots remain occupied until exit/close. |
| Compositional solve | The active abort controller owns publication and `updating`. Install or revoke that owner before notifying the old engine; completed solves release it. Worker transport failure closes admission until a new engine is created. |
| Camera gesture | Pointer ownership, animation, and pending immediate moves defer settling. Destroyed drivers cannot enqueue continuation or a new settle timer from a returning host callback. |
| Realtime ingestion and EventDrop readouts | Clear, replacement, and unmount retire the publishing batch. Recheck ownership after observations and watermark callbacks before emitting more rows or events. Compare aggregation policy fields structurally rather than serializing dependency keys; Strict Mode replay alone must not clear data or rebuild an accumulator. |
| Reference geography | A ready result or import error belongs to one reference name. A different reference renders loading immediately; import errors go through the chart error boundary. |
| Remote docs data | A deadline publishes fallback/error before aborting transport. Late responses and geolocation callbacks cannot publish after request retirement. |
| Saved-edition docs actions | Reservoir and flight pages share `useAsyncAction`: navigation cancels the action's publication rights, including uncancellable file reads and cache writes. Only its owner releases `busy`. |
| Docs tween | Skip initial mount, including Strict Mode effect replay. Each effect cancels its queued frame on replacement/unmount and checks ownership after the frame callback. |

Revoke ownership before aborting or terminating work. A stale completion must
check its owner before changing pending flags, publishing data, or releasing
resources. Recheck after consumer callbacks that can synchronously clear,
replace, or start work. Test those event sequences using existing runtime
doubles, spies, fake timers, and controllable promises; keep instrumentation out
of production code.

## Testing Guidance

- Unit and integration tests live next to source files as `*.test.{ts,tsx,jsx}`.
- Use `npx vitest run path/to/file.test.tsx` for focused runs.
- Browser and visual tests live under `integration-tests`.
- Build dist before Playwright when the test expects packaged output.
- Exact test counts change as coverage grows; use current command output rather than hard-coded counts.

## Code Style

- TypeScript is preferred for new source files.
- Avoid `any` in new code unless there is a clear boundary reason.
- Prettier and ESLint define formatting and lint rules.
- Existing style uses no semicolons and double quotes.

### Custom lint lifecycle

Repository-specific lints run as a blocking ratchet in `npm run
check:custom-lints`. New rules begin as unstable at 5/10, and every failure is
also a test of the rule itself. The accepted dispositions are: fix the bug;
adjust, demote, or retire the rule with evidence; and promote it only after the
strong-evidence threshold is met. See `scripts/custom-lint/README.md` for the
scoring model, evidence ledger, and baseline commands.

### Source file size limits

CI enforces hard line counts on `src/**/*.{ts,tsx,js,jsx}` (physical lines, same as `wc -l`):

| Kind | Soft warning | Hard fail |
| --- | ---: | ---: |
| Production source | 500 | **800** |
| Tests (`*.test.*` / `*.spec.*` / `__tests__`) | 800 | **1500** |

ESLint’s `max-lines` defaults to 300 and docs recommend 100–500; visualization / stream-frame code is denser, so Semiotic uses a higher ceiling plus a **ratchet allowlist** for the remaining mega-files we are splitting.

- Prefer extracting a helper module over growing a large file.
- Grandfathered files live in `scripts/file-size-policy.json`. Their `maxLines` is a reviewed
  warning ceiling; crossing it emits an always-visible warning but remains non-blocking within the
  configured `ratchetGraceLines` runway (50 production lines, 100 test lines). Exceeding the end of
  that runway fails CI.
- **Take ratchet warnings seriously.** They are time to review cohesion and plan or perform a
  meaningful extraction before the gate becomes blocking. Do not raise `maxLines` merely to silence
  a warning, and do not let repeated small additions consume the runway unnoticed.
- When a split brings a file under the hard limit, remove its allowlist entry (or run `npm run check:file-size -- --update-allowlist`).
- Escape hatch for true corner cases: add an allowlist entry with a clear `reason`, or (for generated fixtures) an inline `// file-size-limit: allow — reason` in the first 40 lines.

```bash
npm run check:file-size
npm run check:file-size -- --json          # machine-readable report
npm run check:file-size -- --update-allowlist
```

### Cold-consumer bundle ratchet

Each row bundles one public named import from the packed tarball with Rolldown (via Vite) code
splitting, as an application would ship it. `gzipBytes` is the initial load (the entry plus statically imported
chunks, gzipped per file); `lazyGzipBytes` is code fetched only when a feature needs it.

Two more totals keep growth from hiding behind a lazy boundary. `singleFileGzipBytes` is the same
import bundled by Rolldown with code splitting off, so it counts everything the import can reach.
`esbuildGzipBytes` is that single file built by esbuild, the bundler whose splitting keeps these
modules eager. The ratchet gates the initial load and both totals with the same tolerances.

`npm run check:cold-consumer` keeps package exports and the measurement method exact, so structural
contract drift still fails immediately. Byte measurements use two levels: changes inside the
supported runner variance pass silently; changes outside that variance warn without failing until
positive growth exceeds four times the metric's runner tolerance. Size improvements warn for a
baseline refresh but never fail solely for making a consumer bundle smaller.

The docs/package CI lane runs this check immediately after the production build and bundle budgets,
before MCP preparation, package tests, or the docs build. Local `check:package-contracts` and
`check:package-contracts:from-dist` also check cold consumers before package tests and API checks.
For an intentional import-graph change, run `npm run dist:prod && npm run docs:cold-consumer` and
`npm run docs:readme-dashboard`. Review the baseline JSON, generated README table, and dashboard
SVG together; the dashboard also reads the cold-consumer baseline.

**Take cold-consumer warnings seriously.** Inspect the affected named import and its reachable graph
before the warning runway is exhausted. Regenerate the baseline only after deciding the growth is an
intentional, acceptable part of that public import—not simply to make CI quiet.

### Keeping published chunks tree-shakeable

Published ESM chunks merge many modules, so one module-scope side effect retains every component
that shares its chunk in consumer bundles. Library modules therefore keep module scope inert:

- Name components with a pure initializer:
  `export const Chart = /* @__PURE__ */ withDisplayName(/* @__PURE__ */ forwardRef(...), "Chart")`.
  Annotate module-scope `memo`, `createContext`, and `React.lazy` calls the same way.
- The rule also checks ordinary calls and constructors, including nested
  initializer expressions. Add `/* @__PURE__ */` only after confirming that
  discarding the call is safe; its arguments still need to be inert. Move
  registration and other observable work to first use instead.
- Register plugins, layouts, and engines inside the component (an `ensure…Registrations()` call at
  the top of render), not at import. Server modules and entry files may register at load.
- Prefer module constants to `static` class fields (the es2020 build lowers them to assignments) and
  base classes to prototype mixins.

`semiotic/no-module-side-effects` (`npm run check:custom-lints`) enforces this in `src/components`,
and `npm run check:treeshake-isolation` (part of `npm run size`) bundles representative named
imports from `dist` and fails when one retains an unrelated chart. The build also drops esbuild's
side-effect-only cross-chunk imports when their targets are inert
(`scripts/lib/strip-pure-bare-imports.mjs`), so an on-demand chunk's shared code stays on demand.

### Benchmark baselines

`npm run bench:baseline` refreshes `benchmarks/setup/baseline.json` for local
`npm run bench:compare:committed` comparisons. Capture it on an otherwise idle machine;
absolute timings from a different architecture or runner are not comparable.

The PR performance gate uses `npm run bench:pr-vs-main`: it measures the candidate and
`origin/main` on the same machine with the candidate's identical benchmark cases and fixtures.
Updating the committed JSON cannot clear this gate. Investigate a family of regressions in its
shared runtime path, preserve correctness coverage, and rerun the same-hardware comparison.
Do not remove benchmark cases or raise thresholds to conceal the regression. Refresh the local
baseline only after reviewing the measured behavior change.

The gate requires both relative and absolute growth:

- A single benchmark fails at **≥100% slower and ≥10 ms added**.
- A systemic regression fails at **five or more warnings**, each **≥25% slower
  and ≥5 ms added**.
- Increases of ≥25% that add less than 5 ms remain visible as warnings but do not
  count toward the systemic quota. Relative reporting skips cases only when both means are
  below 1 ms; a large regression from a sub-millisecond baseline still fails.

These absolute allowances are review budgets, not evidence of runner noise.
For example, 2 ms → 5 ms remains informational despite its 150% increase;
20 ms → 30 ms counts toward systemic failure, and 10 ms → 20 ms fails alone.
The same policy applies to PR, previous-release, and committed-baseline comparisons.

The network camera has a separate Chromium gate built directly from source:

```bash
npm run test:network-camera:contracts
npm run test:network-camera
NETWORK_CAMERA_PROFILE=1 npm run test:network-camera
```

Both modes run with one worker, no retries, production React and 4× CDP CPU
throttling. Production enforces the existing acceptance targets: **4 ms mean
scripting per camera frame at 1,000 compact nodes/k=1**, **6 ms for PipelineCard**,
**16 ms at 3,000 nodes/fit** (SVG-only and semantic edges), and **2.5 ms mean
script + browser layout per coalesced pointer update** over 4,500 edges.
The original 4 ms PipelineCard and 1 ms pointer goals remain optimization targets.
Profiling checks layer commit counts; its timings are diagnostic. Both modes
check layout reuse, culling membership, LOD settling and real tooltip behavior.
Repeated dense pans verify exact mounted membership and round-trip stability;
their timings have no calibrated acceptance budget yet.
The cold-query report also separates scene commit, hit-index preparation and
first query across fresh, unchanged, restyled and mutated scenes. Preparation
optimizations must retain exact Canvas hit semantics and detect in-place edits
to retained arrays and records; passing the warm pointer budget alone does not
establish that scene preparation is cheap.

The `network-camera` CI jobs run production and profiling on separate runners
using the pinned Playwright container. Reports survive timing failures and are
uploaded even when the gate fails. Local outputs stay separate under
`test-results/network-camera/{production,profiling}` with sibling Playwright
JSON reports. To retain an entire measurement matrix locally, run the collector
after each mode (set `NETWORK_CAMERA_PROFILE=1` for the profiling default path):

```bash
node --experimental-strip-types scripts/collect-network-camera-baseline.mjs
```

The collector requires all twenty camera rows and twelve pointer rows, rejects
mixed environments or incomplete captures, and records budget failures before
exiting unsuccessfully. Its timing summary does not replace the Playwright
correctness result. It never recalculates the fixed budgets from a baseline.
The committed captures are local evidence; collect repeated CI runner results
before claiming Linux timing calibration. Investigate runner variance or an
over-budget workload without automatically relaxing these targets.

## Before Opening a PR

Run the checks that match the change. For shared library changes, public API changes, release work, generated AI contracts, or SSR behavior, `npm run release:check` is the best local approximation of CI.

For docs-only changes, run at least:

```bash
npm run check:ai-reference-coverage
npm run check:ai-contracts
npm run check:ai-instructions
npm run check:llms
npm run check:docs-routes
```

Add `npm run website:build` when routes, examples, generated API docs, or public docs pages change.

## Feature demand and changelog provenance

Describe demand in the feature request and PR templates, including composition
attempted and observable completion or workaround-removal criteria. “Not yet
attempted” and “no existing workaround” are valid. Public API proposals can use
[the RFC process](rfcs/README.md).

The `added-provenance: v1` marker in `CHANGELOG.md` adopts provenance for new
`Added` bullets in Unreleased and releases after 3.13.3. Existing release history
is grandfathered and must not be rewritten to add attribution. Put exactly one
source marker on each new root bullet, including a continuation line if useful:

```md
- Add a capability needed by the linked use case. [source: #123]
- Implement the accepted proposal. [source: rfcs/001-example.md]
- Support an export workflow. [source: consumer: public dashboard SVG export workflow]
- Improve an independently identified capability. [source: maintainer]
```

An HTTPS issue/PR, public RFC, or meaningful consumer reference also works:
`[source: https://example.org/public-context]`. `maintainer` is an honest origin
statement, not a default to insert automatically. Nested bullets describe their
parent; they do not supply the parent's attribution. Code spans, fenced or
indented examples, and HTML comments also cannot supply attribution. Use ATX
headings (`## [version]`, `### Added`) and Markdown root list items (up to three
leading spaces); align continuation paragraphs to the item's text. The checker
rejects unsupported prose/HTML/blockquote blocks in adopted Added sections and
unclosed fences/comments instead of silently skipping potential entries.

Run `npm run check:changelog-provenance -- --base-ref <explicit-base-sha>` for
PR changes. Missing refs/history fail with a diagnostic; fetch the base first.
Without `--base-ref`, release validation checks all applicable Added entries
against the adoption boundary, including entries moved out of Unreleased.
The source-only checker needs no installed packages, build output, or browser.

## Publishing Releases

Current release checklist:

1. Update the changelog and versioned metadata. Review new `Added` provenance
   with [the checker](scripts/check-changelog-provenance.ts).
2. Run `npm run check:release-preflight` for source/dependency validation before
   builds; `npm run release:check` also builds and validates artifacts. Neither
   command commits, pushes, tags, or publishes. Preflight performs a registry audit.
3. [create-release-branch.sh](scripts/create-release-branch.sh) prepares and
   validates a release branch, then **commits and pushes it**. Its version
   synchronization and baseline commands write files; inspect the script before
   using it. It does not create the release tag.
4. After the release PR is reviewed and merged, creating a tag triggers
   [release.yml](.github/workflows/release.yml), which validates tagged source,
   freezes the artifact, and **publishes to npm** through trusted publishing.
   Manual recovery targets the existing tag and uses current validation tooling.
   Tags predating provenance adoption skip only that new check; a missing checker
   in adopted source fails validation.

These are current mechanics, not an adopted release calendar, response SLA,
freeze, cooling period, or mandatory consumer-review policy.

Releases are automated through GitHub Actions and npm trusted publishing. The
`semiotic` package must authorize GitHub Actions for repository
`nteract/semiotic`, workflow `release.yml`, GitHub environment `release`, with
`npm publish` allowed. Both npm-authenticating jobs must declare that exact
environment because it is part of the trusted OIDC identity. Do not add
`NPM_TOKEN` or `NODE_AUTH_TOKEN` to the release workflow: token credentials take
precedence over OIDC and can turn an expired secret into a misleading npm 404.
Release PRs should update `package.json`, `CHANGELOG.md`, and any generated
artifacts required by the release checks before tagging.

The [release routing helper](scripts/release-dist-tag.ts) validates the complete
package version and chooses the npm dist-tag:

| Version | npm dist-tag |
| --- | --- |
| Stable, such as `3.14.0` | `latest` |
| `alpha`, `beta`, or `rc` prerelease, such as `3.14.0-rc.1` | `beta` |
| `next` prerelease, such as `3.14.0-next.1` | `next` |

The first prerelease identifier must match one of those names exactly;
unsupported channels (including `nextish`) and malformed versions fail before
authentication or expensive jobs. Build metadata does not change SemVer channel
classification, and metadata tools preserve it literally. However, **publication
rejects `+build` versions**: [npm strips build metadata before publishing](https://github.com/npm/cli/blob/v11.6.2/workspaces/libnpmpublish/lib/publish.js),
which would break the exact version identity shared by the tag, tarball,
registry, and deployment. Choose a version without build metadata for a release.
Both initial tag validation and publish output selection use the workflow
revision's helper against the selected tag's `package.json`, including manual
recovery of older tags. Only `latest` enables the stable deployment and Registry
jobs. This mapping does not add scheduled prereleases or prerelease version
progression to the release-branch command.

Use `npm run create-release-branch -- <major|minor|patch>` for the maintained
release flow. It builds the package, MCP server, and docs before refreshing the
machine and browser baselines. Baseline writes first compare p50 measurements
with the previous committed evidence and refuse to overwrite it on a measured
regression; static snapshot drift is printed and committed for PR review. Use
`compare:machine-baseline` or `compare:browser-baseline` for a read-only preview,
and never hand-edit the JSON snapshots. The release-branch command also runs a
missing-only visual bootstrap in the pinned Linux Playwright container: new
images are written for review, while any difference against an existing image
still fails.

After the release PR is merged, `npm run publish-release` creates the version
tag from a clean, validated `main`. The tag workflow independently proves the
tagged commit is merged into `origin/main` and exchanges GitHub OIDC for a
short-lived package-scoped npm credential before starting any expensive jobs.
It then runs deterministic source, API, package, and documentation checks before
freezing the immutable npm artifact. Performance, machine, browser, and visual
baselines are PR gates; release runs may report selected baseline diagnostics,
but they cannot block publication. If infrastructure fails after a tag is
created but before npm accepts the package, use the Release workflow's manual
`release_tag` input to retry that exact tag with the current release tooling.
Manual recovery uses the selected workflow revision's manifest-evidence and
listed browser regression test harnesses against the tagged application and
manifest. Regression harnesses are replaced only when that test already exists
in the tag; recovery never adds a newer example or changes the tagged application.
To apply a harness fix, dispatch Release from the revision containing that fix,
with `release_tag` set to the existing tag. Re-running an old Actions run retains
its old workflow and test harness. The sweep runs in batches
of at most eight routes, each with a fresh browser context and its own timeout;
the uploaded evidence files together cover the complete tagged manifest.
The publish job still checks out the untouched tag separately.
The immutable-artifact and already-published checks keep reruns idempotent.

To prepare the immutable artifact locally after building, run
`npm run release:artifact -- --out-dir /tmp/semiotic-release-artifact`, then
`node scripts/create-release-artifact.mjs --out-dir /tmp/semiotic-release-artifact --verify`.
The checkout directory may have any name. SBOM generation uses a temporary,
package-named copy of the package metadata and lockfiles; the tarball is packed
from the original checkout with `npm pack --ignore-scripts`. All four files are
validated before installation, and a failed attempt removes its partial outputs
so the same output directory can be retried. Existing artifacts are never
overwritten; retain completed evidence and use a new directory for another build.

## Community

This project follows the nteract [Code of Conduct](https://github.com/nteract/nteract/blob/main/CODE_OF_CONDUCT.md).
