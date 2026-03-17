import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  CategoryColorProvider,
  ConnectedScatterplot
} from "semiotic"
import { StreamGeoFrame } from "semiotic/geo"
import { scaleLinear } from "d3-scale"

// ── Minard's March Data ───────────────────────────────────────────────
// Same data as the static version, sequenced for progressive reveal.

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

// Ordered sequence for progressive reveal — advance, detachments, then retreat
const flowSequence = [
  // Main advance
  { source: "Kowno", target: "Wilna", survivors: 422, direction: "advance" },
  { source: "Wilna", target: "Gloubokoye", survivors: 290, direction: "advance" },
  // Southern detachment splits off
  { source: "Wilna", target: "Minsk", survivors: 60, direction: "advance" },
  // Polotsk corps sent north
  { source: "Gloubokoye", target: "Polotsk", survivors: 33, direction: "advance" },
  // Continue advance
  { source: "Gloubokoye", target: "Vitebsk", survivors: 257, direction: "advance" },
  { source: "Vitebsk", target: "Orsha", survivors: 240, direction: "advance" },
  { source: "Orsha", target: "Smolensk", survivors: 210, direction: "advance" },
  { source: "Smolensk", target: "Dorogobuzh", survivors: 175, direction: "advance" },
  { source: "Dorogobuzh", target: "Chjat", survivors: 145, direction: "advance" },
  { source: "Chjat", target: "Mojaisk", survivors: 120, direction: "advance" },
  { source: "Mojaisk", target: "Moscow", survivors: 100, direction: "advance" },
  // Southern detachment continues
  { source: "Minsk", target: "Studianka", survivors: 33, direction: "advance" },
  // Retreat begins
  { source: "Moscow", target: "Mojaisk", survivors: 100, direction: "retreat" },
  { source: "Mojaisk", target: "Smolensk", survivors: 55, direction: "retreat" },
  { source: "Smolensk", target: "Orsha", survivors: 37, direction: "retreat" },
  { source: "Orsha", target: "Bobr", survivors: 24, direction: "retreat" },
  // Polotsk corps retreats south to rejoin
  { source: "Polotsk", target: "Bobr", survivors: 22, direction: "retreat" },
  { source: "Bobr", target: "Studianka", survivors: 50, direction: "retreat" },
  { source: "Studianka", target: "Molodeczno", survivors: 55, direction: "retreat" },
  { source: "Molodeczno", target: "Smorgoni", survivors: 28, direction: "retreat" },
  { source: "Smorgoni", target: "Wilna", survivors: 12, direction: "retreat" },
  { source: "Wilna", target: "Kowno", survivors: 10, direction: "retreat" },
]

// Temperature data — pushed to scatterplot as retreat segments appear
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

// Map retreat flow source to temperature data index
const retreatSourceToTemp = {}
temperatureData.forEach((d, i) => { retreatSourceToTemp[d.source] = i })

// ── Helpers ───────────────────────────────────────────────────────────

const nodeLookup = new Map(marchNodes.map(n => [n.id, n]))

function flowToLine(flow) {
  const src = nodeLookup.get(flow.source)
  const tgt = nodeLookup.get(flow.target)
  if (!src || !tgt) return null
  return {
    ...flow,
    coordinates: [
      { lon: src.lon, lat: src.lat },
      { lon: tgt.lon, lat: tgt.lat }
    ]
  }
}

// Width scale (same domain as the full dataset)
const allSurvivors = flowSequence.map(f => f.survivors)
const widthScale = scaleLinear()
  .domain([Math.min(...allSurvivors), Math.max(...allSurvivors)])
  .range([2, 72])

// ── Component ─────────────────────────────────────────────────────────

