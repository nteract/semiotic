import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { EXAMPLE_FILTERS, EXAMPLES } from "./examplesManifest"
import "./ExamplesOverviewPage.css"

const PREVIEW_COMPONENTS = {
  "living-ledger": MiniLivingLedgerPreview,
  "insight-forge": MiniInsightForgePreview,
  "analyst-adventure": MiniAnalystAdventurePreview,
  "sentence-structure": MiniSentenceStructurePreview,
  watermarks: MiniWatermarksPreview,
  "stakeholder-journey": MiniStakeholderJourneyPreview,
  "merge-pressure": MiniMergePressurePreview,
  nimby: MiniNimbyPreview,
  combined: () => <MiniRadialPreview combined />,
  climate: MiniClimatePreview,
  "lake-isotype": MiniLakeIsotypePreview,
  "hotdog-variations": MiniHotDogPreview,
  "data-centers-isotype": MiniDataCentersIsotypePreview,
  "the-grid": MiniTheGridPreview,
  "creative-contours": MiniCreativeContoursPreview,
  discrete: MiniDiscretePreview,
  isometric: MiniIsometricPreview,
  wars: MiniWarsPreview,
  art: MiniArtPreview,
  urine: MiniUrinePreview,
  erie: MiniEriePreview,
  wikipedia: MiniWikipediaPreview,
  "local-government": MiniLocalGovernmentPreview,
  "port-replay": MiniPortReplayPreview,
  "scroll-tell": MiniScrollTellPreview,
  "dataviz-people": MiniDatavizPeoplePreview,
  "distant-reading": MiniDistantReadingPreview,
  funnels: MiniFunnelsPreview,
  machine: MiniMachinePreview,
  architecture: MiniArchitecturePreview,
  octopus: MiniOctopusPreview,
  gestalt: MiniGestaltPreview,
  "semiotic-standard": MiniSemioticStandardPreview,
  mobilevis: MiniMobileVisPreview,
  networkviz: MiniNetworkVizPreview,
  oregontrail: MiniOregonTrailPreview,
  earthquakes: MiniEarthquakesPreview,
  "europa-languages": MiniEuropaLanguagesPreview,
  maup: MiniMaupPreview,
}

export function ExamplePreview({ preview }) {
  const Preview = PREVIEW_COMPONENTS[preview]
  return Preview ? <Preview /> : <MissingExamplePreview preview={preview} />
}

function MissingExamplePreview({ preview }) {
  const label = preview ? `Missing example preview: ${preview}` : "Missing example preview"
  return (
    <svg
      viewBox="0 0 242 96"
      style={styles.preview}
      role="img"
      aria-label={label}
      data-example-preview-missing="true"
    >
      <rect width="242" height="96" rx="6" fill="var(--surface-1)" />
      <path
        d="M20 76 90 16l54 48 28-26 50 38"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="2"
      />
      <text x="121" y="86" textAnchor="middle" fill="var(--text-secondary)" fontSize="9">
        Preview unavailable
      </text>
    </svg>
  )
}

