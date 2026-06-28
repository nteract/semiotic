import React from "react"
import { Link } from "react-router-dom"

const examples = [
  {
    title: "Point Climate Anomaly",
    path: "/examples/climate-anomaly",
    eyebrow: "Difference chart + uncertainty band",
    description:
      "A polished climate readout comparing this year's daily temperature with an adjusted historical mean and the 5th-95th percentile range.",
    preview: "climate",
  },
  {
    title: "Point Climate Radial",
    path: "/examples/climate-radial-weather",
    eyebrow: "Point controls + radial weather",
    description:
      "Combines point climate controls with a radial custom ordinal chart and stacked temporal detail.",
    preview: "combined",
  },
  {
    title: "All the Wars of the United States",
    path: "/examples/us-war-timeline",
    eyebrow: "Custom ordinal timeline",
    description:
      "A layered timeline of conflicts, geopolitical spheres, historical periods, concurrency, and the comparatively rare years of peace.",
    preview: "wars",
  },
  {
    title: "A Genealogy of Cubism and Abstract Art",
    path: "/examples/art-movement-genealogy",
    eyebrow: "Automatic chronological network",
    description:
      "A constraint-laid influence graph styled after Alfred H. Barr Jr.'s iconic 1936 Cubism and Abstract Art cover.",
    preview: "art",
  },
  {
    title: "Cities, Tile by Tile",
    path: "/examples/paris-isometric-landmarks",
    eyebrow: "Custom isometric GeoFrame",
    description:
      "Five-by-five strategy-game views of Paris, Austin, San Francisco, and Tokyo, populated from DBpedia landmarks with resilient local snapshots.",
    preview: "isometric",
  },
  {
    title: "The Wheel of Urines",
    path: "/examples/urine-wheel",
    eyebrow: "Custom radial network",
    description:
      "A medieval uroscopy diagnostic redrawn as a node-link diagram in a ring — twenty named urine colors, each spoked to the stage of digestion it signifies.",
    preview: "urine",
  },
  {
    title: "The New York & Erie Railroad",
    path: "/examples/erie-railroad-organization",
    eyebrow: "Custom botanical hierarchy",
    description:
      "McCallum and Henshaw's landmark 1855 organization diagram rebuilt as computed railroad trunks, workforce boughs, and navigable roles.",
    preview: "erie",
  },
  {
    title: "Wikipedia, as it happens",
    path: "/examples/wikipedia-realtime",
    eyebrow: "Five coordinated realtime swarms",
    description:
      "A live, filterable view of English Wikipedia edits with actor classification, signed change encodings, aggregation, and revision-level drilldown.",
    preview: "wikipedia",
  },
  {
    title: "Your Local Government Explorer",
    path: "/examples/local-government-explorer",
    eyebrow: "ZIP-driven civic data + networks",
    description:
      "Resolve any postal place into its county's federal disaster record and spending, live 311 service requests, LOCUS municipal law, and a network of bodies, sponsors, meetings, and active legislation.",
    preview: "local-government",
  },
]