export default function MinardsMarchStreaming({ width = 900 }) {
  const mapHeight = Math.round(width * 0.5)
  const chartHeight = Math.round(width * 0.22)

  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef(null)

  // Accumulated state for the map (lines must be bounded props)
  const [visibleFlows, setVisibleFlows] = useState([])
  const [visibleNodes, setVisibleNodes] = useState([])
  const [scatterData, setScatterData] = useState([])

  // Advance one step
  const advanceStep = useCallback(() => {
    setStep(prev => {
      const next = prev + 1
      if (next > flowSequence.length) {
        setPlaying(false)
        return prev
      }

      const flow = flowSequence[next - 1]
      const line = flowToLine(flow)

      // Add the flow line
      setVisibleFlows(f => line ? [...f, line] : f)

      // Add source/target nodes if not already visible
      setVisibleNodes(existing => {
        const ids = new Set(existing.map(n => n.id))
        const toAdd = []
        if (!ids.has(flow.source)) {
          const n = nodeLookup.get(flow.source)
          if (n) toAdd.push(n)
        }
        if (!ids.has(flow.target)) {
          const n = nodeLookup.get(flow.target)
          if (n) toAdd.push(n)
        }
        return toAdd.length ? [...existing, ...toAdd] : existing
      })

      // If this is a retreat flow, push the corresponding temperature point
      if (flow.direction === "retreat") {
        const tempIdx = retreatSourceToTemp[flow.source]
        if (tempIdx !== undefined) {
          setScatterData(prev => {
            // Avoid duplicates
            if (prev.some(d => d.order === temperatureData[tempIdx].order)) return prev
            return [...prev, temperatureData[tempIdx]]
          })
        }
      }

      return next
    })
  }, [])

  // Play/pause
  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(advanceStep, 600)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, advanceStep])

  // Reset
  const reset = useCallback(() => {
    setPlaying(false)
    setStep(0)
    setVisibleFlows([])
    setVisibleNodes([])
    setScatterData([])
  }, [])

  // No custom point style needed — ConnectedScatterplot handles viridis coloring

  // Map line style
  const lineStyle = useCallback((d) => ({
    stroke: d.direction === "advance" ? "#deb887" : "#333",
    strokeWidth: widthScale(d.survivors ?? 0),
    strokeLinecap: "round",
    opacity: 0.85
  }), [])

  // Map point style
  const mapPointStyle = useCallback(() => ({
    fill: "#333",
    r: 5,
    fillOpacity: 0.8
  }), [])

  // Map tooltip
  const mapTooltip = useCallback((d) => {
    const datum = d.data || d
    return (
      <div style={{
        background: "rgba(30,30,30,0.95)",
        color: "white",
        padding: "8px 12px",
        borderRadius: 4,
        fontSize: 12
      }}>
        {datum.source ? (
          <>
            <div style={{ fontWeight: 600 }}>{datum.source} → {datum.target}</div>
            <div style={{ opacity: 0.7 }}>
              {((datum.survivors ?? 0) * 1000).toLocaleString()} troops
            </div>
            <div style={{ opacity: 0.5, fontStyle: "italic" }}>{datum.direction}</div>
          </>
        ) : (
          <div style={{ fontWeight: 600 }}>{datum.id}</div>
        )}
      </div>
    )
  }, [])

  const isComplete = step >= flowSequence.length
  const retreatStarted = visibleFlows.some(f => f.direction === "retreat")

  return (
    <CategoryColorProvider
      categories={["advance", "retreat"]}
      colors={{ advance: "#deb887", retreat: "#333" }}
    >
      <div>
        {/* Controls */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13
        }}>
          <button
            onClick={() => setPlaying(p => !p)}
            disabled={isComplete}
            style={{
              padding: "4px 16px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: playing ? "#eee" : "#fff",
              cursor: isComplete ? "default" : "pointer",
              fontWeight: 600
            }}
          >
            {playing ? "Pause" : isComplete ? "Done" : "Play"}
          </button>
          {!playing && !isComplete && (
            <button
              onClick={advanceStep}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer"
              }}
            >
              Step
            </button>
          )}
          <button
            onClick={reset}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Reset
          </button>
          <span style={{ color: "#666" }}>
            {step} / {flowSequence.length} segments
            {isComplete && " — campaign complete"}
          </span>
        </div>

        {/* Map */}
        <StreamGeoFrame
          projection="mercator"
          lines={visibleFlows}
          points={visibleNodes}
          xAccessor="lon"
          yAccessor="lat"
          lineDataAccessor="coordinates"
          lineType="line"
          lineStyle={lineStyle}
          pointStyle={mapPointStyle}
          fitPadding={0.1}
          zoomable
          zoomExtent={[1, 8]}
          tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          tileAttribution="&copy; OpenStreetMap contributors"
          size={[width, mapHeight]}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          enableHover
          tooltipContent={mapTooltip}
        />

        {/* Scatterplot — only visible once retreat begins */}
        {retreatStarted && (
          <div style={{
            marginTop: 4,
            background: "#fafafa",
            border: "1px solid #e0e0e0",
            borderRadius: 4
          }}>
            <ConnectedScatterplot
              data={scatterData}
              xAccessor="temperature"
              yAccessor="survivors"
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
                  <div>{(d.survivors * 1000).toLocaleString()} troops</div>
                </div>
              )}
              frameProps={{ background: "transparent" }}
            />
          </div>
        )}
      </div>
    </CategoryColorProvider>
  )
}
