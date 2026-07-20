// Shared SSR/CSR parity fixtures.
//
// The Playwright spec uses these props for `renderChart(component, props)`;
// the browser fixture renders the same component+props through the live HOC.
// Keep this module React-light: callers pass their React instance so graphics
// fixtures can create React nodes without coupling this file to either the
// browser bundle or Playwright's Node runtime.

const {
  isotypeInk: GLYPH_INK,
  isotypePaper: GLYPH_PAPER,
  isotypeGhost: GLYPH_GHOST,
  isotypeServerGlyph: SERVER_GLYPH,
  isotypeNetworkGlyphs: NETWORK_GLYPHS,
} = require("../dist/semiotic-recipes.min.js")

const xyData = [
  { x: 0, y: 1 },
  { x: 1, y: 4 },
  { x: 2, y: 2 },
  { x: 3, y: 5 },
  { x: 4, y: 3 },
]

const groupedXyData = [
  { x: 0, y: 10, series: "A" },
  { x: 1, y: 14, series: "A" },
  { x: 2, y: 12, series: "A" },
  { x: 3, y: 18, series: "A" },
  { x: 0, y: 6, series: "B" },
  { x: 1, y: 8, series: "B" },
  { x: 2, y: 13, series: "B" },
  { x: 3, y: 11, series: "B" },
]

const temporalHistogramData = [
  { time: 0, value: 5, kind: "Errors" },
  { time: 350, value: 7, kind: "Warnings" },
  { time: 1200, value: 4, kind: "Errors" },
  { time: 1850, value: 6, kind: "Warnings" },
  { time: 2600, value: 8, kind: "Errors" },
]

const bubbleData = [
  { x: 1, y: 4, size: 12, category: "Alpha" },
  { x: 2, y: 7, size: 22, category: "Beta" },
  { x: 3, y: 5, size: 16, category: "Alpha" },
  { x: 4, y: 9, size: 28, category: "Gamma" },
]

const candlestickData = [
  { day: 1, open: 12, high: 18, low: 10, close: 16 },
  { day: 2, open: 16, high: 20, low: 14, close: 15 },
  { day: 3, open: 15, high: 24, low: 13, close: 22 },
  { day: 4, open: 22, high: 26, low: 19, close: 21 },
]

const connectedScatterData = [
  { x: 10, y: 20, order: 1 },
  { x: 20, y: 42, order: 2 },
  { x: 32, y: 34, order: 3 },
  { x: 42, y: 62, order: 4 },
  { x: 54, y: 48, order: 5 },
]

const differenceData = [
  { x: 0, actual: 12, target: 10 },
  { x: 1, actual: 14, target: 16 },
  { x: 2, actual: 19, target: 15 },
  { x: 3, actual: 17, target: 18 },
  { x: 4, actual: 23, target: 20 },
]

const heatmapData = [
  { xBin: "A", yBin: "Q1", value: 12 },
  { xBin: "B", yBin: "Q1", value: 19 },
  { xBin: "C", yBin: "Q1", value: 6 },
  { xBin: "A", yBin: "Q2", value: 22 },
  { xBin: "B", yBin: "Q2", value: 9 },
  { xBin: "C", yBin: "Q2", value: 31 },
  { xBin: "A", yBin: "Q3", value: 8 },
  { xBin: "B", yBin: "Q3", value: 27 },
  { xBin: "C", yBin: "Q3", value: 14 },
]

const quadrantData = [
  { x: 20, y: 80, segment: "risk" },
  { x: 70, y: 85, segment: "growth" },
  { x: 75, y: 30, segment: "watch" },
  { x: 30, y: 25, segment: "low" },
  { x: 55, y: 50, segment: "center" },
]

const categoryData = [
  { region: "AMER", value: 42 },
  { region: "EMEA", value: 33 },
  { region: "APAC", value: 51 },
]

const groupedCategoryData = [
  { region: "AMER", segment: "Enterprise", value: 26 },
  { region: "AMER", segment: "SMB", value: 16 },
  { region: "EMEA", segment: "Enterprise", value: 18 },
  { region: "EMEA", segment: "SMB", value: 15 },
  { region: "APAC", segment: "Enterprise", value: 28 },
  { region: "APAC", segment: "SMB", value: 23 },
]

const funnelData = [
  { step: "Visited", value: 100 },
  { step: "Activated", value: 52 },
  { step: "Paid", value: 24 },
]

const likertLevels = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
const likertData = [
  { question: "Clarity", level: "Strongly Disagree", value: 4 },
  { question: "Clarity", level: "Disagree", value: 8 },
  { question: "Clarity", level: "Neutral", value: 12 },
  { question: "Clarity", level: "Agree", value: 28 },
  { question: "Clarity", level: "Strongly Agree", value: 18 },
  { question: "Trust", level: "Strongly Disagree", value: 6 },
  { question: "Trust", level: "Disagree", value: 10 },
  { question: "Trust", level: "Neutral", value: 16 },
  { question: "Trust", level: "Agree", value: 22 },
  { question: "Trust", level: "Strongly Agree", value: 14 },
]

const swimlaneData = [
  { lane: "Design", phase: "Plan", value: 18 },
  { lane: "Design", phase: "Build", value: 28 },
  { lane: "Engineering", phase: "Plan", value: 14 },
  { lane: "Engineering", phase: "Build", value: 34 },
  { lane: "Research", phase: "Plan", value: 22 },
  { lane: "Research", phase: "Build", value: 19 },
]

const statisticalData = [
  { category: "Alpha", value: 20 },
  { category: "Alpha", value: 24 },
  { category: "Alpha", value: 29 },
  { category: "Alpha", value: 32 },
  { category: "Alpha", value: 38 },
  { category: "Beta", value: 14 },
  { category: "Beta", value: 18 },
  { category: "Beta", value: 22 },
  { category: "Beta", value: 28 },
  { category: "Beta", value: 35 },
  { category: "Gamma", value: 30 },
  { category: "Gamma", value: 33 },
  { category: "Gamma", value: 37 },
  { category: "Gamma", value: 42 },
  { category: "Gamma", value: 47 },
]

const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 },
  { source: "b", target: "c", value: 3 },
]

const chordEdges = [
  { source: "Product", target: "Support", value: 8 },
  { source: "Support", target: "Success", value: 5 },
  { source: "Success", target: "Product", value: 3 },
  { source: "Product", target: "Sales", value: 6 },
]

