import React, { useCallback, useMemo, useState } from "react"
import { GeoCustomChart, geoAreaHitTarget } from "semiotic/geo"
import { shade, unwrapDatum } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { StatStrip } from "../../components/StatStrip"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import "./CreativeContoursExamplePage.css"

const USA_OUTLINE = {
  type: "Feature",
  properties: { name: "Contiguous United States (schematic)" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [-124.7, 48.5], [-110.0, 49.0], [-96.0, 49.0], [-89.0, 48.0],
      [-83.0, 46.0], [-72.0, 47.0], [-67.0, 45.0], [-75.0, 38.0],
      [-77.0, 34.5], [-80.0, 31.0], [-80.0, 27.0], [-82.0, 25.3],
      [-85.0, 29.5], [-90.0, 29.0], [-97.0, 26.0], [-103.0, 29.0],
      [-106.5, 31.8], [-111.0, 31.3], [-117.0, 32.5], [-122.3, 37.2],
      [-124.3, 40.5], [-124.0, 42.0], [-122.5, 46.0], [-124.7, 48.5],
    ]],
  },
}

const GEO_EXTENT = {
  west: -125,
  east: -66,
  south: 24.5,
  north: 49.5,
}

const SIGNALS = {
  composite: {
    label: "Composite",
    metric: "creative gravity",
    description: "Combined screen, sound, game, design, and research signal.",
    palette: ["#1f594e", "#40846a", "#82a95f", "#d6bd55", "#dd7644", "#c64667", "#6f4aa8"],
  },
  screen: {
    label: "Screen",
    metric: "screen production",
    description: "Film, television, streaming, and production services.",
    palette: ["#214d62", "#2d788d", "#53a5a0", "#bad263", "#f1b64c", "#e66f45", "#b8335a"],
  },
  sound: {
    label: "Sound",
    metric: "recorded music",
    description: "Music production, performance economies, and recording culture.",
    palette: ["#244f51", "#427b5c", "#83a05a", "#d5b653", "#ef8b44", "#cf4f52", "#803d7d"],
  },
  games: {
    label: "Games",
    metric: "game studios",
    description: "Game studios, engines, esports, and interactive media.",
    palette: ["#263d66", "#375f91", "#4f8d9b", "#72b272", "#d5c44e", "#eb8842", "#b84b72"],
  },
  design: {
    label: "Design",
    metric: "design labor",
    description: "Product, industrial, fashion, and architectural design concentration.",
    palette: ["#234f58", "#377a72", "#72a15e", "#cbbd59", "#e18d4e", "#cf5363", "#7551a5"],
  },
  research: {
    label: "Research",
    metric: "research culture",
    description: "University, public research, civic technology, and laboratory spillover.",
    palette: ["#233e60", "#3d668e", "#568d9c", "#77b07f", "#d1bf58", "#d9824b", "#a64b7d"],
  },
}

const SIGNAL_ORDER = ["composite", "screen", "sound", "games", "design", "research"]
const CONTOUR_THRESHOLDS = [15, 28, 41, 54, 67, 80]

