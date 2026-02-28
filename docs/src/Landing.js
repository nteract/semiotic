import React, { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { XYFrame, OrdinalFrame, NetworkFrame, RealtimeBarChart } from "semiotic"

const tierSnippets = {
  charts: `import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
/>`,
  frames: `import { XYFrame } from "semiotic"

<XYFrame
  lines={data}
  xAccessor="date"
  yAccessor="value"
  lineStyle={d => ({ stroke: colorScale(d.key) })}
  hoverAnnotation={true}
  axes={[{ orient: "left" }, { orient: "bottom" }]}
/>`,
  utilities: `import { Axis, Legend, DividedLine } from "semiotic"

<svg width={500} height={300}>
  <DividedLine
    data={lineData}
    parameters={d => ({ stroke: theme(d.type) })}
  />
  <Axis orient="left" scale={yScale} />
  <Legend categories={categories} />
</svg>`
}

const quickStartSteps = [
  {
    number: 1,
    title: "Install",
    code: "npm install semiotic"
  },
  {
    number: 2,
    title: "Import",
    code: 'import { LineChart } from "semiotic"'
  },
  {
    number: 3,
    title: "Render",
    code: `<LineChart
  data={[
    { month: "Jan", value: 100 },
    { month: "Feb", value: 200 },
    { month: "Mar", value: 150 }
  ]}
  xAccessor="month"
  yAccessor="value"
/>`
  }
]

const features = [
  {
    title: "Annotations Built In",
    description:
      "First-class annotation support with smart label placement, connector lines, and rich formatting. No extra library needed.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="2" y="6" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="18" cy="10" r="2" fill="currentColor" />
        <line x1="18" y1="12" x2="18" y2="16" stroke="currentColor" strokeWidth="1.5" />
        <line x1="18" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    title: "Responsive by Default",
    description:
      "ResponsiveFrame components automatically adapt to container size. Your visualizations look great at any width.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="1" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="21" y="7" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="20" x2="16" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Accessibility",
    description:
      "Screen reader support and ARIA attributes for all chart types. Semantic markup ensures your data is accessible to everyone.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 12h14M14 12v8M10 24l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Canvas & SVG",
    description:
      "Switch between SVG and Canvas renderers with a single prop. Get the performance of Canvas or the interactivity of SVG.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="15" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 8h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 20H10v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Pure React",
    description:
      "Not a D3 wrapper. Semiotic is built with React from the ground up, leveraging component composition and the React lifecycle.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="3" fill="currentColor" />
        <ellipse cx="14" cy="14" rx="12" ry="5" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="14" cy="14" rx="12" ry="5" stroke="currentColor" strokeWidth="1.5" transform="rotate(60 14 14)" />
        <ellipse cx="14" cy="14" rx="12" ry="5" stroke="currentColor" strokeWidth="1.5" transform="rotate(120 14 14)" />
      </svg>
    )
  },
  {
    title: "TypeScript",
    description:
      "Full TypeScript definitions for every component and prop. Get autocompletion, type checking, and inline documentation.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <text x="8" y="20" fill="currentColor" fontSize="14" fontWeight="700" fontFamily="var(--font-code)">TS</text>
      </svg>
    )
  }
]

