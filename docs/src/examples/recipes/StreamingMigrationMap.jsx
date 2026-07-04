import React, { useState, useEffect, useCallback, useMemo } from "react"
import { CategoryColorProvider } from "semiotic"
import { FlowMap } from "semiotic/geo"

// ── Global Animal Migration Routes ──────────────────────────────────
// Each segment is tagged with the quarter when the animal is physically
// on that leg. As the rolling window advances, the migration "wave"
// progresses across the map — early segments appear first, later ones
// follow, and early ones drop off behind.

const migrationNodes = [
  // Arctic Tern
  { id: "iceland", lon: -20, lat: 64 },
  { id: "azores", lon: -28, lat: 38 },
  { id: "westAfrica", lon: -17, lat: 14 },
  { id: "gulfOfGuinea", lon: 5, lat: 2 },
  { id: "namibiaCoast", lon: 12, lat: -24 },
  { id: "weddellSea", lon: -25, lat: -68 },

  // Monarch Butterfly
  { id: "ontario", lon: -80, lat: 44 },
  { id: "ozarks", lon: -92, lat: 37 },
  { id: "texasHill", lon: -98, lat: 30 },
  { id: "michoacan", lon: -100, lat: 19 },

  // Humpback Whale
  { id: "antarcticPeninsula", lon: -60, lat: -64 },
  { id: "falklands", lon: -58, lat: -52 },
  { id: "rioDeLaPlata", lon: -55, lat: -35 },
  { id: "salvadorBrazil", lon: -38, lat: -13 },

  // Barn Swallow
  { id: "england", lon: -1, lat: 52 },
  { id: "iberia", lon: -8, lat: 39 },
  { id: "morocco", lon: -6, lat: 32 },
  { id: "mali", lon: -5, lat: 13 },
  { id: "botswana", lon: 25, lat: -22 },

  // Amur Falcon
  { id: "manchuria", lon: 125, lat: 45 },
  { id: "nagaland", lon: 94, lat: 26 },
  { id: "mumbai", lon: 73, lat: 19 },
  { id: "somalia", lon: 46, lat: 5 },
  { id: "mozambique", lon: 35, lat: -18 },

  // White Stork
  { id: "germany", lon: 12, lat: 52 },
  { id: "bosporus", lon: 29, lat: 41 },
  { id: "sinai", lon: 34, lat: 29 },
  { id: "riftValley", lon: 36, lat: 0 },
  { id: "serengeti", lon: 35, lat: -3 },
]

// ── Quarter metadata ────────────────────────────────────────────────

const quarters = [
  { label: "Q1", season: "Winter–Spring", months: "Jan – Mar" },
  { label: "Q2", season: "Spring–Summer", months: "Apr – Jun" },
  { label: "Q3", season: "Summer–Fall",   months: "Jul – Sep" },
  { label: "Q4", season: "Fall–Winter",   months: "Oct – Dec" },
]

// ── Per-segment migration data ──────────────────────────────────────
// Each segment is independently tagged with its quarter.
// Within a species' route, segments progress through quarters as the
// animal moves — e.g., Arctic Tern departs Iceland in Q3 and arrives
// in Antarctica by Q4.

function seg(source, target, value, species, quarter, direction) {
  return { source, target, value, species, quarter, direction }
}

