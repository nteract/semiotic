import * as React from "react"
import type { ReactNode } from "react"
import { roundedEnclosure } from "./recipeChrome"
import type { BandInfo } from "./netEnsembleLayout"

export interface NetEnsembleOverlayOptions {
  convergeColor: string
  branchColor: string
  edgeColor: string
  plot: { x: number; y: number; width: number; height: number }
  showBandLabels: boolean
  showExemplars: boolean
  showLegend: boolean
  textColor: string
  subText: string
}

/** Render presentation-only band labels, exemplars, and the directedness key. */
export function buildNetEnsembleOverlays(
  bands: BandInfo[],
  o: NetEnsembleOverlayOptions
): ReactNode {
  const els: ReactNode[] = []
  for (const band of bands) {
    const color = band.directed ? o.convergeColor : o.branchColor
    els.push(
      roundedEnclosure({
        keyId: `band-${band.motif}`,
        x: band.x - 6,
        y: band.y - 4,
        width: band.width + 12,
        height: band.height + 4,
        radius: 8,
        stroke: color,
        strokeWidth: 1,
        opacity: 0.28
      })
    )
    if (o.showExemplars && band.exemplar) {
      const ex = band.exemplar
      els.push(
        <g key={`ex-${band.motif}`} style={{ pointerEvents: "none" }}>
          {ex.edges.map((e, i) => (
            <line
              key={`exe-${i}`}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={o.edgeColor}
              strokeWidth={0.75}
              opacity={0.55}
            />
          ))}
          {ex.nodes.map((n) => (
            <circle
              key={`exn-${n.id}`}
              cx={n.cx}
              cy={n.cy}
              r={Math.max(1.6, n.r)}
              fill={color}
            />
          ))}
        </g>
      )
    }
    if (o.showBandLabels) {
      const labelX = band.x + (o.showExemplars ? 48 : 4)
      els.push(
        <text
          key={`bl-${band.motif}`}
          x={labelX}
          y={band.y + 12}
          fontSize={13}
          fontWeight={600}
          fill={o.textColor}
          style={{ pointerEvents: "none" }}
        >
          {band.descriptor}
        </text>
      )
      els.push(
        <text
          key={`bc-${band.motif}`}
          x={labelX}
          y={band.y + 27}
          fontSize={11}
          fill={o.subText}
          style={{ pointerEvents: "none" }}
        >{`×${band.count} · ${band.directed ? "converges to 1 sink" : "branches to ≥2 sinks"}`}</text>
      )
    }
  }
  if (o.showLegend) {
    const lx = o.plot.x + o.plot.width - 168
    const ly = o.plot.y - 2
    els.push(
      <g key="net-legend" style={{ pointerEvents: "none" }}>
        <circle cx={lx} cy={ly} r={5} fill={o.convergeColor} />
        <text x={lx + 10} y={ly + 4} fontSize={11} fill={o.subText}>
          converges (1 sink)
        </text>
        <path d={diamondPath(lx, ly + 18, 5)} fill={o.branchColor} />
        <text x={lx + 10} y={ly + 22} fontSize={11} fill={o.subText}>
          branches (≥2 sinks)
        </text>
      </g>
    )
  }
  return <g className="net-ensemble-overlays">{els}</g>
}

function diamondPath(cx: number, cy: number, r: number): string {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`
}
