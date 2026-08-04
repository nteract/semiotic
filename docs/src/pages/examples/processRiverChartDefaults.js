/**
 * Shared ProcessSankey prop cluster for vertical “history river” docs examples.
 *
 * Keep product demos on `layoutExecution: "sync"` so Vite/Playwright paint
 * without waiting on a layout worker module URL. App authors should prefer
 * `"auto"` (or omit) so dense rivers can offload packing/ordering.
 */
export const HISTORY_RIVER_PROCESS_SANKEY = Object.freeze({
  orientation: "vertical",
  pairing: "temporal",
  packing: "reuse",
  laneOrder: "crossing-min+inside-out",
  lanePlacement: "hug",
  ribbonLane: "both",
  lifetimeMode: "full",
  layoutExecution: "sync",
  showLegend: false,
})

/**
 * Snippet comment for code blocks so agents do not cargo-cult docs-only sync.
 */
export const HISTORY_RIVER_LAYOUT_NOTE =
  "// Docs demos use layoutExecution=\"sync\" for deterministic first paint.\n" +
  "// Production apps should use \"auto\" (default) so large graphs can use a worker."