const speciesConfig = [
  {
    name: "Arctic Tern",
    color: "#00e5ff",
    migrations: [
      // Southbound Jul–Nov: departs Q3, arrives Q4
      seg("iceland",      "azores",       7, "Arctic Tern", 3, "Southbound"),
      seg("azores",       "westAfrica",   6, "Arctic Tern", 3, "Southbound"),
      seg("westAfrica",   "gulfOfGuinea", 6, "Arctic Tern", 3, "Southbound"),
      seg("gulfOfGuinea", "namibiaCoast", 5, "Arctic Tern", 4, "Southbound"),
      seg("namibiaCoast", "weddellSea",   5, "Arctic Tern", 4, "Southbound"),
      // Northbound Mar–May: departs Q1, arrives Q2
      seg("weddellSea",   "namibiaCoast", 5, "Arctic Tern", 1, "Northbound"),
      seg("namibiaCoast", "gulfOfGuinea", 5, "Arctic Tern", 1, "Northbound"),
      seg("gulfOfGuinea", "westAfrica",   6, "Arctic Tern", 2, "Northbound"),
      seg("westAfrica",   "azores",       6, "Arctic Tern", 2, "Northbound"),
      seg("azores",       "iceland",      7, "Arctic Tern", 2, "Northbound"),
    ]
  },
  {
    name: "Monarch Butterfly",
    color: "#ff9100",
    migrations: [
      // Southbound Sep–Nov: departs late Q3, arrives Q4
      seg("ontario",  "ozarks",   5, "Monarch Butterfly", 3, "Southbound"),
      seg("ozarks",   "texasHill", 5, "Monarch Butterfly", 4, "Southbound"),
      seg("texasHill", "michoacan", 4, "Monarch Butterfly", 4, "Southbound"),
      // Northbound Mar–Jun: multi-generational relay Q1→Q2
      seg("michoacan", "texasHill", 4, "Monarch Butterfly", 1, "Northbound"),
      seg("texasHill", "ozarks",   5, "Monarch Butterfly", 2, "Northbound"),
      seg("ozarks",    "ontario",  5, "Monarch Butterfly", 2, "Northbound"),
    ]
  },
  {
    name: "Humpback Whale",
    color: "#448aff",
    migrations: [
      // To tropics May–Aug: departs Q2, arrives Q3
      seg("antarcticPeninsula", "falklands",      8, "Humpback Whale", 2, "To tropics"),
      seg("falklands",          "rioDeLaPlata",   7, "Humpback Whale", 2, "To tropics"),
      seg("rioDeLaPlata",       "salvadorBrazil", 6, "Humpback Whale", 3, "To tropics"),
      // To Antarctic Nov–Feb: departs Q4, arrives Q1
      seg("salvadorBrazil", "rioDeLaPlata",       6, "Humpback Whale", 4, "To Antarctic"),
      seg("rioDeLaPlata",   "falklands",          7, "Humpback Whale", 4, "To Antarctic"),
      seg("falklands",      "antarcticPeninsula", 8, "Humpback Whale", 1, "To Antarctic"),
    ]
  },
  {
    name: "Barn Swallow",
    color: "#ff5252",
    migrations: [
      // Southbound Aug–Oct: departs Q3, arrives Q4
      seg("england", "iberia",  5, "Barn Swallow", 3, "Southbound"),
      seg("iberia",  "morocco", 5, "Barn Swallow", 3, "Southbound"),
      seg("morocco", "mali",    4, "Barn Swallow", 4, "Southbound"),
      seg("mali",    "botswana", 4, "Barn Swallow", 4, "Southbound"),
      // Northbound Mar–May: departs Q1, arrives Q2
      seg("botswana", "mali",    4, "Barn Swallow", 1, "Northbound"),
      seg("mali",     "morocco", 4, "Barn Swallow", 1, "Northbound"),
      seg("morocco",  "iberia",  5, "Barn Swallow", 2, "Northbound"),
      seg("iberia",   "england", 5, "Barn Swallow", 2, "Northbound"),
    ]
  },
  {
    name: "Amur Falcon",
    color: "#b388ff",
    migrations: [
      // Southbound Oct–Jan: departs Q4, arrives Q1
      seg("manchuria", "nagaland",   6, "Amur Falcon", 4, "Southbound"),
      seg("nagaland",  "mumbai",     5, "Amur Falcon", 4, "Southbound"),
      seg("mumbai",    "somalia",    5, "Amur Falcon", 4, "Southbound"),
      seg("somalia",   "mozambique", 4, "Amur Falcon", 1, "Southbound"),
      // Northbound Apr–May: concentrated Q2
      seg("mozambique", "somalia",   4, "Amur Falcon", 2, "Northbound"),
      seg("somalia",    "mumbai",    5, "Amur Falcon", 2, "Northbound"),
      seg("mumbai",     "nagaland",  5, "Amur Falcon", 2, "Northbound"),
      seg("nagaland",   "manchuria", 6, "Amur Falcon", 2, "Northbound"),
    ]
  },
  {
    name: "White Stork",
    color: "#69f0ae",
    migrations: [
      // Southbound Aug–Oct: departs Q3, arrives Q4
      seg("germany",    "bosporus",   6, "White Stork", 3, "Southbound"),
      seg("bosporus",   "sinai",      5, "White Stork", 3, "Southbound"),
      seg("sinai",      "riftValley", 5, "White Stork", 4, "Southbound"),
      seg("riftValley", "serengeti",  4, "White Stork", 4, "Southbound"),
      // Northbound Feb–Apr: departs Q1, arrives Q2
      seg("serengeti",  "riftValley", 4, "White Stork", 1, "Northbound"),
      seg("riftValley", "sinai",      5, "White Stork", 1, "Northbound"),
      seg("sinai",      "bosporus",   5, "White Stork", 1, "Northbound"),
      seg("bosporus",   "germany",    6, "White Stork", 2, "Northbound"),
    ]
  },
]

