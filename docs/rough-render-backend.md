# Rough render backend boundary

Semiotic's retained scene nodes remain the source of truth. The optional
`semiotic/rough` entry point changes paint only; hit testing, keyboard focus,
annotation anchors, selection, transitions, and accessibility continue to read
the exact scene geometry.

Frames accept a small `SceneRenderBackend` through `renderMode`. On Canvas,
the frame offers each scene node to the backend and sends unsupported nodes to
the existing renderer. SSR and static export use the same dispatch before the
existing scene-to-SVG converters. The legacy `renderMode="sketchy"` token is
not redefined and stays on the built-in rendering path.

The Rough adapter owns Rough.js imports, deterministic seed derivation, and an
LRU drawable cache keyed by backend, stable scene identity, exact geometry,
resolved style, adapter options, and seed. One memoized mode instance should be
reused by an application. Rough.js is an optional peer and a development
dependency; no normal Semiotic entry point imports it.

Initially supported geometry is rectangles, lines and polylines, circles,
area/trapezoid polygons, projected geographic paths, general SVG path strings,
and network edges. Gradients, icon bars, composite glyphs, candlesticks, text,
axes, legends, tooltips, HTML/widget annotations, focus rings, and physics
bodies use the built-in renderer. Unsupported shapes emit one development
warning per backend/type and fall back without changing interaction geometry.
