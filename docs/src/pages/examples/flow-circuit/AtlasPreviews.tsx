import * as React from "react"

export function FlowCircuitPreview() {
  return (
    <svg viewBox="0 0 242 96" style={{ width: "100%", height: 96 }} aria-hidden="true">
      <path d="M20,48 H70" stroke="#387e98" strokeWidth={5} />
      {Array.from({ length: 8 }, (_, i) => {
        const y = 7 + i * 11
        return (
          <g key={i}>
            <path
              d={`M80,48 H109 V${y} H135 M155,${y} H185 V48 H208`}
              fill="none"
              stroke={i ? "#778796" : "#387e98"}
              strokeWidth={i ? 1 : 3}
            />
            <rect
              x={135}
              y={y - 4}
              width={20}
              height={8}
              fill={i ? "var(--surface-1, #fff)" : "#bb5149"}
              stroke="#778796"
            />
          </g>
        )
      })}
      {[10, 65, 208].map((x) => (
        <rect
          key={x}
          x={x}
          y={39}
          width={20}
          height={18}
          fill="var(--surface-1, #fff)"
          stroke="#778796"
        />
      ))}
    </svg>
  )
}

export function DependencyXRayPreview() {
  const nodes = [
    { id: "Origin", x: 22, y: 48 },
    { id: "X", x: 77, y: 28 },
    { id: "C", x: 133, y: 76 },
    { id: "A", x: 133, y: 16 },
    { id: "B", x: 133, y: 46 },
    { id: "Product", x: 210, y: 48 },
  ]
  return (
    <svg viewBox="0 0 242 96" style={{ width: "100%", height: 96 }} aria-hidden="true">
      <path
        d="M22,48 L77,28 L133,16 L210,48 M77,28 L133,46 L210,48 M22,48 L133,76 L210,48"
        fill="none"
        stroke="#387e98"
        strokeWidth={2}
      />
      {nodes.map((node) => (
        <g key={node.id}>
          <rect
            x={node.x - 7}
            y={node.y - 7}
            width={14}
            height={14}
            rx={3}
            fill="var(--surface-1, #fff)"
            stroke={node.id === "X" ? "#bb5149" : "#778796"}
            strokeWidth={node.id === "X" ? 3 : 1}
          />
          <text x={node.x} y={node.y + 19} fill="currentColor" textAnchor="middle" fontSize={9}>
            {node.id}
          </text>
        </g>
      ))}
    </svg>
  )
}
