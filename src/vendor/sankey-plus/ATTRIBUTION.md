# sankey-plus

Sankey layout engine with improved circular link handling, derived from
[sankey-plus](https://github.com/tomshanley/sankey-plus) by
[Tom Shanley](https://github.com/tomshanley) (@tomshanley).

Tom built `d3-sankey-circular` and then `sankey-plus` as its successor,
with better cycle detection (Johnson's algorithm), hierarchical arc radius
stacking, two-pass layout with collision resolution, and dynamic extent
adjustment. The original work was released under the MIT license.

Vendored into Semiotic as JavaScript with TypeScript declarations and typed
ordering helpers. Semiotic replaces elementary-circuit enumeration with a
weighted feedback-order heuristic, uses iterative DAG layering, and indexes
circular arc placement. The original layout and routing remain the foundation.

## Key improvements over d3-sankey-circular

- **Hierarchical arc radius**: Circular arcs nest concentrically instead of
  stacking linearly, producing tighter layouts with multiple cycles.
- **Two-pass layout**: Double positioning pass with alpha-decay relaxation
  and explicit collision resolution.
- **Proportional circular bands**: Every circular route retains its full flow
  width. Semiotic’s layout plugin fits nodes and complete circular bands into
  the viewport with one uniform scale, preserving flow proportions.
- **Geometric link sorting**: Perpendicular intersection checks prevent
  false link overlaps.
- **Configurable parameters**: `verticalMargin`, `circularGap`, `baseRadius`
  are tunable instead of hardcoded.
- **Bounded cycle handling**: Weighted feedback ordering takes
  O((V + E) log(V + E)) time and O(V + E) space, favoring large forward flows and
  breaking ties by node ID. It is a heuristic, not an exact minimum feedback
  arc set. Self-links remain circular, and parallel flows contribute separately.
- **Indexed routing**: DAG layers use a topological pass, endpoint arc radii
  share column groups, and circular bands use interval occupancy queries.