const hierarchy = {
  name: "root",
  children: [
    { name: "alpha", value: 10 },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}

// ProcessSankey fixture: a tiny 4-node temporal flow. Inline timestamps
// (ms since epoch) keep the spec-side mirror byte-identical.
const psNodes = [
  { id: "Alice", category: "Person", xExtent: [1767657600000, 1767657600000] },
  { id: "Bob", category: "Person", xExtent: [1769472000000, 1769472000000] },
  { id: "Eng", category: "Team" },
  { id: "Release", category: "Milestone", xExtent: [1776384000000, 1779494400000] },
]
const psEdges = [
  { id: "alice-eng", source: "Alice", target: "Eng", value: 8, startTime: 1769904000000, endTime: 1771632000000 },
  { id: "bob-eng", source: "Bob", target: "Eng", value: 5, startTime: 1771977600000, endTime: 1774569600000 },
  { id: "eng-rel", source: "Eng", target: "Release", value: 13, startTime: 1776384000000, endTime: 1778889600000 },
]
const psDomain = [1767225600000, 1779494400000]

const geoAreas = [
  {
    type: "Feature",
    properties: { name: "Region A", value: 100 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region B", value: 200 },
    geometry: {
      type: "Polygon",
      coordinates: [[[10, 40], [30, 40], [30, 50], [10, 50], [10, 40]]],
    },
  },
  {
    type: "Feature",
    properties: { name: "Region C", value: 150 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-10, 50], [10, 50], [10, 60], [-10, 60], [-10, 50]]],
    },
  },
]

const geoPoints = [
  { city: "Alpha", lon: 0, lat: 45, magnitude: 30 },
  { city: "Beta", lon: 20, lat: 55, magnitude: 60 },
  { city: "Gamma", lon: -5, lat: 50, magnitude: 45 },
  { city: "Delta", lon: 15, lat: 42, magnitude: 20 },
]

const geoFlows = [
  { source: "Alpha", target: "Beta", value: 50 },
  { source: "Alpha", target: "Gamma", value: 30 },
  { source: "Gamma", target: "Delta", value: 25 },
]

function graphicsProps(React) {
  const h = React.createElement
  return {
    backgroundGraphics: h(
      "g",
      null,
      h("rect", {
        x: 0,
        y: 0,
        width: 320,
        height: 150,
        fill: "#fff7ed",
        stroke: "#fb923c",
        strokeWidth: 2,
      }),
      h("text", { x: 10, y: 22, fill: "#9a3412", fontSize: 12 }, "SSR-BG")
    ),
    foregroundGraphics: h(
      "g",
      null,
      h("line", {
        x1: 0,
        y1: 0,
        x2: 320,
        y2: 150,
        stroke: "#7c3aed",
        strokeWidth: 2,
        strokeDasharray: "4 4",
      }),
      h("text", { x: 230, y: 18, fill: "#5b21b6", fontSize: 12 }, "SSR-FG")
    ),
  }
}

const calloutAnnotations = [
  { type: "callout", x: 3, y: 5, label: "Peak", dx: -36, dy: -38, color: "#7c3aed" },
  { type: "text", x: 1, y: 4, label: "Lift", dx: 8, dy: -10, color: "#0f766e" },
]

const deferredAnnotations = [
  { type: "callout", x: 2, y: 2, label: "Deferred context", dx: 24, dy: 38, color: "#0f766e", _annotationDeferred: true },
]

const statusAnnotations = [
  {
    type: "callout",
    x: 1,
    y: 4,
    label: "Contested (?)",
    dx: 34,
    dy: -34,
    color: "#dc2626",
    opacity: 0.7,
    strokeDasharray: "2 3",
    lifecycle: { status: "disputed" },
  },
]

const geoAnnotations = [
  { type: "callout", coordinates: [20, 55], label: "Beta", dx: 24, dy: -24, color: "#7c3aed" },
]

const customWaffleData = [
  { category: "Alpha", value: 42 },
  { category: "Beta", value: 31 },
  { category: "Gamma", value: 17 },
  { category: "Delta", value: 10 },
]

const customIsotypeRows = [
  { id: "amer", region: "North America", share: 34, exactness: "reported" },
  { id: "emea", region: "Europe / Middle East", share: 23, exactness: "estimated" },
  { id: "apac", region: "Asia Pacific", share: 18, exactness: "reported" },
]

const customNetworkNodes = [
  { id: "recipes", label: "Recipes", kind: "server", group: "meaning", x: 0.22, y: 0.52 },
  { id: "audit", label: "Audit", kind: "chip", group: "evidence", x: 0.52, y: 0.24 },
  { id: "reader", label: "Reader", kind: "person", group: "reception", x: 0.78, y: 0.62 },
  { id: "fallback", label: "Fallback", kind: "bolt", group: "access", x: 0.48, y: 0.78 },
]

const customNetworkEdges = [
  { source: "recipes", target: "audit", value: 3, label: "declares" },
  { source: "audit", target: "reader", value: 2, label: "proves" },
  { source: "recipes", target: "fallback", value: 1, label: "requires" },
  { source: "fallback", target: "reader", value: 2, label: "supports" },
]

const customGeoPoints = [
  { city: "Seattle", lon: -122.3321, lat: 47.6062, group: "north", powerMW: 260 },
  { city: "Denver", lon: -104.9903, lat: 39.7392, group: "central", powerMW: 145 },
  { city: "Chicago", lon: -87.6298, lat: 41.8781, group: "central", powerMW: 225 },
  { city: "Atlanta", lon: -84.388, lat: 33.749, group: "south", powerMW: 90 },
]

function transparentRectNode({ x, y, width, height, datum, id, group }) {
  return {
    type: "rect",
    x,
    y,
    w: width,
    h: height,
    datum,
    group,
    _transitionKey: String(id),
    style: { fill: "rgba(0,0,0,0)", stroke: "rgba(0,0,0,0)", opacity: 0 },
  }
}

function unitizeFixture(value, unit, maxUnits) {
  const full = Math.floor(Math.max(0, value) / unit)
  const remainder = (Math.max(0, value) / unit) - full
  const units = Array.from({ length: Math.min(full, maxUnits) }, (_, index) => ({ index, fraction: 1 }))
  if (remainder > 0 && units.length < maxUnits) {
    units.push({ index: units.length, fraction: remainder })
  }
  return units
}

