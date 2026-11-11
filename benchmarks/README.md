# Benchmarks

Two kinds of measurement live here.

| Directory | What it is | Runs in CI |
| --- | --- | --- |
| `unit/` | `vitest bench` cases. `npm run bench:pr-vs-main` compares a branch with `main` on the same machine and gates pull requests. | Yes |
| `harness/` | Report-only scripts for the stream rendering core: scene work in Node, and real frames in Chromium. | No |
| `setup/` | Committed baselines and fixtures used by the scripts above and by `scripts/`. | — |
| `experiments/` | One-off investigations, kept for their notes. | No |

`CONTRIBUTING.md` ("Benchmark baselines") documents the `unit/` gate. This file documents
`harness/`.

## The harness

The harness answers one question: when data, size, or the pointer changes, how long is the
frame, and where does the time go? It drives the real `PipelineStore`, canvas renderers, hit
tester, and `DataSourceAdapter` from source. No build is needed.

Every number depends on the machine. Each script prints the machine it ran on; compare a
before and an after from the same machine and never mix machines. Close other work first,
because the scripts report medians of short runs.

### `npm run bench:scene-work`

Node only. Times the work between a change and the paint, for an XY scatterplot and a line.

```
npm run bench:scene-work
npm run bench:scene-work -- --sizes=10000,50000 --load-sizes=200000 --line-sizes=100000 --json
node --expose-gc --import tsx benchmarks/harness/xy-scene-work.ts   # adds the memory estimate
```

Scatter update paths, one row per point count, median milliseconds:

| Column | The change being timed |
| --- | --- |
| cold load | A new store ingests the whole array and builds its first scene. |
| push 1 | One datum is appended and the scene is rebuilt. Nothing reads the spatial index. This is a streaming chart with no pointer over it. |
| push 1 + hit test | The same, followed by one hit test. The first hit test after a rebuild builds the spatial index, so this is a streaming chart with the pointer over it. |
| hit test | One hit test against an index that is already built. |
| resize | The layout changes size. Settled scenes are remapped in place instead of rebuilt. |
| style change | A style function is replaced. Today this rebuilds the scene. |
| same data, new array | The `data` prop gets a new array with equal contents. |
| sliding-window push | One datum is pushed into a full sliding window, evicting the oldest. |

`push 1` should stay well below `push 1 + hit test`. If the two converge, the index is being
built eagerly again.

Large-array load runs an array through `DataSourceAdapter` exactly as a frame does: each
delivery is ingested and the scene is rebuilt once.

| Column | Meaning |
| --- | --- |
| single pass ms | Ingest everything and rebuild once: the floor. |
| adapter total ms | All deliveries, each followed by a rebuild. |
| deliveries | How many chunks the adapter emitted. |
| longest frame ms | The slowest single delivery plus its rebuild. |
| adapter / single | Total work relative to the floor. The default schedule keeps this under about 2x at every size; a ratio that grows with the row count means chunking is quadratic again. |

### `npm run bench:spatial-index`

Node only. Isolates the cost of the point index by running the same sliding-window push with
and without a hit test, on a lattice and on seeded uniform-random points.

```
npm run bench:spatial-index
npm run bench:spatial-index -- --sizes=10000,50000,100000 --json
```

`index build` is `push + hit test` minus `push only` minus `warm hit test`. `index share` is
that build as a fraction of a hovered push. A share near zero with `push only` as large as
`push + hit test` means the index is built during the rebuild, not on demand.

### `npm run bench:frame-interval`

Real Chromium through Playwright, with a real canvas and real animation frames. It needs the
Playwright Chromium build (`npx playwright install chromium`).

```
npm run bench:frame-interval
npm run bench:frame-interval -- --sizes=10000,50000 --load-sizes=200000 --dpr=1
npm run bench:frame-interval -- --software     # CPU rasterization
npm run bench:frame-interval -- --headed --json
```

Each scatter and line cell reads `script ms / frame interval ms (p95 interval)`:

- **script ms** is the JavaScript time our work took inside the frame.
- **frame interval ms** is the time between animation frames. The first line of output gives
  the idle interval for the display (16.7 ms at 60 Hz, 8.3 ms at 120 Hz). A case that keeps the
  idle interval is not dropping frames; one that doubles it has halved the frame rate.

Script time can sit under the idle interval while the frame interval still doubles. That
means rasterization, not JavaScript, is the limit.

The harness never reads pixels back. `getImageData` and `toDataURL` force a synchronous
flush, which makes every frame appear as slow as its raster and hides whether the browser
kept its cadence. The output names the GPU renderer so a software-raster run is not mistaken
for a GPU one. Headless runs are capped at 60 Hz; use `--headed` on a high-refresh display to
see intervals below 16.7 ms.

The load table reports the same large-array load as the Node script, but across real frames:
how many frames painted, wall time to the complete chart, total script time, the slowest
frame, and the cost of the first paint.

### What is not covered yet

Ordinal, network, and geo frames; hover and brush interaction through React; heap growth
over a long stream; Safari and Firefox. Add a case here before optimizing any of those.
