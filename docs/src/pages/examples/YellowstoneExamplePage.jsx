import React, { useMemo, useState } from "react"
import { BarChart, ChartContainer, ThemeProvider } from "semiotic"
import { NetworkCustomChart } from "semiotic/network"
import { unitize, networkHitTarget } from "semiotic/recipes"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  SCENARIOS,
  cascadePath,
  decorateNodes,
  linksForChapter,
  nodesForMode,
} from "./data/yellowstoneCascade"
import "./YellowstoneExamplePage.css"

const UNIT = 10
const implementationCode = `import { NetworkCustomChart } from "semiotic/network"
import { unitize, networkHitTarget } from "semiotic/recipes"

// Fixed habitat anchors — not a free force graph.
// Glyph count = ecological index / 10 (ISOTYPE, not animal headcount).
// Intentionally NO wolves → wetlands edge: the cascade is multi-hop.

layout={(ctx) => {
  const nodes = ctx.nodes.map((n) => {
    const { units } = unitize(n.value, { unit: 10, maxUnits: 12 })
    return {
      type: "rect",
      id: n.id,
      x: n.x * plot.w,
      y: n.y * plot.h,
      // …plate geometry + unit glyphs in overlays
      ...networkHitTarget({ id: n.id, x, y, width, height, datum: n }),
    }
  })
  return { sceneNodes: nodes, overlays: <CascadeOverlay … />, restyle }
}}`

