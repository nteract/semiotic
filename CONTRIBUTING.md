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
- **size-limit** for bundle budgets.

## Common Commands

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
npm run check:claude-md-coverage
npm run check:mcp-registry
npm run check:surface
npm run check:ai-contracts
npm run check:ai-examples-coverage

# Release-oriented checks
npm run check:ssr
npm run check:test-quality
npm run check:jsdoc-coverage
npm run size
npm run check:pack
npm run release:check
```

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

### Source file size limits

CI enforces hard line counts on `src/**/*.{ts,tsx,js,jsx}` (physical lines, same as `wc -l`):

| Kind | Soft warning | Hard fail |
| --- | ---: | ---: |
| Production source | 500 | **800** |
| Tests (`*.test.*` / `*.spec.*` / `__tests__`) | 800 | **1500** |

ESLint’s `max-lines` defaults to 300 and docs recommend 100–500; visualization / stream-frame code is denser, so Semiotic uses a higher ceiling plus a **ratchet allowlist** for the remaining mega-files we are splitting.

- Prefer extracting a helper module over growing a large file.
- Grandfathered files live in `scripts/file-size-policy.json` with a `maxLines` ceiling — they **must not grow** past that ceiling.
- When a split brings a file under the hard limit, remove its allowlist entry (or run `npm run check:file-size -- --update-allowlist`).
- Escape hatch for true corner cases: add an allowlist entry with a clear `reason`, or (for generated fixtures) an inline `// file-size-limit: allow — reason` in the first 40 lines.

```bash
npm run check:file-size
npm run check:file-size -- --json          # machine-readable report
npm run check:file-size -- --update-allowlist
```

## Before Opening a PR

Run the checks that match the change. For shared library changes, public API changes, release work, generated AI contracts, or SSR behavior, `npm run release:check` is the best local approximation of CI.

For docs-only changes, run at least:

```bash
npm run check:claude-md-coverage
npm run check:ai-contracts
npm run check:docs-routes
```

Add `npm run website:build` when routes, examples, generated API docs, or public docs pages change.

## Publishing Releases

Releases are automated through GitHub Actions and npm credentials configured in the repository. Release PRs should update `package.json`, `CHANGELOG.md`, and any generated artifacts required by the release checks before tagging.

## Community

This project follows the nteract [Code of Conduct](https://github.com/nteract/nteract/blob/main/CODE_OF_CONDUCT.md).
