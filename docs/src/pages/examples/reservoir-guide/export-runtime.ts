import { renderChartWithEvidence } from "semiotic/server"
import { distributionChartProps, seasonRenderProps } from "./chart-config"
import { buildGuidePacket } from "./packet"
import { renderSavedHTML } from "./exports"
import type { GuideState, ReservoirSnapshot } from "./types"

export function exportSelection(snapshot: ReservoirSnapshot, state: GuideState) {
  const packet = buildGuidePacket(snapshot, state)
  const rendered = renderChartWithEvidence("LineChart", {
    ...seasonRenderProps(packet.guide),
    _idPrefix: "saved-season",
  })
  const distribution = packet.guide.baseline.count
    ? renderChartWithEvidence("SwarmPlot", {
        ...distributionChartProps(packet.guide),
        _idPrefix: "saved-distribution",
      })
    : null
  return {
    packet,
    html: renderSavedHTML(snapshot, packet.guide, rendered.svg, distribution?.svg),
    evidence: rendered.evidence,
  }
}
