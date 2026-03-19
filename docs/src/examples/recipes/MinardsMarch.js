import React from "react"
import {
  LinkedCharts,
  CategoryColorProvider,
  ConnectedScatterplot
} from "semiotic"
import { FlowMap } from "semiotic/geo"

// ── Minard's March Data ───────────────────────────────────────────────
// Simplified version of Minard's 1869 chart of Napoleon's Russian campaign.
// Positions are [lon, lat], survivors in thousands, temperature in °C.

const marchNodes = [
  { id: "Kowno", lon: 23.9, lat: 54.9 },
  { id: "Wilna", lon: 25.3, lat: 54.7 },
  { id: "Smorgoni", lon: 26.8, lat: 54.5 },
  { id: "Molodeczno", lon: 26.6, lat: 54.3 },
  { id: "Gloubokoye", lon: 27.9, lat: 55.0 },
  { id: "Minsk", lon: 27.6, lat: 53.9 },
  { id: "Studianka", lon: 28.2, lat: 54.3 },
  { id: "Polotsk", lon: 28.8, lat: 55.5 },
  { id: "Bobr", lon: 29.2, lat: 54.4 },
  { id: "Vitebsk", lon: 30.2, lat: 55.2 },
  { id: "Orsha", lon: 30.4, lat: 54.5 },
  { id: "Smolensk", lon: 32.0, lat: 54.8 },
  { id: "Dorogobuzh", lon: 33.9, lat: 54.9 },
  { id: "Chjat", lon: 34.5, lat: 55.2 },
  { id: "Mojaisk", lon: 35.8, lat: 55.5 },
  { id: "Moscow", lon: 37.6, lat: 55.8 }
]

// Main advance (west → east) — survivors account for detachments splitting off
const advanceFlows = [
  { source: "Kowno", target: "Wilna", survivors: 422, direction: "advance" },
  { source: "Wilna", target: "Gloubokoye", survivors: 290, direction: "advance" },
  { source: "Gloubokoye", target: "Vitebsk", survivors: 257, direction: "advance" },
  { source: "Vitebsk", target: "Orsha", survivors: 240, direction: "advance" },
  { source: "Orsha", target: "Smolensk", survivors: 210, direction: "advance" },
  { source: "Smolensk", target: "Dorogobuzh", survivors: 175, direction: "advance" },
  { source: "Dorogobuzh", target: "Chjat", survivors: 145, direction: "advance" },
  { source: "Chjat", target: "Mojaisk", survivors: 120, direction: "advance" },
  { source: "Mojaisk", target: "Moscow", survivors: 100, direction: "advance" }
]

// Southern detachment — split south from Wilna early in the campaign
const southDetachmentFlows = [
  { source: "Wilna", target: "Minsk", survivors: 60, direction: "advance" },
  { source: "Minsk", target: "Studianka", survivors: 33, direction: "advance" }
]

// Polotsk reinforcement — corps sent north, later retreated south to rejoin
const polotskFlows = [
  { source: "Gloubokoye", target: "Polotsk", survivors: 33, direction: "advance" },
  { source: "Polotsk", target: "Bobr", survivors: 22, direction: "retreat" }
]

// Retreat flows (east → west) — the devastating return
// Survivor counts bump at Bobr (Polotsk corps 22k rejoins) and
// Studianka (southern detachment ~33k rejoins), then continue falling.
const retreatFlows = [
  { source: "Moscow", target: "Mojaisk", survivors: 100, direction: "retreat" },
  { source: "Mojaisk", target: "Smolensk", survivors: 55, direction: "retreat" },
  { source: "Smolensk", target: "Orsha", survivors: 37, direction: "retreat" },
  { source: "Orsha", target: "Bobr", survivors: 24, direction: "retreat" },
  { source: "Bobr", target: "Studianka", survivors: 50, direction: "retreat" },   // +22k Polotsk corps, +4k losses
  { source: "Studianka", target: "Molodeczno", survivors: 55, direction: "retreat" }, // +33k southern detachment, −28k Berezina crossing
  { source: "Molodeczno", target: "Smorgoni", survivors: 28, direction: "retreat" },
  { source: "Smorgoni", target: "Wilna", survivors: 12, direction: "retreat" },
  { source: "Wilna", target: "Kowno", survivors: 10, direction: "retreat" }
]

const allFlows = [...advanceFlows, ...southDetachmentFlows, ...polotskFlows, ...retreatFlows]

// Temperature data for the retreat (connected scatterplot: temperature vs casualties)
// source/target fields match retreat flow edges for cross-highlighting.
// Survivor counts bump at Bobr (Polotsk corps) and Studianka (southern detachment).
const temperatureData = [
  { city: "Moscow", source: "Moscow", target: "Mojaisk", survivors: 100, temperature: 0, order: 0 },
  { city: "Mojaisk", source: "Mojaisk", target: "Smolensk", survivors: 55, temperature: -9, order: 1 },
  { city: "Smolensk", source: "Smolensk", target: "Orsha", survivors: 37, temperature: -21, order: 2 },
  { city: "Orsha", source: "Orsha", target: "Bobr", survivors: 24, temperature: -24, order: 3 },
  { city: "Bobr", source: "Bobr", target: "Studianka", survivors: 50, temperature: -30, order: 4 },
  { city: "Studianka", source: "Studianka", target: "Molodeczno", survivors: 55, temperature: -26, order: 5 },
  { city: "Molodeczno", source: "Molodeczno", target: "Smorgoni", survivors: 28, temperature: -33, order: 6 },
  { city: "Smorgoni", source: "Smorgoni", target: "Wilna", survivors: 12, temperature: -36, order: 7 },
  { city: "Wilna", source: "Wilna", target: "Kowno", survivors: 10, temperature: -38, order: 8 },
  { city: "Kowno", source: "Wilna", target: "Kowno", survivors: 10, temperature: -28, order: 9 }
]

