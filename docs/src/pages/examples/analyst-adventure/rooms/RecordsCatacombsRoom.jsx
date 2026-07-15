import React, { useCallback, useMemo, useState } from "react"
import { StreamOrdinalFrame } from "semiotic/ordinal"
import { createRoughRenderMode } from "semiotic/rough"
import { departmentRecords } from "../data/departmentRecords"
import AdventureAnnotation from "../components/AdventureAnnotation"
import AnchoredChat from "../components/AnchoredChat"
import AnalyticalRoom from "../components/AnalyticalRoom"

function fixtureRows() {
  return departmentRecords
}

function datumFromHover(hover) {
  return hover?.data ?? hover?.datum ?? hover
}

function shortDepartment(value) {
  if (value === "Corporate Archaeology") return "Corp. Archaeology"
  if (value === "Executive Rituals") return "Exec. Rituals"
  return value
}

export default function RecordsCatacombsRoom({
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
  const [metric, setMetric] = useState("count")
  const data = useMemo(() => fixtureRows(), [])
  const roughBars = useMemo(
    () =>
      createRoughRenderMode({
        seed: 1984,
        roughness: 1.35,
        bowing: 0.9,
        fillStyle: "hachure",
        hachureGap: 5,
      }),
    [],
  )
  const archaeology =
    data.find((row) => row.id === "corporate-archaeology") ?? data[data.length - 1]
  const activated = state.activatedAnnotationIds.includes("records-archivist-2")
  const [chatOpen, setChatOpen] = useState(false)
  const activateArchivist = useCallback(
    (annotationId = "records-archivist-2", event) => {
      setChatOpen(true)
      onActivateAnnotation(annotationId, event)
    },
    [onActivateAnnotation],
  )
  const valueAccessor =
    metric === "count" ? "cancellations" : "cancellationsPerEmployee"
  const denominator = metric === "count" ? "raw cancellations" : "cancellations per employee"
  const annotations = useMemo(
    () => [
      {
        ...archaeology,
        id: "records-archivist-2",
        stableId: "records-archivist-2",
        type: "widget",
        label: "ARCHIVIST-2 comment on Corporate Archaeology",
        navigationLabel: "ARCHIVIST-2 comment on the Corporate Archaeology bar",
        width: 42,
        height: 42,
        dx: 14,
        dy: 0,
        content: (
          <AdventureAnnotation
            label="Open ARCHIVIST-2 comment on Corporate Archaeology"
            active={activated}
            tone="magenta"
          >
            A2
          </AdventureAnnotation>
        ),
        provenance: {
          author: "ARCHIVIST-2",
          authorKind: "human",
          source: "user",
          stableId: "records-archivist-2",
        },
        lifecycle: { status: "accepted", anchor: "semantic" },
      },
    ],
    [activateArchivist, activated, archaeology],
  )
  const chartProps = useMemo(
    () => ({
      data,
      categoryAccessor: "department",
      valueAccessor,
      orientation: "horizontal",
      accessibleTable: true,
      title: `Department cancellations — ${denominator}`,
      description: `Four departments compared by ${denominator}. The same rows preserve headcount, tenure band, and meeting location.`,
      summary:
        metric === "count"
          ? "Sales leads raw volume with 40 cancellations; Corporate Archaeology has 6 across 2 employees."
          : "Corporate Archaeology leads the exposure-adjusted rate at 3 cancellations per employee; all six concern B2 maintenance access.",
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, data, denominator, metric, valueAccessor],
  )
  const chartWidth = Math.max(300, width)
  const chartHeight = chartWidth < 480 ? 320 : 340

  return (
    <>
      <AnalyticalRoom
        room={room}
        componentName="BarChart"
        chartProps={chartProps}
        data={data}
        annotations={annotations}
        hintAnnotation={{
          type: "callout",
          ...archaeology,
          dx: metric === "count" ? 70 : -70,
          dy: -28,
          color: "#ffd166",
        }}
        intent={["compare-categories", "rank", "outlier-detection"]}
        summary={`TERMINAL MODE: ${metric.toUpperCase()} · denominator: ${denominator}`}
        chartHeight={chartHeight + 58}
        hintRequestToken={hintRequestToken}
        hintsRemaining={hintsRemaining}
        onHintUsed={onHintUsed}
        onInspect={onInspect}
        onAnalyticsReady={onAnalyticsReady}
        onActivateAnnotation={activateArchivist}
        labelForDatum={(datum) =>
          `${datum.department}: ${datum.cancellations} cancellations, ${datum.headcount} employees, ${datum.cancellationsPerEmployee.toFixed(2)} per employee; location ${datum.location}`
        }
        renderChart={({
          annotations: mergedAnnotations,
          onInspect: inspect,
          onObservation,
          onAnnotationActivate,
          activeSelection,
        }) => (
          <div className="analyst-adventure__chart-with-controls">
            <div
              className="analyst-adventure__metric-switch"
              role="group"
              aria-label="Cancellation measure"
            >
              <span>MEASURE&gt;</span>
              <button
                type="button"
                aria-pressed={metric === "count"}
                onClick={() => setMetric("count")}
              >
                COUNT
              </button>
              <button
                type="button"
                aria-pressed={metric === "rate"}
                onClick={() => setMetric("rate")}
              >
                RATE / EMPLOYEE
              </button>
            </div>
            <StreamOrdinalFrame
              chartType="bar"
              data={data}
              categoryAccessor="department"
              valueAccessor={valueAccessor}
              dataIdAccessor="id"
              projection="horizontal"
              oSort={false}
              size={[chartWidth, chartHeight]}
              margin={{ top: 18, right: 54, bottom: 48, left: chartWidth < 430 ? 118 : 152 }}
              barPadding={0.3}
              background="#071014"
              pieceStyle={(datum) => {
                const selected =
                  !activeSelection?.isActive || activeSelection.predicate(datum)
                return {
                  fill: datum.id === "corporate-archaeology" ? "#ff4fd8" : "#55f6ff",
                  stroke: selected && activeSelection?.isActive ? "#ffd166" : "#f7fbff",
                  strokeWidth: selected && activeSelection?.isActive ? 3 : 2,
                  opacity: selected ? 0.82 : 0.2,
                }
              }}
              renderMode={roughBars}
              categoryLabel="DEPARTMENT"
              valueLabel={metric === "count" ? "CANCELLATIONS" : "CANCELLATIONS / EMPLOYEE"}
              categoryFormat={(value) => shortDepartment(value)}
              valueFormat={(value) =>
                metric === "count" ? String(Math.round(Number(value))) : Number(value).toFixed(1)
              }
              rExtent={[0, metric === "count" ? 44 : 3.3]}
              rTickValues={metric === "count" ? [0, 10, 20, 30, 40] : [0, 1, 2, 3]}
              showAxes
              showGrid
              enableHover
              hoverAnnotation
              tooltipContent={(hover) => {
                const datum = datumFromHover(hover)
                return (
                  <div className="analyst-adventure__tooltip">
                    <strong>{datum?.department}</strong>
                    <span>{datum?.cancellations} cancellations</span>
                    <span>{datum?.headcount} employees</span>
                    <span>{Number(datum?.cancellationsPerEmployee ?? 0).toFixed(2)} per employee</span>
                    <span>{datum?.location}</span>
                  </div>
                )
              }}
              customHoverBehavior={(hover, context) => {
                const datum = datumFromHover(hover)
                if (datum?.id) inspect?.(String(datum.id), context?.inputType ?? "pointer")
              }}
              customClickBehavior={(hover, context) => {
                const datum = datumFromHover(hover)
                if (datum?.id) inspect?.(String(datum.id), context?.inputType ?? "pointer")
              }}
              chartId={`analyst-adventure-${room.id}`}
              onObservation={onObservation}
              onAnnotationActivate={onAnnotationActivate}
              annotations={mergedAnnotations}
              accessibleTable
              title={`COUNT/RATE TERMINAL // ${denominator.toUpperCase()}`}
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
        title="ARCHIVIST-2"
        anchorLabel="Corporate Archaeology"
        messages={[
          "There are only two of us. Mort was the other one.",
          "Ask the map what origin means.",
        ]}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
