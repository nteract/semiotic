import React from "react"

export default function ReservoirPreview() {
  return (
    <svg
      viewBox="0 0 500 200"
      role="img"
      aria-label="Shasta, July 30, 2025: 72% of capacity, 105% of the seasonal mean, 50th historical percentile"
    >
      <rect width="500" height="200" fill="#fffdf5" />
      <rect width="500" height="6" fill="#096d76" />
      <text x="24" y="35" fontSize="11" letterSpacing="2" fill="#183c40" fontFamily="system-ui">
        ONE RESERVOIR. THREE QUESTIONS.
      </text>
      {[
        ["72%", "of capacity"],
        ["105%", "of seasonal mean"],
        ["50th", "percentile"],
      ].map(([value, label], i) => (
        <g key={label} transform={`translate(${24 + i * 160},85)`}>
          <text fontFamily="Georgia,serif" fontSize="49" fill="#096d76">
            {value}
          </text>
          <text y="32" fontSize="12" fill="#183c40" fontFamily="system-ui">
            {label}
          </text>
        </g>
      ))}
      <text x="24" y="174" fontSize="12" fill="#183c40" fontFamily="system-ui">
        Shasta · July 30, 2025 · 1991–2020 baseline
      </text>
    </svg>
  )
}
