# sankey-plus

Semiotic's layout derives from Tom Shanley's [sankey-plus at
2459c812](https://github.com/tomshanley/sankey-plus/tree/2459c812cb240735b07796c97226b45ed4f59c86).
The first Semiotic import, `775d6da1a`, contains local adaptations. Its
`find.js` and `sortGraph.js` match the upstream revision byte for byte.

Upstream credits [d3-sankey-circular](https://github.com/tomshanley/d3-sankey-circular/tree/7d9a6e3fba7aafdc7f4664e6bcac5879ad46a5b2)
and [d3-sankey](https://github.com/d3/d3-sankey/tree/bb7233ea0004669878d922e55fe83084ef3cb555).
Their routing and alignment code survives in this layout. The [license
notices](./LICENSE) ship in the npm package as `dist/sankey-plus.LICENSE.txt`.

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
