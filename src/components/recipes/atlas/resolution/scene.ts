import type {
  NetworkLayoutContext,
  NetworkLayoutResult
} from "../../../stream/networkCustomLayout"
import type {
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel
} from "../../../stream/networkTypes"
import type { ResolutionMark } from "./project"
import { attachSelectionProvenance } from "../../../store/selectionProvenance"

import {
  resolutionAppearance,
  type ResolutionAppearance,
  type ResolutionLayoutSelection,
  type ResolutionMarkRole
} from "./appearance"
import type { Style } from "../../../stream/types"

export function markDatum(mark: ResolutionMark) {
  return attachSelectionProvenance(
    {
      id: mark.id,
      semanticTarget: mark.target,
      canonicalSelection: mark.selection,
      description: mark.description,
      label: mark.label,
      nodeIds: mark.nodeIds,
      edgeIds: mark.edgeIds,
      kind: mark.target.kind,
      ...(mark.connectionType && { connectionType: mark.connectionType }),
      ...(mark.nodeIds.length === 1 && { nodeId: mark.nodeIds[0] }),
      sourceRevision: mark.selection.revision.sourceRevision,
      analysisRevision: mark.selection.analysisRevision
    },
    [
      ...mark.nodeIds.map((nodeId) => ({ nodeId })),
      ...mark.edgeIds.map((edgeId) => ({ edgeId }))
    ]
  )
}

export function sceneBuilder(
  theme: NetworkLayoutContext["theme"],
  appearance?: ResolutionAppearance,
  generationCount = 1
) {
  const appearanceState = resolutionAppearance(
    theme,
    appearance,
    generationCount
  )
  const { colors, style, generationColor, dimmedOpacity } = appearanceState
  const bases = new Map<
    string,
    { base: Style; role: ResolutionMarkRole; generation?: number }
  >()
  function register<T extends NetworkSceneNode | NetworkSceneEdge>(
    mark: T,
    role: ResolutionMarkRole,
    generation?: number
  ): T {
    Object.assign(mark.datum!, { resolutionRole: role, generation })
    bases.set(mark.id!, { base: mark.style, role, generation })
    mark.style = style(
      {
        datum: mark.datum!,
        role,
        generation,
        highlighted: false,
        selected: true
      },
      mark.style
    )
    return mark
  }
  const sceneNodes: NetworkSceneNode[] = [],
    sceneEdges: NetworkSceneEdge[] = [],
    labels: NetworkLabel[] = []
  const accessible = (mark: ResolutionMark) => ({
    kind: mark.target.kind,
    label: mark.label,
    evidence: mark.description,
    originalNodes: mark.nodeIds.join(", "),
    originalEdges: mark.edgeIds.join(", ")
  })
  return {
    ...appearanceState,
    sceneNodes,
    sceneEdges,
    labels,
    rect(
      mark: ResolutionMark,
      x: number,
      y: number,
      w: number,
      h: number,
      fill = colors.surface,
      stroke = colors.primary,
      role: ResolutionMarkRole = "component",
      generation?: number,
      strokeWidth = 1.2
    ) {
      sceneNodes.push(
        register(
          {
            type: "rect",
            id: mark.id,
            x,
            y,
            w,
            h,
            label: mark.description,
            datum: markDatum(mark),
            accessibleDatum: accessible(mark),
            style: { fill, stroke, strokeWidth }
          },
          role,
          generation
        )
      )
    },
    circle(
      mark: ResolutionMark,
      x: number,
      y: number,
      r = 3,
      fill = colors.primary
    ) {
      sceneNodes.push(
        register(
          {
            type: "circle",
            id: mark.id,
            cx: x,
            cy: y,
            r,
            label: mark.description,
            datum: markDatum(mark),
            accessibleDatum: accessible(mark),
            style: { fill, stroke: fill }
          },
          "endpoint"
        )
      )
    },
    path(
      mark: ResolutionMark,
      pathD: string,
      color = colors.primary,
      width = 1.5,
      opacity = 1,
      role: ResolutionMarkRole = "edge"
    ) {
      sceneEdges.push(
        register(
          {
            type: "curved",
            id: mark.id,
            pathD,
            datum: markDatum(mark),
            label: mark.description,
            accessibleDatum: accessible(mark),
            style: { fill: "none", stroke: color, strokeWidth: width, opacity }
          },
          role
        )
      )
    },
    label(
      x: number,
      y: number,
      text: string,
      anchor: "start" | "middle" | "end" = "start",
      size = 11,
      onComponent = false
    ) {
      labels.push({
        x,
        y,
        text,
        anchor,
        fontSize: size,
        fill: colors.text,
        ...(onComponent && {
          stroke: colors.surface,
          strokeWidth: 2,
          paintOrder: "stroke"
        }),
        ...appearance?.labelStyle
      })
    },
    result(): NetworkLayoutResult {
      const restyle: NonNullable<NetworkLayoutResult["restyle"]> &
        NonNullable<NetworkLayoutResult["restyleEdge"]> = (mark, selection) => {
        const info = bases.get(mark.id!)
        if (!info) return
        const { base, role, generation } = info
        const highlighted = !!(
          selection as ResolutionLayoutSelection | null
        )?.resolutionHover?.(mark.datum!)
        const selected =
          !selection?.isActive || selection.predicate(mark.datum!)
        return style(
          { datum: mark.datum!, role, generation, highlighted, selected },
          {
            ...base,
            ...(highlighted &&
              role === "component" &&
              generation !== undefined && {
                fill: generationColor(generation),
                fillOpacity: 1,
                strokeWidth: 2.5
              }),
            opacity: (base.opacity ?? 1) * (selected ? 1 : dimmedOpacity)
          }
        )
      }
      return { sceneNodes, sceneEdges, labels, restyle, restyleEdge: restyle }
    }
  }
}

export function shortLabel(text: string, max = 20): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