function CopyButton({ text, style: buttonStyle }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={buttonStyle}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

function MiniCodeBlock({ code, language = "jsx", showCopy = false }) {
  const highlighted =
    window.Prism && window.Prism.languages[language]
      ? window.Prism.highlight(code, window.Prism.languages[language], language)
      : null

  return (
    <div style={styles.miniCodeWrapper}>
      {showCopy && (
        <CopyButton
          text={code}
          style={styles.miniCopyButton}
        />
      )}
      <pre style={styles.miniPre}>
        <code
          style={styles.miniCode}
          {...(highlighted
            ? { dangerouslySetInnerHTML: { __html: highlighted } }
            : { children: code })}
        />
      </pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gallery data
// ---------------------------------------------------------------------------

const galleryLineData = [
  {
    label: "Revenue",
    coordinates: [
      { month: 1, value: 42 }, { month: 2, value: 58 }, { month: 3, value: 53 },
      { month: 4, value: 71 }, { month: 5, value: 64 }, { month: 6, value: 88 },
      { month: 7, value: 79 }, { month: 8, value: 95 }, { month: 9, value: 102 },
      { month: 10, value: 89 }, { month: 11, value: 110 }, { month: 12, value: 124 },
    ],
  },
  {
    label: "Costs",
    coordinates: [
      { month: 1, value: 35 }, { month: 2, value: 38 }, { month: 3, value: 41 },
      { month: 4, value: 44 }, { month: 5, value: 48 }, { month: 6, value: 52 },
      { month: 7, value: 50 }, { month: 8, value: 55 }, { month: 9, value: 58 },
      { month: 10, value: 54 }, { month: 11, value: 60 }, { month: 12, value: 63 },
    ],
  },
]

const galleryBarData = [
  { region: "North", q1: 84, q2: 92, q3: 78, q4: 105 },
  { region: "South", q1: 62, q2: 71, q3: 88, q4: 76 },
  { region: "East", q1: 95, q2: 88, q3: 102, q4: 110 },
  { region: "West", q1: 73, q2: 80, q3: 69, q4: 91 },
]

const galleryScatterData = Array.from({ length: 40 }, (_, i) => ({
  x: 10 + Math.random() * 80,
  y: 10 + Math.random() * 80,
  size: 3 + Math.random() * 8,
  group: ["A", "B", "C"][i % 3],
}))

const galleryAreaData = [
  {
    label: "Desktop",
    coordinates: [
      { week: 1, users: 120 }, { week: 2, users: 135 }, { week: 3, users: 142 },
      { week: 4, users: 128 }, { week: 5, users: 155 }, { week: 6, users: 168 },
      { week: 7, users: 160 }, { week: 8, users: 172 },
    ],
  },
  {
    label: "Mobile",
    coordinates: [
      { week: 1, users: 80 }, { week: 2, users: 95 }, { week: 3, users: 110 },
      { week: 4, users: 105 }, { week: 5, users: 130 }, { week: 6, users: 145 },
      { week: 7, users: 155 }, { week: 8, users: 170 },
    ],
  },
]

const galleryNetworkNodes = [
  { id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" },
  { id: "F" }, { id: "G" }, { id: "H" }, { id: "I" }, { id: "J" },
  { id: "K" }, { id: "L" },
]
const galleryNetworkEdges = [
  { source: "A", target: "B" }, { source: "A", target: "C" }, { source: "A", target: "D" },
  { source: "B", target: "E" }, { source: "B", target: "F" }, { source: "C", target: "G" },
  { source: "D", target: "H" }, { source: "E", target: "I" }, { source: "F", target: "J" },
  { source: "G", target: "K" }, { source: "H", target: "L" }, { source: "I", target: "A" },
  { source: "J", target: "C" }, { source: "K", target: "E" },
]

const galleryColors = ["#6366f1", "#ec4899", "#f97316", "#10b981", "#06b6d4"]

const galleryItems = [
  {
    title: "Line Chart",
    path: "/charts/line-chart",
    render: (w, h) => (
      <XYFrame
        size={[w, h]}
        lines={galleryLineData}
        xAccessor="month"
        yAccessor="value"
        lineDataAccessor="coordinates"
        lineStyle={(d, i) => ({ stroke: galleryColors[i], strokeWidth: 2, fill: "none" })}
        axes={[
          { orient: "left", tickFormat: d => d, ticks: 5 },
          { orient: "bottom", ticks: 6 },
        ]}
        margin={{ top: 16, right: 16, bottom: 36, left: 44 }}
        hoverAnnotation={true}
      />
    ),
  },
  {
    title: "Bar Chart",
    path: "/charts/bar-chart",
    render: (w, h) => (
      <OrdinalFrame
        size={[w, h]}
        data={galleryBarData.flatMap(d =>
          [
            { region: d.region, quarter: "Q1", value: d.q1 },
            { region: d.region, quarter: "Q2", value: d.q2 },
            { region: d.region, quarter: "Q3", value: d.q3 },
            { region: d.region, quarter: "Q4", value: d.q4 },
          ]
        )}
        oAccessor="region"
        rAccessor="value"
        type="clusterbar"
        style={d => {
          const qi = ["Q1", "Q2", "Q3", "Q4"].indexOf(d.quarter)
          return { fill: galleryColors[qi], stroke: "none" }
        }}
        oLabel={true}
        oPadding={8}
        axes={[{ orient: "left", ticks: 5 }]}
        margin={{ top: 16, right: 16, bottom: 36, left: 44 }}
      />
    ),
  },
  {
    title: "Scatterplot",
    path: "/charts/scatterplot",
    render: (w, h) => (
      <XYFrame
        size={[w, h]}
        points={galleryScatterData}
        xAccessor="x"
        yAccessor="y"
        pointStyle={d => {
          const gi = ["A", "B", "C"].indexOf(d.group)
          return { fill: galleryColors[gi], fillOpacity: 0.7, r: d.size }
        }}
        axes={[
          { orient: "left", ticks: 5 },
          { orient: "bottom", ticks: 5 },
        ]}
        margin={{ top: 16, right: 16, bottom: 36, left: 44 }}
        hoverAnnotation={true}
      />
    ),
  },
  {
    title: "Stacked Area",
    path: "/charts/area-chart",
    render: (w, h) => (
      <XYFrame
        size={[w, h]}
        lines={galleryAreaData}
        xAccessor="week"
        yAccessor="users"
        lineDataAccessor="coordinates"
        lineType={{ type: "stackedarea" }}
        lineStyle={(d, i) => ({ fill: galleryColors[i], fillOpacity: 0.6, stroke: galleryColors[i], strokeWidth: 2 })}
        axes={[
          { orient: "left", ticks: 5 },
          { orient: "bottom", ticks: 4 },
        ]}
        margin={{ top: 16, right: 16, bottom: 36, left: 44 }}
      />
    ),
  },
  {
    title: "Network Graph",
    path: "/charts/force-directed-graph",
    render: (w, h) => (
      <NetworkFrame
        size={[w, h]}
        nodes={galleryNetworkNodes}
        edges={galleryNetworkEdges}
        networkType={{ type: "force", iterations: 300 }}
        nodeSizeAccessor={5}
        nodeStyle={(d, i) => ({ fill: galleryColors[i % galleryColors.length], stroke: "#fff", strokeWidth: 1.5 })}
        edgeStyle={() => ({ stroke: "var(--text-secondary)", strokeWidth: 1, opacity: 0.4 })}
        nodeIDAccessor="id"
        margin={16}
      />
    ),
  },
  {
    title: "Realtime Bar Chart",
    path: "/charts/realtime-bar-chart",
    render: (w, h) => <GalleryRealtimeBars width={w} height={h} />,
  },
]

function GalleryRealtimeBars({ width, height }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const categories = ["errors", "warnings", "info"]
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const cat = categories[i % 3]
        chartRef.current.push({
          time: i,
          value: cat === "errors" ? 2 + Math.random() * 8
            : cat === "warnings" ? 5 + Math.random() * 15
            : 10 + Math.random() * 20,
          category: cat,
        })
      }
    }, 40)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeBarChart
      ref={chartRef}
      size={[width, height]}
      categoryAccessor="category"
      colors={{ errors: "#ef4444", warnings: "#f97316", info: "#6366f1" }}
      binSize={20}
      windowSize={200}
      showAxes={true}
    />
  )
}