export default function ExamplesOverviewPage() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.eyebrow}>Semiotic in practice</div>
        <h1 style={styles.title}>Examples</h1>
        <p style={styles.lede}>
          Complete visual experiences that combine charts, annotations,
          controls, interaction, and editorial polish.
        </p>
      </div>

      <div style={styles.grid}>
        {examples.map((example) => (
          <Link key={example.path} to={example.path} style={styles.card}>
            {example.preview === "climate"
              ? <MiniClimatePreview />
              : example.preview === "isometric"
                ? <MiniIsometricPreview />
              : example.preview === "wars"
                ? <MiniWarsPreview />
                : example.preview === "art"
                  ? <MiniArtPreview />
                : example.preview === "urine"
                  ? <MiniUrinePreview />
                : example.preview === "erie"
                  ? <MiniEriePreview />
                : example.preview === "wikipedia"
                  ? <MiniWikipediaPreview />
                : example.preview === "local-government"
                  ? <MiniLocalGovernmentPreview />
                : <MiniRadialPreview combined={example.preview === "combined"} />}
            <div style={styles.cardBody}>
              <div style={styles.eyebrow}>{example.eyebrow}</div>
              <h2 style={styles.cardTitle}>{example.title}</h2>
              <p style={styles.cardDescription}>{example.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function MiniIsometricPreview() {
  const tiles = []
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 5; column++) {
      const x = 121 + (column - row) * 20
      const y = 15 + (column + row) * 10
      tiles.push(
        <path
          key={`${row}-${column}`}
          d={`M${x},${y - 10}L${x + 20},${y}L${x},${y + 10}L${x - 20},${y}Z`}
          fill={(row + column) % 3 === 0 ? "#86a568" : "#739b58"}
          stroke="#314936"
          strokeWidth="0.8"
        />
      )
    }
  }
  const resources = [[82, 38], [142, 38], [102, 68], [162, 68], [121, 82]]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#17241d" />
      {tiles}
      {resources.map(([x, y], index) => (
        <g key={index} transform={`translate(${x},${y})`} shapeRendering="crispEdges">
          <rect x="-4" y="-12" width="8" height="12" fill="#29364a" />
          <rect x="-2" y="-10" width="4" height="6" fill={index === 4 ? "#d8b45b" : "#d5c9a3"} />
          <rect x="-6" y="-2" width="12" height="3" fill="#29364a" />
        </g>
      ))}
    </svg>
  )
}

function MiniArtPreview() {
  const nodes = [
    [36, 15, "red"], [112, 11, "ink"], [196, 19, "ink"],
    [70, 42, "ink"], [146, 39, "red"], [205, 49, "ink"],
    [39, 70, "ink"], [116, 65, "ink"], [184, 76, "ink"],
  ]
  const edges = [[0, 3], [1, 3], [1, 4], [2, 5], [3, 6], [3, 7], [4, 7], [4, 8], [5, 8]]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#d5d0bc" />
      {edges.map(([source, target], index) => {
        const [sx, sy, type] = nodes[source]
        const [tx, ty] = nodes[target]
        return (
          <path
            key={index}
            d={`M${sx},${sy + 4} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty - 4}`}
            fill="none"
            stroke={type === "red" ? "#a52928" : "#25211d"}
            strokeWidth="1"
            opacity="0.75"
          />
        )
      })}
      {nodes.map(([x, y, type], index) => (
        type === "red" ? (
          <rect key={index} x={x - 10} y={y - 4} width="20" height="8" fill="none" stroke="#a52928" />
        ) : (
          <path key={index} d={`M${x - 11},${y - 2} Q${x},${y + 9} ${x + 11},${y - 2}`} fill="none" stroke="#25211d" />
        )
      ))}
      <rect y="86" width="242" height="10" fill="#a52928" />
    </svg>
  )
}

function MiniUrinePreview() {
  const palette = [
    "#d99a2b", "#cc7d22", "#b3531c", "#9e3318", "#8c1410", "#5e1518",
    "#3b2f4a", "#4f6f33", "#45495a", "#595a5c", "#211c1a", "#f1ecdc",
    "#d2d6c4", "#dcc8a0", "#ecca6a", "#e8b021",
  ]
  const cx = 121
  const cy = 48
  const ring = 37
  const inner = 16
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#efe5cb" />
      {/* tree of health */}
      <path d={`M${cx},${cy + 22} C${cx - 4},${cy + 4} ${cx + 4},${cy - 8} ${cx},${cy - 24}`} fill="none" stroke="#4d7a35" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx={cx} cy={cy - 24} r="3" fill="#a9791f" />
      {palette.map((hex, i) => {
        const a = (i / palette.length) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(a) * ring
        const y = cy + Math.sin(a) * ring
        const ix = cx + Math.cos(a) * inner
        const iy = cy + Math.sin(a) * inner
        return (
          <g key={i}>
            <line x1={ix} y1={iy} x2={x} y2={y} stroke="#b59a6a" strokeWidth="0.7" opacity="0.6" />
            <circle cx={x} cy={y} r="4.3" fill={hex} stroke="#6f5a39" strokeWidth="0.7" />
          </g>
        )
      })}
      <circle cx={cx - 12} cy={cy - 6} r="6.5" fill="#efe5cb" stroke="#1f7a44" strokeWidth="1.2" />
      <circle cx={cx + 13} cy={cy + 7} r="6.5" fill="#efe5cb" stroke="#9c2b1b" strokeWidth="1.2" />
    </svg>
  )
}

