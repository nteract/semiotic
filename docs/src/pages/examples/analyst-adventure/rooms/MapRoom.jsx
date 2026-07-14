import React, { useCallback, useMemo, useState } from "react"
import { StreamGeoFrame } from "semiotic/geo"
import { createRoughRenderMode } from "semiotic/rough"
import { badgePacketFlows, campusAreas, campusPoints } from "../data/campusFlows"
import AdventureAnnotation from "../components/AdventureAnnotation"
import AnchoredChat from "../components/AnchoredChat"
import AnalyticalRoom from "../components/AnalyticalRoom"

function campusData() {
  return {
    points: campusPoints,
    flows: badgePacketFlows,
  }
}

function timeLabel(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      })
}

function datumFromHover(hover) {
  return hover?.data ?? hover?.datum ?? hover
}

export default function MapRoom({
  room,
  state,
  width,
  reducedMotion,
  hintRequestToken,
  hintsRemaining,
  onHintUsed,
  onInspect,
  onAnalyticsReady,
  onActivateAnnotation,
}) {
  const fixture = useMemo(campusData, [])
  const roughCampus = useMemo(
    () =>
      createRoughRenderMode({
        seed: 1984,
        roughness: 1.15,
        bowing: 0.75,
        fillStyle: "hachure",
        hachureGap: 7,
      }),
    [],
  )
  const campusRenderMode = useCallback(
    (_datum, node) => (node?.type === "geoarea" ? roughCampus : undefined),
    [roughCampus],
  )
  const points = useMemo(
    () =>
      fixture.points.map((point) => ({
        ...point,
        lon: point.coordinates[0],
        lat: point.coordinates[1],
      })),
    [fixture.points],
  )
  const pointById = useMemo(
    () => Object.fromEntries(points.map((point) => [point.id, point])),
    [points],
  )
  const lines = useMemo(
    () =>
      fixture.flows.map((flow) => {
        const source = pointById[flow.source]
        const target = pointById[flow.target]
        return {
          ...flow,
          sourceName: source?.name ?? flow.source,
          targetName: target?.name ?? flow.target,
          route: [source, target].filter(Boolean),
        }
      }),
    [fixture.flows, pointById],
  )
  const serviceTunnel =
    points.find((point) => point.id === "service-tunnel-marker") ?? points[points.length - 1]
  const activated = state.activatedAnnotationIds.includes("map-service-tunnel")
  const [chatOpen, setChatOpen] = useState(false)
  const activateServiceTunnel = useCallback(
    (annotationId = "map-service-tunnel", event) => {
      setChatOpen(true)
      onActivateAnnotation(annotationId, event)
    },
    [onActivateAnnotation],
  )
  const annotations = useMemo(
    () => [
      {
        ...serviceTunnel,
        id: "map-service-tunnel",
        stableId: "map-service-tunnel",
        pointId: serviceTunnel?.id,
        type: "widget",
        label: "Unlabeled maintenance marker",
        navigationLabel: activated
          ? "FACILITIES_BOT comment at the service tunnel"
          : "Unlabeled maintenance marker",
        width: 42,
        height: 42,
        dx: 60,
        dy: 56,
        content: (
          <AdventureAnnotation
            label="Activate unlabeled maintenance marker"
            active={activated}
            tone="cyan"
          >
            ??
          </AdventureAnnotation>
        ),
        provenance: {
          author: "FACILITIES_BOT",
          authorKind: "agent",
          source: "ai",
          stableId: "map-service-tunnel",
        },
        lifecycle: { status: activated ? "accepted" : "proposed", anchor: "semantic" },
      },
    ],
    [activateServiceTunnel, activated, serviceTunnel],
  )
  const chartProps = useMemo(
    () => ({
      flows: lines,
      data: lines,
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "packets",
      nodes: points,
      accessibleTable: true,
      title: "The Commute of No Return",
      description:
        "A synthetic campus flow map. Every route row names source, target, packet count, and latency. Direction reads source to target; the badge display calls the bunker a location even though the credential route originates at B2.",
      summary:
        "Fourteen credential packets travel B2 Maintenance Relay → HQ Router → Offsite Continuity Bunker → Badge Display Service. B2 is the route origin; the bunker is an endpoint displayed as location.",
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, lines, points],
  )
  const chartWidth = Math.max(300, width)
  // The synthetic campus is taller than a world map. Give wide layouts enough
  // height for the fitted close-up to occupy the plot instead of letterboxing.
  const chartHeight =
    chartWidth < 480 ? 315 : Math.min(440, Math.max(350, Math.round(chartWidth * 0.63)))

  return (
    <>
      <AnalyticalRoom
        room={room}
        componentName="FlowMap"
        chartProps={chartProps}
        data={lines}
        annotations={annotations}
        hintAnnotation={{
          type: "callout",
          ...pointById["b2-maintenance-relay"],
          pointId: "b2-maintenance-relay",
          dx: 54,
          dy: -40,
          color: "#ffd166",
        }}
        intent={["geo", "flow"]}
        summary="PACKET DIRECTION: SOURCE → TARGET · display label is not origin"
        chartHeight={chartHeight + 74}
        hintRequestToken={hintRequestToken}
        hintsRemaining={hintsRemaining}
        onHintUsed={onHintUsed}
        onInspect={onInspect}
        onAnalyticsReady={onAnalyticsReady}
        onActivateAnnotation={activateServiceTunnel}
        labelForDatum={(datum) =>
          `${datum.sourceName} to ${datum.targetName}: ${datum.packets} packets, ${datum.latencyMs} milliseconds latency, first observed ${timeLabel(datum.firstObservedAt)}`
        }
        renderChart={({
          annotations: mergedAnnotations,
          onInspect: inspect,
          onObservation,
          onAnnotationActivate,
        }) => (
          <div className="analyst-adventure__chart-with-controls">
            <div
              className="analyst-adventure__route-readout"
              aria-label="Credential route direction"
            >
              <span>B2 RELAY</span>
              <b aria-hidden="true">→</b>
              <span>HQ ROUTER</span>
              <b aria-hidden="true">→</b>
              <span>OFFSITE BUNKER</span>
              <b aria-hidden="true">→</b>
              <span>DISPLAY</span>
            </div>
            <StreamGeoFrame
              projection="equirectangular"
              areas={campusAreas}
              points={points}
              lines={lines}
              xAccessor="lon"
              yAccessor="lat"
              pointIdAccessor="id"
              lineIdAccessor="id"
              lineDataAccessor="route"
              lineType="line"
              flowStyle="arc"
              fitPadding={0.04}
              size={[chartWidth, chartHeight]}
              margin={{ top: 18, right: 18, bottom: 24, left: 18 }}
              background="#071014"
              areaStyle={(feature) => ({
                fill: "#111f26",
                fillOpacity: 0.8,
                stroke: feature?.properties?.id === "hq-campus" ? "#55f6ff" : "#8aa3ad",
                strokeWidth: 2.5,
                strokeDasharray: "6 4",
              })}
              renderMode={campusRenderMode}
              pointStyle={(datum) => ({
                fill:
                  datum.kind === "tunnel"
                    ? "#ffd166"
                    : datum.kind === "bunker"
                      ? "#ff4fd8"
                      : "#55f6ff",
                stroke: "#f7fbff",
                strokeWidth: 2,
                r: datum.kind === "relay" ? 7 : 6,
              })}
              lineStyle={(datum) => ({
                stroke: datum.id === "cafeteria-heartbeat" ? "#83939a" : "#ff4fd8",
                strokeWidth: 1.5 + Number(datum.packets ?? 1) / 4,
                strokeDasharray: datum.id === "cafeteria-heartbeat" ? "3 5" : undefined,
                opacity: datum.id === "cafeteria-heartbeat" ? 0.55 : 0.9,
              })}
              showParticles={!reducedMotion}
              particleStyle={{
                radius: 2.5,
                color: "#ffd166",
                opacity: 0.9,
                speedMultiplier: 0.55,
                proportionalSpeed: false,
                maxPerEdge: 12,
                spawnRate: 0.1,
              }}
              enableHover
              hoverAnnotation
              tooltipContent={(hover) => {
                const datum = datumFromHover(hover)
                if (datum?.source) {
                  return (
                    <div className="analyst-adventure__tooltip">
                      <strong>
                        {datum.sourceName} → {datum.targetName}
                      </strong>
                      <span>{datum.packets} packets</span>
                      <span>{datum.latencyMs}ms latency</span>
                    </div>
                  )
                }
                return (
                  <div className="analyst-adventure__tooltip">
                    <strong>{datum?.name ?? "Campus point"}</strong>
                    <span>{datum?.kind}</span>
                  </div>
                )
              }}
              customHoverBehavior={(hover) => {
                const datum = datumFromHover(hover)
                if (datum?.id) inspect?.(String(datum.id), "pointer")
              }}
              customClickBehavior={(hover) => {
                const datum = datumFromHover(hover)
                if (datum?.id) inspect?.(String(datum.id), "activate")
              }}
              chartId="analyst-adventure-map"
              onObservation={onObservation}
              onAnnotationActivate={onAnnotationActivate}
              annotations={mergedAnnotations}
              accessibleTable
              title="CAMPUS PACKET ORIGIN TRACE"
              description={chartProps.description}
              summary={chartProps.summary}
              seed={1984}
              animate={reducedMotion ? false : { duration: 260, intro: true }}
            />
          </div>
        )}
      />
      <AnchoredChat
        open={chatOpen}
        title="FACILITIES_BOT"
        anchorLabel="Unlabeled maintenance marker"
        messages={["This tunnel does not exist. Therefore, it cannot be locked."]}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