function MiniLivingLedgerPreview() {
  const stations = [
    [42, 39, "circle", "#57c7b7"],
    [66, 55, "triangle", "#e28b55"],
    [92, 32, "diamond", "#57c7b7"],
    [119, 48, "circle", "#d6a758"],
    [151, 30, "notch", "#dfc46a"],
    [177, 57, "triangle", "#bd86c8"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <defs>
        <pattern
          id="living-ledger-preview-grid"
          width="12"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path d="M12 0H0V12" fill="none" stroke="#89afa5" strokeWidth="0.35" opacity="0.2" />
        </pattern>
        <filter id="living-ledger-preview-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="242" height="96" rx="6" fill="#071816" />
      <rect width="242" height="96" rx="6" fill="url(#living-ledger-preview-grid)" />
      <path
        d="M14 39c11-11 24-16 38-13l12 8 17-8 19 4 10 11 18 2 12-9 17-2 8 8 22-4 20 10-4 16-29 7-29-8-28 9-23-8-24 2-24-11-21 0Z"
        fill="#102a27"
        stroke="#79958c"
        strokeWidth="0.7"
        opacity="0.78"
      />
      {stations.map(([x, y, shape, color], index) => (
        <g key={index} transform={`translate(${x},${y})`} filter="url(#living-ledger-preview-glow)">
          {shape === "triangle" ? (
            <path d="M0-5 5 4-5 4Z" fill={color} fillOpacity="0.25" stroke={color} />
          ) : shape === "diamond" ? (
            <path d="M0-6 6 0 0 6-6 0Z" fill={color} fillOpacity="0.25" stroke={color} />
          ) : (
            <>
              <circle r="4.6" fill="#071816" stroke={color} strokeWidth="1.4" />
              {shape === "notch" ? <path d="M0-7V-3" stroke={color} strokeWidth="1.8" /> : null}
            </>
          )}
        </g>
      ))}
      <g transform="translate(194,8)">
        <rect width="39" height="33" fill="#0b211f" stroke="#46675f" />
        <path d="M19.5 0V33M0 16.5H39" stroke="#789087" strokeDasharray="2 2" strokeWidth="0.5" />
        <circle cx="28" cy="9" r="3" fill="#57c7b7" />
        <path d="M8 9 11 14 5 14Z" fill="#e28b55" />
        <path d="M27 24 31 28 27 32 23 28Z" fill="#ea654f" />
      </g>
      <g transform="translate(15,76)">
        <path
          d="M0 8C14 8 20 6 29 7s16-5 25-4 14-1 21-3 12 2 22-1 15-6 25-5 14-2 26-4"
          fill="none"
          stroke="#57c7b7"
          strokeWidth="1.7"
        />
        <line x1="96" x2="96" y1="-4" y2="11" stroke="#df7857" strokeDasharray="3 2" />
        <line x1="121" x2="121" y1="-4" y2="11" stroke="#ea654f" strokeDasharray="3 2" />
      </g>
      <text x="15" y="15" fill="#f0e7cf" fontSize="8" fontWeight="800" letterSpacing="1.2">
        THE LIVING LEDGER
      </text>
      <text x="15" y="24" fill="#75a79d" fontSize="5.5" letterSpacing="0.7">
        SERVICE WEATHER / EVIDENCE / THRESHOLDS
      </text>
    </svg>
  )
}

export default function ExamplesOverviewPage() {
  const [frame, setFrame] = useState("all")
  const [topic, setTopic] = useState("all")
  const visibleExamples = useMemo(
    () =>
      EXAMPLES.filter(
        (example) =>
          (frame === "all" || example.frames?.includes(frame)) &&
          (topic === "all" || example.topics?.includes(topic)),
      ),
    [frame, topic],
  )
  const hasActiveFilters = frame !== "all" || topic !== "all"

  const countForFilter = (kind, value) =>
    EXAMPLES.filter(
      (example) =>
        (kind !== "frames" || value === "all" || example.frames?.includes(value)) &&
        (kind !== "topics" || value === "all" || example.topics?.includes(value)) &&
        (kind === "frames" || frame === "all" || example.frames?.includes(frame)) &&
        (kind === "topics" || topic === "all" || example.topics?.includes(topic)),
    ).length

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.eyebrow}>Semiotic in practice</div>
        <h1 style={styles.title}>Examples</h1>
        <p style={styles.lede}>
          Each example starts with a visual question and shows how data, layout, annotation, and
          interaction work together to answer it.
        </p>
      </div>

      <section className="examples-filter-bar" aria-label="Filter examples">
        <ExampleFilterGroup
          label="Frame"
          options={EXAMPLE_FILTERS.frames}
          selected={frame}
          onSelect={setFrame}
          countForOption={(value) => countForFilter("frames", value)}
        />
        <ExampleFilterGroup
          label="Topic"
          options={EXAMPLE_FILTERS.topics}
          selected={topic}
          onSelect={setTopic}
          countForOption={(value) => countForFilter("topics", value)}
        />
        <div className="examples-filter-summary" aria-live="polite">
          <span>{visibleExamples.length} examples</span>
          {hasActiveFilters && (
            <button
              type="button"
              className="examples-filter-reset"
              onClick={() => {
                setFrame("all")
                setTopic("all")
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      <div style={styles.grid}>
        {visibleExamples.map((example) => (
          <Link key={example.path} to={example.path} style={styles.card}>
            <ExamplePreview preview={example.preview} />
            <div style={styles.cardBody}>
              <div style={styles.eyebrow}>{example.eyebrow}</div>
              <h2 style={styles.cardTitle}>{example.title}</h2>
              <p style={styles.cardDescription}>{example.description}</p>
              {example.badges?.length > 0 && (
                <div style={styles.badges} aria-label="Example capabilities">
                  {example.badges.map((badge) => (
                    <span key={badge} style={styles.badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
      {visibleExamples.length === 0 && (
        <div className="examples-empty-state">
          No examples match this frame and topic combination.
        </div>
      )}
    </div>
  )
}

function ExampleFilterGroup({ label, options, selected, onSelect, countForOption }) {
  return (
    <div
      className="examples-filter-group"
      role="group"
      aria-label={`Filter by ${label.toLowerCase()}`}
    >
      <span className="examples-filter-label">{label}</span>
      <div className="examples-filter-options">
        <FilterOption
          label="All"
          count={countForOption("all")}
          selected={selected === "all"}
          onClick={() => onSelect("all")}
        />
        {options.map((option) => (
          <FilterOption
            key={option.id}
            label={option.label}
            count={countForOption(option.id)}
            selected={selected === option.id}
            onClick={() => onSelect(option.id)}
          />
        ))}
      </div>
    </div>
  )
}

function FilterOption({ label, count, selected, onClick }) {
  return (
    <button
      type="button"
      className="examples-filter-option"
      aria-pressed={selected}
      onClick={onClick}
      disabled={count === 0}
    >
      {label} <span aria-hidden="true">{count}</span>
    </button>
  )
}

function MiniWatermarksPreview() {
  const events = [
    [24, 25, "#244f72"],
    [45, 31, "#244f72"],
    [66, 53, "#23735d"],
    [89, 42, "#23735d"],
    [112, 63, "#a73b45"],
    [137, 36, "#244f72"],
    [160, 67, "#a73b45"],
    [185, 48, "#23735d"],
    [206, 71, "#a73b45"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#eef3f4" />
      <text x="12" y="18" fill="#1d2730" fontSize="11" fontWeight="900" fontFamily="sans-serif">
        WATERMARKS
      </text>
      {[0, 1, 2, 3, 4].map((index) => {
        const x = 14 + index * 43
        const closed = index < 3
        return (
          <g key={index}>
            <rect
              x={x}
              y="42"
              width="36"
              height="38"
              fill={closed ? "#f0d9dc" : "#dbe9ee"}
              stroke="#b8c3c9"
            />
            {closed && (
              <line
                x1={x + 4}
                x2={x + 32}
                y1="42"
                y2="42"
                stroke="#a73b45"
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
          </g>
        )
      })}
      <line
        x1="137"
        x2="137"
        y1="20"
        y2="83"
        stroke="#d39b2a"
        strokeWidth="3"
        strokeDasharray="6 4"
      />
      {events.map(([x, y, fill], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index % 3 === 0 ? 4.4 : 3.6}
          fill={fill}
          stroke="#ffffff"
          strokeWidth="1"
        />
      ))}
      <path d="M200 29h26v49h-26z" fill="#f5e1e3" stroke="#a73b45" strokeWidth="1.2" />
      <text
        x="213"
        y="24"
        textAnchor="middle"
        fill="#a73b45"
        fontSize="8"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        LATE
      </text>
    </svg>
  )
}

function MiniHotDogPreview() {
  const bars = [14, 9, 10, 11, 16, 21, 24, 25, 50, 54, 66, 59, 68, 54]
  const line = bars
    .map((value, index) => {
      const x = 14 + index * 16.3
      const y = 78 - (value / 70) * 54
      return `${index === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#fbf4e4" />
      <rect x="0" y="0" width="242" height="9" fill="#1f292b" />
      <text x="12" y="25" fill="#1f292b" fontSize="12" fontWeight="900" fontFamily="sans-serif">
        NATHAN&apos;S FOUR WAYS
      </text>
      {[18, 34, 50, 66].map((y) => (
        <line key={y} x1="12" x2="230" y1={y} y2={y} stroke="#d7c59d" strokeWidth="1" />
      ))}
      <path d="M129 14v68M201 14v68" stroke="#c74733" strokeWidth="5" opacity="0.18" />
      <path
        d={line}
        fill="none"
        stroke="#d7a02f"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[0, 1, 2, 3, 4, 5].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => (
          <g
            key={`${row}-${col}`}
            transform={`translate(${16 + col * 10} ${44 + row * 6}) scale(.42 .42)`}
          >
            <path
              d="M1.2 7.2C1.2 4.6 3.4 2.6 6.1 2.6h5.8c2.7 0 4.9 2 4.9 4.6s-2.2 4.6-4.9 4.6H6.1c-2.7 0-4.9-2-4.9-4.6Z"
              fill="#f0c987"
            />
            <path
              d="M2.7 6.4C2.7 4.8 4 3.7 5.7 3.7h6.6c1.7 0 3 1.1 3 2.7s-1.3 2.7-3 2.7H5.7c-1.7 0-3-1.1-3-2.7Z"
              fill={row === 1 && col === 0 ? "#c94f6f" : "#c74733"}
            />
          </g>
        )),
      )}
      <rect x="151" y="66" width="8" height="18" fill="#377f91" />
      <rect x="164" y="54" width="8" height="30" fill="#377f91" />
      <rect x="177" y="34" width="8" height="50" fill="#2d7669" />
      <rect x="190" y="27" width="8" height="57" fill="#2d7669" />
      <text x="213" y="76" fill="#c74733" fontSize="13" fontWeight="900" fontFamily="sans-serif">
        54
      </text>
    </svg>
  )
}

function MiniTheGridPreview() {
  const stack = [
    [18, 62, 14, "#5c5346"],
    [18, 48, 14, "#6b8fad"],
    [18, 38, 10, "#8b7ec8"],
    [18, 28, 10, "#7ec8e3"],
    [40, 58, 18, "#5c5346"],
    [40, 40, 18, "#6b8fad"],
    [40, 28, 12, "#e0a84a"],
    [62, 64, 16, "#5c5346"],
    [62, 46, 18, "#6b8fad"],
    [62, 32, 14, "#7ec8e3"],
    [84, 60, 14, "#5c5346"],
    [84, 42, 18, "#6b8fad"],
    [84, 30, 12, "#e0a84a"],
    [106, 66, 12, "#5c5346"],
    [106, 50, 16, "#6b8fad"],
    [106, 36, 14, "#8b7ec8"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#0e1520" />
      <text
        x="12"
        y="16"
        fill="#e8a23a"
        fontSize="8"
        fontWeight="700"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1.5"
      >
        THE GRID · ERCOT
      </text>
      {stack.map(([x, y, h, fill], i) => (
        <rect key={i} x={x} y={y} width="18" height={h} fill={fill} opacity="0.92" />
      ))}
      <path
        d="M140 70 C150 66 158 48 168 42 C178 36 188 44 198 38 C208 32 218 28 228 34"
        fill="none"
        stroke="#e8a23a"
        strokeWidth="1.6"
      />
      <path
        d="M140 62 C150 60 158 54 168 50 C178 46 188 52 198 48 C208 44 218 40 228 46"
        fill="none"
        stroke="#5ec8d8"
        strokeWidth="1.4"
        strokeDasharray="3 2"
      />
      <rect x="140" y="14" width="44" height="18" fill="#141c2a" stroke="#2a3a52" />
      <text x="146" y="25" fill="#d8e2f0" fontSize="8" fontFamily="ui-monospace, monospace">
        +4.2%
      </text>
      <rect x="190" y="14" width="40" height="18" fill="#141c2a" stroke="#e05a3c" />
      <text x="196" y="25" fill="#e05a3c" fontSize="8" fontFamily="ui-monospace, monospace">
        TIGHT
      </text>
      <line x1="12" y1="84" x2="230" y2="84" stroke="#2a3a52" strokeWidth="1" />
    </svg>
  )
}

function MiniDataCentersIsotypePreview() {
  const racks = Array.from({ length: 24 })
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f2eedf" />
      <text x="12" y="18" fill="#34383b" fontSize="12" fontWeight="900" fontFamily="sans-serif">
        THE BUILDINGS BEHIND AI
      </text>
      <path
        d="M18 30L38 25 65 29 92 25 123 30 155 27 190 34 215 46 207 66 180 73 145 69 111 74 80 67 50 70 25 58Z"
        fill="#e6dfca"
        stroke="#34383b"
        strokeWidth="1"
      />
      {[
        [42, 45, "#34383b"],
        [67, 55, "#34383b"],
        [112, 49, "#4f8999"],
        [135, 60, "#d72f3f"],
        [158, 47, "#d72f3f"],
        [184, 55, "#d8ad43"],
      ].map(([x, y, fill], index) => (
        <rect key={index} x={x} y={y} width="7" height="11" fill={fill} />
      ))}
      {racks.map((_, index) => (
        <rect
          key={index}
          x={12 + index * 9}
          y="82"
          width="6"
          height="10"
          fill={index < 13 ? "#d72f3f" : index < 17 ? "#4f8999" : "#34383b"}
        />
      ))}
    </svg>
  )
}

function MiniCreativeContoursPreview() {
  const cells = [
    [122, 26, "#214d62", 0],
    [101, 36, "#2d788d", 1],
    [123, 38, "#53a5a0", 1],
    [145, 36, "#bad263", 2],
    [80, 48, "#40846a", 1],
    [102, 48, "#82a95f", 2],
    [124, 50, "#d6bd55", 4],
    [146, 48, "#dd7644", 3],
    [168, 48, "#c64667", 2],
    [59, 59, "#1f594e", 0],
    [81, 60, "#40846a", 1],
    [103, 62, "#82a95f", 3],
    [125, 63, "#d6bd55", 5],
    [147, 62, "#dd7644", 4],
    [169, 60, "#c64667", 3],
    [191, 59, "#6f4aa8", 2],
    [82, 72, "#244f51", 0],
    [104, 74, "#427b5c", 1],
    [126, 75, "#83a05a", 2],
    [148, 74, "#d5b653", 2],
    [170, 72, "#ef8b44", 1],
  ]
  const diamond = (x, y) => `M${x},${y - 8}L${x + 16},${y}L${x},${y + 8}L${x - 16},${y}Z`
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f4f0e4" />
      <path
        d="M22 62L42 46 65 42 93 31 123 22 152 29 181 39 218 48 207 65 175 72 140 76 104 74 66 70Z"
        fill="#d9cfb4"
        opacity="0.65"
      />
      <g>
        {cells.map(([x, y, fill, lift], index) => (
          <g key={index}>
            <path d={diamond(x, y + 7)} fill="#233329" opacity="0.16" />
            <path
              d={`M${x - 16},${y}L${x},${y + 8}L${x},${y + 8 + lift}L${x - 16},${y + lift}Z`}
              fill="#2c3c31"
              opacity="0.42"
            />
            <path
              d={`M${x + 16},${y}L${x},${y + 8}L${x},${y + 8 + lift}L${x + 16},${y + lift}Z`}
              fill="#43513b"
              opacity="0.32"
            />
            <path
              d={diamond(x, y - lift)}
              fill={fill}
              stroke="rgba(32,34,27,0.28)"
              strokeWidth="0.7"
            />
          </g>
        ))}
      </g>
      <path
        d="M43,57 C72,40 100,40 121,52 C142,64 161,45 202,52"
        fill="none"
        stroke="#fff6d6"
        strokeWidth="2"
        opacity="0.9"
      />
      <path
        d="M70,67 C105,52 129,83 168,61"
        fill="none"
        stroke="#fff6d6"
        strokeWidth="1.4"
        opacity="0.74"
      />
      {[
        [76, 48],
        [125, 46],
        [171, 51],
        [146, 69],
      ].map(([x, y], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index === 1 ? 4.6 : 3.4}
          fill={index === 1 ? "#c64667" : "#d6bd55"}
          stroke="#fff6d6"
          strokeWidth="1.2"
        />
      ))}
      <text x="14" y="18" fill="#20221b" fontSize="10" fontWeight="900" fontFamily="sans-serif">
        CREATIVE GRAVITY
      </text>
    </svg>
  )
}

function MiniDiscretePreview() {
  const dots = Array.from({ length: 50 }, (_, index) => ({
    x: 20 + (index % 10) * 20 + Math.floor(index / 10) * 1.6,
    y: 24 + Math.floor(index / 10) * 10,
    late: index > 37,
  }))
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f6f7f1" />
      <path
        d="M6 70 C28 62 42 26 70 28 C94 30 105 52 126 54 C150 56 157 34 184 38 C207 41 222 59 236 64"
        fill="none"
        stroke="#1d2730"
        strokeWidth="2.4"
      />
      <path
        d="M6 70 C28 62 42 26 70 28 C94 30 105 52 126 54 L126 70 Z"
        fill="#d8edf7"
        opacity="0.95"
      />
      <line
        x1="126"
        x2="126"
        y1="14"
        y2="76"
        stroke="#c93d3d"
        strokeWidth="2"
        strokeDasharray="5 4"
      />
      {dots.map((dot, index) => (
        <circle
          key={index}
          cx={dot.x}
          cy={dot.y + 34}
          r="2.7"
          fill={dot.late ? "#c93d3d" : "#236d99"}
          opacity="0.92"
        />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <g key={index} transform={`translate(${153 + index * 18} 29)`}>
          <rect
            x="-8"
            y="-8"
            width="16"
            height="12"
            rx="2"
            fill={index === 3 ? "#c93d3d" : "#287f68"}
          />
          <rect x="-5" y="-5" width="10" height="4" fill="#ffffff" opacity="0.9" />
          <circle
            cx="-4"
            cy="5"
            r="2.2"
            fill={index === 3 ? "#c93d3d" : "#287f68"}
            stroke="#ffffff"
            strokeWidth="1"
          />
          <circle
            cx="5"
            cy="5"
            r="2.2"
            fill={index === 3 ? "#c93d3d" : "#287f68"}
            stroke="#ffffff"
            strokeWidth="1"
          />
        </g>
      ))}
      <rect x="148" y="72" width="68" height="8" fill="#cfe7df" />
      {[0, 1, 2, 3].map((index) => (
        <rect key={index} x={150 + index * 16} y="68" width="10" height="12" fill="#287f68" />
      ))}
    </svg>
  )
}

function MiniLakeIsotypePreview() {
  const dams = Array.from({ length: 10 })
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f2eedf" />
      <rect x="0" y="0" width="242" height="7" fill="#34383b" />
      <text x="12" y="25" fill="#34383b" fontSize="13" fontWeight="900" fontFamily="sans-serif">
        LAKE TRAVIS
      </text>
      <text x="12" y="39" fill="#d72f3f" fontSize="8" fontWeight="900" fontFamily="sans-serif">
        THE WATER, IN SIGNS
      </text>
      {dams.map((_, index) => (
        <g key={index} transform={`translate(${13 + index * 22} 48)`}>
          <path d="M2 0h15l-2 25H4z" fill={index < 8 ? "#4f8999" : "#d6cfbc"} />
          <circle cx="9.5" cy="10" r="4" fill="#f2eedf" />
          <circle cx="9.5" cy="10" r="1.6" fill={index < 8 ? "#4f8999" : "#d6cfbc"} />
        </g>
      ))}
      <path
        d="M12 85 C44 78 65 86 92 76 S142 83 166 70 S208 75 230 61"
        fill="none"
        stroke="#d72f3f"
        strokeWidth="3"
      />
    </svg>
  )
}

function MiniEarthquakesPreview() {
  const dots = [
    [48, 42, 3.2, "#f0c4a0"],
    [56, 50, 2.4, "#e89a6a"],
    [62, 38, 4.1, "#e07060"],
    [70, 55, 2.8, "#f0c4a0"],
    [78, 46, 3.5, "#9b6bb0"],
    [52, 60, 2.2, "#e89a6a"],
    [88, 40, 2.6, "#f0c4a0"],
    [94, 52, 3.8, "#e07060"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f7f7f7" />
      <circle cx="52" cy="48" r="34" fill="#fff" stroke="#d0d0d0" strokeWidth="1" />
      <ellipse cx="52" cy="48" rx="34" ry="12" fill="none" stroke="#e0e0e0" strokeWidth="0.6" />
      <ellipse cx="52" cy="48" rx="12" ry="34" fill="none" stroke="#e0e0e0" strokeWidth="0.6" />
      <path
        d="M28,40 C34,28 48,24 62,30 C70,34 76,44 72,54 C66,66 48,70 36,60 C28,54 24,46 28,40Z"
        fill="none"
        stroke="#222"
        strokeWidth="1.1"
      />
      {dots.map(([x, y, r, fill], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity="0.9" />
      ))}
      <rect x="104" y="14" width="42" height="22" fill="#fff" stroke="#e0e0e0" />
      <text x="110" y="24" fill="#222" fontSize="8" fontWeight="700">
        172
      </text>
      <text x="110" y="32" fill="#777" fontSize="5">
        facing
      </text>
      <rect x="152" y="14" width="42" height="22" fill="#fff" stroke="#e0e0e0" />
      <text x="158" y="24" fill="#222" fontSize="8" fontWeight="700">
        M 8.1
      </text>
      <text x="158" y="32" fill="#777" fontSize="5">
        strongest
      </text>
      <rect x="200" y="14" width="34" height="22" fill="#fff" stroke="#e0e0e0" />
      <text x="204" y="24" fill="#222" fontSize="7" fontWeight="700">
        623
      </text>
      <text x="204" y="32" fill="#777" fontSize="5">
        km
      </text>
      <rect x="104" y="46" width="88" height="8" fill="#f0c4a0" />
      <rect x="104" y="58" width="42" height="8" fill="#e89a6a" />
      <rect x="104" y="70" width="18" height="8" fill="#e07060" />
      <rect x="104" y="82" width="14" height="8" fill="#9b6bb0" />
      <path
        d="M198,78 C204,62 212,56 220,52 C228,48 234,54 232,64 C230,72 224,78 218,80"
        fill="none"
        stroke="#4a7fd4"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function MiniEuropaLanguagesPreview() {
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f6f0e4" />
      <rect x="8" y="10" width="52" height="76" fill="#ebe3d2" stroke="#c8bba4" />
      {[
        [14, 18, "#c45a78"],
        [14, 28, "#e8a0b4"],
        [14, 38, "#8fd4bc"],
        [14, 48, "#d8b86a"],
        [14, 58, "#5a6fa8"],
        [14, 68, "#2a2a2a"],
      ].map(([x, y, fill], i) => (
        <g key={i}>
          <rect x={x} y={y} width="10" height="6" fill={fill} stroke="#2a2218" strokeWidth="0.4" />
          <path
            d={`M${x + 14},${y + 3}h28`}
            stroke="#6a5a48"
            strokeWidth="0.8"
            strokeDasharray="2 1.5"
          />
        </g>
      ))}
      <path
        d="M78,22 C90,14 120,12 145,20 C168,28 188,24 210,30 C220,34 226,48 218,62 C208,78 170,84 140,78 C110,72 88,70 78,58 C70,48 70,30 78,22Z"
        fill="#d8b86a"
        fillOpacity="0.85"
        stroke="#2a2218"
        strokeWidth="1"
      />
      <path
        d="M120,28 C140,22 165,26 175,40 C182,52 170,66 148,68 C128,70 112,58 112,44 C112,34 114,30 120,28Z"
        fill="#c45a78"
        fillOpacity="0.9"
        stroke="#2a2218"
        strokeWidth="0.9"
      />
      <path
        d="M175,30 C195,26 215,34 218,48 C220,58 205,68 188,66 C176,64 168,52 170,40 C171,34 173,31 175,30Z"
        fill="#8fd4bc"
        fillOpacity="0.9"
        stroke="#2a2218"
        strokeWidth="0.9"
      />
      <path
        d="M95,48 C108,46 118,52 120,62 C122,72 108,78 96,74 C86,70 88,52 95,48Z"
        fill="#e8d8a0"
        stroke="#2a2218"
        strokeWidth="0.8"
      />
      <text x="200" y="88" fill="#2a2218" fontSize="9" fontStyle="italic" fontFamily="Georgia, serif">
        Europa
      </text>
    </svg>
  )
}

function MiniOregonTrailPreview() {
  const carets = [
    [70, 30],
    [86, 26],
    [150, 34],
    [166, 30],
    [110, 60],
    [128, 66],
    [50, 44],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#1a1ae0" />
      <rect x="7" y="7" width="228" height="82" fill="#b9b9b9" />
      {/* coastline on the left */}
      <path
        d="M30,9 L26,24 L34,36 L24,50 L32,66 L22,82 L30,88"
        fill="none"
        stroke="#101010"
        strokeWidth="1.4"
      />
      {/* a blue river */}
      <path
        d="M210,20 Q150,26 138,44 Q128,58 70,60 Q48,62 40,74"
        fill="none"
        stroke="#2b3bff"
        strokeWidth="1.4"
      />
      {/* mountains */}
      {carets.map(([x, y], i) => (
        <path
          key={i}
          d={`M${x - 5},${y + 3} L${x},${y - 4} L${x + 5},${y + 3}`}
          fill="none"
          stroke="#101010"
          strokeWidth="1.2"
        />
      ))}
      {/* the route */}
      <path
        d="M206,64 L168,58 L138,54 L104,46 L70,44 L44,40"
        fill="none"
        stroke="#101010"
        strokeWidth="2"
      />
      {/* forts */}
      {[
        [168, 58],
        [104, 46],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x - 4}
          y={y - 4}
          width="8"
          height="8"
          fill="#b9b9b9"
          stroke="#101010"
          strokeWidth="1.4"
        />
      ))}
      {/* START + FINISH */}
      <rect x="206" y="58" width="30" height="13" fill="#c26a12" stroke="#101010" strokeWidth="1" />
      <text
        x="221"
        y="68"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fontFamily="monospace"
        fill="#101010"
      >
        START
      </text>
      <text
        x="44"
        y="34"
        textAnchor="middle"
        fontSize="8"
        fontWeight="700"
        fontFamily="monospace"
        fill="#101010"
      >
        ★
      </text>
      <text
        x="121"
        y="20"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fontFamily="monospace"
        fill="#f2f2f2"
        stroke="#101010"
        strokeWidth="2.4"
        paintOrder="stroke"
      >
        OREGON TRAIL
      </text>
    </svg>
  )
}

function MiniNetworkVizPreview() {
  const nodes = [
    [42, 30, "#8a2b22"],
    [78, 20, "#2f6d6a"],
    [70, 56, "#2f6d6a"],
    [110, 40, "#2f6d6a"],
    [150, 26, "#caa53d"],
    [158, 60, "#caa53d"],
    [196, 44, "#3f5b86"],
    [120, 72, "#6b7233"],
  ]
  const edges = [
    [0, 1, true],
    [0, 2, true],
    [1, 3, false],
    [2, 3, false],
    [3, 4, false],
    [4, 5, false],
    [5, 6, false],
    [2, 7, false],
    [3, 5, false],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f3ecda" />
      <rect x="6" y="6" width="230" height="84" fill="none" stroke="#c8bb9c" />
      {edges.map(([a, b, ego], index) => (
        <line
          key={index}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke={ego ? "#8a2b22" : "#2a241d"}
          strokeWidth={ego ? 1.6 : 0.8}
          opacity={ego ? 0.9 : 0.4}
        />
      ))}
      {nodes.map(([x, y, fill], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={index === 0 ? 6 : 4.5}
          fill={fill}
          stroke={index === 0 ? "#8a2b22" : "#2a241d"}
          strokeWidth={index === 0 ? 2 : 1}
        />
      ))}
      {/* arc-diagram strip */}
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={`b${i}`} cx={150 + i * 18} cy={84} r="2.4" fill="#2a241d" />
      ))}
      <path
        d="M150,84 Q177,68 204,84 M168,84 Q186,72 204,84"
        fill="none"
        stroke="#8a2b22"
        strokeWidth="1"
        opacity="0.7"
      />
    </svg>
  )
}

function MiniGestaltPreview() {
  const dots = []
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      dots.push([18 + col * 26, 24 + row * 24, col % 2 === 1])
    }
  }
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f1e7d2" />
      <rect x="0" y="0" width="242" height="7" fill="#1a1610" />
      <rect
        x="10"
        y="14"
        width="42"
        height="62"
        fill="none"
        stroke="#1a1610"
        strokeWidth="1.5"
        strokeDasharray="4 2"
      />
      {dots.map(([x, y, active], index) =>
        active ? (
          <rect
            key={index}
            x={x - 5}
            y={y - 5}
            width="10"
            height="10"
            fill="#df2b1f"
            stroke="#1a1610"
          />
        ) : (
          <circle key={index} cx={x} cy={y} r="5" fill="#b1a78f" stroke="#1a1610" />
        ),
      )}
      <rect x="0" y="89" width="81" height="7" fill="#df2b1f" />
      <rect x="81" y="89" width="80" height="7" fill="#2a4cad" />
      <rect x="161" y="89" width="81" height="7" fill="#f3b724" />
    </svg>
  )
}

function MiniSemioticStandardPreview() {
  const signs = [
    { x: 12, y: 12, kind: "line" },
    { x: 68, y: 12, kind: "bars" },
    { x: 124, y: 12, kind: "network" },
    { x: 180, y: 12, kind: "map" },
    { x: 12, y: 53, kind: "dots" },
    { x: 68, y: 53, kind: "area" },
    { x: 124, y: 53, kind: "flow" },
    { x: 180, y: 53, kind: "pile" },
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f6f5ef" />
      {signs.map((sign) => (
        <g key={`${sign.x}-${sign.y}`} transform={`translate(${sign.x} ${sign.y})`}>
          <rect width="48" height="34" rx="5" fill="#e7e9f1" stroke="#ed1c24" strokeWidth="5" />
          {sign.kind === "line" && <path d="M7 25 17 15 27 20 40 8" fill="none" stroke="#11110e" strokeWidth="3" />}
          {sign.kind === "bars" && <path d="M8 26V18h6v8m5 0V9h6v17m5 0V14h6v12" stroke="#343d96" strokeWidth="5" />}
          {sign.kind === "network" && <><path d="m10 23 12-12 15 13M22 11v15" stroke="#8f8782" /><circle cx="10" cy="23" r="3" fill="#11110e" /><circle cx="22" cy="11" r="4" fill="#ed1c24" /><circle cx="37" cy="24" r="3" fill="#343d96" /></>}
          {sign.kind === "map" && <><path d="m7 19 8-9 8 5 7-5 11 9-8 8-10-3-8 4Z" fill="#11110e" /><circle cx="30" cy="16" r="4" fill="#ed6711" /></>}
          {sign.kind === "dots" && <><circle cx="9" cy="24" r="2" fill="#11110e" /><circle cx="16" cy="18" r="3" fill="#11110e" /><circle cx="23" cy="12" r="2" fill="#11110e" /><circle cx="30" cy="24" r="3" fill="#ed1c24" /><circle cx="37" cy="18" r="2" fill="#11110e" /></>}
          {sign.kind === "area" && <path d="M6 27V22l9-10 9 5 9-9 9 7v12Z" fill="#343d96" />}
          {sign.kind === "flow" && <><path d="M7 9c14 0 13 15 33 15M7 24c15 0 18-15 33-15" fill="none" stroke="#ed6711" strokeWidth="4" /><path d="m36 20 5 4-6 2" fill="#ed6711" /></>}
          {sign.kind === "pile" && <><path d="M12 27h30M15 22h24M18 17h18M21 12h12" stroke="#11110e" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 5" /><circle cx="21" cy="12" r="2.6" fill="#ed1c24" /><circle cx="27" cy="12" r="2.6" fill="#ed1c24" /><circle cx="33" cy="12" r="2.6" fill="#ed1c24" /></>}
        </g>
      ))}
      <rect y="92" width="242" height="4" fill="#ed1c24" />
    </svg>
  )
}

function MiniMobileVisPreview() {
  const bars = [46, 68, 35, 82, 55]
  const dots = [
    [30, 28, "#f25f3a"],
    [54, 38, "#f25f3a"],
    [78, 24, "#f25f3a"],
    [122, 62, "#1f8a70"],
    [148, 48, "#1f8a70"],
    [174, 58, "#1f8a70"],
    [202, 36, "#26334a"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f7efe0" />
      <rect x="8" y="8" width="66" height="80" rx="10" fill="#19231f" />
      <rect x="15" y="18" width="52" height="60" rx="4" fill="#f7efe0" />
      {bars.map((h, index) => (
        <rect
          key={index}
          x={20 + index * 9}
          y={72 - h * 0.46}
          width="6"
          height={h * 0.46}
          fill={index === 3 ? "#f25f3a" : "#1f8a70"}
        />
      ))}
      <path
        d="M94 76 C112 32 132 54 150 30 S184 62 218 24"
        fill="none"
        stroke="#f25f3a"
        strokeWidth="3"
      />
      {dots.map(([x, y, fill], index) => (
        <circle key={index} cx={x} cy={y} r={index === 6 ? 6 : 4} fill={fill} />
      ))}
      <rect x="92" y="70" width="132" height="12" rx="6" fill="#26334a" opacity="0.9" />
      <rect x="100" y="73" width="35" height="6" rx="3" fill="#f7efe0" />
      <rect x="142" y="73" width="29" height="6" rx="3" fill="#f25f3a" />
      <rect x="178" y="73" width="37" height="6" rx="3" fill="#1f8a70" />
      <text x="92" y="18" fill="#19231f" fontSize="10" fontWeight="900" fontFamily="sans-serif">
        MOBILE FIRST
      </text>
    </svg>
  )
}

function MiniPortReplayPreview() {
  const routes = [
    { y: 20, color: "#ff7043" },
    { y: 30, color: "#36d6b3" },
    { y: 40, color: "#ffd166" },
    { y: 50, color: "#68a7ff" },
    { y: 60, color: "#c996ff" },
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#07171d" />
      <path
        d="M0 18H242M0 42H242M0 66H242M34 0V96M82 0V96M130 0V96M178 0V96M226 0V96"
        stroke="#19343b"
        strokeWidth="1"
      />
      <rect x="14" y="12" width="48" height="8" fill="#ff7043" />
      <text x="14" y="34" fill="#f5ecdc" fontSize="13" fontWeight="800" fontFamily="sans-serif">
        BOXES
      </text>
      <text x="14" y="48" fill="#f5ecdc" fontSize="13" fontWeight="800" fontFamily="sans-serif">
        WAIT
      </text>
      {routes.map((route, index) => (
        <g key={route.color}>
          <path
            d={`M82 ${route.y} C126 ${route.y - 8}, 156 ${70 - index * 2}, 218 60`}
            fill="none"
            stroke={route.color}
            strokeWidth={index === 0 ? 3 : 2}
            opacity="0.9"
          />
          <circle cx="82" cy={route.y} r="2.5" fill={route.color} />
        </g>
      ))}
      <rect x="196" y="54" width="30" height="19" fill="none" stroke="#ffd166" />
      <path d="M197 80h29" stroke="#36d6b3" strokeWidth="5" />
    </svg>
  )
}

function MiniScrollTellPreview() {
  const beats = [
    [14, 70, "#5bd6c0"],
    [30, 67, "#5bd6c0"],
    [46, 65, "#5bd6c0"],
    [62, 69, "#5bd6c0"],
    [80, 74, "#7f8ba0"],
    [98, 83, "#ff5fb0"],
    [110, 85, "#ff5fb0"],
    [128, 69, "#5bd6c0"],
    [150, 65, "#5bd6c0"],
    [172, 67, "#5bd6c0"],
    [196, 64, "#5bd6c0"],
    [220, 66, "#5bd6c0"],
  ]
  const trace = "M8,52 C40,46 58,20 84,22 C100,23 104,34 114,30 C150,14 196,10 234,7"
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#0e1620" />
      {[20, 40].map((y) => (
        <line key={y} x1="8" x2="234" y1={y} y2={y} stroke="#222e3a" strokeWidth="0.6" />
      ))}
      <line x1="8" x2="234" y1="76" y2="76" stroke="#2b3a44" strokeWidth="0.8" />
      <path d={`${trace} L234,52 L8,52 Z`} fill="rgba(91,214,192,0.14)" />
      <path d={trace} fill="none" stroke="#5bd6c0" strokeWidth="2.2" />
      <circle cx="234" cy="7" r="3" fill="#5bd6c0" />
      {beats.map(([x, y, color], index) => (
        <circle
          key={index}
          cx={x}
          cy={y}
          r={color === "#ff5fb0" ? 3.2 : 2.6}
          fill={color}
          opacity={color === "#7f8ba0" ? 0.6 : 0.9}
        />
      ))}
    </svg>
  )
}

function MiniDatavizPeoplePreview() {
  const colors = [
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
  const bars = [68, 42, 82, 56, 74]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#fff8dd" />
      <rect
        x="7"
        y="7"
        width="228"
        height="82"
        rx="6"
        fill="#fffaf0"
        stroke="#151515"
        strokeWidth="2"
      />
      <path
        d="M14 75C54 24 82 36 112 52S168 73 220 20"
        fill="none"
        stroke="#151515"
        strokeWidth="2.4"
      />
      {colors.map((color, index) => {
        const x = 24 + (index % 6) * 36
        const y = 24 + Math.floor(index / 6) * 24
        return (
          <g key={color} transform={`translate(${x} ${y})`}>
            <rect
              x="-8"
              y="-8"
              width="16"
              height="16"
              rx="4"
              fill={color}
              stroke="#151515"
              strokeWidth="1.6"
            />
            <circle cx="0" cy="-1" r="4" fill="#fff8dd" stroke="#151515" strokeWidth="1" />
            <path d="M-4 7Q0 4 4 7" fill="none" stroke="#fff8dd" strokeWidth="2" />
          </g>
        )
      })}
      <g transform="translate(20 61)">
        {bars.map((width, index) => (
          <g key={index} transform={`translate(0 ${index * 5})`}>
            <rect width="82" height="3" fill="#e8ddba" />
            <rect width={width} height="3" fill={colors[index]} />
          </g>
        ))}
      </g>
      <g transform="translate(130 54)">
        <path
          d="M0 28C18 0 36 28 54 4S82 20 94 8"
          fill="none"
          stroke="#2f6f88"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="54" cy="4" r="5" fill="#e0a92f" stroke="#151515" strokeWidth="1.4" />
      </g>
      <text x="18" y="20" fill="#151515" fontSize="9" fontWeight="950" fontFamily="sans-serif">
        12 DATAVIZ PEOPLE
      </text>
    </svg>
  )
}

function MiniDistantReadingPreview() {
  const bars = [
    ["#d95f43", 30, 56],
    ["#1f9a8a", 42, 42],
    ["#4f6fb3", 54, 68],
    ["#b33b65", 66, 34],
  ]
  const flows = [
    [116, 35, 170, 25, "#4f6fb3"],
    [116, 44, 184, 48, "#d95f43"],
    [116, 53, 168, 70, "#1f9a8a"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f8f3e3" />
      <rect x="7" y="7" width="228" height="82" fill="#fff8e8" stroke="#1f2528" strokeWidth="1.4" />
      {[0, 1, 2, 3].map((index) => (
        <g key={index} transform={`translate(${18 + index * 21} 18)`}>
          <rect
            width="15"
            height="58"
            rx="2"
            fill={["#486a8f", "#8f5b73", "#7f3046", "#6d7340"][index]}
            stroke="#1f2528"
            strokeWidth="1"
          />
          <rect x="3" y="8" width="9" height="4" rx="2" fill="#fff8e8" opacity="0.85" />
          <rect x="4" y="20" width="7" height="28" fill="#fff8e8" opacity="0.18" />
        </g>
      ))}
      <path d="M110 77H208" stroke="#1f2528" strokeWidth="1.1" />
      <path d="M110 22V77" stroke="#1f2528" strokeWidth="1.1" />
      {bars.map(([color, x, y], index) => (
        <rect
          key={color}
          x={x + 78}
          y={y}
          width="7"
          height={77 - y}
          fill={color}
          opacity={index === 2 ? 1 : 0.72}
        />
      ))}
      <path
        d="M110,61 C128,52 140,66 158,42 C174,20 190,24 216,16"
        fill="none"
        stroke="#4f6fb3"
        strokeWidth="2.4"
      />
      <circle cx="216" cy="16" r="3.2" fill="#4f6fb3" />
      {flows.map(([sx, sy, tx, ty, color]) => (
        <path
          key={color}
          d={`M${sx},${sy} C${138},${sy} ${144},${ty} ${tx},${ty}`}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.72"
        />
      ))}
      <text x="17" y="86" fill="#1f2528" fontSize="9" fontWeight="900" fontFamily="serif">
        DISTANT READING ROOM
      </text>
    </svg>
  )
}

function MiniFunnelsPreview() {
  const bars = [
    [18, 18, 206, "#ff4fa3"],
    [38, 34, 166, "#14c7ff"],
    [58, 50, 126, "#ffd84d"],
    [78, 66, 86, "#42d66b"],
  ]
  const flow = "M142 24 C166 28 160 42 184 46 C207 50 199 66 224 70"
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#fff7d6" />
      <rect x="0" y="0" width="242" height="8" fill="#101014" />
      <circle cx="30" cy="78" r="24" fill="#ffd84d" stroke="#101014" strokeWidth="3" />
      {bars.map(([x, y, width, fill]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={width}
          height="12"
          fill={fill}
          stroke="#101014"
          strokeWidth="2"
        />
      ))}
      <path d={flow} fill="none" stroke="#101014" strokeWidth="7" strokeLinecap="round" />
      <path d={flow} fill="none" stroke="#ff4fa3" strokeWidth="3" strokeLinecap="round" />
      <text
        x="30"
        y="82"
        textAnchor="middle"
        fill="#101014"
        fontSize="13"
        fontWeight="950"
        fontFamily="sans-serif"
      >
        POW
      </text>
    </svg>
  )
}

function MiniMachinePreview() {
  const candidates = [
    [34, "#7c6cf0", true],
    [24, "#5a4fb0", false],
    [18, "#5a4fb0", false],
    [12, "#473f86", false],
  ]
  const dots = [
    [152, 70],
    [168, 56],
    [184, 60],
    [200, 44],
    [216, 50],
    [230, 33],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#14121f" />
      {candidates.map(([meter, color, highlight], index) => (
        <g key={index} transform={`translate(12,${13 + index * 17})`}>
          <rect
            x="0"
            y="0"
            width="96"
            height="12"
            rx="3"
            fill={highlight ? "rgba(124,108,240,0.18)" : "#1d1a2b"}
            stroke={highlight ? "#7c6cf0" : "none"}
            strokeWidth={highlight ? 1 : 0}
          />
          <rect x="7" y="4" width="38" height="4" rx="2" fill="#3a3550" />
          <rect x="52" y="4" width={meter} height="4" rx="2" fill={color} />
        </g>
      ))}
      <path
        d="M110,19 C126,19 126,42 140,44"
        fill="none"
        stroke="#7c6cf0"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
      <path d="M140,44 l-6,-3 l1,5 z" fill="#7c6cf0" />
      <line x1="146" y1="78" x2="234" y2="78" stroke="#2a2740" strokeWidth="0.8" />
      <line x1="146" y1="20" x2="146" y2="78" stroke="#2a2740" strokeWidth="0.8" />
      {dots.map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r="3" fill="#7c6cf0" opacity="0.92" />
      ))}
    </svg>
  )
}

function MiniArchitecturePreview() {
  const branchX = [38, 92, 150, 204]
  const leaves = branchX.flatMap((x, group) =>
    [0, 1, 2].map((row) => ({
      x: x + (row % 2 === 0 ? -10 : 10),
      y: 15 + row * 16 + (group % 2) * 2,
      group,
    })),
  )
  const roots = [
    [42, 82],
    [82, 90],
    [122, 80],
    [162, 90],
    [202, 82],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#18251f" />
      <path
        d="M0,68 C50,64 85,71 121,68 S192,64 242,68"
        fill="none"
        stroke="#756246"
        strokeWidth="1"
      />
      {branchX.map((x, index) => (
        <path
          key={x}
          d={`M121,61 C121,51 ${x},54 ${x},45`}
          fill="none"
          stroke={index === 1 ? "#dfb348" : "#6ca77b"}
          strokeWidth={index === 1 ? "2.4" : "1.2"}
        />
      ))}
      {leaves.map((leaf, index) => (
        <g key={index}>
          <path
            d={`M${branchX[leaf.group]},45 C${branchX[leaf.group]},34 ${leaf.x},34 ${leaf.x},${leaf.y + 5}`}
            fill="none"
            stroke="#6ca77b"
            strokeWidth=".7"
            opacity=".8"
          />
          <rect
            x={leaf.x - 8}
            y={leaf.y}
            width="16"
            height="7"
            rx="3.5"
            fill={index % 5 === 0 ? "#dfb348" : "#6ca77b"}
          />
        </g>
      ))}
      <rect x="107" y="52" width="28" height="15" rx="4" fill="#b57945" stroke="#dfb348" />
      {roots.map(([x, y], index) => (
        <g key={x}>
          <path
            d={`M121,67 C121,75 ${x},72 ${x},${y}`}
            fill="none"
            stroke="#5191a2"
            strokeWidth=".7"
            strokeDasharray="2 2"
          />
          <rect
            x={x - 13}
            y={y - 4}
            width="26"
            height="8"
            rx="3"
            fill="#243a3c"
            stroke="#5191a2"
            strokeWidth=".5"
          />
        </g>
      ))}
    </svg>
  )
}

function MiniOctopusPreview() {
  const routes = [
    [121, 41, 38, 30, -14],
    [121, 41, 70, 58, 12],
    [121, 41, 186, 30, 18],
    [121, 41, 205, 65, 24],
    [121, 41, 25, 70, -22],
  ]
  const frames = [
    [62, 74, "#3b6ea8"],
    [96, 72, "#c64a3d"],
    [146, 72, "#5e8f5a"],
    [180, 74, "#b8872d"],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#f4eddb" />
      <text
        x="121"
        y="14"
        textAnchor="middle"
        fill="#191512"
        fontSize="11"
        fontWeight="900"
        fontFamily="serif"
      >
        FREIHEIT DER MEERE
      </text>
      <path
        d="M8,26 C30,18 54,24 71,18 C92,10 108,20 124,18 C150,16 168,23 190,19 C212,16 230,24 236,36 L236,57 C214,50 195,58 174,54 C148,49 127,61 100,54 C74,48 54,56 29,50 C18,48 10,40 8,26Z"
        fill="#111"
        opacity="0.95"
      />
      {routes.map(([sx, sy, tx, ty, bow], index) => (
        <path
          key={index}
          d={`M${sx},${sy} C${sx + (tx - sx) * 0.35},${sy + bow} ${sx + (tx - sx) * 0.74},${ty - bow} ${tx},${ty}`}
          fill="none"
          stroke="#d63f33"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ))}
      <g transform="translate(121 42)">
        <ellipse cx="0" cy="-7" rx="10" ry="13" fill="#f4eddb" stroke="#191512" strokeWidth="1.4" />
        <circle cx="-3" cy="-7" r="1.1" fill="#191512" />
        <circle cx="3" cy="-7" r="1.1" fill="#191512" />
      </g>
      <path d="M20,82 H222" stroke="#191512" strokeWidth="1" />
      {frames.map(([x, y, color], index) => (
        <g key={color}>
          <path
            d={`M121,62 C121,75 ${x},61 ${x},${y}`}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse
            cx={x}
            cy={y - 5}
            rx="8"
            ry="9"
            fill="#fff8e9"
            stroke={color}
            strokeWidth="1.8"
          />
          {[0, 1, 2].map((bar) => (
            <rect
              key={bar}
              x={x + (index < 2 ? -30 : 13)}
              y={y - 12 + bar * 7}
              width={12 + bar * 5}
              height="4"
              fill={color}
            />
          ))}
        </g>
      ))}
      <text
        x="121"
        y="91"
        textAnchor="middle"
        fill="#191512"
        fontSize="10"
        fontWeight="900"
        fontFamily="sans-serif"
      >
        SEMIOTIC IS AN OCTOPUS
      </text>
    </svg>
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
        />,
      )
    }
  }
  const resources = [
    [82, 38],
    [142, 38],
    [102, 68],
    [162, 68],
    [121, 82],
  ]
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
    [36, 15, "red"],
    [112, 11, "ink"],
    [196, 19, "ink"],
    [70, 42, "ink"],
    [146, 39, "red"],
    [205, 49, "ink"],
    [39, 70, "ink"],
    [116, 65, "ink"],
    [184, 76, "ink"],
  ]
  const edges = [
    [0, 3],
    [1, 3],
    [1, 4],
    [2, 5],
    [3, 6],
    [3, 7],
    [4, 7],
    [4, 8],
    [5, 8],
  ]
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
      {nodes.map(([x, y, type], index) =>
        type === "red" ? (
          <rect
            key={index}
            x={x - 10}
            y={y - 4}
            width="20"
            height="8"
            fill="none"
            stroke="#a52928"
          />
        ) : (
          <path
            key={index}
            d={`M${x - 11},${y - 2} Q${x},${y + 9} ${x + 11},${y - 2}`}
            fill="none"
            stroke="#25211d"
          />
        ),
      )}
      <rect y="86" width="242" height="10" fill="#a52928" />
    </svg>
  )
}

function MiniUrinePreview() {
  const palette = [
    "#d99a2b",
    "#cc7d22",
    "#b3531c",
    "#9e3318",
    "#8c1410",
    "#5e1518",
    "#3b2f4a",
    "#4f6f33",
    "#45495a",
    "#595a5c",
    "#211c1a",
    "#f1ecdc",
    "#d2d6c4",
    "#dcc8a0",
    "#ecca6a",
    "#e8b021",
  ]
  const cx = 121
  const cy = 48
  const ring = 37
  const inner = 16
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#efe5cb" />
      {/* tree of health */}
      <path
        d={`M${cx},${cy + 22} C${cx - 4},${cy + 4} ${cx + 4},${cy - 8} ${cx},${cy - 24}`}
        fill="none"
        stroke="#4d7a35"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
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
  const tips = [
    [19, 16],
    [70, 9],
    [121, 6],
    [174, 10],
    [224, 19],
  ]
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
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [1, 5],
    [2, 6],
    [2, 7],
    [3, 4],
    [4, 6],
    [4, 8],
    [3, 9],
    [6, 10],
    [6, 11],
    [7, 12],
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

function MiniMaupPreview() {
  const cellSize = 17
  const cols = 14
  const rows = 5
  const cells = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const t = col / (cols - 1)
      const fill = t < 0.5 ? "#4d83a8" : "#db9b55"
      cells.push({ x: 7 + col * cellSize, y: 7 + row * cellSize, fill })
    }
  }
  const seamX = 7 + 7.4 * cellSize
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#101820" />
      {cells.map((cell, index) => (
        <rect
          key={index}
          x={cell.x}
          y={cell.y}
          width={cellSize - 1}
          height={cellSize - 1}
          fill={cell.fill}
          opacity="0.85"
        />
      ))}
      <line
        x1={seamX}
        y1="4"
        x2={seamX}
        y2="92"
        stroke="#ffffff"
        strokeWidth="2"
        strokeDasharray="5 3"
      />
      <circle cx={seamX} cy="48" r="7" fill="#101820" stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  )
}

function MiniWarsPreview() {
  const rows = [
    {
      color: "#96abb1",
      spans: [
        [8, 42],
        [55, 65],
        [163, 188],
      ],
    },
    {
      color: "#313746",
      spans: [
        [10, 58],
        [78, 132],
        [145, 154],
      ],
    },
    {
      color: "#b0909d",
      spans: [
        [30, 50],
        [88, 127],
        [170, 222],
      ],
    },
    {
      color: "#687a97",
      spans: [
        [72, 110],
        [132, 164],
        [205, 232],
      ],
    },
    {
      color: "#8a6f55",
      spans: [
        [44, 63],
        [95, 114],
      ],
    },
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
        <pattern
          id="examples-preview-hatch"
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
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
      <path
        d={`${mean} L242,74 C210,70 176,70 132,66 C88,61 44,59 0,62 Z`}
        fill="rgba(239, 68, 68, 0.55)"
      />
      <path
        d={mean}
        fill="none"
        stroke="rgba(100, 116, 139, 0.8)"
        strokeWidth="2"
        strokeDasharray="4 5"
      />
      <path
        d={line}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="205"
        x2="205"
        y1="12"
        y2="88"
        stroke="rgba(148, 163, 184, 0.7)"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      <circle cx="205" cy="70" r="5" fill="var(--text-primary)" />
    </svg>
  )
}

function MiniStakeholderJourneyPreview() {
  const bodies = [
    [58, 60, "#e2e8ee"],
    [92, 70, "#43d6f1"],
    [142, 64, "#ffe08a"],
    [206, 72, "#263653"],
    [58, 132, "#e2e8ee"],
    [104, 126, "#43d6f1"],
    [166, 137, "#94d7cd"],
    [394, 146, "#1f63a8"],
  ]
  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="Mini stakeholder journey bowtie preview"
    >
      <rect width="500" height="200" fill="#fffaf0" />
      <text x="34" y="25" fill="#22304a" fontSize="12" fontWeight="900">
        STACKED BOWTIES
      </text>
      <path
        d="M 24 38 L 196 61 L 196 79 L 24 100 Z"
        fill="#ffffff"
        stroke="#22304a"
        strokeWidth="2.2"
      />
      <path d="M 196 61 L 236 61 L 236 79 L 196 79 Z" fill="#087895" opacity="0.72" />
      <path
        d="M 236 61 L 342 38 L 342 100 L 236 79 Z"
        fill="#ffe8a8"
        stroke="#22304a"
        strokeWidth="2.2"
      />
      <path
        d="M 24 110 L 196 132 L 196 150 L 24 172 Z"
        fill="#ffffff"
        stroke="#22304a"
        strokeWidth="2.2"
      />
      <path d="M 196 132 L 236 132 L 236 150 L 196 150 Z" fill="#087895" opacity="0.4" />
      <path
        d="M 236 132 L 342 110 L 342 172 L 236 150 Z"
        fill="#d8dee6"
        stroke="#22304a"
        strokeWidth="2.2"
      />
      {[78, 124, 170].map((x) => (
        <path
          key={x}
          d={`M ${x} 42 C ${x + 8} 58, ${x - 8} 82, ${x} 98`}
          fill="none"
          stroke="#b63832"
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.55"
        />
      ))}
      {[78, 124, 170].map((x) => (
        <path
          key={`b-${x}`}
          d={`M ${x} 114 C ${x + 12} 128, ${x - 12} 154, ${x} 168`}
          fill="none"
          stroke="#7b8491"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.38"
        />
      ))}
      <rect x="366" y="38" width="42" height="48" fill="none" stroke="#287a48" strokeWidth="3" />
      <rect x="414" y="38" width="42" height="48" fill="none" stroke="#b63832" strokeWidth="3" />
      <rect x="366" y="94" width="90" height="76" fill="none" stroke="#1f63a8" strokeWidth="3" />
      {bodies.map(([x, y, fill], index) => (
        <circle
          key={`${x}-${y}-${index}`}
          cx={x}
          cy={y}
          r={index > 5 ? 8 : 7}
          fill={fill}
          stroke="#22304a"
          strokeWidth="2"
        />
      ))}
      <text x="412" y="187" textAnchor="middle" fill="#22304a" fontSize="12" fontWeight="900">
        OSE CANVAS FIELD
      </text>
    </svg>
  )
}

function MiniMergePressurePreview() {
  const prs = [
    [54, 74, "#dbeafe"],
    [92, 96, "#d8f5ee"],
    [132, 78, "#f7e0ff"],
    [214, 88, "#d8f5ee"],
    [246, 104, "#f7e0ff"],
    [282, 82, "#f7e0ff"],
    [324, 118, "#d8f5ee"],
  ]
  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="Mini merge pressure preview"
    >
      <rect width="500" height="200" fill="#f8fbfc" />
      <text x="38" y="30" fill="#233148" fontSize="12" fontWeight="900">
        CODING
      </text>
      <text x="178" y="30" fill="#233148" fontSize="12" fontWeight="900">
        FEATURES
      </text>
      <text x="286" y="30" fill="#b63832" fontSize="12" fontWeight="900">
        REVIEW DAM
      </text>
      <text x="410" y="30" fill="#233148" fontSize="12" fontWeight="900">
        APP
      </text>
      <path
        d="M 38 102 C 118 78, 178 116, 238 98 S 342 70, 424 102"
        fill="none"
        stroke="#8fa3af"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 11"
      />
      <rect
        x="260"
        y="44"
        width="72"
        height="118"
        rx="14"
        fill="#fff0d6"
        stroke="#b63832"
        strokeWidth="3"
        strokeDasharray="7 6"
      />
      {[62, 88, 114].map((y, index) => (
        <g key={y}>
          <line
            x1="162"
            y1={y}
            x2="394"
            y2={y}
            stroke="#50677a"
            strokeWidth="2"
            strokeDasharray="4 6"
            opacity={index === 1 ? 0.85 : 0.28}
          />
          <rect
            x="154"
            y={y - 15}
            width="82"
            height="30"
            rx="9"
            fill="#ffffff"
            stroke={index === 1 ? "#b63832" : "#64748b"}
            strokeWidth="2"
          />
          <rect
            x="390"
            y={y - 14}
            width="54"
            height="28"
            rx="7"
            fill={index === 0 ? "#f1c75b" : "#ffffff"}
            stroke={index === 1 ? "#b63832" : "#64748b"}
            strokeWidth="2"
          />
        </g>
      ))}
      {prs.map(([x, y, fill], index) => (
        <circle
          key={`${x}-${y}-${index}`}
          cx={x}
          cy={y}
          r={index > 4 ? 8 : 7}
          fill={fill}
          stroke={index > 3 ? "#9f2f2f" : "#244f72"}
          strokeWidth="2"
        />
      ))}
      <text
        x="250"
        y="182"
        textAnchor="middle"
        fill="#233148"
        fontSize="13"
        fontWeight="900"
        letterSpacing="1.4"
      >
        PR COUNT IS NOT PRODUCT VELOCITY
      </text>
    </svg>
  )
}

function MiniNimbyPreview() {
  const features = [
    [64, 84, "#45c2b4", "H"],
    [92, 58, "#8ddf5f", "A"],
    [104, 112, "#f0a6d2", "C"],
    [132, 82, "#f8c24e", "R"],
    [348, 144, "#c4b5fd", "P"],
    [380, 152, "#46b36a", "T"],
  ]
  const dollars = [
    [214, 72],
    [228, 98],
    [248, 86],
    [268, 112],
    [286, 95],
  ]
  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="Mini not in my backyard preview"
    >
      <rect width="500" height="200" fill="#f7fafb" />
      <path
        d="M 42 100 C 126 50, 184 148, 246 100 S 340 56, 430 100"
        fill="none"
        stroke="#9eb4c0"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="12 10"
      />
      {["ZONING", "DESIGN", "PARKING", "REVIEW", "COUNCIL"].map((label, index) => {
        const x = 126 + index * 68
        return (
          <g key={label}>
            <rect
              x={x - 21}
              y="44"
              width="42"
              height="112"
              rx="8"
              fill={index === 2 ? "#fff2cc" : index === 3 ? "#ffe4e6" : "#edf7f6"}
              stroke={index === 3 ? "#b63832" : "#287a74"}
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <text x={x} y="34" textAnchor="middle" fill="#233148" fontSize="8" fontWeight="900">
              {label}
            </text>
          </g>
        )
      })}
      <ellipse
        cx="330"
        cy="102"
        rx="54"
        ry="48"
        fill="none"
        stroke="#b63832"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      <rect
        x="414"
        y="66"
        width="58"
        height="70"
        rx="9"
        fill="#e3f7ec"
        stroke="#287a48"
        strokeWidth="2.5"
      />
      <text x="443" y="55" textAnchor="middle" fill="#287a48" fontSize="9" fontWeight="900">
        SOCKET
      </text>
      <circle cx="84" cy="88" r="27" fill="#0f8f82" stroke="#233148" strokeWidth="2.4" />
      <text x="84" y="92" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">
        84
      </text>
      {features.map(([x, y, fill, label], index) => (
        <g key={`${label}-${index}`}>
          <line
            x1={index > 3 ? 330 : 84}
            y1={index > 3 ? 118 : 88}
            x2={x}
            y2={y}
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="3 4"
          />
          <circle cx={x} cy={y} r="10" fill={fill} stroke="#233148" strokeWidth="1.6" />
          <text x={x} y={y + 3} textAnchor="middle" fill="#172033" fontSize="8" fontWeight="900">
            {label}
          </text>
        </g>
      ))}
      {dollars.map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          <circle
            cx={x}
            cy={y}
            r={index === 4 ? 8 : 7}
            fill="#d94a45"
            stroke="#7f1d1d"
            strokeWidth="1.5"
          />
          <text x={x} y={y + 3} textAnchor="middle" fill="#fff7ed" fontSize="10" fontWeight="900">
            $
          </text>
        </g>
      ))}
      <rect x="314" y="154" width="96" height="24" rx="7" fill="#fff1f2" stroke="#b63832" />
      <text x="362" y="171" textAnchor="middle" fill="#b63832" fontSize="9" fontWeight="900">
        LOST FEATURES
      </text>
    </svg>
  )
}

function MiniSentenceStructurePreview() {
  const words = ["I", "saw", "the", "man", "with", "the", "telescope"]
  const x = [42, 94, 153, 211, 279, 340, 417]
  const arcs = [
    { from: 1, to: 0, height: 34, label: "subject" },
    { from: 1, to: 3, height: 48, label: "object" },
    { from: 1, to: 4, height: 72, label: "instrument" },
    { from: 4, to: 6, height: 38, label: "object" },
  ]

  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="A sentence with words connected by grammatical arcs"
    >
      <rect width="500" height="200" fill="#f1eadb" />
      <path d="M0 22H500M0 178H500" stroke="#d4553f" strokeWidth="3" />
      <text x="24" y="43" fill="#26312e" fontSize="10" fontWeight="900" letterSpacing="2.2">
        THE SENTENCE IS THE STRUCTURE BETWEEN THEM
      </text>
      {arcs.map((arc) => {
        const start = x[arc.from]
        const end = x[arc.to]
        const left = Math.min(start, end)
        const right = Math.max(start, end)
        const peak = 128 - arc.height
        return (
          <g key={`${arc.from}-${arc.to}`}>
            <path
              d={`M${left} 132 Q${(left + right) / 2} ${peak} ${right} 132`}
              fill="none"
              stroke={arc.label === "instrument" ? "#d4553f" : "#315f63"}
              strokeWidth={arc.label === "instrument" ? 4 : 2.5}
            />
            <text
              x={(left + right) / 2}
              y={peak + 12}
              textAnchor="middle"
              fill="#59635f"
              fontSize="8"
              fontWeight="800"
            >
              {arc.label.toUpperCase()}
            </text>
          </g>
        )
      })}
      <line x1="24" x2="476" y1="133" y2="133" stroke="#26312e" strokeWidth="2" />
      {words.map((word, index) => (
        <g key={`${word}-${index}`}>
          <circle
            cx={x[index]}
            cy="133"
            r={index === 6 ? 8 : 4}
            fill={index === 6 ? "#d4553f" : "#f1eadb"}
            stroke={index === 6 ? "#d4553f" : "#26312e"}
            strokeWidth="2"
          />
          <text
            x={x[index]}
            y="157"
            textAnchor="middle"
            fill={index === 6 ? "#b23c2c" : "#26312e"}
            fontSize={index === 6 ? 15 : 13}
            fontWeight={index === 6 ? 900 : 700}
          >
            {word}
          </text>
        </g>
      ))}
      <text x="476" y="190" textAnchor="end" fill="#315f63" fontSize="8" fontWeight="900">
        9 LINKED VIEWS · 1 PERSISTENT WORD
      </text>
    </svg>
  )
}

function MiniAnalystAdventurePreview() {
  const roomPanels = [
    { x: 28, label: "XY", color: "#24d7d7" },
    { x: 91, label: "ORD", color: "#ff4fd8" },
    { x: 154, label: "GEO", color: "#f5f5f5" },
    { x: 217, label: "NET", color: "#ffd84a" },
  ]

  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="Mini Analyst Adventure chart mystery preview"
    >
      <rect width="500" height="200" fill="#05070b" />
      <path
        d="M0 16H500M0 32H500M0 48H500M0 64H500M0 80H500M0 96H500M0 112H500M0 128H500M0 144H500M0 160H500M0 176H500M0 192H500"
        stroke="#101827"
      />
      <rect x="10" y="10" width="480" height="180" fill="none" stroke="#24d7d7" strokeWidth="3" />
      <rect x="18" y="18" width="464" height="28" fill="#101527" stroke="#ff4fd8" strokeWidth="2" />
      <text x="30" y="37" fill="#f5f5f5" fontSize="13" fontWeight="900" letterSpacing="1.8">
        ANALYST ADVENTURE
      </text>
      <text x="469" y="36" textAnchor="end" fill="#24d7d7" fontSize="8" fontWeight="800">
        ZORKCORP // 1984
      </text>

      {roomPanels.map(({ x, label, color }, index) => (
        <g key={label}>
          <rect x={x} y="59" width="49" height="45" fill="#0d1320" stroke={color} strokeWidth="2" />
          <path
            d={
              index === 0
                ? `M${x + 7} 92L${x + 18} 78L${x + 28} 84L${x + 42} 67`
                : index === 1
                  ? `M${x + 8} 94V78H${x + 18}V94M${x + 23} 94V68H${x + 33}V94M${x + 38} 94V83H${x + 43}V94`
                  : index === 2
                    ? `M${x + 8} 91L${x + 19} 69L${x + 30} 84L${x + 42} 66`
                    : `M${x + 10} 88L${x + 25} 69L${x + 40} 87M${x + 25} 69V94`
            }
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          <text x={x + 24.5} y="116" textAnchor="middle" fill={color} fontSize="8" fontWeight="900">
            {label}
          </text>
        </g>
      ))}

      <path d="M278 81H305" stroke="#ff4fd8" strokeWidth="2" strokeDasharray="4 3" />
      <polygon points="305,81 297,76 297,86" fill="#ff4fd8" />
      <rect
        x="314"
        y="57"
        width="151"
        height="69"
        fill="#0d1320"
        stroke="#ff4fd8"
        strokeWidth="2"
      />
      <text x="326" y="74" fill="#ffd84a" fontSize="8" fontWeight="900">
        EVIDENCE DISKETTE
      </text>
      <text x="326" y="91" fill="#f5f5f5" fontSize="8">
        01 STALE ROOF PING
      </text>
      <text x="326" y="104" fill="#f5f5f5" fontSize="8">
        02 DENOMINATOR KEY
      </text>
      <text x="326" y="117" fill="#24d7d7" fontSize="8">
        03 ORIGIN VECTOR_
      </text>

      <rect
        x="24"
        y="139"
        width="452"
        height="34"
        fill="#080d17"
        stroke="#f5f5f5"
        strokeWidth="2"
      />
      <text x="35" y="153" fill="#ff4fd8" fontSize="8" fontWeight="900">
        ZORKBOT-2000:
      </text>
      <text x="35" y="166" fill="#f5f5f5" fontSize="9">
        A TIMESTAMP IS NOT NECESSARILY WHEN IT HAPPENED.
      </text>
      <rect x="444" y="145" width="20" height="20" fill="#ffd84a" />
      <text x="454" y="159" textAnchor="middle" fill="#05070b" fontSize="10" fontWeight="900">
        ?
      </text>
    </svg>
  )
}

function MiniInsightForgePreview() {
  const rooms = [62, 103, 144, 185, 226]
  const line = [
    [32, 105],
    [49, 101],
    [67, 103],
    [85, 98],
    [103, 94],
    [121, 70],
    [139, 53],
    [157, 59],
    [175, 76],
    [193, 82],
    [211, 91],
    [229, 95],
  ]
  const artifacts = [
    [310, 62, "#b34c3d"],
    [351, 62, "#c59837"],
    [392, 62, "#557d85"],
    [433, 62, "#497054"],
    [310, 103, "#d2a43e"],
    [351, 103, "#9b493d"],
    [392, 144, "#477359"],
  ]
  return (
    <svg
      style={styles.preview}
      viewBox="0 0 500 200"
      role="img"
      aria-label="Mini Insight Forge analytical inventory preview"
    >
      <rect width="500" height="200" fill="#28332f" />
      <rect
        x="8"
        y="8"
        width="484"
        height="184"
        rx="4"
        fill="#e8d9b5"
        stroke="#bc9147"
        strokeWidth="3"
      />
      <rect x="10" y="10" width="480" height="31" fill="#46564f" />
      <path d="M10 39H490" stroke="#2b342f" strokeWidth="3" />
      <text x="24" y="29" fill="#f0d28a" fontSize="13" fontWeight="900" letterSpacing="1.5">
        THE INSIGHT FORGE
      </text>
      <text x="476" y="28" textAnchor="end" fill="#d5d2be" fontSize="8" fontWeight="800">
        CASE OF THE SHATTERED LANTERNS
      </text>

      {rooms.map((x, index) => (
        <g key={x}>
          {index > 0 && (
            <path d={`M${rooms[index - 1] + 11} 52H${x - 11}`} stroke="#9a7240" strokeWidth="2" />
          )}
          <circle
            cx={x}
            cy="52"
            r="8"
            fill={index < 3 ? "#52725d" : "#6a604d"}
            stroke="#d3aa55"
            strokeWidth="1.4"
          />
          <text x={x} y="55" textAnchor="middle" fill="#fff0c9" fontSize="7" fontWeight="900">
            {index + 1}
          </text>
        </g>
      ))}

      <rect x="22" y="65" width="223" height="91" fill="#f5ead0" stroke="#79694f" strokeWidth="2" />
      <rect x="27" y="72" width="12" height="76" fill="#d5c399" />
      <path d="M40 142H235M40 119H235M40 96H235" stroke="#b7a581" strokeWidth="1" />
      <path
        d={line.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(" ")}
        fill="none"
        stroke="#a94739"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M118 73V148" stroke="#c49332" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="118" y="72" width="55" height="76" fill="#a94739" opacity="0.09" />
      <text x="44" y="150" fill="#6e604d" fontSize="6" fontWeight="800">
        30-DAY RETURN RATE
      </text>

      <rect
        x="260"
        y="47"
        width="217"
        height="112"
        fill="#3a2c25"
        stroke="#9e7545"
        strokeWidth="3"
      />
      <text x="270" y="60" fill="#e7c46f" fontSize="8" fontWeight="900" letterSpacing="0.8">
        ANALYST&apos;S SATCHEL
      </text>
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3].map((column) => (
          <rect
            key={`${row}-${column}`}
            x={271 + column * 41}
            y={66 + row * 25}
            width="37"
            height="21"
            fill={row === 3 ? "#334638" : row === 2 ? "#493b30" : "#33403a"}
            stroke="#75664d"
          />
        )),
      )}
      {artifacts.map(([x, y, fill], index) => (
        <g key={`${x}-${y}`}>
          <rect
            x={x - 12}
            y={y + 6}
            width="24"
            height="17"
            rx="2"
            fill="#ead7aa"
            stroke={fill}
            strokeWidth={index === 6 ? 2.5 : 1.5}
            strokeDasharray={index === 5 ? "3 2" : undefined}
          />
          <path d={`M${x} ${y + 8}l4 6-4 6-4-6Z`} fill={fill} />
        </g>
      ))}

      <rect
        x="22"
        y="164"
        width="455"
        height="19"
        fill="#384640"
        stroke="#252d29"
        strokeWidth="2"
      />
      <rect x="154" y="167" width="67" height="13" fill="#2a2521" stroke="#c39748" />
      <rect x="279" y="167" width="67" height="13" fill="#2a2521" stroke="#c39748" />
      <path d="M237 178c8-19 16-19 24 0" fill="#d95e36" stroke="#f0bd50" strokeWidth="2" />
      <path d="M221 173h15M263 173h15" stroke="#d1a34d" strokeWidth="2" />
      <text x="372" y="177" fill="#f0d28a" fontSize="7" fontWeight="900">
        CRAFT EVIDENCE, NOT SCREENSHOTS
      </text>
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
  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: "5px",
    marginTop: "12px",
  },
  badge: {
    padding: "3px 6px",
    border: "1px solid var(--surface-3)",
    borderRadius: "999px",
    color: "var(--text-secondary)",
    background: "var(--surface-0)",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
}