function MiniEriePreview() {
  const root = [121, 86]
  const tips = [[19, 16], [70, 9], [121, 6], [174, 10], [224, 19]]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#eee9dc" />
      <rect x="4" y="4" width="234" height="88" fill="none" stroke="#665f52" strokeWidth="0.6" />
      {tips.map(([tx, ty], divisionIndex) => {
        const cx = root[0] + (tx - root[0]) * 0.34
        return (
          <g key={tx}>
            <path
              d={`M${root[0]},${root[1]} C${cx},61 ${tx},38 ${tx},${ty}`}
              fill="none"
              stroke="#28251f"
              strokeWidth="1"
            />
            {[0.26, 0.43, 0.6, 0.77].map((t, stationIndex) => {
              const x = root[0] + (tx - root[0]) * t
              const y = root[1] + (ty - root[1]) * t
              const side = (stationIndex + divisionIndex) % 2 ? -1 : 1
              return (
                <g key={t}>
                  <line
                    x1={x}
                    y1={y}
                    x2={x + side * 12}
                    y2={y - 4}
                    stroke="#665f52"
                    strokeWidth="0.55"
                  />
                  {Array.from({ length: 5 }, (_, leafIndex) => (
                    <circle
                      key={leafIndex}
                      cx={x + side * (10 + (leafIndex % 3) * 3)}
                      cy={y - 7 + Math.floor(leafIndex / 3) * 5}
                      r="1.2"
                      fill={leafIndex % 2 ? "#943f2f" : "#304f63"}
                    />
                  ))}
                </g>
              )
            })}
          </g>
        )
      })}
      <circle cx="121" cy="82" r="7" fill="#eee9dc" stroke="#28251f" />
      <circle cx="121" cy="93" r="4" fill="#eee9dc" stroke="#28251f" />
    </svg>
  )
}

function MiniWikipediaPreview() {
  const dots = [
    [12, 62, "#55c2e8", "#07566f", 2],
    [23, 42, "#c19bea", "#553078", 1],
    [31, 73, "#a7d46f", "#284e16", 2],
    [43, 29, "#55c2e8", "#07566f", 1],
    [54, 67, "#f4bf4f", "#6f3b00", 2],
    [65, 52, "#c19bea", "#553078", 1],
    [79, 19, "#a7d46f", "#284e16", 2],
    [91, 70, "#55c2e8", "#07566f", 1],
    [106, 44, "#55c2e8", "#07566f", 1],
    [119, 61, "#f4bf4f", "#6f3b00", 2],
    [132, 33, "#c19bea", "#553078", 1],
    [145, 76, "#a7d46f", "#284e16", 2],
    [159, 48, "#55c2e8", "#07566f", 1],
    [174, 24, "#c19bea", "#553078", 1],
    [188, 65, "#55c2e8", "#07566f", 1],
    [205, 39, "#a7d46f", "#284e16", 2],
    [220, 72, "#f4bf4f", "#6f3b00", 2],
    [231, 51, "#55c2e8", "#07566f", 1],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#101820" />
      {[24, 48, 72].map((y) => (
        <line key={y} x1="8" x2="234" y1={y} y2={y} stroke="#33404c" strokeWidth="0.6" />
      ))}
      {dots.map(([x, y, fill, stroke, width], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index % 5 === 0 ? 4 : 3}
          fill={fill}
          stroke={stroke}
          strokeWidth={width}
          opacity="0.9"
        />
      ))}
      <path
        d="M8,88 C34,84 43,90 68,82 S105,87 126,80 S161,89 183,81 S219,85 234,77"
        fill="none"
        stroke="#55c2e8"
        strokeWidth="1.5"
      />
      <circle cx="234" cy="77" r="2.5" fill="#55c2e8" />
    </svg>
  )
}

