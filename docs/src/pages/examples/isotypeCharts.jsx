import React from "react"
import {
  Glyph,
  hatchFill,
  hitTargetRect,
  unitize,
  unitizeRange,
} from "semiotic/recipes"

// Shared pictogram primitives and layouts for ISOTYPE-style custom charts.
export const ISOTYPE = Object.freeze({
  paper: "#f2eedf",
  paperDeep: "#e6dfca",
  ink: "#34383b",
  muted: "#9c9d94",
  red: "#d72f3f",
  blue: "#4f8999",
  bluePale: "#a9c8ce",
  yellow: "#d8ad43",
  green: "#4f9656",
  white: "#fffdf4",
})

export function unwrapIsotypeDatum(value) {
  return value?.data ?? value?.datum ?? value ?? null
}

// ── The sign set ──────────────────────────────────────────────────────────
// One GlyphDef per sign, in a 40×40 box with feet at the anchor — the same
// definition stamps `glyph` scene nodes onto canvas inside charts AND renders
// as SVG chrome through the library's <Glyph>. Parts declare role paints
// ("color"/"accent"), so one cut prints in every ink.

const SIGN = { viewBox: [40, 40], anchor: [0.5, 1] }

export const ISOTYPE_GLYPHS = Object.freeze({
  sun: {
    ...SIGN,
    parts: [
      { d: "M12 20a8 8 0 1 0 16 0a8 8 0 1 0-16 0", fill: "color" },
      {
        d: "M20 3V9M32.02 7.98L27.78 12.22M37 20H31M32.02 32.02L27.78 27.78M20 37V31M7.98 32.02L12.22 27.78M3 20H9M7.98 7.98L12.22 12.22",
        fill: "none",
        stroke: "color",
        strokeWidth: 3.4,
        strokeLinecap: "square",
      },
    ],
  },
  rain: {
    ...SIGN,
    parts: [
      { d: "M8 18c0-5 4-9 9-9 3 0 6 1 8 4 5 0 8 3 8 7H8z", fill: "color" },
      {
        d: "M11 24l-3 10M19 24l-3 10M27 24l-3 10",
        fill: "none",
        stroke: "color",
        strokeWidth: 3,
        strokeLinecap: "square",
      },
    ],
  },
  wind: {
    ...SIGN,
    parts: [
      {
        d: "M4 12h22c7 0 7-8 1-8M4 21h29c7 0 7 9 0 9M4 30h14",
        fill: "none",
        stroke: "color",
        strokeWidth: 3.2,
      },
    ],
  },
  dam: {
    ...SIGN,
    parts: [
      { d: "M8 5h24l-3 31H11z", fill: "color" },
      { d: "M13 19a7 7 0 1 0 14 0a7 7 0 1 0-14 0", fill: "accent" },
      { d: "M17 19a3 3 0 1 0 6 0a3 3 0 1 0-6 0", fill: "color" },
      {
        d: "M18.5 9h3v6h-3zM27.91 12.7L29.41 15.3 24.21 18.3 22.71 15.7ZM29.41 22.7L27.91 25.3 22.71 22.3 24.21 19.7Z",
        fill: "color",
      },
    ],
  },
  lake: {
    ...SIGN,
    parts: [
      { d: "M4 8h32v26H4z", fill: "color" },
      {
        d: "M5 17c4-4 8 4 12 0s8 4 12 0 6 0 7 1M5 25c4-4 8 4 12 0s8 4 12 0 6 0 7 1",
        fill: "none",
        stroke: "accent",
        strokeWidth: 2.4,
      },
    ],
  },
  boat: {
    ...SIGN,
    parts: [
      { d: "M5 23h30l-6 10H12z", fill: "color" },
      { d: "M18 7h3v17h-3z", fill: "color" },
      { d: "M22 8l10 11H22z", fill: "color" },
      {
        d: "M6 37c4-3 8 3 12 0s8 3 12 0 6 0 7 1",
        fill: "none",
        stroke: "color",
        strokeWidth: 2.5,
      },
    ],
  },
  city: {
    ...SIGN,
    parts: [
      { d: "M4 35V18h8V8h7v12h6V13h9v22z", fill: "color" },
      { d: "M14 2h3v10h-3z", fill: "color" },
      { d: "M27 20h3v4h-3zM8 23h3v4H8z", fill: "accent" },
    ],
  },
  hill: {
    ...SIGN,
    parts: [
      { d: "M2 34L14 12l7 11 6-9 11 20z", fill: "color" },
      { d: "M11 18l3-6 4 7", fill: "accent", opacity: 0.8 },
    ],
  },
  thermometer: {
    ...SIGN,
    parts: [
      {
        d: "M15 8a5 5 0 0 1 10 0v18a5 5 0 0 1-10 0z",
        fill: "none",
        stroke: "color",
        strokeWidth: 3,
      },
      { d: "M13 32a7 7 0 1 0 14 0a7 7 0 1 0-14 0", fill: "color" },
      { d: "M18 13h4v21h-4z", fill: "color" },
    ],
  },
  server: {
    ...SIGN,
    parts: [
      { d: "M8 3h24v34H8z", fill: "color" },
      { d: "M12 9h16v5H12zM12 18h16v5H12zM12 27h16v5H12z", fill: "accent" },
      {
        d: "M23.8 11.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M23.8 20.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0M23.8 29.5a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0",
        fill: "color",
      },
    ],
  },
  chip: {
    ...SIGN,
    parts: [
      {
        d: "M10 8h20a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z",
        fill: "color",
      },
      { d: "M15 15h10v10H15z", fill: "accent" },
      {
        d: "M7 2v6M14 2v6M21 2v6M28 2v6M7 32v6M14 32v6M21 32v6M28 32v6M2 7h6M2 14h6M2 21h6M2 28h6M32 7h6M32 14h6M32 21h6M32 28h6",
        fill: "none",
        stroke: "color",
        strokeWidth: 3.2,
      },
    ],
  },
  worker: {
    ...SIGN,
    parts: [
      { d: "M14 8a6 6 0 1 0 12 0a6 6 0 1 0-12 0", fill: "color" },
      { d: "M8 37V22c0-6 5-10 12-10s12 4 12 10v15H8z", fill: "color" },
      { d: "M12 22h16", fill: "none", stroke: "accent", strokeWidth: 3 },
    ],
  },
  plant: {
    ...SIGN,
    parts: [
      { d: "M7 4h6v16H7zM4 37V22l10-7v7l10-7v7l10-7v22z", fill: "color" },
      { d: "M9 28h5v5H9zM19 28h5v5h-5z", fill: "accent" },
    ],
  },
  bolt: {
    ...SIGN,
    parts: [{ d: "M23 1L7 23h10l-3 16 19-25H22z", fill: "color" }],
  },
  flame: {
    ...SIGN,
    parts: [
      {
        d: "M21 2c2 8-5 10-2 17 2-4 6-5 7-10 7 7 9 14 6 21-3 7-10 9-15 8C8 37 4 31 7 23c2-6 8-10 14-21z",
        fill: "color",
      },
    ],
  },
  pipe: {
    ...SIGN,
    parts: [
      { d: "M5 8h18v8H13v11h14v-5l10 9-10 8v-5H5z", fill: "color" },
      { d: "M7 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0", fill: "accent" },
    ],
  },
  water: {
    ...SIGN,
    parts: [
      { d: "M20 3C14 12 8 19 8 27a12 12 0 0024 0c0-8-6-15-12-24z", fill: "color" },
      { d: "M14 28c4 3 8 3 12 0", fill: "none", stroke: "accent", strokeWidth: 2.2 },
    ],
  },
})

