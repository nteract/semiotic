# sankey-plus

Sankey layout engine with improved circular link handling, derived from
[sankey-plus](https://github.com/tomshanley/sankey-plus) by
[Tom Shanley](https://github.com/tomshanley) (@tomshanley).

Tom built `d3-sankey-circular` and then `sankey-plus` as its successor,
with better cycle detection (Johnson's algorithm), hierarchical arc radius
stacking, two-pass layout with collision resolution, and dynamic extent
adjustment. The original work was released under the MIT license.

Vendored into Semiotic with Tom's algorithms preserved. Converted from
JavaScript to TypeScript for strict mode compatibility.

## Key improvements over d3-sankey-circular

- **Hierarchical arc radius**: Circular arcs nest concentrically instead of
  stacking linearly, producing tighter layouts with multiple cycles.
- **Two-pass layout**: Double positioning pass with alpha-decay relaxation
  and explicit collision resolution.
- **Dynamic extent adjustment**: `adjustGraphExtents()` recalculates bounds
  after circular path data is computed — no more clipped loops.
- **Geometric link sorting**: Perpendicular intersection checks prevent
  false link overlaps.
- **Configurable parameters**: `verticalMargin`, `circularGap`, `baseRadius`
  are tunable instead of hardcoded.
- **Built-in cycle detection**: Johnson's algorithm via Tarjan SCC, no
  external dependency on `elementary-circuits-directed-graph`.
