import * as React from "react"

export interface DistanceCartogramOverlayLayout {
  cx: number
  cy: number
  maxCost: number
  availableRadius: number
  layout: "radial" | "strip"
}

export interface DistanceCartogramRingStyle {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  labelColor?: string
  labelSize?: number
}

interface DistanceCartogramOverlayProps {
  bottomMargin?: number
  costLabel?: string
  layout: DistanceCartogramOverlayLayout
  ringStyle?: DistanceCartogramRingStyle
  ringValues: number[]
  showNorth: boolean
  showRingLabels: boolean
  showRings: boolean | number | number[]
}

/** Plot-relative reference rings, axis, and compass for DistanceCartogram. */
export function DistanceCartogramOverlay({
  bottomMargin,
  costLabel,
  layout: { cx, cy, maxCost, availableRadius, layout },
  ringStyle,
  ringValues,
  showNorth,
  showRingLabels,
  showRings
}: DistanceCartogramOverlayProps) {
  const isStrip = layout === "strip"
  const style = {
    stroke: isStrip ? "var(--semiotic-border, #999)" : "#999",
    strokeWidth: isStrip ? 1 : 0.8,
    strokeDasharray: isStrip ? "none" : "4,3",
    labelColor: "var(--semiotic-text-secondary, #777)",
    labelSize: isStrip ? 8 : 10,
    ...ringStyle
  }

  // cx/cy are plot-relative. The owning GeoSVGOverlay applies frame margins.
  if (isStrip) {
    return (
      <g>
        <line
          x1={cx}
          y1={cy}
          x2={cx + availableRadius}
          y2={cy}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeLinecap="round"
          opacity={0.85}
        />
        <line
          x1={cx}
          y1={cy - 3.5}
          x2={cx}
          y2={cy + 3.5}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          opacity={0.9}
        />
        {showRings &&
          ringValues.map((cost) => {
            const x =
              cx + (maxCost > 0 ? (cost / maxCost) * availableRadius : 0)
            return (
              <g key={cost}>
                <line
                  x1={x}
                  y1={cy - 2.5}
                  x2={x}
                  y2={cy + 2.5}
                  stroke={style.stroke}
                  strokeWidth={0.9}
                  opacity={0.65}
                />
                {showRingLabels && (
                  <text
                    x={x}
                    y={cy + Math.min(10, (bottomMargin ?? 2) + 8)}
                    textAnchor="middle"
                    fontSize={style.labelSize}
                    fill={style.labelColor}
                    fontFamily="var(--semiotic-font-family, system-ui, sans-serif)"
                  >
                    {cost}
                    {costLabel ? ` ${costLabel}` : ""}
                  </text>
                )}
              </g>
            )
          })}
      </g>
    )
  }

  return (
    <g>
      {ringValues.map((cost) => {
        const radius = (cost / maxCost) * availableRadius
        return (
          <g key={cost}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
              opacity={0.5}
            />
            {showRingLabels && (
              <text
                x={cx + radius + 3}
                y={cy - 2}
                fontSize={style.labelSize}
                fill={style.labelColor}
                fontFamily="var(--semiotic-font-family, system-ui, sans-serif)"
              >
                {cost}
                {costLabel ? ` ${costLabel}` : ""}
              </text>
            )}
          </g>
        )
      })}
      {showNorth && (
        <g transform="translate(24, 24)">
          <circle
            r={16}
            fill="white"
            fillOpacity={0.85}
            stroke="#bbb"
            strokeWidth={0.8}
          />
          <path
            d="M0,-11 L3,-3 L1,-4 L1,7 L-1,7 L-1,-4 L-3,-3 Z"
            fill="#555"
            stroke="none"
          />
          <text
            y={-12}
            textAnchor="middle"
            fontSize={7}
            fontWeight={700}
            fill="#555"
            fontFamily="var(--semiotic-font-family, system-ui, sans-serif)"
          >
            N
          </text>
          <line x1={11} y1={0} x2={13} y2={0} stroke="#bbb" strokeWidth={0.8} />
          <line
            x1={-11}
            y1={0}
            x2={-13}
            y2={0}
            stroke="#bbb"
            strokeWidth={0.8}
          />
          <line x1={0} y1={11} x2={0} y2={13} stroke="#bbb" strokeWidth={0.8} />
        </g>
      )}
    </g>
  )
}
