import type { ResolutionAppearance } from "./appearance"
import type { NetworkCustomChartProps } from "../../../charts/custom/NetworkCustomChart"
import { atlasLinkedHover } from "../atlasChartOptions"
import { boundaryLoomLayout } from "./boundaryLoomLayout"
import {
  defaultResolutionView,
  projectResolutionView,
  type ResolutionProjection
} from "./project"
import { resolutionAtlasLayout } from "./resolutionAtlasLayout"
import { markDatum } from "./scene"
import type {
  CanonicalSelection,
  PreparedNetworkResolution,
  ResolutionViewSpec,
  SemanticTarget
} from "./types"

export interface ResolutionChartProps {
  resolution: PreparedNetworkResolution
  appearance?: ResolutionAppearance
  /** Highlight corresponding components on hover. Enabled by default. */
  hoverHighlight?: boolean
  onObservation?: NetworkCustomChartProps["onObservation"]
  pageId?: string
  view?: ResolutionViewSpec
  width?: number
  height?: number
  title?: string
  description?: string
  summary?: string
  accessibleTable?: boolean
  selection?: NetworkCustomChartProps["selection"]
  linkedHover?: NetworkCustomChartProps["linkedHover"]
  selected?: CanonicalSelection
  onSelect?: (selection: CanonicalSelection, target: SemanticTarget) => void
  frameProps?: NetworkCustomChartProps["frameProps"]
  tooltip?: NetworkCustomChartProps["tooltip"]
}

export function readerProjection(
  props: ResolutionChartProps,
  mode: "resolution-atlas" | "boundary-loom"
): ResolutionProjection {
  const view = props.view ?? defaultResolutionView(props.resolution, mode)
  const last = props.pageId
    ? props.resolution.pages.findIndex((p) => p.id === props.pageId)
    : props.resolution.pages.length - 1
  if (last < 0) throw new Error("Unknown selected page")
  const pageIds = props.view
    ? view.pageIds
    : props.resolution.pages
        .slice(
          Math.max(0, last - ((props.width ?? 1000) < 650 ? 1 : 3)),
          last + 1
        )
        .map((p) => p.id)
  return projectResolutionView(props.resolution, { ...view, mode, pageIds })
}

/** Shared client/static chart props. Analysis and scoped queries precede rendering. */
export function resolutionChartProps(
  props: ResolutionChartProps,
  mode: "resolution-atlas" | "boundary-loom",
  projection = readerProjection(props, mode)
) {
  return {
    nodes: [...projection.groups, ...projection.edges].map(markDatum),
    edges: [],
    layout:
      mode === "resolution-atlas" ? resolutionAtlasLayout : boundaryLoomLayout,
    layoutConfig: {
      projection,
      appearance: props.appearance
    },
    width: props.width ?? 1000,
    height: props.height ?? 640,
    margin: { left: 12, top: 15, right: 12, bottom: 10 },
    title:
      props.title ??
      (mode === "resolution-atlas" ? "Resolution Atlas" : "Boundary Loom"),
    description:
      props.description ??
      (mode === "resolution-atlas"
        ? "Aligned network representations with source membership correspondence and cycle accounts."
        : "Original edge columns with exact endpoints and ownership history; rail crossings have no connection meaning."),
    summary: props.summary ?? projection.caption,
    accessibleTable: false,
    animate: false as const,
    selection: props.selection,
    onObservation: props.onObservation,
    linkedHover: atlasLinkedHover(props.linkedHover),
    frameProps: props.frameProps,
    tooltip:
      props.tooltip ??
      ((datum: { description?: string }) => (
        <div>{datum.description ?? "Resolution evidence"}</div>
      ))
  }
}