const CREATIVE_HUBS = [
  { id: "la", name: "Los Angeles", lon: -118.24, lat: 34.05, screen: 98, sound: 62, games: 76, design: 88, research: 52, radius: 560 },
  { id: "bay", name: "Bay Area", lon: -122.42, lat: 37.77, screen: 52, sound: 46, games: 86, design: 96, research: 91, radius: 520 },
  { id: "seattle", name: "Seattle", lon: -122.33, lat: 47.61, screen: 36, sound: 42, games: 91, design: 67, research: 75, radius: 470 },
  { id: "portland", name: "Portland", lon: -122.68, lat: 45.52, screen: 34, sound: 48, games: 45, design: 79, research: 45, radius: 380 },
  { id: "denver", name: "Denver", lon: -104.99, lat: 39.74, screen: 38, sound: 42, games: 48, design: 56, research: 54, radius: 430 },
  { id: "phoenix", name: "Phoenix", lon: -112.07, lat: 33.45, screen: 40, sound: 34, games: 42, design: 52, research: 48, radius: 390 },
  { id: "salt-lake", name: "Salt Lake City", lon: -111.89, lat: 40.76, screen: 32, sound: 34, games: 58, design: 46, research: 60, radius: 360 },
  { id: "austin", name: "Austin", lon: -97.74, lat: 30.27, screen: 58, sound: 86, games: 88, design: 66, research: 70, radius: 470 },
  { id: "dfw", name: "Dallas-Fort Worth", lon: -96.8, lat: 32.78, screen: 50, sound: 44, games: 58, design: 60, research: 52, radius: 430 },
  { id: "houston", name: "Houston", lon: -95.37, lat: 29.76, screen: 45, sound: 50, games: 38, design: 50, research: 74, radius: 410 },
  { id: "new-orleans", name: "New Orleans", lon: -90.07, lat: 29.95, screen: 44, sound: 82, games: 22, design: 42, research: 30, radius: 330 },
  { id: "nashville", name: "Nashville", lon: -86.78, lat: 36.16, screen: 54, sound: 96, games: 24, design: 44, research: 36, radius: 390 },
  { id: "atlanta", name: "Atlanta", lon: -84.39, lat: 33.75, screen: 88, sound: 76, games: 42, design: 62, research: 54, radius: 470 },
  { id: "miami", name: "Miami", lon: -80.19, lat: 25.76, screen: 58, sound: 72, games: 30, design: 78, research: 38, radius: 360 },
  { id: "orlando", name: "Orlando", lon: -81.38, lat: 28.54, screen: 62, sound: 38, games: 52, design: 56, research: 35, radius: 320 },
  { id: "raleigh", name: "Research Triangle", lon: -78.64, lat: 35.78, screen: 36, sound: 34, games: 54, design: 50, research: 92, radius: 380 },
  { id: "dc", name: "Washington", lon: -77.04, lat: 38.9, screen: 48, sound: 36, games: 28, design: 54, research: 86, radius: 360 },
  { id: "philadelphia", name: "Philadelphia", lon: -75.16, lat: 39.95, screen: 48, sound: 46, games: 38, design: 58, research: 76, radius: 330 },
  { id: "new-york", name: "New York", lon: -73.94, lat: 40.71, screen: 94, sound: 88, games: 58, design: 100, research: 74, radius: 520 },
  { id: "boston", name: "Boston", lon: -71.06, lat: 42.36, screen: 52, sound: 48, games: 52, design: 68, research: 98, radius: 390 },
  { id: "pittsburgh", name: "Pittsburgh", lon: -79.99, lat: 40.44, screen: 42, sound: 34, games: 44, design: 50, research: 78, radius: 330 },
  { id: "detroit", name: "Detroit", lon: -83.05, lat: 42.33, screen: 44, sound: 72, games: 34, design: 86, research: 48, radius: 350 },
  { id: "chicago", name: "Chicago", lon: -87.63, lat: 41.88, screen: 66, sound: 76, games: 56, design: 82, research: 70, radius: 470 },
  { id: "minneapolis", name: "Minneapolis", lon: -93.27, lat: 44.98, screen: 40, sound: 56, games: 42, design: 74, research: 54, radius: 360 },
  { id: "kansas-city", name: "Kansas City", lon: -94.58, lat: 39.1, screen: 36, sound: 54, games: 34, design: 50, research: 38, radius: 330 },
  { id: "las-vegas", name: "Las Vegas", lon: -115.14, lat: 36.17, screen: 64, sound: 70, games: 38, design: 58, research: 22, radius: 330 },
]

const REGION_LABELS = [
  { id: "pacific", label: "Pacific media shelf", lon: -119.2, lat: 39.4, rotate: -32 },
  { id: "texas", label: "Interactive belt", lon: -98.2, lat: 31.9, rotate: 18 },
  { id: "south", label: "Sound and screen arc", lon: -86.1, lat: 33.9, rotate: -20 },
  { id: "northeast", label: "Research corridor", lon: -75.1, lat: 41.4, rotate: -28 },
  { id: "great-lakes", label: "Design basin", lon: -86.1, lat: 42.3, rotate: -10 },
]