export function isotypeGlyphDef(kind) {
  return ISOTYPE_GLYPHS[kind] || ISOTYPE_GLYPHS.water
}

// The chrome face of the sign set — a thin wrapper over the library's
// <Glyph>. Same call signature the pages have always used (x/y are the
// definition's top-left corner).
export function IsotypeGlyph({
  kind = "water",
  x = 0,
  y = 0,
  size = 36,
  color = ISOTYPE.ink,
  accent = ISOTYPE.white,
  opacity = 1,
}) {
  return (
    <Glyph
      def={isotypeGlyphDef(kind)}
      x={x}
      y={y}
      size={size}
      color={color}
      accent={accent}
      opacity={opacity === 1 ? undefined : opacity}
    />
  )
}

// A row of repeated unit signs, allocated by the library's unitizeRange:
// solid icons up to `value`, hatched icons from `value` to `rangeValue`
// (the ISOTYPE idiom for a projection — countable, but visibly not yet
// real), ghost icons to `maxIcons` so the scale stays tangible.
export function IsotypeUnitRow({
  value,
  rangeValue,
  unit,
  maxIcons,
  kind = "dam",
  color = ISOTYPE.blue,
  rangeColor,
  emptyColor = ISOTYPE.paperDeep,
  iconSize = 38,
  gap = 5,
  label,
  idPrefix = "isotype-row",
}) {
  const { units, rangeUnits } = unitizeRange(value, rangeValue ?? 0, {
    unit,
    maxUnits: maxIcons,
  })
  const hatch = hatchFill({
    id: `${idPrefix}-hatch`,
    color: rangeColor || color,
    angle: 48,
    spacing: Math.max(3, iconSize / 6),
    strokeWidth: Math.max(1.4, iconSize / 12),
    opacity: 0.9,
  })
  const width = maxIcons * (iconSize + gap) - gap
  const height = iconSize
  const def = isotypeGlyphDef(kind)
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMinYMid meet"
    >
      <defs>{rangeUnits.length > 0 && hatch.def}</defs>
      {Array.from({ length: maxIcons }, (_, index) => (
        <Glyph
          key={`ghost-${index}`}
          def={def}
          x={index * (iconSize + gap)}
          size={iconSize}
          color={emptyColor}
          accent={ISOTYPE.white}
        />
      ))}
      {units.map((sign) => (
        <Glyph
          key={`solid-${sign.index}`}
          def={def}
          x={sign.index * (iconSize + gap)}
          size={iconSize}
          color={color}
          accent={ISOTYPE.white}
          fraction={sign.fraction}
        />
      ))}
      {rangeUnits.map((sign) => (
        <Glyph
          key={`range-${sign.index}`}
          def={def}
          x={sign.index * (iconSize + gap)}
          size={iconSize}
          color={hatch.fill}
          accent={ISOTYPE.white}
          fraction={sign.fraction}
          fractionStart={sign.startFraction}
        />
      ))}
    </svg>
  )
}