function pathFromTo(a, b, bend = 18) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2 + (a.x < b.x ? bend : -bend)
  return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`
}

function CascadeOverlay({ nodes, links, plot, selectedId }) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  return (
    <g className="yellowstone-overlay" aria-hidden>
      {/* Habitat bands */}
      <rect x={0} y={0} width={plot.w * 0.28} height={plot.h} fill="rgba(109,89,60,0.06)" />
      <rect x={plot.w * 0.48} y={0} width={plot.w * 0.28} height={plot.h} fill="rgba(63,127,135,0.07)" />
      <text x={10} y={16} className="yellowstone-band-label">
        UPLAND
      </text>
      <text x={plot.w * 0.5} y={16} className="yellowstone-band-label">
        RIPARIAN
      </text>
      <path
        d={`M${plot.w * 0.55},8 C${plot.w * 0.72},${plot.h * 0.35} ${plot.w * 0.7},${plot.h * 0.65} ${plot.w * 0.96},${plot.h - 8}`}
        fill="none"
        stroke="rgba(63,127,135,0.35)"
        strokeWidth={22}
        strokeLinecap="round"
      />

      {links.map((link) => {
        const source = byId.get(link.source)
        const target = byId.get(link.target)
        if (!source || !target) return null
        const related =
          !selectedId ||
          selectedId === link.id ||
          selectedId === link.source ||
          selectedId === link.target
        const midX = (source.px + target.px) / 2
        const midY = (source.py + target.py) / 2
        return (
          <g key={link.id} opacity={related ? 1 : 0.14}>
            <path
              d={pathFromTo({ x: source.px, y: source.py }, { x: target.px, y: target.py })}
              fill="none"
              stroke={link.sign > 0 ? "#52734d" : "#a24e3e"}
              strokeWidth={related ? 2.4 : 1.2}
              strokeDasharray={link.confidence === "high" ? undefined : "5 4"}
            />
            <circle cx={midX} cy={midY} r={8} fill="var(--ys-paper)" stroke={link.sign > 0 ? "#52734d" : "#a24e3e"} />
            <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="middle" className="yellowstone-sign">
              {link.sign > 0 ? "+" : "−"}
            </text>
          </g>
        )
      })}

      {nodes.map((node) => {
        const selected = selectedId === node.id
        const dimmed = selectedId && !selected && !links.some((l) => (l.source === selectedId || l.target === selectedId) && (l.source === node.id || l.target === node.id))
        const { units } = unitize(node.value, { unit: UNIT, maxUnits: 12, minFraction: 0.2 })
        const plateW = node.external ? 88 : 102
        const plateH = node.external ? 56 : 68
        const x = node.px - plateW / 2
        const y = node.py - plateH / 2
        return (
          <g key={node.id} opacity={dimmed ? 0.28 : node.value === 0 ? 0.55 : 1}>
            <rect
              x={x}
              y={y}
              width={plateW}
              height={plateH}
              rx={8}
              fill={node.value === 0 ? "#eee5cf" : "#fbf5e5"}
              stroke={selected ? "#18271f" : node.color}
              strokeWidth={selected ? 3 : 1.6}
            />
            <text x={x + 8} y={y + 14} className="yellowstone-plate-label">
              {node.label}
            </text>
            <text x={x + plateW - 8} y={y + 14} textAnchor="end" className="yellowstone-plate-value">
              {node.value}
            </text>
            {units.map((unit, i) => {
              const col = i % 6
              const row = Math.floor(i / 6)
              const gx = x + 10 + col * 14
              const gy = y + 28 + row * 14
              const r = 5 * Math.sqrt(unit.fraction)
              return (
                <circle
                  key={`${node.id}-${unit.index}`}
                  cx={gx}
                  cy={gy}
                  r={r}
                  fill={node.color}
                  opacity={0.35 + unit.fraction * 0.65}
                />
              )
            })}
            {node.external ? (
              <text x={x + 8} y={y + plateH - 8} className="yellowstone-external-tag">
                co-author
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

export default function YellowstoneExamplePage() {
  const [docsTheme] = useDocsTheme()
  const themeName = docsTheme === "dark" ? "tufte-dark" : "tufte"
  const [width, hostRef] = useResponsiveWidth(320, 1100)
  const chartWidth = Math.max(320, Math.min(width - 24, 960))
  const chartHeight = chartWidth < 640 ? 640 : 520

  const [chapter, setChapter] = useState(1)
  const [mode, setMode] = useState("simple")
  const [selectedId, setSelectedId] = useState("wolves")

  const scenario = SCENARIOS[chapter]
  const previous = chapter > 0 ? SCENARIOS[chapter - 1] : null
  const baseNodes = useMemo(() => nodesForMode(mode), [mode])
  const nodes = useMemo(
    () => decorateNodes(baseNodes, scenario, previous),
    [baseNodes, previous, scenario],
  )
  const links = useMemo(() => linksForChapter(chapter, mode), [chapter, mode])
  const path = cascadePath()
  const pathRows = path.map((id) => nodes.find((n) => n.id === id)).filter(Boolean)

  const selected = nodes.find((n) => n.id === selectedId) ?? links.find((l) => l.id === selectedId)

  const layout = useMemo(() => {
    return (ctx) => {
      const { width: pw, height: ph } = ctx.dimensions.plot
      const positioned = nodes.map((node) => {
        const px = 16 + node.x * (pw - 32)
        const py = 28 + node.y * (ph - 48)
        const plateW = node.external ? 88 : 102
        const plateH = node.external ? 56 : 68
        return {
          ...node,
          px,
          py,
          plateW,
          plateH,
        }
      })

      const sceneNodes = positioned.map((node) =>
        networkHitTarget({
          id: node.id,
          x: node.px - node.plateW / 2,
          y: node.py - node.plateH / 2,
          width: node.plateW,
          height: node.plateH,
          datum: node,
        }),
      )

      // Transparent edge hit targets (midpoints)
      const byId = new Map(positioned.map((n) => [n.id, n]))
      for (const link of links) {
        const s = byId.get(link.source)
        const t = byId.get(link.target)
        if (!s || !t) continue
        sceneNodes.push(
          networkHitTarget({
            id: link.id,
            x: (s.px + t.px) / 2 - 10,
            y: (s.py + t.py) / 2 - 10,
            width: 20,
            height: 20,
            datum: { ...link, kind: "relationship", label: `${s.label} ${link.relation} ${t.label}` },
          }),
        )
      }

      return {
        sceneNodes,
        overlays: (
          <CascadeOverlay
            nodes={positioned}
            links={links}
            plot={{ w: pw, h: ph }}
            selectedId={selectedId}
          />
        ),
        restyle: (node) => node.style,
      }
    }
  }, [links, nodes, selectedId])

  const implementationNote = useMemo(
    () =>
      `// Chapter ${chapter + 1}: ${scenario.title}