const implementationCode = `import { GeoCustomChart, geoAreaHitTarget } from "semiotic/geo"

function isometricContourLayout(ctx) {
  return {
    nodes: sampledCells.map((cell) => geoAreaHitTarget({
      pathData: diamondPath(cell.x, cell.y, tileWidth, tileHeight),
      centroid: [cell.x, cell.y],
      bounds: cell.bounds,
      datum: cell,
      group: ctx.config.signal,
    })),
    overlays: <StackedContourMap cells={sampledCells} />,
  }
}

<GeoCustomChart
  areas={[contiguousUsOutline]}
  points={metroSignals}
  projection="albersUsa"
  layout={isometricContourLayout}
  layoutConfig={{
    signal: "games",
    columns: 42,
    rows: 25,
    verticalScale: 1.2,
    thresholds: [15, 28, 41, 54, 67, 80],
  }}
  enableHover
  tooltip={(cell) => <strong>{cell.scoreLabel}</strong>}
  accessibleTable
/>`

export default function CreativeContoursExamplePage() {
  const [signalKey, setSignalKey] = useState("composite")
  const [verticalScale, setVerticalScale] = useState(1.15)
  const [activeDatum, setActiveDatum] = useState(null)
  const [chartWidth, chartHostRef] = useResponsiveWidth(320, 1120)
  const compact = chartWidth < 680
  const chartHeight = compact ? 360 : chartWidth < 900 ? 540 : 640
  const layoutConfig = useMemo(() => ({
    signalKey,
    verticalScale,
    columns: compact ? 27 : 43,
    rows: compact ? 16 : 25,
    thresholds: CONTOUR_THRESHOLDS,
  }), [compact, signalKey, verticalScale])
  const signal = SIGNALS[signalKey]
  const rankedHubs = useMemo(
    () =>
      CREATIVE_HUBS
        .map((hub) => ({ ...hub, value: signalValue(hub, signalKey) }))
        .sort((a, b) => b.value - a.value),
    [signalKey],
  )
  const active = activeDatum ?? {
    name: rankedHubs[0].name,
    scoreLabel: `${Math.round(rankedHubs[0].value)} ${signal.metric}`,
    nearestHub: rankedHubs[0].name,
    bandLabel: "strongest anchor",
  }

  const handleObservation = useCallback((observation) => {
    if (observation.type === "hover" && observation.datum) {
      setActiveDatum(unwrapDatum(observation.datum))
    } else if (observation.type === "hover-end") {
      setActiveDatum(null)
    }
  }, [])

  return (
    <ExamplePageLayout title="Creative Gravity of America">
      <p className="creative-contours__lede">
        Metro-level creative industries are sampled into contours and stacked across an isometric
        United States. Height encodes the selected
        cultural-production signal.
      </p>

      <StatStrip
        items={[
          { value: signal.label, label: "active signal" },
          { value: rankedHubs[0].name, label: "strongest hub" },
          { value: CONTOUR_THRESHOLDS.length + 1, label: "contour shelves" },
          { value: compact ? "27 x 16" : "43 x 25", label: "sample grid" },
        ]}
      />

      <section className="creative-contours__stage">
        <div className="creative-contours__toolbar">
          <div className="creative-contours__signal-group" role="group" aria-label="Signal field">
            {SIGNAL_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={signalKey === key}
                onClick={() => setSignalKey(key)}
              >
                {SIGNALS[key].label}
              </button>
            ))}
          </div>
          <label className="creative-contours__range">
            <span>Vertical scale</span>
            <input
              type="range"
              min="0.7"
              max="1.6"
              step="0.05"
              value={verticalScale}
              onChange={(event) => setVerticalScale(Number(event.target.value))}
            />
            <output>{verticalScale.toFixed(2)}x</output>
          </label>
        </div>

        <div className="creative-contours__readout" aria-live="polite">
          <span>{signal.description}</span>
          <strong>{active.name}</strong>
          <span>{active.scoreLabel}</span>
          <span>{active.bandLabel}</span>
        </div>

        <div ref={chartHostRef} className="creative-contours__chart-host">
          <GeoCustomChart
            areas={[USA_OUTLINE]}
            points={CREATIVE_HUBS}
            projection="albersUsa"
            layout={isometricContourLayout}
            layoutConfig={layoutConfig}
            width={chartWidth}
            height={chartHeight}
            margin={{ top: 12, right: 12, bottom: 18, left: 12 }}
            enableHover
            onObservation={handleObservation}
            tooltip={(datum) => {
              const cell = unwrapDatum(datum)
              return (
                <div className="creative-contours__tooltip">
                  <strong>{cell.name}</strong>
                  <span>{cell.scoreLabel}</span>
                  <span>{cell.nearestHub}</span>
                </div>
              )
            }}
            description={`An isometric contour map of the contiguous United States showing ${signal.metric}.`}
            summary={`The strongest ${signal.metric} hub is ${rankedHubs[0].name}. The map uses ${CONTOUR_THRESHOLDS.length + 1} contour shelves across a synthetic metro signal field.`}
            accessibleTable
            frameProps={{
              background: "transparent",
              allowTooltipOverflow: true,
            }}
          />
        </div>

        <div className="creative-contours__legend" aria-label="Contour shelf legend">
          {signal.palette.map((color, index) => (
            <span key={color}>
              <i style={{ background: color }} />
              {index === 0
                ? "low"
                : index === signal.palette.length - 1
                  ? "peak"
                  : CONTOUR_THRESHOLDS[index - 1]}
            </span>
          ))}
        </div>
      </section>

      <section className="creative-contours__notes">
        <div>
          <h2>What the surface encodes</h2>
          <p>
            Each metro contributes a weighted radial field for the selected cultural sector.
            The page normalizes the sampled field, cuts it into contour shelves, and renders every
            in-country sample as a raised isometric prism. The contour lines are generated from the
            same sampled scalar field with marching squares.
          </p>
        </div>
        <div>
          <h2>Why a custom GeoFrame</h2>
          <p>
            The data enters as ordinary lon/lat records and a US outline. The layout owns the
            contour grid and isometric projection, while GeoCustomChart still supplies hover
            observation, tooltips, accessible rows, SSR, and the surrounding frame behavior.
          </p>
        </div>
      </section>

      <CodeBlock language="jsx" showCopyButton code={implementationCode} />
    </ExamplePageLayout>
  )
}

