import React from "react"
import { monthDayLabel, number, readingLabel } from "./format"
import type { PreparedGuide, Reservoir } from "./types"

export function GuideTable({ guide }: { guide: PreparedGuide }) {
  return (
    <details className="reservoir-table-details">
      <summary>Read the two-year table and missing observations</summary>
      <p>
        Unavailable is not zero. Estimated values are listed but excluded from the lines and
        calculations. A nonleap water year has no February 29. The baseline mean can use fewer years
        than the percentile requires.
      </p>
      <div
        className="reservoir-table-scroll"
        role="region"
        tabIndex={0}
        aria-label="Two-year storage table"
      >
        <table>
          <caption>
            {guide.reservoir.name} · water years {guide.state.waterYear} and{" "}
            {guide.state.comparisonYear}; acre-feet. Baseline: eligible 1991–2020 values.
          </caption>
          <thead>
            <tr>
              <th scope="col">Month/day</th>
              <th scope="col">Selected WY {guide.state.waterYear}</th>
              <th scope="col">Compare WY {guide.state.comparisonYear}</th>
              <th scope="col">Mean AF (N)</th>
            </tr>
          </thead>
          <tbody>
            {guide.season.map((point) => (
              <tr key={point.monthDay} data-selected={point.monthDay === guide.state.monthDay}>
                <th scope="row">{monthDayLabel(point.monthDay)}</th>
                <td>{readingLabel(point.active)}</td>
                <td>{readingLabel(point.comparison)}</td>
                <td>
                  {number(point.baselineMean, 2)} ({point.baselineCount})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function SourceDetails({ guide }: { guide: PreparedGuide }) {
  return (
    <details>
      <summary>Inspect this date’s source fields and baseline</summary>
      <p>
        DATE TIME assigns the reporting day. OBS DATE is a separate timestamp; neither is a source
        publication time. CDEC documents fixed Pacific Standard Time output.
      </p>
      <pre>
        {JSON.stringify(
          {
            selected: guide.reading,
            comparison: guide.comparisonReading,
            capacity: guide.capacity.capacity,
          },
          null,
          2,
        )}
      </pre>
      <p>
        Eligible baseline years:{" "}
        {guide.baseline.samples.map((s) => `${s.year}: ${number(s.value)} AF`).join("; ") || "None"}
        .
      </p>
      <p>
        Excluded:{" "}
        {guide.baseline.excluded.map((s) => `${s.year}: ${s.reason}`).join("; ") || "None"}.
      </p>
    </details>
  )
}

export function ReservoirLocator({
  reservoirs,
  selected,
}: {
  reservoirs: Reservoir[]
  selected: string
}) {
  return (
    <figure className="reservoir-locator">
      <svg
        viewBox="0 0 330 280"
        role="img"
        aria-labelledby="reservoir-map-title reservoir-map-description"
      >
        <title id="reservoir-map-title">
          Six station locations in northern and central California
        </title>
        <desc id="reservoir-map-description">
          CDEC station coordinates, longitude west to east and latitude south to north. Location
          does not identify a household’s water supply.
        </desc>
        <rect x="5" y="5" width="320" height="270" rx="8" fill="#edf2e6" />
        {[38, 39, 40, 41].map((lat) => (
          <g key={lat}>
            <path d={`M35,${245 - (lat - 37.5) * 61}H300`} stroke="#bac9bb" strokeDasharray="3 4" />
            <text x="10" y={249 - (lat - 37.5) * 61} fontSize="10">
              {lat}°
            </text>
          </g>
        ))}
        {reservoirs.map((r) => {
          const x = 85 + (r.longitude + 123) * 76
          const y = 245 - (r.latitude - 37.5) * 61
          return (
            <g key={r.id}>
              <circle
                cx={x}
                cy={y}
                r={selected === r.id ? 7 : 4}
                fill="#096d76"
                stroke="#fffdf5"
                strokeWidth="2"
              />
              <text
                x={r.id === "CLE" ? x - 10 : x + 10}
                y={y + (r.id === "DNP" ? 12 : -5)}
                textAnchor={r.id === "CLE" ? "end" : "start"}
                fontSize="12"
                fill="#183c40"
              >
                {r.name}
              </text>
            </g>
          )
        })}
        <text x="180" y="269" textAnchor="middle" fontSize="10">
          West ← station longitude → East
        </text>
      </svg>
      <figcaption>
        Station locations from CDEC metadata. Proximity does not establish your water supplier.
      </figcaption>
    </figure>
  )
}
