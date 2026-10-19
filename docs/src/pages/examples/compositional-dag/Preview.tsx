import * as React from "react"

/** Static gallery art keeps the solver out of the examples index. */
export default function CompositionalPreview() {
  const colors = ["#087f8c", "#a25a13", "#8858b8"]
  return (
    <svg viewBox="0 0 242 96" style={{ width: "100%", height: 96 }} aria-hidden="true">
      {[8, 94, 180].map((x) => (
        <rect
          key={x}
          x={x}
          y={10}
          width={54}
          height={76}
          rx={5}
          fill="var(--surface-1, #fff)"
          stroke="var(--border, #ccd6dd)"
        />
      ))}
      {colors.map((color, i) => (
        <g key={color} stroke={color} fill="none">
          {[8, 94, 180].map((x) => (
            <rect key={x} x={x + 6} y={30 + i * 16} width={42} height={10} rx={2} />
          ))}
          <path d={`M56 ${35 + i * 16} H100 M142 ${35 + i * 16} H186`} strokeWidth={1.5} />
          {i === 0 && <path d="M56 35 H65 V41 H90 V35 H100" strokeWidth={1.5} />}
        </g>
      ))}
    </svg>
  )
}