function isometricContourLayout(ctx) {
  const signalKey = ctx.config.signalKey || "composite"
  const thresholds = ctx.config.thresholds || CONTOUR_THRESHOLDS
  const columns = Math.max(18, ctx.config.columns || 43)
  const rows = Math.max(12, ctx.config.rows || 25)
  const verticalScale = Math.max(0.4, Math.min(2.2, ctx.config.verticalScale || 1))
  const signal = SIGNALS[signalKey] || SIGNALS.composite
  const hubs = ctx.points.map(unwrapDatum).filter(Boolean)
  const field = sampleSignalField({
    points: hubs,
    columns,
    rows,
    signalKey,
    thresholds,
  })

  const width = ctx.dimensions.width
  const height = ctx.dimensions.height
  const tileWidth = Math.max(
    9,
    Math.min(
      (width - 36) * 2 / (columns + rows),
      (height - 78) * 4 / (columns + rows),
    ),
  )
  const tileHeight = tileWidth / 2
  const rise = tileHeight * 0.48 * verticalScale
  const baseDepth = Math.max(3.5, tileHeight * 0.2)
  const maxLift = baseDepth + thresholds.length * rise
  const rawMinX = -(rows - 1) * tileWidth / 2
  const rawMaxX = (columns - 1) * tileWidth / 2
  const boardWidth = rawMaxX - rawMinX + tileWidth
  const boardHeight = (columns + rows - 2) * tileHeight / 2 + tileHeight + maxLift
  const originX = (width - boardWidth) / 2 - rawMinX + tileWidth / 2
  const verticalInset = width < 680 ? -12 : 20
  const originY = Math.max(26 + maxLift, (height - boardHeight) / 2 + maxLift + verticalInset)

  const toIso = (column, row, lift = 0) => [
    originX + (column - row) * tileWidth / 2,
    originY + (column + row) * tileHeight / 2 - lift,
  ]
  const heightForBand = (band) => baseDepth + band * rise
  const heightForValue = (value) => heightForBand(bandForValue(value, thresholds))

  const visibleCells = field.cells
    .map((cell) => {
      const [x, y] = toIso(cell.column, cell.row)
      const band = bandForValue(cell.value, thresholds)
      const lift = heightForBand(band)
      const [tx, ty] = toIso(cell.column, cell.row, lift)
      return {
        ...cell,
        band,
        lift,
        x,
        y,
        topX: tx,
        topY: ty,
        fill: signal.palette[Math.min(signal.palette.length - 1, band)],
      }
    })
    .sort((a, b) => (a.row + a.column) - (b.row + b.column) || a.column - b.column)

  const contourSegments = thresholds.flatMap((threshold) =>
    contourSegmentsForThreshold(field.samples, columns, rows, threshold)
      .map((segment, index) => ({
        id: `${threshold}-${index}`,
        threshold,
        points: segment.map(([column, row]) => {
          const [x, y] = toIso(column, row, heightForValue(threshold) + 0.8)
          return [x, y]
        }),
      })),
  )

  const labelPoints = REGION_LABELS.map((label) => {
    const grid = lonLatToGrid(label.lon, label.lat, columns, rows)
    const value = normalizedValueAt(label.lon, label.lat, field.maxRaw, hubs, signalKey)
    const [x, y] = toIso(grid.column, grid.row, heightForValue(value) + 7)
    return { ...label, x, y }
  })

  const hubMarkers = hubs
    .map((hub) => {
      const grid = lonLatToGrid(hub.lon, hub.lat, columns, rows)
      if (!pointInPolygon(hub.lon, hub.lat, USA_OUTLINE.geometry.coordinates[0])) return null
      const value = normalizedValueAt(hub.lon, hub.lat, field.maxRaw, hubs, signalKey)
      const [x, y] = toIso(grid.column, grid.row, heightForValue(value) + 2)
      return { ...hub, x, y, value: signalValue(hub, signalKey) }
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const nodes = visibleCells.map((cell) =>
    geoAreaHitTarget({
      pathData: diamondPath(cell.topX, cell.topY, tileWidth, tileHeight),
      centroid: [cell.topX, cell.topY],
      bounds: [
        [cell.topX - tileWidth / 2, cell.topY - tileHeight / 2],
        [cell.topX + tileWidth / 2, cell.topY + tileHeight / 2],
      ],
      screenArea: tileWidth * tileHeight / 2,
      datum: {
        id: cell.id,
        name: cell.name,
        score: cell.value,
        scoreLabel: `${Math.round(cell.value)} ${signal.metric}`,
        nearestHub: `nearest anchor: ${cell.nearestHub}`,
        band: cell.band,
        bandLabel: `contour shelf ${cell.band + 1}`,
        lon: cell.lon,
        lat: cell.lat,
      },
      group: signalKey,
    }),
  )

  return {
    nodes,
    overlays: (
      <CreativeContourOverlay
        cells={visibleCells}
        contourSegments={contourSegments}
        labelPoints={labelPoints}
        hubMarkers={hubMarkers}
        signal={signal}
        tileWidth={tileWidth}
        tileHeight={tileHeight}
        heightForBand={heightForBand}
      />
    ),
  }
}

function CreativeContourOverlay({
  cells,
  contourSegments,
  labelPoints,
  hubMarkers,
  signal,
  tileWidth,
  tileHeight,
}) {
  return (
    <g className="creative-contours__overlay" aria-hidden="true" pointerEvents="none">
      <defs>
        <filter id="creative-contours-shadow" x="-25%" y="-30%" width="150%" height="165%">
          <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#152019" floodOpacity="0.22" />
        </filter>
      </defs>
      <ellipse
        cx="50%"
        cy="86%"
        rx="42%"
        ry="9%"
        fill="#274036"
        opacity="0.13"
      />
      <g filter="url(#creative-contours-shadow)">
        {cells.map((cell) => (
          <PrismCell
            key={cell.id}
            cell={cell}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
          />
        ))}
      </g>
      <g className="creative-contours__lines">
        {contourSegments.map((segment) => (
          <path
            key={segment.id}
            d={`M${segment.points[0][0]},${segment.points[0][1]}L${segment.points[1][0]},${segment.points[1][1]}`}
          />
        ))}
      </g>
      <g className="creative-contours__region-labels">
        {labelPoints.map((label) => (
          <text
            key={label.id}
            x={label.x}
            y={label.y}
            transform={`rotate(${label.rotate} ${label.x} ${label.y})`}
          >
            {label.label.toUpperCase()}
          </text>
        ))}
      </g>
      <g className="creative-contours__hub-markers">
        {hubMarkers.map((hub, index) => (
          <g key={hub.id} transform={`translate(${hub.x} ${hub.y})`}>
            <line y1="-13" y2="-2" stroke="#261f1a" strokeWidth="2" strokeLinecap="round" />
            <circle
              cy="-15"
              r={index < 4 ? 5.5 : 3.6}
              fill={signal.palette[Math.max(3, signal.palette.length - 1 - Math.floor(index / 2))]}
              stroke="#fff6dd"
              strokeWidth="1.4"
            />
            {index < 6 && (
              <text x="8" y="-17">
                {hub.name}
              </text>
            )}
          </g>
        ))}
      </g>
    </g>
  )
}

function PrismCell({ cell, tileWidth, tileHeight }) {
  const top = diamondPoints(cell.topX, cell.topY, tileWidth, tileHeight)
  const base = diamondPoints(cell.x, cell.y, tileWidth, tileHeight)
  return (
    <g className="creative-contours__cell">
      <path
        d={`M${top.left}L${top.bottom}L${base.bottom}L${base.left}Z`}
        fill={shade(cell.fill, 0.74)}
      />
      <path
        d={`M${top.right}L${top.bottom}L${base.bottom}L${base.right}Z`}
        fill={shade(cell.fill, 0.64)}
      />
      <path
        d={`M${top.top}L${top.right}L${top.bottom}L${top.left}Z`}
        fill={cell.fill}
      />
      <path
        d={`M${top.top}L${top.right}L${top.bottom}L${top.left}Z`}
        className="creative-contours__cell-grid"
      />
    </g>
  )
}

function sampleSignalField({ points, columns, rows, signalKey, thresholds }) {
  const ring = USA_OUTLINE.geometry.coordinates[0]
  const rawCenters = []
  const rawSamples = []
  let maxRaw = 0

  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      const { lon, lat } = gridToLonLat(column, row, columns, rows)
      const inside = pointInPolygon(lon, lat, ring)
      const raw = inside ? rawSignalAt(lon, lat, points, signalKey) : 0
      rawSamples.push({ column, row, lon, lat, inside, raw })
      if (inside) maxRaw = Math.max(maxRaw, raw)
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const { lon, lat } = gridToLonLat(column + 0.5, row + 0.5, columns, rows)
      if (!pointInPolygon(lon, lat, ring)) continue
      const raw = rawSignalAt(lon, lat, points, signalKey)
      rawCenters.push({ column, row, lon, lat, raw })
      maxRaw = Math.max(maxRaw, raw)
    }
  }

  const cells = rawCenters.map((cell) => {
    const value = maxRaw > 0 ? (cell.raw / maxRaw) * 100 : 0
    const nearest = nearestHub(cell.lon, cell.lat, points, signalKey)
    const band = bandForValue(value, thresholds)
    return {
      ...cell,
      id: `${cell.column}-${cell.row}`,
      name: `${nearest.name} field cell`,
      value,
      nearestHub: nearest.name,
      band,
    }
  })

  const samples = rawSamples.map((sample) => ({
    ...sample,
    value: maxRaw > 0 ? (sample.raw / maxRaw) * 100 : 0,
  }))

  return { cells, samples, maxRaw }
}

