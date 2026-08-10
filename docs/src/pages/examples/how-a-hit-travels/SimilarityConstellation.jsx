import React, { useMemo } from "react"
import { NetworkCustomChart, TooltipRoot } from "semiotic/network"
import { networkHitTarget, unwrapDatum } from "semiotic/recipes"

const LABEL_ANCHORS = new Set(["BR", "ES", "GB", "IN", "JP", "KR", "US", "ZA"])
const TOUCH_INTERACTION = Object.freeze({
  tapToSelect: true,
  tapToLockTooltip: true,
  clearSelection: "backgroundTap",
  targetSize: 44,
})
const ANIMATION_CONFIG = Object.freeze({ duration: 760 })
const TRANSPARENT_FRAME_PROPS = Object.freeze({ background: "transparent" })
const CHART_MARGIN = Object.freeze({ top: 24, right: 24, bottom: 30, left: 24 })

export function SimilarityConstellation({
  chartId = "how-a-hit-travels-constellation",
  countries,
  layout,
  layoutMode,
  selectedTitle,
  cursor,
  selectedCountryId,
  onCountrySelect,
  reducedMotion,
  width,
}) {
  const historyByCountry = useMemo(
    () => new Map(selectedTitle.countryHistory.map((country) => [country.countryId, country])),
    [selectedTitle],
  )
  const nodes = useMemo(
    () =>
      countries.map((country) => {
        const history = historyByCountry.get(country.id)
        const rankAtCursor = history?.ranks.find(([elapsedWeek]) => elapsedWeek === cursor)?.[1]
        return {
          ...country,
          history,
          firstElapsedWeek: history?.firstElapsedWeek ?? null,
          activeWeeks: history?.activeWeeks ?? 0,
          bestRank: history?.bestRank ?? null,
          rankAtCursor: rankAtCursor ?? null,
        }
      }),
    [countries, cursor, historyByCountry],
  )
  const chartHeight = width < 560 ? 520 : 590
  const arrived = nodes.filter(
    (country) => country.firstElapsedWeek != null && country.firstElapsedWeek <= cursor,
  ).length
  const selectedCountry = nodes.find((country) => country.id === selectedCountryId)
  const layoutConfig = useMemo(
    () => ({
      positions: layout.positions,
      layoutMode,
      cursor,
      selectedCountryId,
      reducedMotion,
      nodeGlowId: `${chartId}-node-glow`,
    }),
    [chartId, cursor, layout.positions, layoutMode, reducedMotion, selectedCountryId],
  )

  return (
    <div className="hat-constellation-shell">
      <NetworkCustomChart
        chartId={chartId}
        nodes={nodes}
        edges={layout.edges}
        layout={similarityConstellationLayout}
        layoutConfig={layoutConfig}
        width={Math.max(300, width)}
        height={chartHeight}
        margin={CHART_MARGIN}
        enableHover
        mode={width < 560 ? "mobile" : "primary"}
        mobileInteraction={TOUCH_INTERACTION}
        accessibleTable
        animate={reducedMotion ? false : ANIMATION_CONFIG}
        onClick={(value) => {
          const country = unwrapDatum(value)
          if (country?.id) onCountrySelect?.(country.id)
        }}
        description={
          layoutMode === "map"
            ? `A geographic point map showing when ${selectedTitle.label} first appeared in the published Top 10 of ${countries.length} reference countries.`
            : "A fixed country-similarity constellation. Countries sit near one another when they repeatedly ranked many of the same titles in the same weeks."
        }
        summary={`${arrived} of ${countries.length} reference countries have appeared by elapsed week ${cursor + 1}. ${selectedCountry ? `${selectedCountry.name} is selected.` : "Select a country to inspect its ranking history and strongest relationships."}`}
        tooltip={(value) => (
          <CountryTooltip country={unwrapDatum(value)} title={selectedTitle} cursor={cursor} />
        )}
        frameProps={TRANSPARENT_FRAME_PROPS}
      />
      <p className="hat-stage-readout" aria-live="polite">
        <span>{layoutMode === "map" ? "GEOGRAPHIC POSITION" : "SHARED RANKING PATTERNS"}</span>
        <strong>
          {arrived} of {countries.length} reference countries visible by week {cursor + 1}
        </strong>
        <small>
          {selectedCountry
            ? `${selectedCountry.name}: ${countryStatus(selectedCountry, cursor)}`
            : "Select a country for exact values. Distance is approximate; edges are not influence paths."}
        </small>
      </p>
    </div>
  )
}

