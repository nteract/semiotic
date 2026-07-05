export const CHART_COLORS = [
  "#2f6f88",
  "#d95f43",
  "#e0a92f",
  "#3b8f6a",
  "#8f5cbf",
  "#ce4257",
  "#25283d",
  "#10a5a5",
  "#7a4f2b",
  "#6f7f3f",
  "#cc6c2f",
  "#5661a9",
]

export const METRIC_KEYS = [
  { key: "speed", label: "Speed", color: "#2f6f88" },
  { key: "craft", label: "Craft", color: "#d95f43" },
  { key: "evidence", label: "Evidence", color: "#3b8f6a" },
  { key: "audience", label: "Audience", color: "#e0a92f" },
  { key: "weird", label: "Weird", color: "#8f5cbf" },
]

const tableauRows = [
  { stage: "Connect", layer: "Defaults", value: 82 },
  { stage: "Connect", layer: "Calculations", value: 34 },
  { stage: "Connect", layer: "Polish", value: 16 },
  { stage: "Explore", layer: "Defaults", value: 74 },
  { stage: "Explore", layer: "Calculations", value: 68 },
  { stage: "Explore", layer: "Polish", value: 30 },
  { stage: "Publish", layer: "Defaults", value: 61 },
  { stage: "Publish", layer: "Calculations", value: 54 },
  { stage: "Publish", layer: "Polish", value: 42 },
  { stage: "Demo", layer: "Defaults", value: 91 },
  { stage: "Demo", layer: "Calculations", value: 47 },
  { stage: "Demo", layer: "Polish", value: 65 },
]

const mediaLines = [
  { step: 0, beat: "Lead", series: "Reader", value: 40 },
  { step: 1, beat: "Chart", series: "Reader", value: 56 },
  { step: 2, beat: "Context", series: "Reader", value: 63 },
  { step: 3, beat: "Reveal", series: "Reader", value: 81 },
  { step: 4, beat: "Caveat", series: "Reader", value: 68 },
  { step: 5, beat: "Share", series: "Reader", value: 74 },
  { step: 0, beat: "Lead", series: "Evidence", value: 28 },
  { step: 1, beat: "Chart", series: "Evidence", value: 42 },
  { step: 2, beat: "Context", series: "Evidence", value: 71 },
  { step: 3, beat: "Reveal", series: "Evidence", value: 83 },
  { step: 4, beat: "Caveat", series: "Evidence", value: 88 },
  { step: 5, beat: "Share", series: "Evidence", value: 70 },
]

const scientistScatter = Array.from({ length: 44 }, (_, index) => {
  const x = 12 + ((index * 19) % 82)
  const drift = (index % 7) * 3.5 - (index % 5) * 2.2
  const y = Math.max(8, Math.min(96, 18 + x * 0.64 + drift))
  return {
    id: `model-${index + 1}`,
    x,
    y,
    cohort: index % 4 === 0 ? "p < .01" : index % 3 === 0 ? "p < .05" : "n.s.",
    n: 12 + ((index * 13) % 72),
  }
})

const proceduralPoints = Array.from({ length: 88 }, (_, index) => ({
  id: `rule-${index}`,
  x: 8 + ((index * 37) % 88),
  y: 7 + ((index * 61 + 11) % 86),
  family: ["noise", "shader", "poem", "l-system", "clock"][index % 5],
  mass: 10 + ((index * 17) % 80),
  shape: ["circle", "square", "triangle", "star", "diamond"][index % 5],
}))

const financeCandles = Array.from({ length: 22 }, (_, index) => {
  const base = 96 + Math.sin(index * 0.42) * 9 + index * 1.05
  const open = base + ((index * 5) % 7) - 3
  const close = open + (index % 4 === 0 ? -4.8 : index % 5 === 0 ? -2.1 : 3.2)
  const high = Math.max(open, close) + 3 + ((index * 3) % 5)
  const low = Math.min(open, close) - 3 - ((index * 7) % 4)
  return {
    day: index,
    open: Math.round(open * 10) / 10,
    high: Math.round(high * 10) / 10,
    low: Math.round(low * 10) / 10,
    close: Math.round(close * 10) / 10,
  }
})

const workshopRows = [
  { phase: "Intake", room: "Beginner", value: 54 },
  { phase: "Intake", room: "Manager", value: 38 },
  { phase: "Sketch", room: "Beginner", value: 72 },
  { phase: "Sketch", room: "Manager", value: 64 },
  { phase: "Critique", room: "Beginner", value: 58 },
  { phase: "Critique", room: "Manager", value: 77 },
  { phase: "Redo", room: "Beginner", value: 46 },
  { phase: "Redo", room: "Manager", value: 69 },
  { phase: "Slides", room: "Beginner", value: 84 },
  { phase: "Slides", room: "Manager", value: 91 },
]