function HeroGallery() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * galleryItems.length))
  const containerRef = useRef(null)
  const [width, setWidth] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const item = galleryItems[index]
  const chartHeight = 280

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <div
        ref={containerRef}
        style={{
          borderRadius: "12px",
          border: "1px solid var(--surface-3)",
          background: "var(--surface-1)",
          overflow: "hidden",
          color: "var(--text-primary)",
        }}
      >
        {width && item.render(width, chartHeight)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <button
          onClick={() => setIndex((index - 1 + galleryItems.length) % galleryItems.length)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--surface-3)",
            borderRadius: 6,
            padding: "4px 12px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 14,
            lineHeight: "1.4",
          }}
          aria-label="Previous chart"
        >
          &larr;
        </button>
        <Link
          to={item.path}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--accent)",
            textDecoration: "none",
          }}
        >
          {item.title}
        </Link>
        <button
          onClick={() => setIndex((index + 1) % galleryItems.length)}
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--surface-3)",
            borderRadius: 6,
            padding: "4px 12px",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 14,
            lineHeight: "1.4",
          }}
          aria-label="Next chart"
        >
          &rarr;
        </button>
      </div>
    </div>
  )
}

const styles = {
  /* ---- Hero ---- */
  hero: {
    padding: "80px 24px",
    textAlign: "center",
    background: "linear-gradient(180deg, var(--surface-0) 0%, var(--surface-1) 100%)"
  },
  heroInner: {
    maxWidth: "800px",
    margin: "0 auto"
  },
  heroHeadline: {
    fontSize: "clamp(2rem, 5vw, 3.25rem)",
    fontWeight: 700,
    margin: "0 0 16px",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    lineHeight: 1.15
  },
  heroSubtitle: {
    fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
    color: "var(--text-secondary)",
    margin: "0 0 40px",
    lineHeight: 1.6,
    maxWidth: "600px",
    marginLeft: "auto",
    marginRight: "auto"
  },
  heroButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "32px"
  },
  btnPrimary: {
    display: "inline-block",
    padding: "12px 28px",
    background: "var(--accent)",
    color: "#fff",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "15px",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.15s ease"
  },
  btnSecondary: {
    display: "inline-block",
    padding: "12px 28px",
    background: "transparent",
    color: "var(--text-primary)",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "15px",
    textDecoration: "none",
    border: "1px solid var(--surface-3)",
    cursor: "pointer",
    transition: "background 0.15s ease, border-color 0.15s ease"
  },
  installBlock: {
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
    padding: "10px 16px",
    marginBottom: "40px"
  },
  installText: {
    fontFamily: "var(--font-code)",
    fontSize: "14px",
    color: "var(--text-primary)",
    margin: 0,
    userSelect: "all"
  },
  installCopy: {
    background: "none",
    border: "1px solid var(--surface-3)",
    borderRadius: "4px",
    padding: "4px 10px",
    fontSize: "12px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-code)",
    transition: "color 0.2s ease, border-color 0.2s ease",
    lineHeight: "1.4"
  },
  vizPlaceholder: {
    maxWidth: "700px",
    height: "300px",
    margin: "0 auto",
    borderRadius: "12px",
    background:
      "linear-gradient(135deg, var(--surface-2) 0%, var(--surface-1) 40%, var(--surface-2) 60%, var(--surface-1) 100%)",
    border: "1px solid var(--surface-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-secondary)",
    fontSize: "14px",
    fontStyle: "italic"
  },

  /* ---- Section Shell ---- */
  section: {
    padding: "64px 24px",
    margin: "0 auto"
  },
  sectionTitle: {
    fontSize: "clamp(1.5rem, 3vw, 2rem)",
    fontWeight: 700,
    textAlign: "center",
    margin: "0 0 8px",
    color: "var(--text-primary)"
  },
  sectionSubtitle: {
    textAlign: "center",
    color: "var(--text-secondary)",
    margin: "0 0 48px",
    fontSize: "15px",
    maxWidth: "560px",
    marginLeft: "auto",
    marginRight: "auto",
    lineHeight: 1.6
  },

  /* ---- Tier Cards ---- */
  tierGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "24px"
  },
  tierCard: {
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden"
  },
  tierLabel: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: "#fff",
    lineHeight: "1.6",
    marginBottom: "12px",
    alignSelf: "flex-start"
  },
  tierHeading: {
    fontSize: "1.15rem",
    fontWeight: 700,
    margin: "0 0 8px",
    color: "var(--text-primary)"
  },
  tierDescription: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    margin: "0 0 16px",
    lineHeight: 1.6,
    flex: 1
  },

  /* ---- Features ---- */
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "32px"
  },
  featureItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  featureIcon: {
    color: "var(--accent)",
    marginBottom: "4px"
  },
  featureTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0
  },
  featureDesc: {
    fontSize: "14px",
    color: "var(--text-secondary)",
    margin: 0,
    lineHeight: 1.6
  },

  /* ---- Quick Start ---- */
  stepsContainer: {
    maxWidth: "600px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "32px"
  },
  step: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start"
  },
  stepNumber: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "var(--accent)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "15px",
    flexShrink: 0
  },
  stepContent: {
    flex: 1,
    minWidth: 0
  },
  stepTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "0 0 8px",
    color: "var(--text-primary)",
    lineHeight: "36px"
  },

  /* ---- Mini Code Block ---- */
  miniCodeWrapper: {
    position: "relative",
    background: "var(--surface-2)",
    border: "1px solid var(--surface-3)",
    borderRadius: "8px",
    overflow: "hidden"
  },
  miniPre: {
    margin: 0,
    padding: "14px 16px",
    overflowX: "auto"
  },
  miniCode: {
    fontFamily: "var(--font-code)",
    fontSize: "13px",
    lineHeight: 1.6,
    color: "var(--text-primary)",
    whiteSpace: "pre",
    background: "none",
    padding: 0,
    borderRadius: 0
  },
  miniCopyButton: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "var(--surface-1)",
    border: "1px solid var(--surface-3)",
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "11px",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontFamily: "var(--font-code)",
    transition: "color 0.2s ease, border-color 0.2s ease",
    lineHeight: "1.4",
    zIndex: 1
  },

  /* ---- Footer CTA ---- */
  footerCTA: {
    padding: "64px 24px",
    textAlign: "center",
    background: "var(--surface-1)",
    borderTop: "1px solid var(--surface-3)"
  }
}