function makeWaffleLayout(React) {
  const h = React.createElement
  return (ctx) => {
    const totalUnits = ctx.config.unitCount || 100
    const columns = ctx.config.columns || 10
    const gap = ctx.config.gap || 2
    const labelBand = 30
    const rows = Math.ceil(totalUnits / columns)
    const cell = Math.min(
      (ctx.dimensions.width - (columns - 1) * gap) / columns,
      (ctx.dimensions.height - labelBand - (rows - 1) * gap) / rows,
    )
    const total = ctx.data.reduce((sum, d) => sum + Number(d.value || 0), 0) || 1
    const counts = ctx.data.map((d, i) => {
      if (i === ctx.data.length - 1) {
        const used = ctx.data
          .slice(0, -1)
          .reduce((sum, prev) => sum + Math.round((Number(prev.value || 0) / total) * totalUnits), 0)
        return Math.max(0, totalUnits - used)
      }
      return Math.round((Number(d.value || 0) / total) * totalUnits)
    })
    const nodes = []
    let cursor = 0
    ctx.data.forEach((datum, categoryIndex) => {
      const color = ctx.resolveColor(datum.category, datum)
      for (let i = 0; i < counts[categoryIndex]; i++) {
        const unitIndex = cursor + i
        const col = unitIndex % columns
        const row = Math.floor(unitIndex / columns)
        nodes.push({
          type: "rect",
          x: col * (cell + gap),
          y: row * (cell + gap),
          w: cell,
          h: cell,
          datum: {
            ...datum,
            share: Number(datum.value || 0) / total,
            unit: i + 1,
          },
          pointId: `${datum.category}-${i}`,
          style: { fill: color, stroke: "#ffffff", strokeWidth: 0.5, opacity: 0.94 },
        })
      }
      cursor += counts[categoryIndex]
    })
    const overlays = h(
      "g",
      null,
      h("text", { x: 0, y: ctx.dimensions.height - 8, fill: "#334155", fontSize: 12, fontWeight: 700 }, "Custom waffle layout"),
      h("text", { x: ctx.dimensions.width, y: ctx.dimensions.height - 8, fill: "#475569", fontSize: 11, textAnchor: "end" }, `${totalUnits} units`),
    )
    return { nodes, overlays }
  }
}

function makeIsotypeColumnLayout(React) {
  const h = React.createElement
  return (ctx) => {
    const signSize = 16
    const rowGap = 4
    const labelWidth = 118
    const unitsPerRow = 10
    const maxShare = Math.max(...ctx.data.map((d) => d.share), 1)
    const nodes = ctx.data.flatMap((row, rowIndex) => {
      const rowTop = rowIndex * (ctx.dimensions.height / ctx.data.length)
      const rowHeight = ctx.dimensions.height / ctx.data.length
      const color = row.exactness === "reported" ? "#2563eb" : "#d97706"
      const units = unitizeFixture(row.share, 2, 40)
      return [
        transparentRectNode({
          x: 0,
          y: rowTop + 4,
          width: ctx.dimensions.width,
          height: rowHeight - 8,
          datum: row,
          id: row.id,
          group: "isotype-region",
        }),
        ...units.map((unit) => ({
          type: "glyph",
          x: labelWidth + (unit.index % unitsPerRow) * (signSize + 2) + signSize / 2,
          y: rowTop + 18 + Math.floor(unit.index / unitsPerRow) * (signSize + rowGap) + signSize,
          size: signSize,
          glyph: SERVER_GLYPH,
          color,
          accent: GLYPH_PAPER,
          fraction: unit.fraction < 1 ? unit.fraction : undefined,
          ghostColor: unit.fraction < 1 ? GLYPH_GHOST : undefined,
          style: {},
          // The visible signs are not the interaction target. The row-level
          // transparent rect above carries the column/row datum.
          datum: null,
        })),
      ]
    })
    return {
      nodes,
      overlays: h(
        "g",
        null,
        ...ctx.data.flatMap((row, rowIndex) => {
          const rowTop = rowIndex * (ctx.dimensions.height / ctx.data.length)
          const rowHeight = ctx.dimensions.height / ctx.data.length
          const color = row.exactness === "reported" ? "#2563eb" : "#d97706"
          const shareWidth = ((ctx.dimensions.width - labelWidth - 24) * row.share) / maxShare
          return [
            h("text", { key: `${row.id}-label`, x: 0, y: rowTop + 22, fill: GLYPH_INK, fontSize: 12, fontWeight: 800 }, row.region.toUpperCase()),
            h("rect", { key: `${row.id}-bar`, x: labelWidth, y: rowTop + rowHeight - 15, width: shareWidth, height: 4, fill: color, opacity: 0.45 }),
            h("text", { key: `${row.id}-share`, x: ctx.dimensions.width - 2, y: rowTop + 22, fill: color, fontSize: 16, fontWeight: 900, textAnchor: "end" }, `${row.exactness === "reported" ? "" : "≈"}${row.share}%`),
          ]
        }),
        h("text", { x: 0, y: ctx.dimensions.height - 3, fill: "#64748b", fontSize: 9, fontWeight: 800 }, "EACH SERVER SIGN = 2% SHARE · PARTIAL SIGNS USE GLYPH FRACTION + GHOST COLOR"),
      ),
    }
  }
}

function edgeEndpointId(endpoint) {
  if (typeof endpoint === "string") return endpoint
  if (endpoint && typeof endpoint === "object") return endpoint.id
  return null
}

function makeGlyphNetworkLayout(React) {
  const h = React.createElement
  return (ctx) => {
    const positions = new Map()
    ctx.nodes.forEach((node) => {
      const raw = node.data || node
      positions.set(node.id, {
        x: raw.x * ctx.dimensions.width,
        y: raw.y * ctx.dimensions.height,
      })
    })
    const edgePath = (source, target) => {
      const dx = target.x - source.x
      const dy = target.y - source.y
      const bend = Math.max(24, Math.min(70, Math.hypot(dx, dy) * 0.22))
      const c1 = { x: source.x + dx * 0.35, y: source.y - bend + dy * 0.1 }
      const c2 = { x: source.x + dx * 0.65, y: target.y + bend - dy * 0.1 }
      return `M${source.x},${source.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`
    }
    const sceneEdges = ctx.edges.map((edge) => {
      const source = positions.get(edgeEndpointId(edge.source))
      const target = positions.get(edgeEndpointId(edge.target))
      if (!source || !target) return null
      return {
        type: "curved",
        pathD: edgePath(source, target),
        datum: edge.data,
        style: { stroke: "#64748b", strokeWidth: Math.max(1.5, (edge.value || 1) * 1.2), fill: "none", opacity: 0.72 },
      }
    }).filter(Boolean)
    const sceneNodes = ctx.nodes.map((node) => {
      const p = positions.get(node.id)
      const raw = node.data || node
      return {
        type: "glyph",
        id: node.id,
        cx: p.x,
        cy: p.y,
        size: raw.kind === "person" ? 32 : 36,
        glyph: NETWORK_GLYPHS[raw.kind] || SERVER_GLYPH,
        color: ctx.resolveColor(raw.group || node.id),
        accent: GLYPH_PAPER,
        datum: raw,
        style: {},
      }
    })
    const labels = ctx.nodes.map((node) => {
      const p = positions.get(node.id)
      return {
        text: node.data?.label || node.id,
        x: p.x,
        y: p.y + 34,
        fontSize: 10,
        fill: "#334155",
        fontWeight: 700,
        anchor: "middle",
      }
    })
    const arrows = ctx.edges.map((edge, index) => {
      const source = positions.get(edgeEndpointId(edge.source))
      const target = positions.get(edgeEndpointId(edge.target))
      if (!source || !target) return null
      const mx = (source.x + target.x) / 2
      const my = (source.y + target.y) / 2
      const angle = Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI
      return h("path", {
        key: `arrow-${index}`,
        d: "M-7 -5 L5 0 L-7 5",
        transform: `translate(${mx} ${my}) rotate(${angle})`,
        fill: "none",
        stroke: "#0f172a",
        strokeWidth: 2,
        strokeLinejoin: "round",
      })
    }).filter(Boolean)
    return {
      sceneNodes,
      sceneEdges,
      labels,
      overlays: h(
        "g",
        null,
        h("rect", { x: 8, y: 8, width: ctx.dimensions.width - 16, height: ctx.dimensions.height - 16, fill: "none", stroke: "#cbd5e1", strokeDasharray: "5 5" }),
        ...arrows,
      ),
    }
  }
}

