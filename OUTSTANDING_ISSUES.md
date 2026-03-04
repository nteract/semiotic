0. Ensure that changelog, claude.md and readme are updated when appropriate — IN PROGRESS
1. ~~Stacked Bar Chart on frames/ordinal-frame does not encode color~~ **FIXED** — `buildBarScene` now passes stackKey to `resolvePieceStyle` for stacked bars, so `barColors` maps correctly.
2. ~~Quick start on frames/xy-frame does not show any data. Multi-Line with Color also does not. Also Stacked Area Chart does not.~~ **FIXED** — Data flattened from nested `{ id, coordinates }` format to flat arrays with `groupAccessor`.
3. ~~frames/network-frame Tree Diagram example is not colored and the bottom labels are cut off.~~ **FIXED** — Changed to `colorByDepth: true`, added `colorScheme`, increased height and bottom margin.
4. ~~charts/bubble-chart no bubble opacity is visible on the Custom Size Range example~~ **FIXED** — `pointCanvasRenderer` was checking `style.opacity` but BubbleChart sets `style.fillOpacity`. Now checks both.
5. ~~charts/stacked-area-chart Streaming example is a stacked bar chart~~ **FIXED** — Replaced `RealtimeHistogram` with `StreamXYFrame` using `chartType="stackedarea"` with per-group `lineStyle` colors.
6. ~~charts/histogram Streaming example draws centered instead of from a baseline~~ **FIXED** — Changed `buildHistogramScene` bar positioning from centered (`col.x + (col.width - barH) / 2`) to baseline-aligned (`col.x + col.width - barH`).
7. ~~charts/histogram & charts/violin-plot have sparse data~~ **FIXED** — Replaced with `generateNormal()` producing 60-80 points per category.
8. ~~charts/dot-plot Streaming should use pulse and decay~~ **FIXED** — Added `decay` and `pulse` props to streaming demo.
9. ~~features/small-multiples no longer demonstrates linking~~ **FIXED** — BarChart's `customHoverBehavior` was passing `HoverData` object to `linkedHoverHook.onHover` instead of extracting `d.data`. Now passes `d.data || d`.
10. ~~features/sparklines isn't working at all~~ **FIXED** — Ordinal sparkline used `type="bar"` (v1) instead of `chartType="bar"` with `oAccessor`/`rAccessor`. Network sparkline used `networkType` instead of `chartType`. Data was raw numbers, now objects with category/value fields.
11. ~~Delete features/canvas-rendering entirely~~ **DONE**
12. ~~features/responsive charts aren't rendering~~ **FIXED** — Duplicate `StreamOrdinalFrame` import, ordinal example used `type: "bar"` instead of `chartType: "bar"` with proper `pieceStyle`.
13. ~~features/interaction Highlight on Hover is not rendering~~ **FIXED** — `frameLineData` used nested `{ title, coordinates }` format. Flattened to flat array with `groupAccessor: "group"`. Removed stale `lineDataAccessor`/`lineIDAccessor` references.
14. ~~features/tooltips MultiLineTooltip renders no chart~~ **FIXED** — StreamOrdinalFrame example used `type: "bar"` instead of `chartType: "bar"` with `pieceStyle`.
15. features/annotations — annotation types (`category`, `highlight`, `enclose`) may not all be implemented in the v2 canvas renderer. Frame examples have been fixed to use correct API, but annotation rendering depends on the SVG annotation rules implementation.
16. ~~features/axes Delete Axes on StreamOrdinalFrame section~~ **DONE** — Deleted the section. Jagged baseline is a legacy feature not ported to StreamXYFrame.
17. ~~cookbook/homerun-map add pulse animation~~ **FIXED**
18. ~~cookbook/marginal-graphics wrong export~~ **FIXED** — Export name was `HomerunMap`, now `MarginalGraphics`. Note: `marginalSummaryType` axis feature needs implementation in StreamXYFrame for full functionality.
19. ~~cookbook/bar-line-chart Remove this entirely~~ **DONE**
20. ~~cookbook/waterfall-chart remove this page entirely~~ **DONE**
21. ~~cookbook/marimekko-chart no padding between columns~~ **FIXED** — Added `barPadding: 8`.
22. ~~charts/chord-diagram arc/ribbon angle mismatch~~ **FIXED** — Applied `-Math.PI/2` offset to both arcs and ribbons in `chordLayoutPlugin`.
23. ~~recipes/time-series-brush "ee is not a function"~~ **FIXED** — `normalizeTooltip` now handles `TooltipConfig` objects by converting them to tooltip functions via `Tooltip()`.

### Remaining items:
- **0**: Changelog/CLAUDE.md/README updates (pending)
- **15**: Annotation types — some v2 annotation rendering may be incomplete
- **18**: Marginal graphics — `marginalSummaryType` axis feature needs StreamXYFrame implementation