function rawSignalAt(lon, lat, points, signalKey) {
  return points.reduce((sum, hub) => {
    const weight = signalValue(hub, signalKey)
    const avgLat = ((lat + hub.lat) / 2) * Math.PI / 180
    const dx = (lon - hub.lon) * Math.cos(avgLat) * 69
    const dy = (lat - hub.lat) * 69
    const rx = (hub.radius || 420) * 1.05
    const ry = (hub.radius || 420) * 0.7
    const distance = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry)
    return sum + weight * Math.exp(-distance * 1.55)
  }, 0)
}

function signalValue(hub, signalKey) {
  if (!hub) return 0
  if (signalKey === "composite") {
    return (
      hub.screen * 0.24 +
      hub.sound * 0.2 +
      hub.games * 0.18 +
      hub.design * 0.2 +
      hub.research * 0.18
    )
  }
  return hub[signalKey] || 0
}

function nearestHub(lon, lat, points, signalKey) {
  if (!points.length) return { name: "Unanchored field" }
  let best = points[0]
  let bestScore = Infinity
  for (const hub of points) {
    const avgLat = ((lat + hub.lat) / 2) * Math.PI / 180
    const dx = (lon - hub.lon) * Math.cos(avgLat) * 69
    const dy = (lat - hub.lat) * 69
    const score = Math.hypot(dx, dy) / Math.max(1, signalValue(hub, signalKey))
    if (score < bestScore) {
      best = hub
      bestScore = score
    }
  }
  return best
}