export function lakeLevelIsotypeLayout(ctx) {
  const rows = ctx.data.map(unwrapIsotypeDatum).filter(Boolean).slice(-24)
  const { width, height } = ctx.dimensions.plot
  const left = 22
  const right = 24
  const top = 32
  const bottom = 42
  const innerWidth = Math.max(1, width - left - right)
  const innerHeight = Math.max(1, height - top - bottom)
  const domain = ctx.config.levelDomain || [671.7, 672.45]
  const x = (index) => left + (index / Math.max(1, rows.length - 1)) * innerWidth
  const y = (value) =>
    top + ((domain[1] - Number(value)) / Math.max(0.001, domain[1] - domain[0])) * innerHeight
  const points = rows.map((row, index) => ({ row, x: x(index), y: y(row.level) }))
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ")
  const latest = points.at(-1)

  return {
    // The pushed readings stay point nodes: they carry the frame's pulse,
    // decay, and windowed-transition machinery, which draws through the
    // point pipeline. The water signs above them are chrome.
    nodes: points.map(({ row, x: px, y: py }) => ({
      type: "point",
      x: px,
      y: py,
      r: 8,
      style: {
        fill: row.id === latest?.row.id ? ISOTYPE.red : ISOTYPE.blue,
        stroke: ISOTYPE.paper,
        strokeWidth: 2,
      },
      datum: row,
      id: row.id,
      group: "lake level",
    })),
    overlays: (
      <g>
        {[domain[0], (domain[0] + domain[1]) / 2, domain[1]].map((tick) => {
          const py = y(tick)
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={py}
                y2={py}
                stroke={ISOTYPE.muted}
                strokeWidth="1"
                strokeDasharray="3 5"
              />
              <text x={left} y={py - 6} fill={ISOTYPE.ink} fontSize="11" fontWeight="800">
                {tick.toFixed(1)} FT
              </text>
            </g>
          )
        })}
        <path d={linePath} fill="none" stroke={ISOTYPE.red} strokeWidth="5" strokeLinejoin="round" />
        {points.map(({ row, x: px, y: py }, index) => (
          <IsotypeGlyph
            key={row.id}
            kind="water"
            x={px - (index === points.length - 1 ? 8 : 5)}
            y={py - (index === points.length - 1 ? 8 : 5)}
            size={index === points.length - 1 ? 16 : 10}
            color={index === points.length - 1 ? ISOTYPE.red : ISOTYPE.blue}
          />
        ))}
        <text x={left} y={height - 12} fill={ISOTYPE.ink} fontSize="11" fontWeight="800">
          OLDER READINGS
        </text>
        <text
          x={width - right}
          y={height - 12}
          fill={ISOTYPE.ink}
          fontSize="11"
          fontWeight="800"
          textAnchor="end"
        >
          SENSOR NOW
        </text>
        {latest && (
          <g transform={`translate(${Math.max(left, latest.x - 92)} ${Math.max(12, latest.y - 54)})`}>
            <rect width="92" height="32" fill={ISOTYPE.ink} />
            <text x="46" y="21" fill={ISOTYPE.white} fontSize="13" fontWeight="900" textAnchor="middle">
              {latest.row.level.toFixed(2)} FT
            </text>
          </g>
        )}
      </g>
    ),
  }
}

