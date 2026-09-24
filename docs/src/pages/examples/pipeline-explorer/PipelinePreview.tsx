import * as React from "react"

// A small static gallery thumbnail; it does not import the gesture runtime.
export default function PipelinePreview() {
  const colors = ["#358499", "#8874bb", "#b98538", "#498c75", "#bb7089"]
  return (
    <svg viewBox="0 0 242 96" style={{ width: "100%", height: 96 }} aria-hidden="true">
      {[9, 39, 69].map((y) => (
        <g key={y}>
          <path d={`M24,${y + 9} H220`} stroke="#9bacb5" strokeWidth={1.5} />
          {colors.map((color, i) => (
            <g key={color}>
              <rect
                x={8 + i * 47}
                y={y}
                width={34}
                height={20}
                rx={3}
                fill="var(--surface-1, #fff)"
                stroke={color}
              />
              <path
                d={`M${13 + i * 47},${y + 7} h20 M${13 + i * 47},${y + 13} h13`}
                stroke={color}
                strokeWidth={2}
              />
            </g>
          ))}
        </g>
      ))}
      <rect
        x={99}
        y={34}
        width={82}
        height={30}
        rx={4}
        fill="none"
        stroke="#358499"
        strokeWidth={2}
      />
    </svg>
  )
}
