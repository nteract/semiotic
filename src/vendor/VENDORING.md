# Vendoring d3-sankey-circular

This is a vendored (bundled-as-source) replacement for [d3-sankey-circular](https://github.com/tomshanley/d3-sankey-circular). It exposes the same API, so it's a drop-in swap anywhere `d3-sankey-circular` is used.

## Why vendor instead of npm install?

- You control the source directly — no waiting on upstream fixes
- One runtime dependency (`d3-array`) instead of three
- No build step required — it's plain ES modules

## Directory structure

Copy the `src/` directory into your project under a path like `src/vendor/d3-sankey-circular/`:

```
your-library/
  src/
    vendor/
      d3-sankey-circular/
        index.js
        align.js
        circularPath.js
        sortGraph.js
        nodeAttributes.js
        linkAttributes.js
        find.js
        networks/
          elementaryCircuits.js
    ...your code...
```

## Dependency

This package requires `d3-array` (v3+). Your host project almost certainly already has it. If not:

```
npm install d3-array
```

No other dependencies.

## Swapping it in

Wherever your library currently imports from `d3-sankey-circular`:

```js
// Before
import { sankeyCircular, sankeyJustify } from 'd3-sankey-circular';

// After
import { sankeyCircular, sankeyJustify } from './vendor/d3-sankey-circular/index.js';
```

Or if you prefer, set up a path alias in your bundler:

```js
// webpack
resolve: {
  alias: {
    'd3-sankey-circular': path.resolve(__dirname, 'src/vendor/d3-sankey-circular/index.js')
  }
}

// vite
resolve: {
  alias: {
    'd3-sankey-circular': './src/vendor/d3-sankey-circular/index.js'
  }
}
```

With the alias approach, you don't need to change any import statements at all.

## API

The API matches d3-sankey-circular exactly.

### Setup

```js
import { sankeyCircular, sankeyJustify } from './vendor/d3-sankey-circular/index.js';

const sankey = sankeyCircular()
  .nodeWidth(24)
  .nodePadding(8)
  .nodeId(d => d.name)
  .nodeAlign(sankeyJustify)
  .size([width, height])
  .iterations(32)
  .circularLinkGap(2);
```

### Compute layout

```js
const graph = sankey({
  nodes: data.nodes,
  links: data.links
});

// graph.nodes — each node now has x0, x1, y0, y1
// graph.links — each link now has y0, y1, width, path
```

### After repositioning nodes (e.g. drag)

```js
sankey.update(graph);
```

### Chainable getter/setters

All methods return the sankey instance when called with an argument (setter), or the current value when called without (getter).

| Method | Default | Description |
|---|---|---|
| `.nodeWidth([px])` | 24 | Width of node rectangles |
| `.nodePadding([px])` | 8 | Vertical spacing between nodes |
| `.nodePaddingRatio([ratio])` | null | Padding as proportion of densest column (overrides nodePadding if set) |
| `.nodeId([fn])` | `d => d.index` | Accessor for node identity |
| `.nodeAlign([fn])` | `sankeyJustify` | Alignment function |
| `.nodeSort([fn])` | undefined | Comparator for vertical node order; also determines circularity when provided |
| `.nodes([fn])` | `d => d.nodes` | Accessor to extract nodes from input |
| `.links([fn])` | `d => d.links` | Accessor to extract links from input |
| `.extent([[x0,y0],[x1,y1]])` | `[[0,0],[1,1]]` | Layout bounds |
| `.size([w, h])` | `[1, 1]` | Layout size (shorthand for extent from origin) |
| `.iterations([n])` | 32 | Relaxation iterations |
| `.circularLinkGap([px])` | 2 | Gap between circular link paths |
| `.update(graph)` | — | Recompute link positions after moving nodes |

### Alignment functions

```js
import {
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from './vendor/d3-sankey-circular/index.js';
```

### Node properties after layout

| Property | Description |
|---|---|
| `x0`, `x1` | Horizontal bounds |
| `y0`, `y1` | Vertical bounds |
| `sourceLinks` | Outgoing links |
| `targetLinks` | Incoming links |
| `value` | Node value (max of in/out link sums) |
| `depth` | Distance from left |
| `height` | Distance from right |
| `column` | Assigned column index |
| `index` | Position in nodes array |
| `partOfCycle` | `true` if node has circular links |
| `circularLinkType` | `"top"` or `"bottom"` |

### Link properties after layout

| Property | Description |
|---|---|
| `source`, `target` | Resolved node objects |
| `y0`, `y1` | Vertical position at source/target |
| `width` | Link thickness (proportional to value) |
| `path` | SVG path `d` string — works for both normal and circular links |
| `circular` | `true` if this is a back-edge |
| `circularLinkType` | `"top"` or `"bottom"` |
| `circularLinkID` | Index among circular links |
| `circularPathData` | Geometry details for circular links (has `.path` among other fields) |

### Rendering links

Every link gets a `path` property you can use directly:

```js
svg.selectAll('.link')
  .data(graph.links)
  .join('path')
    .attr('d', d => d.path)
    .attr('fill', 'none')
    .attr('stroke-width', d => d.width);
```

## What changed from the original d3-sankey-circular

- Removed `d3-shape` and `d3-scale` dependencies (path math and scaling inlined)
- Better circular link detection via Johnson's elementary circuits algorithm
- Two-pass layout for improved node positioning
- Fixed several bugs in size calculation and node breadth assignment
- No build step — source ES modules only
