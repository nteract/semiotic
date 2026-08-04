import React, { useCallback, useMemo, useState } from "react"
import {
  CategoryColorProvider,
  LinkedCharts,
  ProcessSankey,
  ThemeProvider,
  useSelectionActions,
} from "semiotic"
import { unwrapDatum } from "semiotic/recipes"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ProcessRiverExampleLayout from "./ProcessRiverExampleLayout"
import {
  HISTORY_RIVER_LAYOUT_NOTE,
  HISTORY_RIVER_PROCESS_SANKEY,
} from "./processRiverChartDefaults"
import {
  GOOD_EARTH_ALWAYS_LENS,
  GOOD_EARTH_AXIS_TICKS,
  GOOD_EARTH_COLORS,
  GOOD_EARTH_DOMAIN,
  GOOD_EARTH_LENSES,
  GOOD_EARTH_NODE_HATCHES,
  GOOD_EARTH_PROCESS_EDGES,
  GOOD_EARTH_PROCESS_NODES,
  GOOD_EARTH_STAGES,
  GOOD_EARTH_SUBTITLE,
  GOOD_EARTH_TITLE,
  GOOD_EARTH_WEIGHT_SEMANTICS,
  goodEarthStageLabel,
} from "./data/goodEarthLyingFlat"
import "./GoodEarthLyingFlatExamplePage.css"

const LENS_SELECTION = "good-earth-claim-lens"

// A band is a junction between two directed color systems. The fill preserves
// its strongest incoming ribbon color; hatch lines use its outgoing color.
const GOOD_EARTH_NODE_STYLE_RULES = Object.freeze([
  {
    id: "incoming-outgoing-hatch",
    style: (node) => ({
      fill: GOOD_EARTH_NODE_HATCHES[node.id],
      stroke: GOOD_EARTH_COLORS[node.family],
      strokeWidth: 1,
    }),
  },
])

const implementationCode = `import { LinkedCharts, ProcessSankey, useSelectionActions } from "semiotic"

${HISTORY_RIVER_LAYOUT_NOTE}

// The xExtent pins every concept to one of six authored stages.
// Each edge has start/end times from its source and target stages.
<ProcessSankey
  {...historyRiverDefaults}
  nodes={concepts.map((node) => ({
    ...node,
    xExtent: [node.stage - 0.12, node.stage + 0.12],
  }))}
  edges={claims.map((edge) => ({
    ...edge,
    startTime: stageOf(edge.source) + 0.12,
    endTime: stageOf(edge.target) - 0.12,
  }))}
  domain={[-0.22, 5.22]}
  axisTicks={sixStageHeadings}
  colorBy="family"
  edgeOpacity={(edge) => confidenceOpacity[edge.confidence]}
  nodeSizing="max"
  styleRules={[{
    style: (node) => ({ fill: nodeHatches[node.id] }), // HatchFill
  }]}
  accessibleTable
/>

// A named selection leaves the geometry intact and fades nonmatching ribbons.
// selectPoints({ claimLens: ["economic", "__node__"] })`

const FINDINGS = [
  {
    eyebrow: "The Wang Lung path / historical inversion",
    title: "The object meant to defeat insecurity becomes a source of insecurity.",
    body: "Scarcity memory flows through property as family security and housing-led accumulation, then returns as housing burden, uncertain wealth, weak confidence, precautionary saving, and weak consumption.",
  },
  {
    eyebrow: "The meritocracy path / diminishing returns",
    title: "Credentials stop delivering the promise they were built to carry.",
    body: "The growth bargain turns education into a mobility instrument. When the credential arms race meets job mismatch and involution, disciplined striving can feel positional rather than productive—and lying flat becomes legible.",
  },
  {
    eyebrow: "The adaptive fork / same pressure, different conduct",
    title: "Insecurity produces both disengagement and hyperconformity.",
    body: "Involution branches to lying flat, low-energy rat people, and defensive stability seeking. Refusal, exhausted retreat, and intensified competition for protected employment share a loss of confidence upstream.",
  },
]

function confidenceLabel(confidence) {
  return `${confidence} confidence`
}

function relationshipCount(nodeId) {
  return GOOD_EARTH_PROCESS_EDGES.filter((edge) => edge.source === nodeId || edge.target === nodeId)
    .length
}

export function GoodEarthLyingFlatTooltip({ hover }) {
  const datum = unwrapDatum(hover)
  if (!datum) return null

  if (datum.source && datum.target) {
    return (
      <div className="semiotic-tooltip process-river__tooltip good-earth__tooltip">
        <span>
          {datum.sourceStageLabel} → {datum.targetStageLabel}
        </span>
        <strong>
          {datum.sourceLabel} → {datum.targetLabel}
        </strong>
        <p>{datum.claim}</p>
        <b>
          {datum.value} causal-emphasis units · {confidenceLabel(datum.confidence)}
        </b>
        <small>{datum.type}</small>
      </div>
    )
  }

  const related = relationshipCount(datum.id)
  return (
    <div className="semiotic-tooltip process-river__tooltip good-earth__tooltip">
      <span>
        {datum.stageLabel} / {datum.familyLabel}
      </span>
      <strong>{datum.label ?? datum.id}</strong>
      <p>{datum.description}</p>
      <b>
        {related} connected causal claim{related === 1 ? "" : "s"}
      </b>
      <small>Color encodes {datum.familyLabel.toLowerCase()}.</small>
    </div>
  )
}

