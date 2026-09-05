import React from "react"

export default function PlanePreview() {
  return (
    <svg
      viewBox="0 0 500 200"
      role="img"
      aria-label="Three departures: 150, 11 and 12 minutes late"
    >
      <rect width={500} height={200} fill="#f7f3e9" />
      <text x={25} y={28} fontSize={10} letterSpacing={2} fill="#193449" fontFamily="monospace">
        ONE PLANE. THREE DEPARTURES.
      </text>
      {[
        ["SFO → HNL", 150],
        ["HNL → PPG", 11],
        ["PPG → HNL", 12],
      ].map(([route, delay], index) => (
        <g key={route} transform={`translate(25, ${58 + index * 48})`}>
          <text y={8} fontSize={12} fontFamily="monospace" fill="#193449">
            {route}
          </text>
          <rect
            x={115}
            y={-4}
            width={Number(delay) * 1.8}
            height={16}
            fill={index === 0 ? "#9e4229" : "#256f6e"}
          />
          <text x={125 + Number(delay) * 1.8} y={9} fontSize={12} fill="#193449">
            +{delay}
          </text>
        </g>
      ))}
    </svg>
  )
}
