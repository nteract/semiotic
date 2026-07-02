import React from "react"
import { Link } from "react-router-dom"
import { EXAMPLES } from "./examplesManifest"


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
        {EXAMPLES.map((example) => (
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
                : example.preview === "port-replay"
                  ? <MiniPortReplayPreview />
                : example.preview === "scroll-tell"
                  ? <MiniScrollTellPreview />
                : example.preview === "machine"
                  ? <MiniMachinePreview />
                : example.preview === "architecture"
                  ? <MiniArchitecturePreview />
                : example.preview === "gestalt"
                  ? <MiniGestaltPreview />
                : example.preview === "networkviz"
                  ? <MiniNetworkVizPreview />
                : example.preview === "oregontrail"
                  ? <MiniOregonTrailPreview />
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

function MiniOregonTrailPreview() {
  const carets = [[70, 30], [86, 26], [150, 34], [166, 30], [110, 60], [128, 66], [50, 44]]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" fill="#1a1ae0" />
      <rect x="7" y="7" width="228" height="82" fill="#b9b9b9" />
      {/* coastline on the left */}
      <path d="M30,9 L26,24 L34,36 L24,50 L32,66 L22,82 L30,88" fill="none" stroke="#101010" strokeWidth="1.4" />
      {/* a blue river */}
      <path d="M210,20 Q150,26 138,44 Q128,58 70,60 Q48,62 40,74" fill="none" stroke="#2b3bff" strokeWidth="1.4" />
      {/* mountains */}
      {carets.map(([x, y], i) => (
        <path key={i} d={`M${x - 5},${y + 3} L${x},${y - 4} L${x + 5},${y + 3}`} fill="none" stroke="#101010" strokeWidth="1.2" />
      ))}
      {/* the route */}
      <path d="M206,64 L168,58 L138,54 L104,46 L70,44 L44,40" fill="none" stroke="#101010" strokeWidth="2" />
      {/* forts */}
      {[[168, 58], [104, 46]].map(([x, y], i) => (
        <rect key={i} x={x - 4} y={y - 4} width="8" height="8" fill="#b9b9b9" stroke="#101010" strokeWidth="1.4" />
      ))}
      {/* START + FINISH */}
      <rect x="206" y="58" width="30" height="13" fill="#c26a12" stroke="#101010" strokeWidth="1" />
      <text x="221" y="68" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#101010">START</text>
      <text x="44" y="34" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="monospace" fill="#101010">★</text>
      <text x="121" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="monospace" fill="#f2f2f2" stroke="#101010" strokeWidth="2.4" paintOrder="stroke">OREGON TRAIL</text>
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
    [0, 1, true], [0, 2, true], [1, 3, false], [2, 3, false],
    [3, 4, false], [4, 5, false], [5, 6, false], [2, 7, false], [3, 5, false],
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
      <path d="M150,84 Q177,68 204,84 M168,84 Q186,72 204,84" fill="none" stroke="#8a2b22" strokeWidth="1" opacity="0.7" />
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
      <rect x="10" y="14" width="42" height="62" fill="none" stroke="#1a1610" strokeWidth="1.5" strokeDasharray="4 2" />
      {dots.map(([x, y, active], index) =>
        active ? (
          <rect key={index} x={x - 5} y={y - 5} width="10" height="10" fill="#df2b1f" stroke="#1a1610" />
        ) : (
          <circle key={index} cx={x} cy={y} r="5" fill="#b1a78f" stroke="#1a1610" />
        )
      )}
      <rect x="0" y="89" width="81" height="7" fill="#df2b1f" />
      <rect x="81" y="89" width="80" height="7" fill="#2a4cad" />
      <rect x="161" y="89" width="81" height="7" fill="#f3b724" />
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
      <path d="M0 18H242M0 42H242M0 66H242M34 0V96M82 0V96M130 0V96M178 0V96M226 0V96" stroke="#19343b" strokeWidth="1" />
      <rect x="14" y="12" width="48" height="8" fill="#ff7043" />
      <text x="14" y="34" fill="#f5ecdc" fontSize="13" fontWeight="800" fontFamily="sans-serif">BOXES</text>
      <text x="14" y="48" fill="#f5ecdc" fontSize="13" fontWeight="800" fontFamily="sans-serif">WAIT</text>
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
    [14, 70, "#5bd6c0"], [30, 67, "#5bd6c0"], [46, 65, "#5bd6c0"],
    [62, 69, "#5bd6c0"], [80, 74, "#7f8ba0"], [98, 83, "#ff5fb0"],
    [110, 85, "#ff5fb0"], [128, 69, "#5bd6c0"], [150, 65, "#5bd6c0"],
    [172, 67, "#5bd6c0"], [196, 64, "#5bd6c0"], [220, 66, "#5bd6c0"],
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

function MiniMachinePreview() {
  const candidates = [
    [34, "#7c6cf0", true],
    [24, "#5a4fb0", false],
    [18, "#5a4fb0", false],
    [12, "#473f86", false],
  ]
  const dots = [[152, 70], [168, 56], [184, 60], [200, 44], [216, 50], [230, 33]]
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
      <path d="M110,19 C126,19 126,42 140,44" fill="none" stroke="#7c6cf0" strokeWidth="1.2" strokeDasharray="2 2" />
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
    }))
  )
  const roots = [
    [42, 82], [82, 90], [122, 80], [162, 90], [202, 82],
  ]
  return (
    <svg viewBox="0 0 242 96" style={styles.preview} aria-hidden="true">
      <rect width="242" height="96" rx="6" fill="#18251f" />
      <path d="M0,68 C50,64 85,71 121,68 S192,64 242,68" fill="none" stroke="#756246" strokeWidth="1" />
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
          <path d={`M${branchX[leaf.group]},45 C${branchX[leaf.group]},34 ${leaf.x},34 ${leaf.x},${leaf.y + 5}`} fill="none" stroke="#6ca77b" strokeWidth=".7" opacity=".8" />
          <rect x={leaf.x - 8} y={leaf.y} width="16" height="7" rx="3.5" fill={index % 5 === 0 ? "#dfb348" : "#6ca77b"} />
        </g>
      ))}
      <rect x="107" y="52" width="28" height="15" rx="4" fill="#b57945" stroke="#dfb348" />
      {roots.map(([x, y], index) => (
        <g key={x}>
          <path d={`M121,67 C121,75 ${x},72 ${x},${y}`} fill="none" stroke="#5191a2" strokeWidth=".7" strokeDasharray="2 2" />
          <rect x={x - 13} y={y - 4} width="26" height="8" rx="3" fill="#243a3c" stroke="#5191a2" strokeWidth=".5" />
        </g>
      ))}
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
