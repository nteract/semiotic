import type { ResolutionAppearance } from "./appearance"
import type { NetworkCustomLayout } from "../../../stream/networkCustomLayout"
import type { projectComponentCutaway } from "./ports"
import { sceneBuilder, shortLabel } from "./scene"
import { drawCutawayGraph } from "./cutawayGraph"

export type CutawayProjection = ReturnType<typeof projectComponentCutaway>
export const componentCutawayLayout: NetworkCustomLayout<{
  cutaway: CutawayProjection
  appearance?: ResolutionAppearance
  selectedPair?: { ingressId: string; egressId: string }
}> = (ctx) => {
  const { cutaway } = ctx.config,
    scene = sceneBuilder(ctx.theme, ctx.config.appearance),
    { ingress, egress, cells } = cutaway.value
  const width = ctx.dimensions.plot.width,
    height = ctx.dimensions.plot.height
  const single = cells.length === 1
  const cellWidth = Math.min(38, (width - 125) / Math.max(1, egress.length))
  const cellHeight = 36
  const matrixHeight = cells.length
    ? single
      ? 80
      : 75 + ingress.length * cellHeight
    : 0
  const graphHeight = Math.max(100, height - matrixHeight)
  const selected =
    cells.find(
      (c) =>
        c.query.ingressId === ctx.config.selectedPair?.ingressId &&
        c.query.egressId === ctx.config.selectedPair?.egressId
    ) ?? cells[0]
  drawCutawayGraph(scene, cutaway, selected, width, graphHeight)
  if (!cells.length) return scene.result()
  const left = Math.min(110, width * 0.25),
    top = graphHeight + 40
  scene.label(
    left,
    graphHeight + 12,
    single ? "Entry → exit" : "Entry ↓ / exit →",
    "start",
    11
  )
  for (let j = 0; j < egress.length; j++)
    scene.label(
      left + (j + 0.5) * cellWidth,
      graphHeight + 30,
      single ? "" : shortLabel(egress[j].internalNodeId, 6),
      "middle"
    )
  for (let i = 0; i < ingress.length; i++) {
    scene.label(
      left - 8,
      top + (i + 0.5) * cellHeight + 4,
      single ? "" : shortLabel(ingress[i].internalNodeId, 14),
      "end"
    )
    for (let j = 0; j < egress.length; j++) {
      const cell = cells[i * egress.length + j],
        verdict = cell.result.verdict
      const label = `${ingress[i].internalNodeId} to ${egress[j].internalNodeId}: ${verdict}`
      scene.rect(
        {
          id: `support:${i}:${j}`,
          target: { kind: "support-cell", query: cell.query },
          label,
          description: `${label}; ${cell.query.basis}; ${cell.query.continuation}; ${cell.result.coverage.reason ?? cell.result.coverage.status}`,
          nodeIds: [ingress[i].internalNodeId, egress[j].internalNodeId],
          edgeIds: [],
          selection: {
            revision: cutaway.revision,
            analysisRevision: cutaway.analysisRevision,
            target: { kind: "port-path", query: cell.query }
          }
        },
        left + j * cellWidth + 2,
        top + i * cellHeight + 2,
        single ? Math.min(300, width - left - 10) : Math.max(4, cellWidth - 4),
        Math.max(4, cellHeight - 4),
        scene.colors.surface,
        verdict === "yes"
          ? scene.colors.success
          : verdict === "no"
            ? scene.colors.danger
            : scene.colors.border,
        verdict === "yes"
          ? "supportYes"
          : verdict === "no"
            ? "supportNo"
            : "supportUnknown",
        undefined,
        cell === selected ? 3 : 1.2
      )
      scene.label(
        single ? left + 12 : left + (j + 0.5) * cellWidth,
        top + (i + 0.5) * cellHeight + 5,
        single
          ? `${shortLabel(ingress[i].internalNodeId, 12)} → ${shortLabel(egress[j].internalNodeId, 12)}: ${verdict}`
          : verdict === "yes"
            ? "●"
            : verdict === "no"
              ? "×"
              : "?",
        single ? "start" : "middle",
        single ? 12 : 18
      )
    }
  }
  if (!single)
    scene.label(
      left,
      top + ingress.length * cellHeight + 16,
      "● supported · × absent in scope · ? unknown",
      "start",
      10
    )
  return scene.result()
}
