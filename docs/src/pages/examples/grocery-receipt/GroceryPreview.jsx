import React from "react"

export default function GroceryPreview() {
  return (
    <svg viewBox="0 0 242 96" style={{ width: "100%", height: 96 }} aria-hidden="true">
      <rect width="242" height="96" fill="#e7ebda" />
      {[
        [21, "JUNE 2019", "$18.28"],
        [133, "JUNE 2025", "$27.29"],
      ].map(([x, date, total], index) => (
        <g key={date} transform={`translate(${x} 9)`}>
          <path
            d="M0 0H88V76L82 72L76 76L70 72L64 76L58 72L52 76L46 72L40 76L34 72L28 76L22 72L16 76L10 72L4 76L0 72Z"
            fill="#fffdf5"
          />
          <path d="M0 0H88" stroke={index ? "#a3462e" : "#36644c"} strokeWidth="3" />
          <text x="8" y="15" fontFamily="monospace" fontSize="8" fill="#23372c">
            {date}
          </text>
          {[23, 29, 35, 41].map((y, row) => (
            <path
              key={y}
              d={`M8 ${y}H${row % 2 ? 46 : 55} M67 ${y}H80`}
              stroke="#9da892"
              strokeWidth="1.5"
            />
          ))}
          <path d="M8 48H80" stroke="#9da892" strokeDasharray="2 3" />
          <text x="8" y="65" fontFamily="Georgia,serif" fontSize="18" fill="#23372c">
            {total}
          </text>
        </g>
      ))}
    </svg>
  )
}