const allFlows = speciesConfig.flatMap(s => s.migrations)
const speciesNames = speciesConfig.map(s => s.name)
const speciesColorMap = Object.fromEntries(speciesConfig.map(s => [s.name, s.color]))

// ── Window helpers ──────────────────────────────────────────────────

function getWindowQuarters(pos) {
  const q1 = (pos % 4) + 1
  const q2 = (pos + 1) % 4 + 1
  return [q1, q2]
}

const windowSeasons = [
  "Winter → Summer",
  "Spring → Fall",
  "Summer → Winter",
  "Fall → Spring",
]

// ── Component ─────────────────────────────────────────────────────────

export default function StreamingMigrationMap({ width = 900 }) {
  const height = Math.round(width * 0.55)
  const [windowPos, setWindowPos] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => {
      setWindowPos(prev => {
        const next = (prev + 1) % 4
        if (next === 0) setCycle(c => c + 1)
        return next
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [playing])

  const windowQ = useMemo(() => getWindowQuarters(windowPos), [windowPos])

  // Filter individual segments by quarter
  const visibleFlows = useMemo(
    () => allFlows.filter(f => windowQ.includes(f.quarter)),
    [windowQ]
  )

  // Per-species: which segments are active and in which directions
  const speciesStatus = useMemo(() => {
    return speciesConfig.map(s => {
      const activeSegs = s.migrations.filter(f => windowQ.includes(f.quarter))
      const directions = [...new Set(activeSegs.map(f => f.direction))]
      return {
        name: s.name,
        color: s.color,
        directions,
        activeCount: activeSegs.length,
        totalCount: s.migrations.length,
      }
    })
  }, [windowQ])

  const activeSpeciesCount = speciesStatus.filter(s => s.activeCount > 0).length

  const step = useCallback(() => {
    setWindowPos(prev => {
      const next = (prev + 1) % 4
      if (next === 0) setCycle(c => c + 1)
      return next
    })
  }, [])

  return (
    <div>
      {/* Controls */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        flexWrap: "wrap"
      }}>
        <button onClick={() => setPlaying(p => !p)} style={btnStyle(playing)}>
          {playing ? "Pause" : "Play"}
        </button>
        {!playing && (
          <button onClick={step} style={btnStyle(false)}>Step</button>
        )}
        <button onClick={() => { setWindowPos(0); setCycle(0); setPlaying(true) }} style={btnStyle(false)}>
          Reset
        </button>
        <span style={{ color: "#667788", fontSize: 11 }}>
          Year {cycle + 1} · {visibleFlows.length} segments · {activeSpeciesCount} species
        </span>
      </div>

      {/* Quarter timeline bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {quarters.map((q, i) => {
          const qNum = i + 1
          const isActive = windowQ.includes(qNum)
          return (
            <div key={i} style={{
              flex: 1,
              padding: "6px 8px",
              background: isActive ? "#1b3a5c" : "#0f1a2a",
              border: `1px solid ${isActive ? "#2a5a8a" : "#1a2535"}`,
              borderRadius: 4,
              textAlign: "center",
              transition: "all 0.4s ease",
            }}>
              <div style={{
                fontWeight: 600, fontSize: 12,
                color: isActive ? "#fff" : "#334455",
                transition: "color 0.4s ease",
              }}>
                {q.label}
              </div>
              <div style={{
                fontSize: 10,
                color: isActive ? "#8899aa" : "#223344",
                transition: "color 0.4s ease",
              }}>
                {q.months}
              </div>
              <div style={{
                fontSize: 9,
                color: isActive ? "#667788" : "#1a2535",
                marginTop: 1,
                transition: "color 0.4s ease",
              }}>
                {q.season}
              </div>
            </div>
          )
        })}
      </div>

      {/* Map */}
      <div style={{ position: "relative", background: "#0d1b2a", borderRadius: 8, overflow: "hidden" }}>
        <CategoryColorProvider categories={speciesNames} colors={speciesColorMap}>
          <FlowMap
            flows={visibleFlows}
            nodes={migrationNodes}
            areas="world-110m"
            projection="equalEarth"
            lineType="geo"
            edgeColorBy="species"
            edgeOpacity={0.4}
            edgeWidthRange={[1.5, 3.5]}
            valueAccessor="value"
            showParticles
            particleStyle={{
              radius: 2,
              color: (d) => speciesColorMap[d?.species] || "#fff",
              opacity: 0.9,
              speedMultiplier: 0.7,
              maxPerLine: 30,
              spawnRate: 0.18
            }}
            graticule
            fitPadding={0.02}
            width={width}
            height={height}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            tooltip={(d) => {
              if (!d.species) {
                return (
                  <div style={tooltipStyle}>
                    <div style={{ fontWeight: 600 }}>{d.label || d.id}</div>
                  </div>
                )
              }
              return (
                <div style={tooltipStyle}>
                  <div style={{ fontWeight: 600, color: speciesColorMap[d.species] }}>
                    {d.species}
                  </div>
                  <div style={{ opacity: 0.7 }}>
                    {d.direction} — {d.source} → {d.target}
                  </div>
                  <div style={{ opacity: 0.5, fontSize: 11 }}>
                    Peak: {quarters[d.quarter - 1].label} ({quarters[d.quarter - 1].months})
                  </div>
                </div>
              )
            }}
            frameProps={{
              areaStyle: () => ({
                fill: "#1b2838",
                stroke: "#2a3f55",
                strokeWidth: 0.5
              }),
              lineStyle: (d) => {
                const datum = d.data || d
                return {
                  stroke: speciesColorMap[datum.species] || "#ffffff44",
                  strokeWidth: 1.5,
                  strokeOpacity: 0.35
                }
              },
              background: "#0d1b2a"
            }}
            showLegend={false}
          />
        </CategoryColorProvider>

        {/* Species legend with per-segment status */}
        <div style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          pointerEvents: "none"
        }}>
          {speciesStatus.map(s => {
            const isActive = s.activeCount > 0
            return (
              <div key={s.name} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(13,27,42,0.85)",
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                backdropFilter: "blur(4px)",
                opacity: isActive ? 1 : 0.3,
                transition: "opacity 0.5s ease",
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: s.color, flexShrink: 0,
                }} />
                <span style={{ fontWeight: 600, color: isActive ? s.color : "#556" }}>
                  {s.name}
                </span>
                <span style={{ color: "#8899aa", fontSize: 10 }}>
                  {isActive
                    ? `${s.directions.join(" + ")} (${s.activeCount}/${s.totalCount} legs)`
                    : "at rest"
                  }
                </span>
              </div>
            )
          })}
        </div>

        {/* Window label */}
        <div style={{
          position: "absolute",
          top: 8,
          right: 12,
          fontSize: 10,
          color: "#556677",
          pointerEvents: "none",
          textAlign: "right",
        }}>
          <div>{windowSeasons[windowPos]}</div>
          <div style={{ opacity: 0.6 }}>Equal Earth projection</div>
        </div>
      </div>
    </div>
  )
}

const tooltipStyle = {
  background: "rgba(13,27,42,0.95)",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 4,
  fontSize: 12,
}

function btnStyle(active) {
  return {
    padding: "4px 16px",
    borderRadius: 4,
    border: "1px solid #334455",
    background: active ? "#1b2838" : "#0d1b2a",
    color: "#aabbcc",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12
  }
}