export default function Landing() {
  return (
    <div className="landing-page">
      {/* ================================================================
          HERO SECTION
          ================================================================ */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <h1 style={styles.heroHeadline}>Data Visualization for React</h1>
          <p style={styles.heroSubtitle}>
            From simple charts to custom visualizations — one library,
            progressive complexity.
          </p>

          <div style={styles.heroButtons}>
            <Link to="/getting-started" style={styles.btnPrimary}>
              Get Started
            </Link>
            <Link to="/cookbook" style={styles.btnSecondary}>
              See Examples
            </Link>
          </div>

          <div style={styles.installBlock}>
            <code style={styles.installText}>npm install semiotic</code>
            <CopyButton text="npm install semiotic" style={styles.installCopy} />
          </div>

          <HeroGallery />
        </div>
      </section>

      {/* ================================================================
          THREE TIERS SECTION
          ================================================================ */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>One Library, Three Levels</h2>
        <p style={styles.sectionSubtitle}>
          Start simple and add complexity only when you need it. Semiotic grows
          with your requirements.
        </p>

        <div style={styles.tierGrid} className="landing-tier-grid">
          {/* Charts Tier */}
          <div
            style={{
              ...styles.tierCard,
              borderTop: "3px solid var(--tier-charts)"
            }}
          >
            <span
              style={{
                ...styles.tierLabel,
                background: "var(--tier-charts)"
              }}
            >
              Charts
            </span>
            <h3 style={styles.tierHeading}>Simple Props, Instant Results</h3>
            <p style={styles.tierDescription}>
              20 ready-to-use chart components. Pass your data, set a few props,
              get a beautiful visualization.
            </p>
            <MiniCodeBlock code={tierSnippets.charts} />
          </div>

          {/* Frames Tier */}
          <div
            style={{
              ...styles.tierCard,
              borderTop: "3px solid var(--tier-frames)"
            }}
          >
            <span
              style={{
                ...styles.tierLabel,
                background: "var(--tier-frames)"
              }}
            >
              Frames
            </span>
            <h3 style={styles.tierHeading}>Full Creative Control</h3>
            <p style={styles.tierDescription}>
              Four powerful Frame components give you complete control over every
              aspect of your visualization.
            </p>
            <MiniCodeBlock code={tierSnippets.frames} />
          </div>

          {/* Utilities Tier */}
          <div
            style={{
              ...styles.tierCard,
              borderTop: "3px solid var(--tier-utilities)"
            }}
          >
            <span
              style={{
                ...styles.tierLabel,
                background: "var(--tier-utilities)"
              }}
            >
              Utilities
            </span>
            <h3 style={styles.tierHeading}>Build Your Own</h3>
            <p style={styles.tierDescription}>
              Use individual components like Axis, Legend, Brush, and DividedLine
              to build completely custom visualizations.
            </p>
            <MiniCodeBlock code={tierSnippets.utilities} />
          </div>
        </div>
      </section>

      {/* ================================================================
          FEATURES SECTION
          ================================================================ */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Built for Real-World Use</h2>
        <p style={styles.sectionSubtitle}>
          Everything you need to ship production data visualizations, without
          reaching for extra libraries.
        </p>

        <div style={styles.featureGrid} className="landing-feature-grid">
          {features.map((feature) => (
            <div key={feature.title} style={styles.featureItem}>
              <div style={styles.featureIcon}>{feature.icon}</div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          QUICK START SECTION
          ================================================================ */}
      <section
        style={{
          ...styles.section,
          background: "var(--surface-1)",
          maxWidth: "none",
          borderTop: "1px solid var(--surface-3)",
          borderBottom: "1px solid var(--surface-3)"
        }}
      >
        <h2 style={styles.sectionTitle}>Get Up and Running in Minutes</h2>
        <p style={styles.sectionSubtitle}>
          Three steps to your first chart.
        </p>

        <div style={styles.stepsContainer}>
          {quickStartSteps.map((step) => (
            <div key={step.number} style={styles.step}>
              <div style={styles.stepNumber}>{step.number}</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>{step.title}</h3>
                <MiniCodeBlock
                  code={step.code}
                  showCopy={step.number === 1}
                  language={step.number === 1 ? "bash" : "jsx"}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================
          FOOTER CTA
          ================================================================ */}
      <section style={styles.footerCTA}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: "12px" }}>
          Ready to Build?
        </h2>
        <p
          style={{
            ...styles.sectionSubtitle,
            marginBottom: "32px"
          }}
        >
          Explore the guides, browse examples, or dive straight into the API
          reference.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/getting-started" style={styles.btnPrimary}>
            Get Started
          </Link>
          <Link to="/cookbook" style={styles.btnSecondary}>
            See Examples
          </Link>
        </div>
      </section>

      {/* ================================================================
          RESPONSIVE STYLES
          ================================================================ */}
      <style>{`
        @media (max-width: 900px) {
          .landing-tier-grid {
            grid-template-columns: 1fr !important;
          }
          .landing-feature-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .landing-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