function MiniLocalGovernmentPreview() {
  const nodes = [
    [121, 14, "#e7e1cf", 5],
    [72, 35, "#4d83a8", 5],
    [170, 35, "#6f9e7a", 5],
    [34, 59, "#db9b55", 4],
    [74, 64, "#d96b5f", 4],
    [108, 53, "#9b7bc1", 4],
    [150, 61, "#54a9a1", 4],
    [194, 58, "#b7a66a", 4],
    [48, 83, "#d96b5f", 3],
    [94, 84, "#db9b55", 3],
    [142, 82, "#b7a66a", 3],
    [184, 84, "#b7a66a", 3],
    [220, 78, "#b7a66a", 3],
  ]
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [1, 5], [2, 6], [2, 7],
    [3, 4], [4, 6], [4, 8], [3, 9], [6, 10], [6, 11], [7, 12],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#101820" />
      {edges.map(([source, target], index) => (
        <line
          key={index}
          x1={nodes[source][0]}
          y1={nodes[source][1]}
          x2={nodes[target][0]}
          y2={nodes[target][1]}
          stroke={index === 8 || index === 9 ? "#f4bf4f" : "#617181"}
          strokeWidth={index === 8 || index === 9 ? 1.5 : 0.8}
          opacity="0.72"
        />
      ))}
      {nodes.map(([x, y, fill, radius], index) => (
        <circle key={index} cx={x} cy={y} r={radius} fill={fill} stroke="#17212b" />
      ))}
      <rect x="8" y="7" width="46" height="7" rx="3.5" fill="#54a9a1" opacity="0.8" />
      <rect x="188" y="7" width="45" height="7" rx="3.5" fill="#33414d" />
    </svg>
  )
}

function MiniWarsPreview() {
  const rows = [
    { color: "#96abb1", spans: [[8, 42], [55, 65], [163, 188]] },
    { color: "#313746", spans: [[10, 58], [78, 132], [145, 154]] },
    { color: "#b0909d", spans: [[30, 50], [88, 127], [170, 222]] },
    { color: "#687a97", spans: [[72, 110], [132, 164], [205, 232]] },
    { color: "#8a6f55", spans: [[44, 63], [95, 114]] },
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="var(--surface-1)" />
      {[48, 96, 144, 192].map((x) => (
        <line key={x} x1={x} x2={x} y1="9" y2="81" stroke="var(--surface-3)" />
      ))}
      {rows.map((row, rowIndex) => (
        <g key={row.color} transform={`translate(0,${12 + rowIndex * 14})`}>
          {row.spans.map(([start, end], index) => (
            <rect
              key={index}
              x={start}
              y={index % 2 ? 5 : 0}
              width={Math.max(4, end - start)}
              height="5"
              rx="2"
              fill={row.color}
            />
          ))}
        </g>
      ))}
      <path
        d="M8,87 H42 V83 H78 V89 H110 V80 H145 V85 H180 V76 H232"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function MiniRadialPreview({ combined = false }) {
  const ticks = Array.from({ length: 52 }, (_, i) => i)
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="var(--surface-1)" />
      <g transform="translate(122,48)">
        {combined && (
          <path
            d="M -37 -16 A 40 40 0 1 1 37 16 L 28 12 A 30 30 0 1 0 -28 -12 Z"
            fill="rgba(184, 221, 214, 0.24)"
            stroke="rgba(63, 163, 158, 0.25)"
            strokeDasharray="3 3"
          />
        )}
        {[14, 26, 38].map((r) => (
          <circle key={r} r={r} fill="none" stroke="rgba(148, 163, 184, 0.22)" />
        ))}
        {ticks.map((tick) => {
          const angle = (tick / ticks.length) * Math.PI * 2
          const low = 18 + Math.sin(tick * 0.2) * 6
          const high = 33 + Math.sin(tick * 0.17 + 1) * 10
          const x1 = Math.sin(angle) * low
          const y1 = -Math.cos(angle) * low
          const x2 = Math.sin(angle) * high
          const y2 = -Math.cos(angle) * high
          const beyond = tick > 17 && tick < 32
          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={beyond ? "#f97f5a" : "#3fa39e"}
              strokeWidth="2"
              opacity={beyond ? 0.95 : 0.55}
            />
          )
        })}
        <path
          d="M -4 -45 A 45 45 0 0 1 41 18 L 33 13 A 36 36 0 0 0 -3 -36 Z"
          fill="rgba(111,111,111,0.3)"
        />
        <line x1="-2" y1="-8" x2="-8" y2="-45" stroke="#6f6f6f" strokeWidth="6" />
        <line x1="7" y1="6" x2="42" y2="20" stroke="#a1a1a1" strokeWidth="6" />
      </g>
      <g transform="translate(18,70)">
        {Array.from({ length: 34 }, (_, i) => (
          <line
            key={i}
            x1={i * 3.2}
            x2={i * 3.2}
            y1={16}
            y2={16 - 5 - Math.sin(i * 0.3) * 9}
            stroke={i > 8 && i < 22 ? "#f97f5a" : "#445e5b"}
            strokeWidth="2"
          />
        ))}
      </g>
    </svg>
  )
}

