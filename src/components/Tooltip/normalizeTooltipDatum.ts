import type { Datum } from "../charts/shared/datumTypes"
import { normalizeHoverDatum } from "../stream/hoverUtils"
import {
  attachSelectionProvenance,
  getSelectionProvenance
} from "../store/selectionProvenance"

/** Adapt frame hover data for authored-datum tooltip callbacks. */
export function normalizeTooltipDatum(hoverData: Datum): Datum | null {
  // Unwrap Semiotic HoverData → raw datum so user functions receive
  // the data they pushed/passed. Prefer the explicit internal marker
  // emitted by Stream Frames. Accept frame-only metadata as a narrow
  // fallback, but avoid guessing
  // from common raw fields like `{ x, y, data }` — those are valid user
  // datum shapes and must not be over-unwrapped.
  const explicitlyMarked = hoverData?.__semioticHoverData === true
  const hasLegacyFrameMarker =
    hoverData &&
    (hoverData.type === "node" ||
      hoverData.type === "edge" ||
      hoverData.nodeOrEdge !== undefined ||
      hoverData.allSeries !== undefined ||
      hoverData.stats !== undefined ||
      hoverData.__chartType !== undefined)
  const looksLikeHoverWrapper =
    explicitlyMarked ||
    (hoverData &&
      hoverData.data !== undefined &&
      typeof hoverData.x === "number" &&
      typeof hoverData.y === "number" &&
      hasLegacyFrameMarker)
  let datum = normalizeHoverDatum(
    looksLikeHoverWrapper ? (hoverData.data ?? {}) : hoverData
  )
  // Network frames wrap the user's datum twice. HoverData.data is the
  // RealtimeNode/RealtimeEdge that layout produced (carrying x0/y0/
  // sourceLinks — and, for edges, `source`/`target` resolved to node
  // OBJECTS), while the raw datum the user passed in `nodes`/`edges`
  // sits one level deeper at `.data`. Unwrap that extra level so network
  // HOC tooltips receive raw data, matching the XY/ordinal contract.
  // Without it a custom tooltip rendering `edge.source` gets a node
  // object and React throws "Objects are not valid as a React child".
  //
  // Match only genuine RealtimeNode/RealtimeEdge wrappers, not just the
  // presence of `nodeOrEdge` + a nested `.data`: every node built by the
  // network pipeline has numeric x0/x1 (createNode), and every edge a
  // numeric sankeyWidth (0 for non-sankey layouts). A customNetworkLayout
  // hit whose datum is the user's own object — even one that happens to
  // carry an incidental `.data` field — lacks those layout fields and is
  // passed through untouched.
  const isNodeWrapper =
    hoverData?.nodeOrEdge === "node" &&
    typeof datum?.x0 === "number" &&
    typeof datum?.x1 === "number"
  const isEdgeWrapper =
    hoverData?.nodeOrEdge === "edge" && typeof datum?.sankeyWidth === "number"
  if (!datum) return null
  if (
    (isNodeWrapper || isEdgeWrapper) &&
    datum.data &&
    typeof datum.data === "object"
  ) {
    datum = datum.data
  }
  if (!datum) return null
  // Multi-tooltip mode (`tooltip="multi"`) puts the per-series values on
  // the hover ROOT as `allSeries`, alongside the data-space `xValue` of
  // the cursor — not inside `.data`. Unwrapping to `.data` above would
  // therefore discard exactly the fields a multi-series tooltip needs
  // (and `allSeries !== undefined` is itself one of the markers that
  // *enables* the unwrap, so its presence triggered the step that
  // dropped it). Re-attach them onto a shallow copy so a user function
  // can read `datum.allSeries` the way `MultiPointTooltip` — which is
  // wired as `tooltipContent` directly and never passes through here —
  // always could. Copy rather than mutate: `datum` is the caller's own
  // data row. Real datum fields win, so a data row that legitimately
  // carries an `xValue` column is not overwritten by the cursor's.
  if (
    looksLikeHoverWrapper &&
    (hoverData.allSeries !== undefined || hoverData.xValue !== undefined)
  ) {
    const withHoverContext: Datum = attachSelectionProvenance(
      { ...datum },
      getSelectionProvenance(datum)
    )
    if (
      hoverData.allSeries !== undefined &&
      withHoverContext.allSeries === undefined
    ) {
      withHoverContext.allSeries = hoverData.allSeries
    }
    if (
      hoverData.xValue !== undefined &&
      withHoverContext.xValue === undefined
    ) {
      withHoverContext.xValue = hoverData.xValue
    }
    datum = withHoverContext
  }
  return datum
}