// Edges active: ${links.length}  ·  Plates: ${nodes.length}
// Direct wolf→river edge: never (by design)`,
    [chapter, links.length, nodes.length, scenario.title],
  )

  return (
    <ExamplePageLayout title="The Yellowstone Mobile">
      <ThemeProvider theme={themeName}>
        <div className="yellowstone" ref={hostRef}>
          <header className="yellowstone__hero">
            <div>
              <span className="yellowstone__kicker">Cascade · multi-hop topology · not a domino myth</span>
              <h2>Wolves returned. The river did not get a wire.</h2>
              <p>
                The popular story draws a straight line from wolves to rivers. The mobile refuses
                that shortcut. Each plate is an ecological index (1 glyph ≈ 10 points — not an animal
                count). Edges are signed, lagged, and optional. When you open the full ecosystem,
                harvest, climate, and bison appear as co-authors of the same willow story.
              </p>
            </div>
            <aside className="yellowstone__thesis" aria-label="Teaching point">
              <strong>Teaching edge</strong>
              <p>
                There is <em>no</em> wolves → wetlands relationship in this graph. Wetlands only
                move after woody plants and beavers do — multi-hop, multi-year, multi-cause.
              </p>
            </aside>
          </header>

          <section className="yellowstone__controls" aria-label="Cascade controls">
            <div className="yellowstone__chapters" role="tablist" aria-label="Cascade chapter">
              {SCENARIOS.map((s, index) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={chapter === index}
                  className={chapter === index ? "is-active" : ""}
                  onClick={() => setChapter(index)}
                >
                  <span>{s.short}</span>
                  <strong>{s.year}</strong>
                </button>
              ))}
            </div>
            <div className="yellowstone__segmented" role="group" aria-label="Ecosystem detail">
              <button
                type="button"
                className={mode === "simple" ? "is-active" : ""}
                aria-pressed={mode === "simple"}
                onClick={() => setMode("simple")}
              >
                Core cascade
              </button>
              <button
                type="button"
                className={mode === "full" ? "is-active" : ""}
                aria-pressed={mode === "full"}
                onClick={() => setMode("full")}
              >
                Full ecosystem
              </button>
            </div>
          </section>

          <p className="yellowstone__claim" aria-live="polite">
            <strong>{scenario.title}.</strong> {scenario.claim}
          </p>

          <div className="yellowstone__grid">
            <section className="yellowstone__chart-host">
              <ChartContainer
                title="Signed trophic topology"
                subtitle={`${scenario.year} · ${mode === "full" ? "core + external co-authors" : "core cascade only"}`}
              >
                <NetworkCustomChart
                  nodes={nodes}
                  edges={links}
                  nodeIDAccessor="id"
                  sourceAccessor="source"
                  targetAccessor="target"
                  layout={layout}
                  layoutConfig={{ chapter, mode, selectedId }}
                  width={chartWidth}
                  height={chartHeight}
                  chartId="yellowstone-mobile"
                  description={`Yellowstone cascade mobile for ${scenario.title}. ${nodes.length} plates, ${links.length} signed relationships. No direct wolf to wetland edge.`}
                  summary={scenario.claim}
                  onObservation={(obs) => {
                    const d = obs?.datum
                    if (d?.id) setSelectedId(d.id)
                  }}
                  onClick={(d) => {
                    if (d?.id) setSelectedId(d.id)
                  }}
                  tooltip={{
                    title: (d) => d.label ?? d.id,
                    fields: [
                      { field: "value", label: "Index" },
                      { field: "delta", label: "Δ chapter", format: (v) => (v > 0 ? `+${v}` : String(v)) },
                      { field: "role", label: "Role" },
                      { field: "caveat", label: "Caveat" },
                    ],
                  }}
                />
              </ChartContainer>
              <div className="yellowstone__legend">
                <span>
                  <i style={{ background: "#52734d" }} /> positive edge
                </span>
                <span>
                  <i style={{ background: "#a24e3e" }} /> negative edge
                </span>
                <span>
                  <i className="yellowstone__dot" /> 1 glyph ≈ {UNIT} index points
                </span>
                <span className="yellowstone__missing">no wolf → river wire</span>
              </div>
            </section>

            <aside className="yellowstone__side">
              <div className="yellowstone__inspect">
                <span className="yellowstone__kicker">Selected</span>
                {selected?.kind === "relationship" || selected?.source ? (
                  <>
                    <h3>
                      {(nodes.find((n) => n.id === selected.source)?.label ?? selected.source)}{" "}
                      {selected.relation}{" "}
                      {(nodes.find((n) => n.id === selected.target)?.label ?? selected.target)}
                    </h3>
                    <dl>
                      <div>
                        <dt>Sign</dt>
                        <dd>{selected.sign > 0 ? "positive" : "negative"}</dd>
                      </div>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{selected.confidence}</dd>
                      </div>
                      <div>
                        <dt>Lag</dt>
                        <dd>{selected.lag}</dd>
                      </div>
                    </dl>
                  </>
                ) : selected ? (
                  <>
                    <h3>{selected.label}</h3>
                    <dl>
                      <div>
                        <dt>Index</dt>
                        <dd>{selected.value}</dd>
                      </div>
                      <div>
                        <dt>Δ from prior chapter</dt>
                        <dd>{selected.delta > 0 ? `+${selected.delta}` : selected.delta}</dd>
                      </div>
                      <div>
                        <dt>Habitat</dt>
                        <dd>{selected.habitat}</dd>
                      </div>
                    </dl>
                    <p>{selected.evidence}</p>
                    <small>{selected.caveat}</small>
                  </>
                ) : null}
              </div>

              <div className="yellowstone__path-chart">
                <h3>Cascade path (still multi-hop)</h3>
                <p>Wolves never appear on the wetland plate. Watch the lag along the path.</p>
                <BarChart
                  data={pathRows}
                  categoryAccessor="label"
                  valueAccessor="value"
                  orientation="horizontal"
                  colorBy="id"
                  colorScheme={Object.fromEntries(pathRows.map((n) => [n.id, n.color]))}
                  width={Math.min(340, chartWidth)}
                  height={240}
                  margin={{ left: 100, right: 16, top: 8, bottom: 24 }}
                  barPadding={32}
                  description="Ecological index along the multi-hop cascade path"
                  onObservation={(obs) => {
                    if (obs?.datum?.id) setSelectedId(obs.datum.id)
                  }}
                />
              </div>
            </aside>
          </div>

          <section className="yellowstone__reading">
            <div>
              <span className="yellowstone__kicker">How to read it</span>
              <h3>Motion is optional; the claim is topological.</h3>
            </div>
            <div className="yellowstone__reading-grid">
              <article>
                <strong>Value</strong>
                <p>Glyph tallies encode an illustrative index. Plates stay identity-stable across chapters.</p>
              </article>
              <article>
                <strong>Sign</strong>
                <p>Green + and rust − wires are curated ecology, not estimated effect sizes.</p>
              </article>
              <article>
                <strong>Lag</strong>
                <p>Edges activate by chapter. Fast trophic links light before woody recovery.</p>
              </article>
              <article>
                <strong>Co-authors</strong>
                <p>Full mode adds harvest, climate, and bison so the cascade is not a single-cause myth.</p>
              </article>
            </div>
          </section>

          <section className="yellowstone__method">
            <div>
              <span className="yellowstone__kicker">Information engine</span>
              <h3>Fixed anchors + unitize + signed edges</h3>
              <p>
                The mobile is a <code>NetworkCustomChart</code> with habitat coordinates,{" "}
                <code>unitize</code> for ISOTYPE plates, and transparent <code>networkHitTarget</code>{" "}
                hit regions. Physics is not required to teach multi-hop causality — the missing edge
                does the work.
              </p>
            </div>
            <pre className="yellowstone__spine">{implementationNote}</pre>
            <CodeBlock language="jsx" code={implementationCode} showCopyButton />
          </section>
        </div>
      </ThemeProvider>
    </ExamplePageLayout>
  )
}