export function similarityConstellationLayout(context) {
  const { plot } = context.dimensions
  const rawNodes = context.nodes.map(unwrapDatum)
  const rawEdges = context.edges.map(unwrapDatum)
  const positions = context.config?.positions ?? {}
  const layoutMode = context.config?.layoutMode ?? "constellation"
  const cursor = Number(context.config?.cursor ?? 0)
  const selectedCountryId = context.config?.selectedCountryId ?? null
  const nodeGlowId = context.config?.nodeGlowId ?? "hat-node-glow"
  const compact = plot.width < 520

  const positioned = rawNodes.map((country) => {
    const constellation = positions[country.id] ?? { x: 0.5, y: 0.5 }
    const x =
      layoutMode === "map"
        ? 22 + ((country.longitude + 180) / 360) * (plot.width - 44)
        : 28 + constellation.x * (plot.width - 56)
    const y =
      layoutMode === "map"
        ? 24 + ((72 - country.latitude) / 132) * (plot.height - 48)
        : 28 + constellation.y * (plot.height - 56)
    const arrived = country.firstElapsedWeek != null && country.firstElapsedWeek <= cursor
    const active = country.rankAtCursor != null
    return { ...country, x, y, arrived, active }
  })
  const nodeById = new Map(positioned.map((country) => [country.id, country]))
  const selectedEdges = rawEdges
    .map((edge) => ({
      ...edge,
      sourceNode: nodeById.get(typeof edge.source === "object" ? edge.source.id : edge.source),
      targetNode: nodeById.get(typeof edge.target === "object" ? edge.target.id : edge.target),
    }))
    .filter((edge) => edge.sourceNode && edge.targetNode)

  if (!positioned.length) {
    return { sceneNodes: [], sceneEdges: [], overlays: null }
  }

  return {
    sceneNodes: positioned.map((country) => {
      const accessibilityLabel = `${country.name}, ${country.region}. ${countryStatus(country, cursor)}`
      return {
        ...networkHitTarget({
          x: country.x,
          y: country.y,
          r: compact ? 18 : 16,
          datum: country,
          id: `hit-country-${country.id}`,
          label: accessibilityLabel,
        }),
        accessibility: {
          label: accessibilityLabel,
          tableFields: {
            Country: country.name,
            Region: country.region,
            "First observed week": country.history?.firstWeek ?? "Not observed",
            "Best rank": country.bestRank ?? "Not observed",
            "Ranked weeks": country.activeWeeks,
          },
        },
      }
    }),
    sceneEdges: [],
    restyle: () => undefined,
    overlays: (
      <ConstellationOverlay
        nodes={positioned}
        edges={selectedEdges}
        layoutMode={layoutMode}
        selectedCountryId={selectedCountryId}
        compact={compact}
        nodeGlowId={nodeGlowId}
      />
    ),
  }
}

function ConstellationOverlay({
  nodes,
  edges,
  layoutMode,
  selectedCountryId,
  compact,
  nodeGlowId,
}) {
  return (
    <g
      className={`hat-constellation-overlay mode-${layoutMode}`}
      pointerEvents="none"
      aria-hidden="true"
    >
      <defs>
        <filter id={nodeGlowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {layoutMode === "map" ? <MapGraticule /> : null}
      <g className="hat-constellation-edges">
        {edges.map((edge) => {
          const selected =
            selectedCountryId &&
            (edge.sourceNode.id === selectedCountryId || edge.targetNode.id === selectedCountryId)
          const muted = selectedCountryId && !selected
          return (
            <line
              key={edge.id}
              x1={edge.sourceNode.x}
              y1={edge.sourceNode.y}
              x2={edge.targetNode.x}
              y2={edge.targetNode.y}
              className={selected ? "is-selected" : muted ? "is-muted" : ""}
              strokeWidth={selected ? 1.8 + edge.similarity * 2 : 0.45 + edge.similarity * 1.2}
            />
          )
        })}
      </g>
      <g className="hat-constellation-nodes">
        {nodes.map((country) => {
          const selected = country.id === selectedCountryId
          const showLabel = selected || (!compact && LABEL_ANCHORS.has(country.id))
          return (
            <g
              key={country.id}
              className={[
                "hat-country",
                country.arrived ? "has-arrived" : "is-unobserved",
                country.active ? "is-active" : "",
                selected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ transform: `translate(${country.x}px, ${country.y}px)` }}
            >
              <circle
                r={country.active ? 7.5 : country.arrived ? 5.6 : 3.6}
                filter={country.active ? `url(#${nodeGlowId})` : undefined}
              />
              {country.active ? <circle className="hat-country-pulse" r="12" /> : null}
              {showLabel ? (
                <text x="10" y="4" textAnchor="start">
                  {country.id}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}

function MapGraticule() {
  return (
    <g className="hat-map-graticule">
      {[0.2, 0.4, 0.6, 0.8].map((position) => (
        <line
          key={`v-${position}`}
          x1={`${position * 100}%`}
          x2={`${position * 100}%`}
          y1="4%"
          y2="96%"
        />
      ))}
      {[0.25, 0.5, 0.75].map((position) => (
        <line
          key={`h-${position}`}
          x1="2%"
          x2="98%"
          y1={`${position * 100}%`}
          y2={`${position * 100}%`}
        />
      ))}
    </g>
  )
}

function CountryTooltip({ country, title, cursor }) {
  if (!country?.id) return null
  const related = country.history
  return (
    <TooltipRoot chrome="css" className="hat-tooltip">
      <span>
        {country.region} · {country.id}
      </span>
      <strong>{country.name}</strong>
      {related ? (
        <>
          <p>{countryStatus(country, cursor)}</p>
          <small>
            {title.label}: first observed {related.firstWeek}; best rank {related.bestRank};{" "}
            {related.activeWeeks} ranked week{related.activeWeeks === 1 ? "" : "s"}.
          </small>
        </>
      ) : (
        <small>
          {title.label} did not appear in this country&apos;s published Top 10 in the snapshot.
        </small>
      )}
    </TooltipRoot>
  )
}

function countryStatus(country, cursor) {
  if (!country.history) return "No published Top 10 appearance in this snapshot."
  if (country.firstElapsedWeek > cursor) {
    return `First appears in elapsed week ${country.firstElapsedWeek + 1}.`
  }
  if (country.rankAtCursor != null) {
    return `Ranked no. ${country.rankAtCursor} in elapsed week ${cursor + 1}.`
  }
  return `Already observed; not ranked in elapsed week ${cursor + 1}.`
}
