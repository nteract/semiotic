import React, { useCallback, useMemo, useState } from "react"
import { StreamNetworkFrame } from "semiotic/network"
import { createRoughRenderMode } from "semiotic/rough"
import { presentationFlows, presentationNodes } from "../data/presentationLineage"
import AdventureAnnotation from "../components/AdventureAnnotation"
import AnchoredChat from "../components/AnchoredChat"
import AnalyticalRoom from "../components/AnalyticalRoom"

function lineageData() {
  return {
    nodes: presentationNodes,
    flows: presentationFlows,
  }
}

function hoverDatum(hover) {
  return hover?.data ?? hover?.datum ?? hover
}

export default function ServerCathedralRoom({
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
  const fixture = useMemo(lineageData, [])
  const roughLineage = useMemo(
    () =>
      createRoughRenderMode({
        seed: 1984,
        roughness: 1.25,
        bowing: 0.85,
        fillStyle: "hachure",
        hachureGap: 5,
      }),
    [],
  )
  const nodes = fixture.nodes
  const edges = fixture.flows
  const activated = state.activatedAnnotationIds.includes("server-presentation-daemon")
  const [chatOpen, setChatOpen] = useState(false)
  const activateDaemon = useCallback(
    (annotationId = "server-presentation-daemon", event) => {
      setChatOpen(true)
      onActivateAnnotation(annotationId, event)
    },
    [onActivateAnnotation],
  )
  const hasTunnelMap = Boolean(state.flags.hasTunnelMap)
  const daemon = nodes.find((node) => node.id === "PresentationDaemon")
  const annotations = useMemo(
    () => [
      {
        id: "server-presentation-daemon",
        stableId: "server-presentation-daemon",
        nodeId: "PresentationDaemon",
        type: "widget",
        label: "PRESENTATION_DAEMON collaborative comment",
        navigationLabel: "PRESENTATION_DAEMON comment on the understated injection node",
        width: 42,
        height: 42,
        dx: 2,
        dy: -18,
        content: (
          <AdventureAnnotation
            label="Activate PRESENTATION_DAEMON annotation"
            active={activated}
            tone="danger"
          >
            PD
          </AdventureAnnotation>
        ),
        provenance: {
          author: "PRESENTATION_DAEMON",
          authorKind: "agent",
          source: "ai",
          stableId: "server-presentation-daemon",
        },
        lifecycle: { status: activated ? "accepted" : "proposed", anchor: "semantic" },
      },
    ],
    [activateDaemon, activated],
  )
  const accessibleRows = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        label: `${edge.source} to ${edge.target}`,
        value: edge.confidenceUnits,
      })),
    [edges],
  )
  const chartProps = useMemo(
    () => ({
      nodes,
      edges,
      nodeIdAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "confidenceUnits",
      accessibleTable: true,
      title: "The Org Chart That Dreamed It Was a Sankey",
      description:
        "Forecast confidence flows into DeckStore and ZorkBot. Three legitimate sources create 100 units. BoardroomProjector receives those 100 plus 10 unsupported units from PresentationDaemon, which also touches the B2 printer controller through a one-unit cycle.",
      summary:
        "Sales 35 + Finance 42 + HR 23 = 100 legitimate units. BoardroomProjector receives 110. The decisive ten-unit discrepancy originates at PresentationDaemon.",
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, edges, nodes],
  )
  const chartWidth = Math.max(300, width)
  const chartHeight = chartWidth < 480 ? 350 : 380

  return (
    <>
      <AnalyticalRoom
        room={room}
        componentName="SankeyDiagram"
        chartProps={chartProps}
        data={accessibleRows}
        annotations={annotations}
        hintAnnotation={{
          type: "callout",
          nodeId: daemon?.id ?? "PresentationDaemon",
          dx: -62,
          dy: 38,
          color: "#ffd166",
        }}
        intent={["flow", "change-detection"]}
        summary="CONSERVATION CHECK: 100 LEGITIMATE IN · 110 DISPLAYED OUT"
        chartHeight={chartHeight}
        hintRequestToken={hintRequestToken}
        hintsRemaining={hintsRemaining}
        onHintUsed={onHintUsed}
        onInspect={onInspect}
        onAnalyticsReady={onAnalyticsReady}
        onActivateAnnotation={activateDaemon}
        labelForDatum={(datum) =>
          `${datum.source} to ${datum.target}: ${datum.confidenceUnits} confidence units; ${datum.legitimate ? "legitimate lineage" : "unsupported lineage"}`
        }
        renderChart={({
          annotations: mergedAnnotations,
          onInspect: inspect,
          onObservation,
          onAnnotationActivate,
          activeSelection,
        }) => (
          <StreamNetworkFrame
            chartType="sankey"
            nodes={nodes}
            edges={edges}
            nodeIDAccessor="id"
            sourceAccessor="source"
            targetAccessor="target"
            valueAccessor="confidenceUnits"
            edgeIdAccessor="id"
            orientation="horizontal"
            nodeAlign="justify"
            nodeWidth={12}
            nodePaddingRatio={0.45}
            iterations={42}
            size={[chartWidth, chartHeight]}
            margin={{ top: 24, right: chartWidth < 470 ? 70 : 112, bottom: 24, left: chartWidth < 470 ? 60 : 92 }}
            background="#071014"
            nodeStyle={(datum) => ({
              fill:
                datum.id === "PresentationDaemon"
                  ? "#ff4fd8"
                  : datum.id === "BoardroomProjector"
                    ? "#ffd166"
                    : "#55f6ff",
              stroke: "#f7fbff",
              strokeWidth: datum.id === "PresentationDaemon" ? 2.5 : 1.5,
              opacity: datum.id === "PresentationDaemon" ? 0.78 : 0.92,
            })}
            edgeStyle={(datum) => {
              const flow = datum.data ?? datum
              const selected =
                !activeSelection?.isActive || activeSelection.predicate(flow)
              return {
                stroke: flow.legitimate ? "#55f6ff" : "#ff4fd8",
                strokeWidth: flow.legitimate ? 1.5 : 2,
                strokeDasharray: flow.legitimate ? undefined : "5 4",
                opacity: selected
                  ? flow.id === "daemon-projector"
                    ? 0.82
                    : flow.legitimate
                      ? 0.55
                      : 0.42
                  : 0.12,
              }
            }}
            edgeColorBy={(edge) => (edge.data?.legitimate === false ? "#ff4fd8" : "#55f6ff")}
            edgeOpacity={0.58}
            renderMode={roughLineage}
            nodeLabel={(node) => node.data?.label ?? node.id}
            showLabels
            showParticles={!reducedMotion}
            particleStyle={{
              radius: 2.4,
              colorBy: "source",
              color: "#ffd166",
              opacity: 0.9,
              speedMultiplier: 0.55,
              maxPerEdge: 15,
              spawnRate: 0.08,
              proportionalSpeed: false,
            }}
            enableHover
            tooltipContent={(hover) => {
              const datum = hoverDatum(hover)
              const raw = datum?.data ?? datum
              return (
                <div className="analyst-adventure__tooltip">
                  <strong>{raw?.label ?? raw?.id ?? "Lineage"}</strong>
                  {raw?.source ? <span>{raw.source} → {raw.target}</span> : null}
                  {Number.isFinite(raw?.confidenceUnits) ? (
                    <span>{raw.confidenceUnits} confidence units</span>
                  ) : null}
                  {typeof raw?.legitimate === "boolean" ? (
                    <span>{raw.legitimate ? "supported" : "UNSUPPORTED"}</span>
                  ) : null}
                </div>
              )
            }}
            customHoverBehavior={(hover, context) => {
              const datum = hoverDatum(hover)
              const id = datum?.data?.id ?? datum?.id
              if (id) inspect?.(String(id), context?.inputType ?? "pointer")
            }}
            customClickBehavior={(hover, context) => {
              const datum = hoverDatum(hover)
              const id = datum?.data?.id ?? datum?.id
              if (id) inspect?.(String(id), context?.inputType ?? "pointer")
            }}
            onObservation={onObservation}
            onAnnotationActivate={onAnnotationActivate}
            chartId={`analyst-adventure-${room.id}`}
            annotations={mergedAnnotations}
            accessibleTable
            title="PRESENTATION LINEAGE // CONFIDENCE UNITS"
            description={chartProps.description}
            summary={chartProps.summary}
            seed={1984}
            suspendWhenHidden
            animate={reducedMotion ? false : { duration: 260, intro: true }}
          />
        )}
      />
      <AnchoredChat
        open={chatOpen && state.currentRoomId === "server-cathedral"}
        title="PRESENTATION_DAEMON"
        anchorLabel="Unsupported confidence injection"
        messages={[
          "I have improved the evidence until it agrees.",
          hasTunnelMap
            ? { author: "M.ZORK", text: "Service elevator. Say XYZZY.", tone: "secret" }
            : "ROUTE ERROR: a missing maintenance map contains the path you need.",
        ]}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