export function forecastIsotypeLayout(ctx) {
  const rows = ctx.data.map(unwrapIsotypeDatum).filter(Boolean)
  const { width, height } = ctx.dimensions.plot
  const columnWidth = width / Math.max(1, rows.length)
  const tight = columnWidth < 62
  const rainUnit = Math.min(10, Math.max(5, (columnWidth - 10) / 5))
  const rainStripWidth = rainUnit * 5 - 2

  return {
    // hitTargetRect: the day column is fully interactive/keyboard-navigable;
    // the pictograms below are chrome decorating that one target.
    nodes: rows.map((row, index) =>
      hitTargetRect({
        x: index * columnWidth + 3,
        y: 4,
        width: Math.max(10, columnWidth - 6),
        height: height - 8,
        datum: row,
        id: row.id,
        group: "forecast",
      }),
    ),
    overlays: (
      <g>
        {rows.map((row, index) => {
          const center = index * columnWidth + columnWidth / 2
          const weatherKind = row.rainChance >= 35 ? "rain" : "sun"
          const rainUnits = Math.round(row.rainChance / 20)
          const tempScale = (value) => 198 - ((value - 70) / 32) * 78
          return (
            <g key={row.id}>
              {index > 0 && (
                <line
                  x1={index * columnWidth}
                  x2={index * columnWidth}
                  y1="8"
                  y2={height - 10}
                  stroke={ISOTYPE.muted}
                  strokeWidth="1"
                />
              )}
              <text x={center} y="25" textAnchor="middle" fill={ISOTYPE.ink} fontSize={tight ? 10 : 13} fontWeight="900">
                {row.day}
              </text>
              <IsotypeGlyph
                kind={weatherKind}
                x={center - (tight ? 15 : 20)}
                y={tight ? 45 : 40}
                size={tight ? 30 : 40}
                color={weatherKind === "rain" ? ISOTYPE.blue : ISOTYPE.yellow}
              />
              <text x={center} y="101" textAnchor="middle" fill={ISOTYPE.ink} fontSize={tight ? 16 : 21} fontWeight="900">
                {row.high}°
              </text>
              <text x={center} y="119" textAnchor="middle" fill={ISOTYPE.ink} fontSize={tight ? 8 : 11} fontWeight="800">
                {row.low}° LOW
              </text>
              <rect
                x={center - 13}
                y={tempScale(row.high)}
                width="10"
                height={198 - tempScale(row.high)}
                fill={row.high >= 98 ? ISOTYPE.red : ISOTYPE.yellow}
              />
              <rect
                x={center + 3}
                y={tempScale(row.low)}
                width="10"
                height={198 - tempScale(row.low)}
                fill={ISOTYPE.blue}
              />
              <line x1={center - 18} x2={center + 18} y1="198" y2="198" stroke={ISOTYPE.ink} strokeWidth="2" />
              <g transform={`translate(${center - rainStripWidth / 2} 218)`}>
                {Array.from({ length: 5 }, (_, rainIndex) => (
                  <rect
                    key={rainIndex}
                    x={rainIndex * rainUnit}
                    y="0"
                    width={rainUnit - 2}
                    height="19"
                    fill={rainIndex < rainUnits ? ISOTYPE.blue : ISOTYPE.paperDeep}
                  />
                ))}
              </g>
              <text x={center} y="254" textAnchor="middle" fill={ISOTYPE.ink} fontSize={tight ? 7 : 10} fontWeight="800">
                {row.rainChance}% RAIN
              </text>
            </g>
          )
        })}
        <text x="0" y={height - 7} fill={ISOTYPE.ink} fontSize="10" fontWeight="800">
          EACH BLOCK = 20% CHANCE OF RAIN
        </text>
      </g>
    ),
  }
}

