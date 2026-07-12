import React, { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { EXAMPLE_FILTERS, EXAMPLES } from "./examplesManifest"
import "./ExamplesOverviewPage.css"

const PREVIEW_COMPONENTS = {
  "insight-forge": MiniInsightForgePreview,
  watermarks: MiniWatermarksPreview,
  "stakeholder-journey": MiniStakeholderJourneyPreview,
  "merge-pressure": MiniMergePressurePreview,
  nimby: MiniNimbyPreview,
  combined: () => <MiniRadialPreview combined />,
  climate: MiniClimatePreview,
  "lake-isotype": MiniLakeIsotypePreview,
  "hotdog-variations": MiniHotDogPreview,
  "data-centers-isotype": MiniDataCentersIsotypePreview,
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
  mobilevis: MiniMobileVisPreview,
  networkviz: MiniNetworkVizPreview,
  oregontrail: MiniOregonTrailPreview,
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
          Complete visual experiences that combine charts, annotations, controls, interaction, and
          editorial polish.
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