// ── Viridis gradient legend ────────────────────────────────────────────

function ViridisLegend({ width }) {
  const legendWidth = Math.min(180, width * 0.25)
  const stops = [
    { offset: "0%", color: "#440154" },
    { offset: "25%", color: "#31688e" },
    { offset: "50%", color: "#35b779" },
    { offset: "75%", color: "#90d743" },
    { offset: "100%", color: "#fde725" }
  ]
  return (
    <g transform={`translate(${width - legendWidth - 50}, -14)`}>
      <defs>
        <linearGradient id="viridis-legend-grad">
          {stops.map(s => (
            <stop key={s.offset} offset={s.offset} stopColor={s.color} />
          ))}
        </linearGradient>
      </defs>
      <text x={0} y={0} fontSize={10} fill="#666" fontWeight={600}>
        Retreat stage
      </text>
      <rect
        x={0} y={4} width={legendWidth} height={8} rx={2}
        fill="url(#viridis-legend-grad)"
      />
      <text x={0} y={22} fontSize={9} fill="#888">Moscow</text>
      <text x={legendWidth} y={22} fontSize={9} fill="#888" textAnchor="end">Kowno</text>
    </g>
  )
}

// ── Component ─────────────────────────────────────────────────────────

export default function MinardsMarch({ width = 900 }) {
  const mapHeight = Math.round(width * 0.5)
  const chartHeight = Math.round(width * 0.22)

  return (
    <CategoryColorProvider
      categories={["advance", "retreat"]}
      colors={{ advance: "#deb887", retreat: "#333" }}
    >
      <LinkedCharts
        selections={[{ name: "city-hl", resolution: "union" }]}
        showLegend={false}
      >
        <div>
          <FlowMap
            flows={allFlows}
            nodes={marchNodes}
            xAccessor="lon"
            yAccessor="lat"
            valueAccessor="survivors"
            projection="mercator"
            lineType="line"
            flowStyle="offset"
            edgeColorBy="direction"
            edgeLinecap="square"
            edgeOpacity={0.85}
            edgeWidthRange={[2, 72]}
            showParticles
            particleStyle={{
              radius: 2.5,
              color: (d) => d?.direction === "advance" ? "#8b5e3c" : "#888",
              opacity: 0.85,
              speedMultiplier: 0.6,
              maxPerLine: 20,
              spawnRate: 0.1
            }}
            tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            tileAttribution="&copy; OpenStreetMap contributors"
            fitPadding={0.1}
            width={width}
            height={mapHeight}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            tooltip={(d) => (
              <div style={{
                background: "rgba(30,30,30,0.95)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12
              }}>
                {d.source ? (
                  <>
                    <div style={{ fontWeight: 600 }}>
                      {d.source} → {d.target}
                    </div>
                    <div style={{ opacity: 0.7 }}>
                      {(d.survivors * 1000).toLocaleString()} troops
                    </div>
                    <div style={{ opacity: 0.5, fontStyle: "italic" }}>
                      {d.direction}
                    </div>
                  </>
                ) : (
                  <div style={{ fontWeight: 600 }}>{d.id}</div>
                )}
              </div>
            )}
            linkedHover={{
              name: "city-hl",
              fields: ["source", "target"]
            }}
            selection={{ name: "city-hl" }}
          />

          <div style={{ marginTop: 4, background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 4 }}>
            <ConnectedScatterplot
              data={temperatureData}
              xAccessor="temperature"
              yAccessor="survivors"
              xLabel="Temperature (°C)"
              yLabel="Survivors (thousands)"
              orderAccessor="order"
              orderLabel="Retreat stage"
              pointRadius={7}
              width={width}
              height={chartHeight}
              margin={{ top: 30, right: 40, bottom: 50, left: 70 }}
              showGrid
              tooltip={(d) => (
                <div style={{
                  background: "rgba(30,30,30,0.95)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  <div style={{ fontWeight: 600 }}>{d.city}</div>
                  <div>{d.temperature}°C</div>
                  <div>{(d.survivors * 1000).toLocaleString()} troops surviving</div>
                </div>
              )}
              linkedHover={{
                name: "city-hl",
                fields: ["source", "target"]
              }}
              selection={{ name: "city-hl" }}
              frameProps={{
                background: "transparent",
                foregroundGraphics: <ViridisLegend width={width - 70 - 40} />
              }}
            />
          </div>
        </div>
      </LinkedCharts>
    </CategoryColorProvider>
  )
}
