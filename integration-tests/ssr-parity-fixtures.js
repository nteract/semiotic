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
      props: { data: xyData, xAccessor: "x", yAccessor: "y", width: 400, height: 220 },
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
      props: { data: categoryData, categoryAccessor: "region", valueAccessor: "value", width: 320, height: 320 },
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
      id: "xy-custom-waffle",
      component: "XYCustomChart",
      props: {
        data: customWaffleData,
        layout: makeWaffleLayout(React),
        layoutConfig: { columns: 10, unitCount: 100, gap: 2 },
        colorBy: "category",
        width: 420,
        height: 260,
        margin: { top: 20, right: 20, bottom: 36, left: 24 },
        title: "SSR custom waffle",
      },
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
  ]
}

module.exports = { makeSsrParityCases }