function makeGeoIsotypeLayout(React) {
  const h = React.createElement
  return (ctx) => {
    const nodes = ctx.points.flatMap((point) => {
      const [x, y] = ctx.scales.projectedPoint(point.lon, point.lat)
      const units = unitizeFixture(point.powerMW, 100, 4)
      return units.map((unit) => ({
        type: "glyph",
        x: x - ((units.length - 1) * 8) / 2 + unit.index * 8,
        y,
        size: 18,
        glyph: SERVER_GLYPH,
        color: ctx.resolveColor(point.group),
        accent: GLYPH_PAPER,
        fraction: unit.fraction < 1 ? unit.fraction : undefined,
        ghostColor: unit.fraction < 1 ? GLYPH_GHOST : undefined,
        datum: unit.index === 0 ? point : null,
        pointId: `${point.city}-${unit.index}`,
        style: {},
      }))
    })
    const labels = ctx.points.map((point) => {
      const [x, y] = ctx.scales.projectedPoint(point.lon, point.lat)
      return h(
        "g",
        { key: point.city },
        h("line", { x1: x, y1: y - 20, x2: x, y2: y - 6, stroke: "#94a3b8", strokeWidth: 1 }),
        h("text", { x: x + 9, y: y - 18, fill: "#334155", fontSize: 10, fontWeight: 700 }, `${point.city} ${point.powerMW}MW`),
      )
    })
    return {
      nodes,
      overlays: h(
        "g",
        null,
        h("text", { x: 0, y: 13, fill: "#334155", fontSize: 11, fontWeight: 800 }, "Projected geo glyphs · one server sign = 100MW"),
        ...labels,
      ),
    }
  }
}

// ── SSR-fix regression fixtures data ───────────────────────────────────
// Non-round maxima (47) so axisExtent "nice" vs "exact" produce a visibly
// different domain + tick set.
const axisExactBarData = [
  { region: "AMER", value: 47 },
  { region: "EMEA", value: 23 },
  { region: "APAC", value: 31 },
]
const axisExactLineData = [
  { x: 3, y: 47 },
  { x: 17, y: 23 },
  { x: 29, y: 31 },
]
// symbolBy datasets carry a categorical field distinct enough to yield
// multiple glyph shapes.
const symbolScatterData = [
  { x: 1, y: 4, kind: "Civil" },
  { x: 2, y: 7, kind: "Weather" },
  { x: 3, y: 5, kind: "Civil" },
  { x: 4, y: 9, kind: "Comms" },
  { x: 5, y: 6, kind: "Weather" },
]
// Wide-form composed series melted to long form: one "area" series + one
// "line" series on a single LineChart (the ComposedChart mixed shape).
const mixedAreaData = [
  { step: 1, value: 400, series: "Volume" }, { step: 1, value: 24, series: "Latency" },
  { step: 2, value: 300, series: "Volume" }, { step: 2, value: 13, series: "Latency" },
  { step: 3, value: 600, series: "Volume" }, { step: 3, value: 38, series: "Latency" },
  { step: 4, value: 800, series: "Volume" }, { step: 4, value: 43, series: "Latency" },
]
// AreaChart value ramp exercised with a value-anchored semanticGradient.
const semanticAreaData = [
  { time: 0, value: 10 }, { time: 1, value: 45 }, { time: 2, value: 62 },
  { time: 3, value: 80 }, { time: 4, value: 95 },
]
// LineChart band: per-series low/high envelope, curved.
const bandLineData = [
  { time: 0, value: 10, series: "A", low: 5, high: 15 },
  { time: 1, value: 25, series: "A", low: 18, high: 32 },
  { time: 2, value: 18, series: "A", low: 12, high: 24 },
  { time: 3, value: 30, series: "A", low: 22, high: 38 },
  { time: 0, value: 15, series: "B", low: 8, high: 22 },
  { time: 1, value: 12, series: "B", low: 5, high: 20 },
  { time: 2, value: 28, series: "B", low: 20, high: 35 },
  { time: 3, value: 20, series: "B", low: 12, high: 28 },
]
// Single-lane / single-segment quota exercised against a pinned value axis:
// the segment (40) is well under the extent max (100) so it must fill ~40%.
const valueExtentBarData = [{ lane: "capacity", phase: "used", value: 40 }]
// Range/dumbbell: high/low only (no open/close) → CandlestickChart range mode.
const rangeData = [
  { t: 1, high: 80, low: 40 },
  { t: 2, high: 90, low: 50 },
  { t: 3, high: 70, low: 30 },
  { t: 4, high: 100, low: 60 },
  { t: 5, high: 85, low: 45 },
]
// Range + middleAccessor: same high/low dumbbell plus a mean/median middle
// mark that a downstream RangeChart paints via custom svgAnnotationRules.
const rangeMiddleData = [
  { t: 1, high: 80, low: 40, middle: 60 },
  { t: 2, high: 90, low: 50, middle: 72 },
  { t: 3, high: 70, low: 30, middle: 48 },
  { t: 4, high: 100, low: 60, middle: 82 },
  { t: 5, high: 85, low: 45, middle: 66 },
]
// One lane with a solid "used" segment and a hatched "reserved" segment. The
// hatch is a declarative HatchFill descriptor, resolved to a CanvasPattern on
// canvas and an SVG <pattern> in SSR — so the two backends match.
const hatchBarData = [
  { lane: "capacity", phase: "used", value: 55 },
  { lane: "capacity", phase: "reserved", value: 25 },
]
// A settling series annotated with a vertical band (an era/phase region) and a
// vertical threshold line + label — the native x-band / x-threshold types.
const verticalBandData = [
  { x: 0, y: 12 }, { x: 1, y: 17 }, { x: 2, y: 15 }, { x: 3, y: 8 },
  { x: 4, y: 3 }, { x: 5, y: 4 }, { x: 6, y: 3 }, { x: 7, y: 4 },
]
// Hierarchy whose leaves carry a categorical `tier`, so `colorBy` must paint
// distinct tiles and `labelMode:"all"` must label every tier.
const tieredHierarchy = {
  name: "All",
  children: [
    {
      name: "Group A",
      children: [
        { name: "Zone 1", children: [
          { name: "item-a1", value: 142, tier: "primary" },
          { name: "item-a2", value: 12, tier: "backup" },
        ] },
        { name: "Zone 3", children: [{ name: "item-a3", value: 64, tier: "primary" }] },
      ],
    },
    { name: "Group B", children: [{ name: "Zone 2", children: [{ name: "item-b1", value: 96, tier: "primary" }] }] },
  ],
}

