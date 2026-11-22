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
  if (!datum) return null
  const isNodeWrapper =
    hoverData?.nodeOrEdge === "node" &&
    typeof datum.x0 === "number" &&
    typeof datum.x1 === "number"
  const isEdgeWrapper =
    hoverData?.nodeOrEdge === "edge" && typeof datum.sankeyWidth === "number"
  if (
    (isNodeWrapper || isEdgeWrapper) &&
    datum.data &&
    typeof datum.data === "object"
  ) {
    datum = datum.data
  }
  // Multi hover keeps its rows and selected x on the wrapper. Copy them onto
  // the callback datum, preserving authored fields and selection provenance.
  if (
    looksLikeHoverWrapper &&
    (hoverData.allSeries !== undefined || hoverData.xValue !== undefined)
  ) {
    const withHoverContext: Datum = attachSelectionProvenance(
      { ...datum },
      getSelectionProvenance(datum)
    )
    for (const key of ["allSeries", "xValue"]) {
      if (hoverData[key] !== undefined && withHoverContext[key] === undefined) {
        withHoverContext[key] = hoverData[key]
      }
    }
    datum = withHoverContext
  }
  return datum
}