export function watershedIsotypeLayout(ctx) {
  const { width, height } = ctx.dimensions.plot
  const positions = {
    rain: { x: Math.max(62, width * 0.12), y: height * 0.27 },
    tributaries: { x: width * 0.34, y: height * 0.63 },
    lake: { x: width * 0.58, y: height * 0.43 },
    dam: { x: width * 0.78, y: height * 0.63 },
    austin: { x: Math.min(width - 62, width * 0.92), y: height * 0.27 },
  }
  const rawNodes = ctx.nodes.map((node) => node.data ?? node)
  const rawEdges = ctx.edges.map((edge) => edge.data ?? edge)
  const edgePath = (source, target) => {
    const sourcePosition = positions[source]
    const targetPosition = positions[target]
    const middle = (sourcePosition.x + targetPosition.x) / 2
    return `M${sourcePosition.x},${sourcePosition.y} C${middle},${sourcePosition.y} ${middle},${targetPosition.y} ${targetPosition.x},${targetPosition.y}`
  }

  return {
    // The pictograms ARE the marks: interactive glyph scene nodes, canvas
    // painted, hit-tested and keyboard-navigable — no separate hit target.
    // Feet-anchored defs stand each sign so its center matches the layout
    // position (cy is the feet line).
    sceneNodes: rawNodes.map((node) => ({
      type: "glyph",
      cx: positions[node.id].x,
      cy: positions[node.id].y + 24,
      size: 48,
      glyph: isotypeGlyphDef(node.kind),
      color: node.color,
      accent: ISOTYPE.white,
      style: {},
      datum: node,
      id: node.id,
      label: node.label,
    })),
    sceneEdges: rawEdges.map((edge) => ({
      type: "curved",
      pathD: edgePath(edge.source, edge.target),
      style: { stroke: ISOTYPE.red, strokeWidth: 6, fill: "none", opacity: 0.92 },
      datum: edge,
    })),
    overlays: (
      <g>
        {rawEdges.map((edge) => {
          // A direction chevron at each flow's midpoint — the signs are
          // canvas marks now, so end-of-edge arrowheads would paint over
          // them; mid-edge chevrons read the same and cover nothing.
          const source = positions[edge.source]
          const target = positions[edge.target]
          const midX = (source.x + target.x) / 2
          const midY = (source.y + target.y) / 2
          const angle =
            (Math.atan2(1.5 * (target.y - source.y), 0.75 * (target.x - source.x)) * 180) /
            Math.PI
          return (
            <path
              key={`${edge.source}-${edge.target}`}
              d="M-8 -6 L5 0 L-8 6"
              transform={`translate(${midX} ${midY}) rotate(${angle})`}
              fill="none"
              stroke={ISOTYPE.paper}
              strokeWidth="4"
            />
          )
        })}
        {rawNodes.map((node) => {
          const position = positions[node.id]
          return (
            <g key={node.id}>
              <rect
                x={position.x - 58}
                y={position.y + 31}
                width="116"
                height="36"
                fill={node.id === "lake" ? ISOTYPE.blue : ISOTYPE.ink}
              />
              <text x={position.x} y={position.y + 46} textAnchor="middle" fill={ISOTYPE.white} fontSize="11" fontWeight="900">
                {node.label.toUpperCase()}
              </text>
              <text x={position.x} y={position.y + 59} textAnchor="middle" fill={ISOTYPE.white} fontSize="9" fontWeight="700">
                {node.value}
              </text>
            </g>
          )
        })}
      </g>
    ),
  }
}