const devopsNodes = [
  { id: "stdin", type: "pipe" },
  { id: "awk", type: "pipe" },
  { id: "sed", type: "pipe" },
  { id: "2kb lisp", type: "belief" },
  { id: "terminal sankey", type: "output" },
  { id: "GeoCities post", type: "output" },
]

const devopsEdges = [
  { source: "stdin", target: "awk", value: 48 },
  { source: "awk", target: "sed", value: 39 },
  { source: "sed", target: "2kb lisp", value: 24 },
  { source: "sed", target: "terminal sankey", value: 30 },
  { source: "2kb lisp", target: "terminal sankey", value: 16 },
  { source: "2kb lisp", target: "GeoCities post", value: 14 },
]

const dissectorTree = {
  id: "Visualization Analysis",
  children: [
    {
      id: "Why",
      children: [
        { id: "Actions" },
        { id: "Targets" },
      ],
    },
    {
      id: "What",
      children: [
        { id: "Data types" },
        { id: "Dataset types" },
      ],
    },
    {
      id: "How",
      children: [
        { id: "Encode" },
        { id: "Manipulate" },
        { id: "Facet" },
        { id: "Reduce" },
      ],
    },
  ],
}

export const PERSONAS = [
  {
    id: "excel",
    number: "01",
    name: "Excel Brute Forcers",
    shortName: "Excel",
    sourceRole: "Spreadsheet maximalists",
    chartKind: "SankeyDiagram",
    chartLabel: "Sankey",
    color: "#2f6f88",
    accent: "#f2b84b",
    stance: "If the chart menu refuses, make the cells conspire.",
    brief:
      "A flow diagram built from helper columns, named ranges, and a heroic disregard for the default chart picker.",
    semioticMove:
      "Semiotic treats the contraption as first-class flow data: nodes, edges, values, labels, and hover all stay explicit.",
    metrics: { speed: 52, craft: 64, evidence: 58, audience: 70, weird: 88 },
    chart: {
      nodes: [
        { id: "Raw CSV", type: "Input" },
        { id: "Pivot table", type: "Spreadsheet" },
        { id: "Helper columns", type: "Spreadsheet" },
        { id: "Named ranges", type: "Spreadsheet" },
        { id: "Fake bars", type: "Hack" },
        { id: "Client deck", type: "Output" },
        { id: "Award rumor", type: "Output" },
      ],
      edges: [
        { source: "Raw CSV", target: "Pivot table", value: 42 },
        { source: "Pivot table", target: "Helper columns", value: 35 },
        { source: "Pivot table", target: "Named ranges", value: 18 },
        { source: "Helper columns", target: "Fake bars", value: 26 },
        { source: "Named ranges", target: "Fake bars", value: 16 },
        { source: "Fake bars", target: "Client deck", value: 31 },
        { source: "Fake bars", target: "Award rumor", value: 8 },
      ],
    },
  },
  {
    id: "tableau",
    number: "02",
    name: "Tableau Zen Masters",
    shortName: "Tableau",
    sourceRole: "Dashboard dojo",
    chartKind: "GroupedBarChart",
    chartLabel: "Grouped bar",
    color: "#d95f43",
    accent: "#2f6f88",
    stance: "Twenty minutes, three calculated fields, and the room is chanting.",
    brief:
      "A dashboard stage act where defaults do real work and the big reveal arrives before anyone can open a code editor.",
    semioticMove:
      "GroupedBarChart separates demo velocity from the calculations and polish that make the dashboard land.",
    metrics: { speed: 94, craft: 55, evidence: 63, audience: 88, weird: 34 },
    chart: { rows: tableauRows },
  },
  {
    id: "italians",
    number: "03",
    name: "The Italians",
    shortName: "Italians",
    sourceRole: "Accurat-style studio portfolio",
    chartKind: "Custom glyph atlas",
    chartLabel: "Glyph atlas",
    color: "#e0a92f",
    accent: "#ce4257",
    stance: "Every data object gets a composed surface, a humane note, and a very confident margin.",
    brief:
      "A portfolio-style atlas of precise editorial systems: tiny glyphs, warm paper, structured density, and designed hierarchy.",
    semioticMove:
      "The chart can leave the default grammar entirely and still keep data, scale, and evidence in one portable React object.",
    metrics: { speed: 26, craft: 98, evidence: 76, audience: 66, weird: 72 },
    chart: {
      marks: [
        { x: 92, y: 84, size: 28, kind: "institution", label: "museum" },
        { x: 180, y: 122, size: 36, kind: "city", label: "city" },
        { x: 296, y: 82, size: 22, kind: "brand", label: "brand" },
        { x: 420, y: 150, size: 44, kind: "research", label: "research" },
        { x: 560, y: 104, size: 30, kind: "public", label: "public" },
        { x: 700, y: 176, size: 38, kind: "system", label: "system" },
        { x: 240, y: 260, size: 32, kind: "public", label: "policy" },
        { x: 382, y: 320, size: 46, kind: "institution", label: "archive" },
        { x: 628, y: 300, size: 26, kind: "city", label: "mobility" },
      ],
    },
  },
  {
    id: "media",
    number: "04",
    name: "Media Static",
    shortName: "Media",
    sourceRole: "News org explainers",
    chartKind: "LineChart",
    chartLabel: "Line chart",
    color: "#3b8f6a",
    accent: "#25283d",
    stance: "The reader is on a phone, the hover is dead, and the annotation has to carry.",
    brief:
      "A static-seeming story chart with every interpretive move embedded in labels, callouts, and careful sequence.",
    semioticMove:
      "LineChart keeps the sequence legible while annotations name the turns that an article would stage.",
    metrics: { speed: 66, craft: 74, evidence: 82, audience: 96, weird: 42 },
    chart: { rows: mediaLines },
  },
  {
    id: "scientists",
    number: "05",
    name: "Data Scientists",
    shortName: "Scientists",
    sourceRole: "Methods-section loyalists",
    chartKind: "Scatterplot",
    chartLabel: "Scatterplot",
    color: "#8f5cbf",
    accent: "#3b8f6a",
    stance: "The answer is right there in the model diagnostics, if you would simply read the appendix.",
    brief:
      "A dense point field, significance categories, sample sizes, gridlines, and a model fit for anyone who asks.",
    semioticMove:
      "Scatterplot supplies the quantitative grammar while regression and hover expose the statistical ritual.",
    metrics: { speed: 38, craft: 39, evidence: 98, audience: 36, weird: 49 },
    chart: { points: scientistScatter },
  },
  {
    id: "industry",
    number: "06",
    name: "Industry",
    shortName: "Industry",
    sourceRole: "NDA oracle",
    chartKind: "FunnelChart",
    chartLabel: "Funnel",
    color: "#ce4257",
    accent: "#2f6f88",
    stance: "The dataset is enormous, the impact is strategic, and the screenshot is redacted.",
    brief:
      "An enterprise pipeline narrows from huge private systems to the small public artifact people can actually inspect.",
    semioticMove:
      "FunnelChart makes the attrition visible without pretending the hidden stages are the whole story.",
    metrics: { speed: 58, craft: 62, evidence: 86, audience: 48, weird: 67 },
    chart: {
      rows: [
        { step: "Private telemetry", value: 120000 },
        { step: "Stakeholder review", value: 78000 },
        { step: "Redacted screenshots", value: 31000 },
        { step: "Conference slide", value: 8400 },
        { step: "Open-source clue", value: 2600 },
      ],
    },
  },
  {
    id: "freelancers",
    number: "07",
    name: "The Fun Freelancers",
    shortName: "Freelancers",
    sourceRole: "Data Sketches energy",
    chartKind: "Custom icon garden",
    chartLabel: "Icon garden",
    color: "#25283d",
    accent: "#e0a92f",
    stance: "A Venn diagram of art, trigonometry, code, workshops, and late-night critique.",
    brief:
      "A colorful custom sketch with icons, petals, constellations, and small multiples that openly enjoys itself.",
    semioticMove:
      "Semiotic can host bespoke marks as an authored visual system, not just a chart-type dropdown.",
    metrics: { speed: 47, craft: 93, evidence: 58, audience: 82, weird: 98 },
    chart: {
      icons: [
        { x: 130, y: 110, icon: "star", value: 36, label: "math" },
        { x: 270, y: 168, icon: "flower", value: 52, label: "code" },
        { x: 410, y: 92, icon: "spark", value: 44, label: "art" },
        { x: 540, y: 210, icon: "moon", value: 31, label: "story" },
        { x: 705, y: 126, icon: "shell", value: 47, label: "community" },
        { x: 620, y: 320, icon: "flower", value: 62, label: "process" },
        { x: 320, y: 330, icon: "star", value: 28, label: "deadline" },
      ],
    },
  },
  {
    id: "procedural",
    number: "08",
    name: "Bitter Procedurally Generated Artists",
    shortName: "Procedural",
    sourceRole: "Too many encodings",
    chartKind: "Encoding-overload scatter",
    chartLabel: "Overload scatter",
    color: "#10a5a5",
    accent: "#8f5cbf",
    stance: "Every mark encodes twelve variables because minimalism is a conspiracy against shaders.",
    brief:
      "A point field where color, position, size, shape, opacity, stroke, and category all demand attention at once.",
    semioticMove:
      "Scatterplot can carry the overload, and the surrounding interface can admit that the overload is the joke.",
    metrics: { speed: 44, craft: 76, evidence: 41, audience: 24, weird: 100 },
    chart: { points: proceduralPoints },
  },
  {
    id: "finance",
    number: "09",
    name: "Sensitive Finance Visualization Artists",
    shortName: "Finance",
    sourceRole: "Over-annotated market readers",
    chartKind: "CandlestickChart",
    chartLabel: "Candlestick",
    color: "#7a4f2b",
    accent: "#3b8f6a",
    stance: "The wick is whispering, the moving average is grieving, and the annotation must say so.",
    brief:
      "A candlestick plot with emotional support annotations, trend dread, and a legend that knows too much.",
    semioticMove:
      "CandlestickChart gives the OHLC grammar, while annotations turn the market into a tiny melodrama.",
    metrics: { speed: 50, craft: 70, evidence: 78, audience: 42, weird: 82 },
    chart: {
      candles: financeCandles,
      annotations: [
        { type: "text", day: 5, high: 118, label: "quiet panic", dx: -10, dy: -16, color: "#7a4f2b" },
        { type: "text", day: 11, high: 129, label: "resistance with feelings", dx: 8, dy: -14, color: "#ce4257" },
        { type: "text", day: 17, high: 137, label: "support group", dx: -6, dy: -16, color: "#3b8f6a" },
      ],
    },
  },
  {
    id: "devops",
    number: "10",
    name:
      "DevOps Visualization Wizards Who Created a Sankey Diagram in the Terminal Using Only 2kb of Code and I Don't Even Know Why Anyone Still Uses JavaScript When JavaScript is Really Just a Dialect of Lisp, Like I Said on GeoCities Several Times Already",
    shortName: "DevOps",
    sourceRole: "Terminal sankey maximalists",
    chartKind: "Terminal Sankey",
    chartLabel: "Terminal sankey",
    color: "#6f7f3f",
    accent: "#10a5a5",
    stance: "If your browser needs more than 2kb, have you considered becoming one with awk?",
    brief:
      "A flow diagram smuggled through pipes, monospaced ideology, and a firm belief that all UI is a shell script.",
    semioticMove:
      "SankeyDiagram still draws the flow, but the page can wrap it in any product surface or terminal mythology you want.",
    metrics: { speed: 72, craft: 43, evidence: 57, audience: 29, weird: 96 },
    chart: { nodes: devopsNodes, edges: devopsEdges },
  },
  {
    id: "workshops",
    number: "11",
    name: "Expert Workshop Nomads",
    shortName: "Workshops",
    sourceRole: "Kirk/Evergreen classroom circuit",
    chartKind: "GroupedBarChart",
    chartLabel: "Workshop bars",
    color: "#cc6c2f",
    accent: "#5661a9",
    stance: "Three hours, forty sticky notes, five redesign rules, and one airport lounge invoice.",
    brief:
      "A workshop rubric tracking how different rooms move from intake to sketching, critique, redo, and slides.",
    semioticMove:
      "GroupedBarChart turns facilitation stages into comparable evidence without losing the workshop cadence.",
    metrics: { speed: 68, craft: 82, evidence: 73, audience: 90, weird: 45 },
    chart: { rows: workshopRows },
  },
  {
    id: "dissectors",
    number: "12",
    name: "Academic Dissectors",
    shortName: "Dissectors",
    sourceRole: "Munzner-style abstraction lab",
    chartKind: "TreeDiagram",
    chartLabel: "Tree diagram",
    color: "#5661a9",
    accent: "#d95f43",
    stance: "First we separate the why from the what from the how. Then we separate those again.",
    brief:
      "A nested model of visualization analysis where tasks, data abstractions, encodings, and interaction get pinned down.",
    semioticMove:
      "TreeDiagram makes the taxonomy explicit: not a vibe, an abstraction ladder with parent-child contracts.",
    metrics: { speed: 34, craft: 66, evidence: 96, audience: 58, weird: 62 },
    chart: { tree: dissectorTree },
  },
]

export function getPersona(id) {
  return PERSONAS.find((persona) => persona.id === id) || PERSONAS[0]
}

export function metricRows(persona) {
  return METRIC_KEYS.map((metric) => ({
    metric: metric.label,
    value: persona.metrics[metric.key],
    colorKey: metric.label,
  }))
}

export function allPersonaRows() {
  return PERSONAS.flatMap((persona) =>
    METRIC_KEYS.map((metric) => ({
      persona: persona.shortName,
      metric: metric.label,
      value: persona.metrics[metric.key],
      color: persona.color,
    }))
  )
}
