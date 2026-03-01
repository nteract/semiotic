# Contributing to Semiotic

Welcome! We're glad you're here.

## Getting started

```bash
git clone https://github.com/nteract/semiotic.git
cd semiotic
npm install --legacy-peer-deps
npm test          # 628 unit tests (Jest)
npm run dist      # build all bundles (Rollup)
npm run typescript  # type check
```

Requires Node 18+. See `.node-version`.

## Project structure

```
src/
  components/
    XYFrame.tsx, OrdinalFrame.tsx, NetworkFrame.tsx   # core Frames
    charts/
      xy/         # LineChart, AreaChart, Scatterplot, etc.
      ordinal/    # BarChart, StackedBarChart, PieChart, etc.
      network/    # ForceDirectedGraph, SankeyDiagram, TreeDiagram, etc.
      realtime/   # RealtimeLineChart, RealtimeBarChart, etc.
      shared/     # colorUtils, hooks, validateChartData, validateProps
    realtime/     # RealtimeFrame, RingBuffer, renderers
    server/       # renderToStaticSVG
  processing/     # data pipelines and layout algorithms
ai/               # schema.json, MCP server, CLI, system prompt, examples
scripts/          # build.mjs, release scripts
docs/             # website source (Parcel)
```

## Development workflow

1. Create a branch from `main`
2. Make your changes
3. Run `npm test` and `npm run dist` to verify
4. Open a PR against `main`
5. CI runs tests, build, and type check automatically

## Build toolchain

- **Rollup 4** — library bundles (`npm run dist`)
- **Parcel** — docs website (`npm start`)
- **TypeScript 5** — type checking (`npm run typescript`)
- **Jest** — unit tests (`npm test`)
- **Playwright** — integration tests (`npm run test:dist`)

## Architecture

Semiotic has three layers:

| Layer | Purpose | Example |
|---|---|---|
| **HOC Charts** | Simple props, sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Frames** | Full control over rendering and interaction | `<XYFrame lines={d} customLineMark={...} />` |
| **Utilities** | Axes, legends, annotations, brushes | Used internally by Frames |

HOC charts wrap Frames. Every HOC accepts `frameProps` to pass through to
the underlying Frame for advanced use cases.

## Testing

- Unit tests live next to source files: `ComponentName.test.tsx`
- Run a single test: `npx jest --testPathPattern=LineChart`
- Integration tests: `npm run test:dist` (requires build first)

## Code style

- TypeScript, no `any` in new code where avoidable
- Prettier handles formatting (see `.prettierrc`)
- ESLint for linting (`npm run lint`)
- No semicolons, double quotes, trailing commas

## Publishing releases

Releases are automated via GitHub Actions. The workflow:

1. Update `version` in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore(release): v3.0.0"`
4. Tag: `git tag v3.0.0`
5. Push: `git push && git push --tags`
6. CI builds, tests, and publishes to npm automatically

The `NPM_TOKEN` secret must be configured in the repo's GitHub settings.

## Community

This project follows the nteract
[Code of Conduct](https://github.com/nteract/nteract/blob/main/CODE_OF_CONDUCT.md).