function ClaimLensControls({ activeLens, onLensChange }) {
  const { selectPoints, clear } = useSelectionActions(LENS_SELECTION, "good-earth-lens-control")

  const chooseLens = (lensId) => {
    onLensChange(lensId)
    if (lensId === "all") {
      clear()
      return
    }
    // Nodes share __node__, keeping all stage labels/bands present while only
    // the selected claim family stays fully opaque.
    selectPoints({ claimLens: [lensId, GOOD_EARTH_ALWAYS_LENS] })
  }

  return (
    <div className="good-earth__lens-control" role="group" aria-label="Focus the causal claim lens">
      <span>CLAIM LENS</span>
      <div>
        {GOOD_EARTH_LENSES.map((lens) => (
          <button
            type="button"
            key={lens.id}
            aria-pressed={activeLens === lens.id}
            aria-label={`${lens.label}: ${lens.description}`}
            onClick={() => chooseLens(lens.id)}
          >
            {lens.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ArgumentReader({ activeLens, selectedDatum }) {
  const lens = GOOD_EARTH_LENSES.find((item) => item.id === activeLens) ?? GOOD_EARTH_LENSES[0]
  const selectedEdge = selectedDatum?.source && selectedDatum?.target ? selectedDatum : null
  const selectedNode = selectedDatum?.id && !selectedEdge ? selectedDatum : null

  return (
    <aside className="process-river__reader good-earth__reader" aria-live="polite">
      <span className="process-river__reader-kicker">
        HOW MIGHT WE UNDERSTAND CULTURAL (R)EVOLUTION?
      </span>
      <strong className="good-earth__reader-index">ABUNDANCE IS NOT HAPPINESS</strong>
      <h3>{lens.label}</h3>
      <p>{lens.description}</p>

      <div className="good-earth__family-key" aria-label="Node family color key">
        {Object.entries(GOOD_EARTH_COLORS).map(([family, color]) => {
          const sample = GOOD_EARTH_PROCESS_NODES.find((node) => node.family === family)
          return (
            <span key={family}>
              <i style={{ background: color }} aria-hidden="true" />
              {sample?.familyLabel ?? family}
            </span>
          )
        })}
      </div>

      {(selectedEdge || selectedNode) && (
        <div className="process-river__selection">
          <span>SELECTED {selectedEdge ? "CAUSAL CLAIM" : "CONCEPT"}</span>
          <strong>
            {selectedNode?.label ?? `${selectedEdge.sourceLabel} → ${selectedEdge.targetLabel}`}
          </strong>
          <p>{selectedNode?.description ?? selectedEdge.claim}</p>
          <b>
            {selectedNode
              ? `${relationshipCount(selectedNode.id)} connected claims`
              : `${selectedEdge.value} causal-emphasis units · ${confidenceLabel(selectedEdge.confidence)}`}
          </b>
          {selectedEdge && <small>{selectedEdge.type}</small>}
        </div>
      )}
    </aside>
  )
}

function GoodEarthLyingFlatStory() {
  const [activeLens, setActiveLens] = useState("all")
  const [selectedDatum, setSelectedDatum] = useState(null)
  // Bucket resize updates so lane packing is not recalculated for every pixel.
  const [chartWidth, chartRef] = useResponsiveWidth(300, 1120, { bucket: 40 })
  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const compact = chartWidth < 680
  const chartHeight = compact ? 1760 : 1860
  const chartMargin = useMemo(
    () => ({ top: 28, right: compact ? 8 : 24, bottom: 26, left: compact ? 68 : 92 }),
    [compact],
  )
  const confidenceOpacity = useCallback((edge) => edge.confidenceOpacity, [])

  const inspectDatum = useCallback((hover) => {
    const datum = unwrapDatum(hover)
    if (datum) setSelectedDatum(datum)
  }, [])

  return (
    <ThemeProvider theme={carbonTheme}>
      <CategoryColorProvider colors={GOOD_EARTH_COLORS}>
        <ProcessRiverExampleLayout
          pageTitle="From The Good Earth to Lying Flat"
          themeClass="good-earth"
          masthead={{
            kicker: "A CAUSAL SANKEY / SECURITY, RISK, WITHDRAWAL",
            title: (
              <h2>
                FROM THE
                <br />
                GOOD EARTH
                <br />
                TO LYING FLAT
              </h2>
            ),
            copy: (
              <p>
                Housing, credentials, disciplined work, and visible consumption first promised
                security and mobility. When their returns became unreliable, the same
                security-seeking behavior began producing precaution, delayed adulthood, involution,
                and withdrawal.
              </p>
            ),
            tagline: "The modern substitute for land becomes a new terrain of risk.",
          }}
          readingKey={[
            {
              icon: "↓",
              title: "READ DOWN",
              body: "Six authored openings move from inherited insecurity to social outcomes.",
            },
            {
              icon: "≈",
              title: "READ WIDTH AS EMPHASIS",
              body: "Ribbon width is an interpretive causal-emphasis unit, never a count of people.",
            },
            {
              icon: "◌",
              title: "CHANGE THE LENS",
              body: "Focus a claim family to make the argument inspectable rather than falsely settled.",
            },
          ]}
          river={{
            idPrefix: "good-earth",
            kicker: "01 / A security system turns into a risk system",
            title: GOOD_EARTH_TITLE,
            intro: GOOD_EARTH_SUBTITLE,
            controls: <ClaimLensControls activeLens={activeLens} onLensChange={setActiveLens} />,
            chartRef,
            chart: (
              <ProcessSankey
                {...HISTORY_RIVER_PROCESS_SANKEY}
                nodes={GOOD_EARTH_PROCESS_NODES}
                edges={GOOD_EARTH_PROCESS_EDGES}
                domain={GOOD_EARTH_DOMAIN}
                axisTicks={GOOD_EARTH_AXIS_TICKS}
                nodeLabel="shortLabel"
                width={Math.max(300, chartWidth)}
                height={chartHeight}
                margin={chartMargin}
                colorBy="family"
                colorScheme={GOOD_EARTH_COLORS}
                nodeSizing="max"
                showLabels={compact ? "auto" : true}
                maxLabels={compact ? 13 : 20}
                labelPriorityAccessor="labelPriority"
                edgeOpacity={confidenceOpacity}
                styleRules={GOOD_EARTH_NODE_STYLE_RULES}
                selection={{ name: LENS_SELECTION, unselectedOpacity: 0.12 }}
                tooltip={(hover) => <GoodEarthLyingFlatTooltip hover={hover} />}
                onClick={inspectDatum}
                timeFormat={goodEarthStageLabel}
                valueFormat={(value) => `${value} causal-emphasis units`}
                accessibleTable
                description="A six-stage top-to-bottom ProcessSankey presents a causal interpretation: inherited insecurity becomes security strategies, growth machinery, broken promises, adaptive responses, and social outcomes. Ribbon widths are interpretive causal-emphasis units, not population counts."
                summary="The greatest early flow treats property as family security. Housing, credentials, consumption, and overwork then produce housing burden, job mismatch, involution, and lost future confidence. Involution and low confidence branch toward precautionary saving, lying flat, low-energy rat people, and defensive stability seeking before weak consumption, delayed family formation, and privatized retreat."
                chartId="good-earth-lying-flat-process-sankey"
              />
            ),
            reader: <ArgumentReader activeLens={activeLens} selectedDatum={selectedDatum} />,
            caption: (
              <>
                Vertical openings are fixed to the six authored stages—not inferred from graph
                depth. Node height holds each stage’s maximum incoming or outgoing causal emphasis.
                Each node hatches its dominant incoming ribbon color through its outgoing family
                color; ribbon opacity signals confidence (high, medium, low). {GOOD_EARTH_WEIGHT_SEMANTICS}
              </>
            ),
          }}
          findings={{
            kicker: "02 / Three readings worth tracing",
            title: "The Sankey makes a contested causal argument visible.",
            items: FINDINGS.map((finding) => ({ ...finding, key: finding.eyebrow })),
          }}
          method={{
            kicker: "03 / What this diagram does and does not claim",
            title: "A causal map with its uncertainty left on the page",
            body: (
              <>
                <p>
                  This is not a forecast, a survey, or an attempt to calculate how many people move
                  from one cultural position to another. It renders a structured interpretation of
                  how insecurity is transmitted through institutions and then expressed in multiple
                  adaptive responses.
                </p>
                <p className="process-river__warning">
                  A ribbon value is a comparative emphasis inside this argument. It must not be read
                  as a probability, percentage, population share, or literal transformation rate.
                </p>
                <p>
                  “Lying flat” and “rat people” remain separate because strategic refusal is not the
                  same as aestheticized, low-energy retreat. Defensive stability seeking remains
                  separate too: the same loss of confidence can produce less competition for upside
                  and more competition for institutional safety.
                </p>
              </>
            ),
          }}
          code={{
            kicker: "04 / Pin stages; keep claims inspectable",
            title: "A Sankey can make an argument legible without pretending it is a census.",
            intro:
              "The important ingredients are explicit temporal extents, source-family color, confidence-aware ribbon opacity, and a selection-backed claim lens that does not rewrite the topology.",
            source: implementationCode,
          }}
          footer={{
            kicker: "FROM THE GOOD EARTH TO LYING FLAT / SIX STAGES",
            tagline:
              "When security no longer yields confidence, both retreat and conformity can be rational adaptations.",
            stats: `${GOOD_EARTH_STAGES.length} authored stages · ${GOOD_EARTH_PROCESS_NODES.length} concepts · ${GOOD_EARTH_PROCESS_EDGES.length} interpretive causal claims`,
          }}
        />
      </CategoryColorProvider>
    </ThemeProvider>
  )
}

export default function GoodEarthLyingFlatExamplePage() {
  return (
    <LinkedCharts>
      <GoodEarthLyingFlatStory />
    </LinkedCharts>
  )
}
