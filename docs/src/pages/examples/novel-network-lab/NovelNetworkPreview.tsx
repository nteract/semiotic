import * as React from "react"

// A small schematic keeps the gallery independent of the lab's chart runtime.
export default function NovelNetworkPreview() {
  return (
    <svg viewBox="0 0 242 110" style={{ width: "100%", height: 110 }} aria-hidden="true">
      <g stroke="currentColor" strokeOpacity={0.4} fill="none">
        <path d="M18,52 L42,26 L67,51 L39,78 Z M42,26 L39,78 M67,51 L91,30 M67,51 L92,81" />
        <path d="M117,18 V91" strokeDasharray="2 4" />
      </g>
      {[
        [18, 52],
        [42, 26],
        [67, 51],
        [39, 78],
        [91, 30],
        [92, 81],
      ].map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === 2 ? 8 : 5}
          fill={i < 3 ? "var(--accent, #3983a5)" : "var(--text-secondary, #8995a3)"}
        />
      ))}
      <g stroke="var(--accent, #3983a5)" fill="none" strokeOpacity={0.65}>
        <path d="M136,48 C157,48 157,35 178,35 S199,24 220,24" strokeWidth={13} />
        <path d="M178,41 C201,41 199,68 220,68" strokeWidth={6} />
        <path d="M178,45 C191,72 152,86 151,58 S165,35 178,35" strokeWidth={3} />
      </g>
      {[
        { x: 133, y: 36, h: 25 },
        { x: 175, y: 24, h: 30 },
        { x: 217, y: 13, h: 20 },
        { x: 217, y: 60, h: 16 },
      ].map(({ x, y, h }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={6} height={h} fill="currentColor" />
      ))}
      <text x={50} y={106} textAnchor="middle" fontSize={9} fill="currentColor">
        CONNECTIONS
      </text>
      <text x={181} y={106} textAnchor="middle" fontSize={9} fill="currentColor">
        HANDOFF VOLUME
      </text>
    </svg>
  )
}