function normalizedValueAt(lon, lat, maxRaw, points, signalKey) {
  if (!maxRaw) return 0
  return rawSignalAt(lon, lat, points, signalKey) / maxRaw * 100
}

function bandForValue(value, thresholds) {
  let band = 0
  for (const threshold of thresholds) {
    if (value >= threshold) band += 1
  }
  return band
}

function gridToLonLat(column, row, columns, rows) {
  return {
    lon: GEO_EXTENT.west + (column / columns) * (GEO_EXTENT.east - GEO_EXTENT.west),
    lat: GEO_EXTENT.north - (row / rows) * (GEO_EXTENT.north - GEO_EXTENT.south),
  }
}

function lonLatToGrid(lon, lat, columns, rows) {
  return {
    column: ((lon - GEO_EXTENT.west) / (GEO_EXTENT.east - GEO_EXTENT.west)) * columns,
    row: ((GEO_EXTENT.north - lat) / (GEO_EXTENT.north - GEO_EXTENT.south)) * rows,
  }
}

function pointInPolygon(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersects =
      ((yi > lat) !== (yj > lat)) &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-6) + xi
    if (intersects) inside = !inside
  }
  return inside
}

function contourSegmentsForThreshold(samples, columns, rows, threshold) {
  const sampleAt = (column, row) => samples[row * (columns + 1) + column]
  const segments = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = sampleAt(column, row)
      const b = sampleAt(column + 1, row)
      const c = sampleAt(column + 1, row + 1)
      const d = sampleAt(column, row + 1)
      if (![a, b, c, d].some((sample) => sample.inside)) continue
      const crossings = []
      addCrossing(crossings, a, b, threshold, [column, row], [column + 1, row])
      addCrossing(crossings, b, c, threshold, [column + 1, row], [column + 1, row + 1])
      addCrossing(crossings, c, d, threshold, [column + 1, row + 1], [column, row + 1])
      addCrossing(crossings, d, a, threshold, [column, row + 1], [column, row])
      if (crossings.length === 2) {
        segments.push([crossings[0], crossings[1]])
      } else if (crossings.length === 4) {
        segments.push([crossings[0], crossings[1]], [crossings[2], crossings[3]])
      }
    }
  }

  return segments
}

function addCrossing(crossings, a, b, threshold, pa, pb) {
  const av = a.value
  const bv = b.value
  if ((av < threshold && bv < threshold) || (av >= threshold && bv >= threshold)) return
  const t = (threshold - av) / ((bv - av) || 1e-6)
  crossings.push([
    pa[0] + (pb[0] - pa[0]) * t,
    pa[1] + (pb[1] - pa[1]) * t,
  ])
}

function diamondPath(x, y, width, height) {
  const p = diamondPoints(x, y, width, height)
  return `M${p.top}L${p.right}L${p.bottom}L${p.left}Z`
}

function diamondPoints(x, y, width, height) {
  return {
    top: `${x},${y - height / 2}`,
    right: `${x + width / 2},${y}`,
    bottom: `${x},${y + height / 2}`,
    left: `${x - width / 2},${y}`,
  }
}