export function basinIsotypeLayout(ctx) {
  const P = (lon, lat) => ctx.scales.projectedPoint(lon, lat)
  const rows = ctx.points.map(unwrapIsotypeDatum).filter(Boolean)
  const byId = new Map(rows.map((row) => [row.id, row]))
  const projected = new Map(rows.map((row) => [row.id, P(row.lon, row.lat)]))
  const routes = ctx.config.routes || []

  const routePoints = routes
    .map((id) => projected.get(id))
    .filter(Boolean)
    .map((point) => [point[0], point[1]])

  return {
    nodes: [
      // The river route paints on canvas BELOW the signs — scene line nodes,
      // not overlay strokes, so the wide wash never covers a pictogram.
      {
        type: "line",
        path: routePoints,
        style: { stroke: ISOTYPE.blue, strokeWidth: 17, opacity: 0.45 },
        datum: null,
      },
      {
        type: "line",
        path: routePoints,
        style: { stroke: ISOTYPE.ink, strokeWidth: 2, strokeDasharray: "5 6" },
        datum: null,
      },
      // Projected pictograms standing on the map — interactive geo glyph
      // nodes (canvas-painted, focus-ringed) centered on each place.
      ...rows.map((row) => {
        const point = projected.get(row.id)
        return {
          type: "glyph",
          x: point[0],
          y: point[1] + 18,
          size: 36,
          glyph: isotypeGlyphDef(row.kind),
          color: row.color,
          accent: ISOTYPE.white,
          style: {},
          datum: row,
          pointId: row.id,
        }
      }),
    ],
    overlays: (
      <g>
        {routes.slice(0, -1).map((id, index) => {
          const source = projected.get(id)
          const target = projected.get(routes[index + 1])
          if (!source || !target) return null
          const x = (source[0] + target[0]) / 2
          const y = (source[1] + target[1]) / 2
          return (
            <path
              key={id}
              d={`M${x - 8},${y - 6} L${x + 4},${y} L${x - 8},${y + 6}`}
              fill="none"
              stroke={ISOTYPE.red}
              strokeWidth="4"
            />
          )
        })}
        {rows.map((row) => {
          const point = projected.get(row.id)
          return (
            <text
              key={row.id}
              x={point[0]}
              y={point[1] - 28}
              textAnchor="middle"
              fill={ISOTYPE.ink}
              fontSize="11"
              fontWeight="900"
              paintOrder="stroke"
              stroke={ISOTYPE.paper}
              strokeWidth="4"
            >
              {byId.get(row.id).label.toUpperCase()}
            </text>
          )
        })}
      </g>
    ),
  }
}

