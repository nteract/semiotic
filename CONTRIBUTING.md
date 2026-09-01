# Contributing to Semiotic

Semiotic is a React data visualization library with canvas-first chart rendering, server-side SVG rendering, AI/MCP tooling, and a Vite-powered documentation site. This guide describes the current repository workflow; package scripts and CI are the source of truth.

## Getting Started

```bash
git clone https://github.com/nteract/semiotic.git
cd semiotic
npm install
npm run dist
npm test
npm run typescript
```

Build the library bundles (`npm run dist`) before the first `npm test`: the MCP
protocol suites spawn the bundled server, which resolves `semiotic/*` entry
points from `dist/`. Without them those suites are skipped with a warning.

The repo pins Node with Volta in `package.json`. Use that version when possible.

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
scripts/          # build, release, validation, and generated-doc scripts
benchmarks/       # vitest bench suites
```

## Development Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Run the narrow tests or checks that cover your change.
4. Run broader release checks for shared behavior, public API changes, SSR, AI contracts, or docs changes.
5. Open a PR against `main` with the checks you ran.

## Toolchain

- **tsup / esbuild** via `scripts/build.mjs` for library bundles (ESM + CJS).
- **Vite 8** for the docs website and integration-example server.
- **TypeScript 6** for type checking and declarations (`tsconfig.declarations.json`).
- **Vitest** for unit, integration, and benchmark tests.
- **Playwright** for browser and visual regression coverage.
- **esbuild** (via `scripts/build-mcp.mjs`) for the bundled MCP server.
- **Chunk-aware cold-consumer checks** for bundle budgets; facade files are
  intentionally tiny re-export shells and are not a useful size signal.

## Common Commands

### Choose the smallest useful check

Use this three-tier loop instead of beginning with the full release suite:

1. **Focused:** `npx vitest run path/to/changed.test.tsx` (and targeted ESLint
   for source edits). Run this while implementing.
2. **Fast shared gate:** `npm run check:fast` when a change crosses component,
   schema, or generated-surface boundaries.
3. **Release gate:** `npm run release:check` only for a release candidate or a
   shared/public-surface change that needs the complete contract matrix.

### New-chart checklist

Before calling a chart public, complete every relevant item:

- Add the HOC and its focused behavior tests.
- Add the chart spec; `scripts/check-chart-specs.ts` is the source of truth
  for the schema/capability contract.
- Regenerate and check schema/surface artifacts when the spec changes.
- Add capability metadata, a documentation page/example, and one focused
  Playwright visual snapshot.
- Cover SSR or explicitly mark the chart HOC-SSR-only/non-renderable with a
  reason; validate the corresponding `renderChart` path.
- Run the focused tests plus `npm run check:chart-specs`, and use the checks
  listed in the repository instructions for AI, docs, or package-surface work.

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
npm run release:check
```

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

## Architecture

Semiotic has three main user-facing layers:

| Layer | Purpose | Example |
| --- | --- | --- |
| **HOC charts** | Focused chart APIs with sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Stream Frames** | Lower-level rendering, interaction, streaming, and SSR behavior | `<StreamXYFrame ... />` |
| **Utilities and AI tooling** | Validation, serialization, themes, server rendering, MCP, and assistant contracts | `validateProps`, `renderChart`, `semiotic-ai` |

HOC charts wrap Stream Frames. Every HOC accepts `frameProps` for advanced pass-through behavior.

Prefer **subpath imports** in application code (`semiotic/xy`, `semiotic/ordinal`, …) so consumers do not pull the full library. The root `semiotic` entry and `semiotic/ai` are convenience / tooling surfaces.

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

`npm run check:cold-consumer` keeps package exports and the measurement method exact, so structural
contract drift still fails immediately. Byte measurements use two levels: changes inside the
supported runner variance pass silently; changes outside that variance warn without failing until
positive growth exceeds four times the metric's runner tolerance. Size improvements warn for a
baseline refresh but never fail solely for making a consumer bundle smaller.

**Take cold-consumer warnings seriously.** Inspect the affected named import and its reachable graph
before the warning runway is exhausted. Regenerate the baseline only after deciding the growth is an
intentional, acceptable part of that public import—not simply to make CI quiet.

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

## Publishing Releases

Releases are automated through GitHub Actions and npm trusted publishing. The
`semiotic` package must authorize GitHub Actions for repository
`nteract/semiotic`, workflow `release.yml`, GitHub environment `release`, with
`npm publish` allowed. Both npm-authenticating jobs must declare that exact
environment because it is part of the trusted OIDC identity. Do not add
`NPM_TOKEN` or `NODE_AUTH_TOKEN` to the release workflow: token credentials take
precedence over OIDC and can turn an expired secret into a misleading npm 404.
Release PRs should update `package.json`, `CHANGELOG.md`, and any generated
artifacts required by the release checks before tagging.

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
The immutable-artifact and already-published checks keep reruns idempotent.

## Community

This project follows the nteract [Code of Conduct](https://github.com/nteract/nteract/blob/main/CODE_OF_CONDUCT.md).