function makeSsrParityCases(React) {
  return [
    {
      id: "line",
      component: "LineChart",
      props: { data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 200 },
    },
    {
      id: "area",
      component: "AreaChart",
      // A single high-signal fixture covers both scene-to-SVG curve
      // serialization and area-gradient defs. Each once silently degraded to
      // straight/flat SSR marks while the canvas CSR path was correct.
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        curve: "monotoneX",
        gradientFill: true,
        width: 400,
        height: 220,
      },
    },
    {
      id: "stacked-area",
      component: "StackedAreaChart",
      props: {
        data: groupedXyData,
        xAccessor: "x",
        yAccessor: "y",
        areaBy: "series",
        colorBy: "series",
        width: 420,
        height: 240,
      },
    },
    {
      id: "scatter",
      component: "Scatterplot",
      props: { data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 220 },
    },
    {
      id: "bubble",
      component: "BubbleChart",
      props: {
        data: bubbleData,
        xAccessor: "x",
        yAccessor: "y",
        sizeBy: "size",
        colorBy: "category",
        width: 420,
        height: 240,
      },
    },
    {
      id: "candlestick",
      component: "CandlestickChart",
      props: {
        data: candlestickData,
        xAccessor: "day",
        highAccessor: "high",
        lowAccessor: "low",
        openAccessor: "open",
        closeAccessor: "close",
        width: 420,
        height: 240,
      },
    },
    {
      id: "connected-scatter",
      component: "ConnectedScatterplot",
      props: {
        data: connectedScatterData,
        xAccessor: "x",
        yAccessor: "y",
        orderAccessor: "order",
        width: 420,
        height: 240,
      },
    },
    {
      id: "bar",
      component: "BarChart",
      props: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 400, height: 200 },
    },
    {
      // Regression coverage for the SSR gradientFill gap (2026-07): SSR
      // silently dropped `gradientFill` before it reached the scene
      // builder, so the SSR baseline rendered flat bars while CSR showed
      // the gradient. Baselining both sides here means any future
      // regression on either pipeline shows up as a screenshot diff.
      id: "bar-gradient",
      component: "BarChart",
      props: {
        data: categoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        gradientFill: true,
        width: 400,
        height: 200,
      },
    },
    {
      id: "grouped-bar",
      component: "GroupedBarChart",
      props: {
        data: groupedCategoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        groupBy: "segment",
        colorBy: "segment",
        width: 420,
        height: 240,
      },
    },
    {
      id: "stacked-bar",
      component: "StackedBarChart",
      props: {
        data: groupedCategoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        stackBy: "segment",
        colorBy: "segment",
        width: 420,
        height: 240,
      },
    },
    {
      id: "pie",
      component: "PieChart",
      props: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 300, height: 300 },
    },
    {
      id: "donut",
      component: "DonutChart",
      // Explicitly exercise the inner-radius and center-content slots — both
      // are visual SSR/CSR fidelity contracts, not just valid markup.
      props: {
        data: categoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        innerRadius: 80,
        centerContent: React.createElement("strong", null, "126 total"),
        showLegend: false,
        width: 320,
        height: 320,
      },
    },
    {
      id: "funnel",
      component: "FunnelChart",
      props: { data: funnelData, stepAccessor: "step", valueAccessor: "value", width: 420, height: 240 },
    },
    {
      id: "gauge",
      component: "GaugeChart",
      props: {
        value: 72,
        min: 0,
        max: 100,
        thresholds: [
          { value: 50, color: "#ef4444" },
          { value: 80, color: "#f59e0b" },
          { value: 100, color: "#16a34a" },
        ],
        // A half gauge exposes full-circle centering errors and makes the
        // default value readout easy to review beside its CSR counterpart.
        sweep: 180,
        width: 320,
        height: 260,
      },
    },
    {
      // The gradient band is intentionally a separate parity sheet: it
      // follows a different scene/rendering path from threshold zones, and
      // must preserve its arc-length color stops in both SSR and CSR.
      id: "gauge-gradient",
      component: "GaugeChart",
      props: {
        value: 70,
        min: 0,
        max: 100,
        sweep: 180,
        fillZones: true,
        showNeedle: false,
        backgroundColor: "#d1d5db",
        cornerRadius: 14,
        gradientFill: {
          colorStops: [
            { offset: 0, color: "#ef4444" },
            { offset: 0.5, color: "#f59e0b" },
            { offset: 1, color: "#3b82f6" },
          ],
        },
        width: 320,
        height: 260,
      },
    },
    {
      id: "likert",
      component: "LikertChart",
      props: {
        data: likertData,
        categoryAccessor: "question",
        levelAccessor: "level",
        countAccessor: "value",
        levels: likertLevels,
        width: 460,
        height: 260,
      },
    },
    {
      id: "swimlane",
      component: "SwimlaneChart",
      props: {
        data: swimlaneData,
        categoryAccessor: "lane",
        subcategoryAccessor: "phase",
        valueAccessor: "value",
        colorBy: "phase",
        width: 460,
        height: 260,
      },
    },
    {
      id: "sankey",
      component: "SankeyDiagram",
      props: {
        nodes: networkNodes,
        edges: networkEdges,
        valueAccessor: "value",
        nodeIdAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        width: 500,
        height: 300,
      },
    },
    {
      id: "chord",
      component: "ChordDiagram",
      props: {
        edges: chordEdges,
        valueAccessor: "value",
        sourceAccessor: "source",
        targetAccessor: "target",
        width: 420,
        height: 360,
      },
    },
    {
      id: "force-directed",
      component: "ForceDirectedGraph",
      // The browser simulation and synchronous server settle can rotate or
      // reflect an equivalent force layout. Evidence + the composite snapshot
      // gate its structure; coordinate-wise pixel comparison is inappropriate.
      comparison: "structural",
      props: {
        nodes: networkNodes,
        edges: networkEdges,
        nodeIdAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        width: 420,
        height: 320,
      },
    },
    {
      id: "treemap",
      component: "Treemap",
      props: { data: hierarchy, childrenAccessor: "children", valueAccessor: "value", width: 500, height: 400 },
    },
    {
      id: "tree",
      component: "TreeDiagram",
      props: { data: hierarchy, childrenAccessor: "children", width: 420, height: 320 },
    },
    {
      id: "circlepack",
      component: "CirclePack",
      props: { data: hierarchy, childrenAccessor: "children", valueAccessor: "value", width: 420, height: 360 },
    },
    {
      id: "process-sankey",
      component: "ProcessSankey",
      props: {
        nodes: psNodes,
        edges: psEdges,
        domain: psDomain,
        colorBy: "category",
        showLegend: true,
        width: 500,
        height: 320,
      },
    },
    {
      id: "difference",
      component: "DifferenceChart",
      props: {
        data: differenceData,
        xAccessor: "x",
        seriesAAccessor: "actual",
        seriesBAccessor: "target",
        width: 420,
        height: 240,
        showLines: true,
      },
    },
    {
      id: "heatmap",
      component: "Heatmap",
      props: {
        data: heatmapData,
        xAccessor: "xBin",
        yAccessor: "yBin",
        valueAccessor: "value",
        showValues: true,
        width: 420,
        height: 240,
      },
    },
    {
      id: "temporal-histogram",
      component: "TemporalHistogram",
      props: {
        data: temporalHistogramData,
        binSize: 1000,
        timeAccessor: "time",
        valueAccessor: "value",
        categoryAccessor: "kind",
        colors: { Errors: "#d62728", Warnings: "#f59e0b" },
        width: 420,
        height: 240,
      },
      visibleLegendLabel: "Errors",
    },
    {
      id: "xy-custom-waffle",
      component: "XYCustomChart",
      props: {
        data: customWaffleData,
        layout: makeWaffleLayout(React),
        layoutConfig: { columns: 10, unitCount: 100, gap: 2 },
        colorBy: "category",
        width: 420,
        height: 260,
        // Keep the authored plot margins while explicitly delegating the
        // legend side to the chart's standard auto-reservation contract.
        margin: { top: 20, right: "auto", bottom: 36, left: 24 },
        title: "SSR custom waffle",
      },
      visibleLegendLabel: "Alpha",
    },
    {
      id: "ordinal-custom-isotype-glyphs",
      component: "OrdinalCustomChart",
      props: {
        data: customIsotypeRows,
        layout: makeIsotypeColumnLayout(React),
        categoryAccessor: "region",
        valueAccessor: "share",
        rExtent: [0, 40],
        width: 420,
        height: 260,
        margin: { top: 24, right: 20, bottom: 28, left: 24 },
        title: "SSR ordinal glyph isotype",
      },
    },
    {
      id: "network-custom-glyph-layout",
      component: "NetworkCustomChart",
      props: {
        nodes: customNetworkNodes,
        edges: customNetworkEdges,
        layout: makeGlyphNetworkLayout(React),
        nodeIDAccessor: "id",
        sourceAccessor: "source",
        targetAccessor: "target",
        colorBy: "group",
        width: 440,
        height: 320,
        title: "SSR custom network glyphs",
      },
    },
    {
      id: "geo-custom-isotype-glyphs",
      component: "GeoCustomChart",
      package: "geo",
      props: {
        points: customGeoPoints,
        layout: makeGeoIsotypeLayout(React),
        xAccessor: "lon",
        yAccessor: "lat",
        colorBy: "group",
        projection: "equirectangular",
        width: 460,
        height: 300,
        title: "SSR custom geo isotype",
      },
    },
    {
      id: "quadrant",
      component: "QuadrantChart",
      props: {
        data: quadrantData,
        xAccessor: "x",
        yAccessor: "y",
        colorBy: "segment",
        xCenter: 50,
        yCenter: 50,
        quadrants: {
          topRight: { label: "High / High", color: "#16a34a" },
          topLeft: { label: "Low / High", color: "#f59e0b" },
          bottomRight: { label: "High / Low", color: "#2563eb" },
          bottomLeft: { label: "Low / Low", color: "#dc2626" },
        },
        width: 420,
        height: 260,
      },
    },
    {
      id: "boxplot",
      component: "BoxPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", width: 420, height: 260 },
    },
    {
      id: "violin",
      component: "ViolinPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "swarm",
      component: "SwarmPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", colorBy: "category", width: 420, height: 260 },
    },
    {
      id: "dotplot",
      component: "DotPlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", colorBy: "category", width: 420, height: 260 },
    },
    {
      id: "histogram",
      component: "Histogram",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "ridgeline",
      component: "RidgelinePlot",
      props: { data: statisticalData, categoryAccessor: "category", valueAccessor: "value", bins: 8, width: 420, height: 260 },
    },
    {
      id: "choropleth",
      component: "ChoroplethMap",
      package: "geo",
      props: { areas: geoAreas, valueAccessor: (d) => d.properties.value, colorScheme: "blues", width: 460, height: 300 },
    },
    {
      id: "proportional-symbol",
      component: "ProportionalSymbolMap",
      package: "geo",
      props: {
        points: geoPoints,
        xAccessor: "lon",
        yAccessor: "lat",
        sizeBy: "magnitude",
        areas: geoAreas,
        width: 460,
        height: 300,
      },
    },
    {
      id: "flowmap",
      component: "FlowMap",
      package: "geo",
      props: {
        nodes: geoPoints,
        flows: geoFlows,
        nodeIdAccessor: "city",
        xAccessor: "lon",
        yAccessor: "lat",
        areas: geoAreas,
        width: 460,
        height: 300,
      },
    },
    {
      id: "line-graphics",
      component: "LineChart",
      props: {
        data: groupedXyData,
        xAccessor: "x",
        yAccessor: "y",
        lineBy: "series",
        colorBy: "series",
        width: 420,
        height: 240,
        frameProps: graphicsProps(React),
      },
    },
    {
      id: "line-dark-theme",
      component: "LineChart",
      theme: "dark",
      props: {
        data: groupedXyData,
        xAccessor: "x",
        yAccessor: "y",
        lineBy: "series",
        colorBy: "series",
        showLegend: true,
        showGrid: true,
        width: 420,
        height: 260,
      },
    },
    {
      id: "annotation-callout",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: calloutAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "annotation-progressive",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: deferredAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "annotation-status",
      component: "LineChart",
      props: {
        data: xyData,
        xAccessor: "x",
        yAccessor: "y",
        annotations: statusAnnotations,
        width: 420,
        height: 240,
      },
    },
    {
      id: "geo-annotation",
      component: "ProportionalSymbolMap",
      package: "geo",
      props: {
        points: geoPoints,
        xAccessor: "lon",
        yAccessor: "lat",
        sizeBy: "magnitude",
        areas: geoAreas,
        annotations: geoAnnotations,
        width: 460,
        height: 300,
      },
    },
    {
      // Custom geo pin overlay via svgAnnotationRules. Geo used to hardcode
      // `undefined` for the user rule in GeoSVGOverlay and never threaded the
      // prop through StreamGeoFrame / renderChart staticGeo — so custom pins
      // only existed on hand-rolled SVG splices. Coordinates are projected
      // before the rule runs (same on CSR and SSR).
      id: "geo-custom-annotation",
      component: "ProportionalSymbolMap",
      package: "geo",
      props: {
        points: geoPoints,
        xAccessor: "lon",
        yAccessor: "lat",
        sizeBy: "magnitude",
        areas: geoAreas,
        annotations: [
          { type: "geo-pin", coordinates: [20, 55], color: "#DB2777", label: "Hotspot" },
          { type: "geo-pin", coordinates: [0, 45], color: "#0E9AA7", label: "Hub" },
          // Built-in callout still falls through when the custom rule returns null.
          { type: "callout", coordinates: [15, 42], label: "Delta", dx: 18, dy: -18, color: "#7c3aed" },
        ],
        frameProps: {
          svgAnnotationRules: (ann, _i, context) => {
            if (ann.type !== "geo-pin") return null
            const sx = context.scales && context.scales.x
            const sy = context.scales && context.scales.y
            if (!sx || !sy || ann.x == null || ann.y == null) return null
            const cx = sx(ann.x)
            const cy = sy(ann.y)
            return React.createElement(
              "g",
              { className: "geo-custom-pin", key: `pin-${ann.label || cx}` },
              React.createElement("circle", {
                cx,
                cy,
                r: 9,
                fill: ann.color || "#DB2777",
                stroke: "#fff",
                strokeWidth: 2,
              }),
              React.createElement("circle", {
                cx,
                cy,
                r: 3,
                fill: "#fff",
              }),
            )
          },
        },
        width: 460,
        height: 300,
      },
    },

    // ── SSR-fix regression fixtures ────────────────────────────────────
    // Each locks in a prop that used to be silently dropped on the SSR
    // (renderChart) path. Structural SSR assertions live in
    // assertSsrFixEvidence() in the spec; the screenshots guard CSR/SSR
    // parity. See project memory: SSR gradientFill/axisExtent/HOC-prop gaps.
    {
      // Ordinal axisExtent:"exact" — value-axis domain + ticks pin to data max.
      id: "bar-axis-exact",
      component: "BarChart",
      props: {
        data: axisExactBarData,
        categoryAccessor: "region",
        valueAccessor: "value",
        axisExtent: "exact",
        showGrid: true,
        width: 400,
        height: 220,
      },
    },
    {
      // XY axisExtent:"exact" — y-domain + ticks pin to data min/max.
      id: "line-axis-exact",
      component: "LineChart",
      props: {
        data: axisExactLineData,
        xAccessor: "x",
        yAccessor: "y",
        axisExtent: "exact",
        showGrid: true,
        width: 400,
        height: 220,
      },
    },
    {
      // Ordinal symbolBy → glyph shapes (mirrors SwarmPlot.tsx HOC rename).
      id: "swarm-symbol",
      component: "SwarmPlot",
      props: {
        data: statisticalData,
        categoryAccessor: "category",
        valueAccessor: "value",
        colorBy: "category",
        symbolBy: "category",
        width: 420,
        height: 260,
      },
    },
    {
      // XY symbolBy → glyph shapes; symbolMap pins explicit shapes.
      id: "scatter-symbol",
      component: "Scatterplot",
      props: {
        data: symbolScatterData,
        xAccessor: "x",
        yAccessor: "y",
        colorBy: "kind",
        symbolBy: "kind",
        symbolMap: { Civil: "star", Weather: "triangle", Comms: "cross" },
        pointRadius: 8,
        width: 420,
        height: 240,
      },
    },
    {
      // FunnelChart connectorOpacity styles the horizontal step connectors.
      id: "funnel-connector-opacity",
      component: "FunnelChart",
      props: {
        data: funnelData,
        stepAccessor: "step",
        valueAccessor: "value",
        connectorOpacity: 0.66,
        width: 420,
        height: 240,
      },
    },
    {
      // SwimlaneChart trackFill paints the lane background.
      id: "swimlane-track",
      component: "SwimlaneChart",
      props: {
        data: swimlaneData,
        categoryAccessor: "lane",
        subcategoryAccessor: "phase",
        valueAccessor: "value",
        colorBy: "phase",
        trackFill: "#c9d6ea",
        width: 460,
        height: 260,
      },
    },
    {
      // LineChart mixed line+area: `fillArea:[names]` fills one series while the
      // other stays a line, `gradientFill` (via frameProps) gradients the area.
      // SSR dropped fillArea/areaOpacity and drew every series as a bare line.
      id: "line-mixed-area",
      component: "LineChart",
      props: {
        data: mixedAreaData,
        xAccessor: "step",
        yAccessor: "value",
        lineBy: "series",
        colorBy: "series",
        fillArea: ["Volume"],
        areaOpacity: 0.3,
        curve: "monotoneX",
        colorScheme: ["#E04F5F", "#3E8CF9"],
        frameProps: { gradientFill: true },
        width: 440,
        height: 240,
      },
    },
    {
      // AreaChart value-anchored semanticGradient. SSR dropped it and painted a
      // flat area; the step curve + y-threshold annotations already worked.
      id: "area-semantic-gradient",
      component: "AreaChart",
      props: {
        data: semanticAreaData,
        xAccessor: "time",
        yAccessor: "value",
        curve: "step",
        semanticGradient: [
          { at: 50, color: "#E5A800" },
          { at: 75, color: "#FF8000" },
          { at: 95, color: "#FF7077" },
        ],
        yExtent: [0, 100],
        annotations: [
          { type: "y-threshold", value: 50, label: "Warning", color: "#E5A800" },
          { type: "y-threshold", value: 90, label: "Critical", color: "#FF7077" },
        ],
        width: 440,
        height: 260,
      },
    },
    {
      // LineChart band envelope: SSR dropped `band` entirely, and the ribbon
      // ignored the line's curve (drew straight edges under a curved line).
      id: "line-band",
      component: "LineChart",
      props: {
        data: bandLineData,
        xAccessor: "time",
        yAccessor: "value",
        lineBy: "series",
        colorBy: "series",
        curve: "monotoneX",
        lineWidth: 3,
        band: { y0Accessor: "low", y1Accessor: "high" },
        width: 440,
        height: 260,
      },
    },
    {
      // PieChart startAngle rotation (+ cornerRadius). SSR ignored startAngle
      // and always began at 12 o'clock.
      id: "pie-start-angle",
      component: "PieChart",
      props: {
        data: categoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        colorScheme: ["#6C4EE8", "#0E9AA7", "#C2185B"],
        startAngle: 45,
        cornerRadius: 4,
        width: 320,
        height: 320,
      },
    },
    {
      // DonutChart startAngle rotation (+ cornerRadius + innerRadius).
      id: "donut-start-angle",
      component: "DonutChart",
      props: {
        data: categoryData,
        categoryAccessor: "region",
        valueAccessor: "value",
        colorScheme: ["#6C4EE8", "#0E9AA7", "#C2185B"],
        startAngle: 90,
        cornerRadius: 6,
        innerRadius: 70,
        showLegend: false,
        width: 320,
        height: 320,
      },
    },
    {
      // SwimlaneChart valueExtent pins the value axis so a segment (40) under
      // the extent max (100) fills the right fraction, plus roundedTop caps the
      // outer ends. SSR auto-scaled to the data max (bar filled the whole lane).
      id: "swimlane-value-extent",
      component: "SwimlaneChart",
      props: {
        data: valueExtentBarData,
        categoryAccessor: "lane",
        subcategoryAccessor: "phase",
        valueAccessor: "value",
        // The single "used" segment is 40; the pinned [0,100] axis must keep it
        // at ~40% of the track. Without the fix SSR auto-scaled to 40 (full).
        valueExtent: [0, 100],
        trackFill: "#e3e3ea",
        roundedTop: 6,
        colorBy: "phase",
        width: 440,
        height: 160,
      },
    },
    {
      // Treemap colorBy paints leaf tiles by a categorical field, and
      // labelMode:"all" + paddingTop label every hierarchy tier. SSR collapsed
      // all tiles to one color and dropped parent labels.
      id: "treemap-colorby-labels",
      component: "Treemap",
      props: {
        data: tieredHierarchy,
        childrenAccessor: "children",
        valueAccessor: "value",
        colorBy: "tier",
        labelMode: "all",
        paddingTop: 18,
        showLabels: true,
        colorScheme: ["#0E9AA7", "#C2185B", "#7CB342"],
        width: 520,
        height: 340,
      },
    },
    {
      // CandlestickChart range mode (high/low, no open/close) → a dumbbell:
      // high→low line with endpoint bulbs. SSR used to draw a filled body rect.
      id: "range-dumbbell",
      component: "CandlestickChart",
      props: {
        data: rangeData,
        xAccessor: "t",
        highAccessor: "high",
        lowAccessor: "low",
        candlestickStyle: { rangeColor: "#6C4EE8" },
        width: 440,
        height: 260,
      },
    },
    {
      // Treemap with colorBy + nested header bands (paddingTop / labelMode all)
      // PLUS a hide-root nodeStyle overlay. SSR used to replace (not compose)
      // the built-in color encoding when any custom nodeStyle was present, so
      // the nested multi-color layout collapsed to monochrome "flat" tiles.
      id: "treemap-hideroot",
      component: "Treemap",
      props: {
        data: tieredHierarchy,
        childrenAccessor: "children",
        valueAccessor: "value",
        colorBy: "tier",
        labelMode: "all",
        paddingTop: 18,
        showLabels: true,
        colorScheme: ["#0E9AA7", "#C2185B", "#7CB342"],
        width: 520,
        height: 340,
        nodeStyle: (d) =>
          d.depth === 0
            ? { fill: "transparent", pointerEvents: "none" }
            : {},
      },
    },
    {
      // RangeChart middleAccessor analog: CandlestickChart range dumbbell plus
      // a custom mean/median bulb+pill painted via svgAnnotationRules. The
      // native dumbbell path was already fixed; the custom rule path used to
      // vanish entirely from renderChart SVG. Rules ride `frameProps` so the
      // live CandlestickChart HOC (CSR) and renderChart (SSR) both see them.
      id: "range-middle-overlay",
      component: "CandlestickChart",
      props: {
        data: rangeMiddleData,
        xAccessor: "t",
        highAccessor: "high",
        lowAccessor: "low",
        candlestickStyle: { rangeColor: "#6C4EE8" },
        annotations: rangeMiddleData.map((d) => ({
          type: "range-middle",
          x: d.t,
          y: d.middle,
          color: "#DB2777",
        })),
        frameProps: {
          svgAnnotationRules: (ann, _i, context) => {
            if (ann.type !== "range-middle") return null
            const sx = context.scales && context.scales.x
            const sy = context.scales && context.scales.y
            if (!sx || !sy || ann.x == null || ann.y == null) return null
            const cx = sx(ann.x)
            const cy = sy(ann.y)
            return React.createElement(
              "g",
              { className: "range-middle-overlay", key: `mid-${ann.x}` },
              React.createElement("circle", {
                cx,
                cy,
                r: 5,
                fill: ann.color || "#DB2777",
              }),
              React.createElement("rect", {
                x: cx - 12,
                y: cy - 4,
                width: 24,
                height: 8,
                rx: 4,
                fill: ann.color || "#DB2777",
                opacity: 0.9,
              }),
            )
          },
        },
        width: 440,
        height: 260,
      },
    },
    {
      // A hatched swimlane segment via a declarative HatchFill descriptor in
      // pieceStyle — a CanvasPattern on canvas, an SVG <pattern> in SSR. This
      // is the backend-agnostic way to get the hatch that a canvas-only
      // `createHatchPattern` (→ null in SSR) can't. `createHatchPattern` now
      // also returns this descriptor when no canvas exists, so either path works.
      id: "swimlane-hatch",
      component: "SwimlaneChart",
      props: {
        data: hatchBarData,
        categoryAccessor: "lane",
        subcategoryAccessor: "phase",
        valueAccessor: "value",
        valueExtent: [0, 100],
        trackFill: "#e3e3ea",
        roundedTop: 6,
        colorScheme: ["#6C4EE8", "#6C4EE8"],
        width: 440,
        height: 160,
        frameProps: {
          pieceStyle: (d) =>
            d.phase === "reserved"
              ? { fill: { type: "hatch", background: "transparent", stroke: "#6C4EE8", spacing: 6, angle: 45 } }
              : { fill: "#6C4EE8" },
        },
      },
    },
    {
      // Vertical band (an era/phase region) + vertical threshold line & label —
      // the native `x-band` / `x-threshold` annotation types. Both render on the
      // canvas (CSR) and serialize to SVG (SSR) through the shared annotation
      // renderer, so the region fill, the dashed line, and both labels match.
      // (This is the library-native equivalent of a downstream chart's custom
      // "vertical bands + annotations" — which used bespoke annotation types +
      // manual SVG splicing that dropped out in SSR.)
      id: "line-vertical-bands",
      component: "LineChart",
      props: {
        data: verticalBandData,
        xAccessor: "x",
        yAccessor: "y",
        curve: "monotoneX",
        annotations: [
          // Explicit label `color` so the band label matches on both backends
          // regardless of whether a ThemeProvider set `--semiotic-primary`.
          { type: "x-band", x0: 0, x1: 3, label: "Catch-up window", color: "#6C4EE8", fill: "#6C4EE8", fillOpacity: 0.15 },
          { type: "x-threshold", value: 3, label: "Caught up", color: "#DB2777" },
        ],
        margin: { top: 40, right: 24, bottom: 30, left: 48 },
        width: 460,
        height: 280,
      },
    },
  ]
}

module.exports = { makeSsrParityCases }