function MiniClimatePreview() {
  const points = [
    [0, 42],
    [22, 48],
    [44, 40],
    [66, 56],
    [88, 52],
    [110, 70],
    [132, 58],
    [154, 66],
    [176, 62],
    [198, 78],
    [220, 68],
    [242, 74],
  ]
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ")
  const mean = "M0,58 C44,55 88,57 132,62 C176,66 210,66 242,70"

  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <defs>
        <pattern id="examples-preview-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="242" height="96" rx="6" fill="var(--surface-1)" />
      <path
        d="M0,35 C50,28 92,34 122,38 C160,42 190,34 242,40 L242,82 C198,78 160,83 122,76 C84,69 46,76 0,70 Z"
        fill="url(#examples-preview-hatch)"
        color="rgba(148, 163, 184, 0.28)"
        stroke="rgba(148, 163, 184, 0.35)"
      />
      <path d={`${mean} L242,74 C210,70 176,70 132,66 C88,61 44,59 0,62 Z`} fill="rgba(239, 68, 68, 0.55)" />
      <path d={mean} fill="none" stroke="rgba(100, 116, 139, 0.8)" strokeWidth="2" strokeDasharray="4 5" />
      <path d={line} fill="none" stroke="var(--text-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="205" x2="205" y1="12" y2="88" stroke="rgba(148, 163, 184, 0.7)" strokeWidth="2" strokeDasharray="6 6" />
      <circle cx="205" cy="70" r="5" fill="var(--text-primary)" />
    </svg>
  )
}

const styles = {
  page: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "64px 28px 32px",
    boxSizing: "border-box",
  },
  header: {
    maxWidth: "760px",
    marginBottom: "42px",
  },
  title: {
    margin: "4px 0 14px",
    color: "var(--text-primary)",
    fontSize: "clamp(3rem, 10vw, 6.5rem)",
    lineHeight: 0.95,
    letterSpacing: "-0.06em",
  },
  lede: {
    color: "var(--text-secondary)",
    fontSize: "19px",
    lineHeight: 1.55,
    maxWidth: "720px",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    display: "block",
    overflow: "hidden",
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
    background: "var(--surface-1)",
    color: "var(--text-primary)",
    textDecoration: "none",
  },
  preview: {
    display: "block",
    width: "100%",
    aspectRatio: "2.5 / 1",
  },
  cardBody: {
    padding: "18px",
  },
  eyebrow: {
    color: "var(--accent)",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  cardTitle: {
    margin: "6px 0 8px",
    fontSize: "20px",
  },
  cardDescription: {
    color: "var(--text-secondary)",
    margin: 0,
    fontWeight: 400,
  },
}
