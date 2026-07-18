import React, { useCallback, useMemo, useState } from "react"
import { StreamXYFrame } from "semiotic/xy"
import { executiveTelemetry } from "../data/executiveTelemetry"
import AdventureAnnotation from "../components/AdventureAnnotation"
import AnchoredChat from "../components/AnchoredChat"
import AnalyticalRoom from "../components/AnalyticalRoom"

const COLORS = {
  badge: "#ff4fd8",
  elevator: "#55f6ff",
  danger: "#ffd166",
  ink: "#f7fbff",
}

function fixtureRows() {
  return executiveTelemetry
}

function timeValue(value) {
  return value instanceof Date ? value : new Date(value)
}

function timeLabel(value) {
  const date = timeValue(value)
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

export default function ExecutiveSuiteRoom({
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
  onSecretCalendarWarp,
}) {
  const data = useMemo(
    () =>
      fixtureRows().map((row) => ({
        ...row,
        timestamp: timeValue(row.timestamp),
        observedAt: timeValue(row.observedAt),
      })),
    [],
  )
  const roof =
    data.find((row) => row.id === "badge-roof-cached") ??
    data.find((row) => row.source === "badge" && row.trusted === false) ??
    data.find((row) => Number(row.cacheAgeMinutes) > 0) ??
    data[data.length - 1]
  const activated = state.activatedAnnotationIds.includes("executive-cached-roof")
  const [chatOpen, setChatOpen] = useState(false)
  const activateCachedRoof = useCallback(
    (annotationId = "executive-cached-roof", event) => {
      setChatOpen(true)
      onActivateAnnotation(annotationId, event)
    },
    [onActivateAnnotation],
  )
  const annotations = useMemo(
    () => [
      {
        id: "executive-disappearance-window",
        stableId: "executive-disappearance-window",
        type: "x-band",
        x0: timeValue("1984-06-04T09:12:00.000Z"),
        x1: timeValue("1984-06-04T09:20:00.000Z"),
        label: "DISAPPEARANCE WINDOW",
        fill: "#ff4fd8",
        color: "#ff9deb",
        fillOpacity: 0.09,
        interactive: false,
      },
      {
        ...roof,
        id: "executive-cached-roof",
        stableId: "executive-cached-roof",
        type: "widget",
        label: "M.ZORK (offline) left a comment",
        navigationLabel: "M.ZORK offline comment at the cached roof observation",
        width: 42,
        height: 42,
        dx: 0,
        dy: -20,
        content: (
          <AdventureAnnotation
            label="M.ZORK (offline) left a comment"
            active={activated}
            tone="secret"
          >
            MZ
          </AdventureAnnotation>
        ),
        provenance: {
          author: "M.ZORK",
          authorKind: "human",
          source: "user",
          stableId: "executive-cached-roof",
        },
        lifecycle: { status: "accepted", anchor: "semantic" },
      },
    ],
    [activateCachedRoof, activated, roof],
  )
  const chartProps = useMemo(
    () => ({
      data,
      xAccessor: "timestamp",
      yAccessor: "floor",
      lineBy: "source",
      colorBy: "source",
      xScaleType: "time",
      xLabel: "Displayed event time",
      yLabel: "Building floor",
      accessibleTable: true,
      title: "The Calendar That Lies",
      description:
        "Badge and elevator positions by displayed event time. Each accessible row also states observedAt and cacheAgeMinutes; the roof badge point was observed eight minutes earlier.",
      summary:
        "Before 9:12 the badge trails the elevator by eight minutes. The 9:14 roof ping was observed at 9:06, while the last contemporaneous elevator record places Mort on B2.",
      annotations: annotations.map(({ content: _content, ...annotation }) => annotation),
    }),
    [annotations, data],
  )
  const chartWidth = Math.max(300, width)
  const chartHeight = chartWidth < 480 ? 300 : 340

  return (
    <>
      <AnalyticalRoom
        room={room}
        componentName="LineChart"
        chartProps={chartProps}
        data={data}
        annotations={annotations}
        hintAnnotation={{
          type: "callout",
          ...roof,
          dx: -70,
          dy: 44,
          color: COLORS.danger,
        }}
        intent={["compare-series", "change-detection"]}
        summary="DISPLAY TIME ≠ OBSERVATION TIME · inspect both clocks"
        chartHeight={chartHeight}
        hintRequestToken={hintRequestToken}
        hintsRemaining={hintsRemaining}
        onHintUsed={onHintUsed}
        onInspect={onInspect}
        onAnalyticsReady={onAnalyticsReady}
        onActivateAnnotation={activateCachedRoof}
        onSecretCalendarWarp={onSecretCalendarWarp}
        labelForDatum={(datum) =>
          `${datum.source} at ${timeLabel(datum.timestamp)}: floor ${datum.floor < 0 ? `B${Math.abs(datum.floor)}` : datum.floor}; observed ${timeLabel(datum.observedAt)}; cache age ${datum.cacheAgeMinutes} minutes; ${datum.trusted ? "contemporaneous" : "cached"}`
        }
        renderChart={({
          annotations: mergedAnnotations,
          onInspect: inspect,
          onObservation,
          onAnnotationActivate,
          activeSelection,
        }) => (
          <StreamXYFrame
            chartType="line"
            data={data}
            xAccessor="timestamp"
            yAccessor="floor"
            groupAccessor="source"
            pointIdAccessor="id"
            xScaleType="time"
            xExtent={[
              Math.min(...data.map((row) => row.timestamp.getTime())),
              Math.max(...data.map((row) => row.timestamp.getTime())),
            ]}
            yExtent={[-2, Math.max(9, ...data.map((row) => row.floor))]}
            size={[chartWidth, chartHeight]}
            margin={{ top: 30, right: 22, bottom: 50, left: 54 }}
            background="#071014"
            lineStyle={(_datum, group) => ({
              stroke: group === "badge" ? COLORS.badge : COLORS.elevator,
              strokeWidth: group === "badge" ? 3 : 2.5,
              opacity: group === "badge" ? 0.9 : 1,
            })}
            axes={[
              {
                orient: "bottom",
                label: "DISPLAYED EVENT TIME",
                ticks: chartWidth < 440 ? 4 : 6,
                tickFormat: timeLabel,
                tickAnchor: "edges",
              },
              {
                orient: "left",
                label: "FLOOR",
                tickValues: [-2, 0, 2, 4, 6, 8],
                tickFormat: (value) => (value < 0 ? `B${Math.abs(value)}` : String(value)),
              },
            ]}
            foregroundGraphics={({ scales }) => {
              if (!scales?.x || !scales?.y) return null
              return (
                <g aria-hidden="true">
                  {data.map((row) => {
                    const selected =
                      !activeSelection?.isActive || activeSelection.predicate(row)
                    return (
                      <circle
                        key={row.id}
                        cx={scales.x(row.timestamp)}
                        cy={scales.y(row.floor)}
                        r={row.id === roof?.id ? 6 : 4}
                        fill={row.source === "badge" ? COLORS.badge : COLORS.elevator}
                        stroke={selected ? (row.trusted ? "#071014" : COLORS.danger) : "#24424b"}
                        strokeWidth={selected ? (row.trusted ? 1.5 : 3) : 1}
                        opacity={selected ? 1 : 0.2}
                      />
                    )
                  })}
                </g>
              )
            }}
            showGrid
            enableHover
            hoverRadius={28}
            hoverAnnotation
            tooltipMode="multi"
            tooltipContent={(hover) => {
              const datum = datumFromHover(hover)
              return (
                <div className="analyst-adventure__tooltip">
                  <strong>{String(datum?.source ?? "telemetry").toUpperCase()}</strong>
                  <span>event {timeLabel(datum?.timestamp)}</span>
                  <span>observed {timeLabel(datum?.observedAt)}</span>
                  <span>cache age {datum?.cacheAgeMinutes ?? 0}m</span>
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
            description={chartProps.description}
            summary={chartProps.summary}
            title="EXECUTIVE TELEMETRY // TRUST WINDOW"
            seed={1984}
            animate={reducedMotion ? false : { duration: 280, intro: true }}
          />
        )}
      />
      <AnchoredChat
        open={chatOpen}
        title="M.ZORK (offline)"
        anchorLabel="Cached roof observation"
        messages={["A timestamp is not necessarily the time something happened."]}
        onClose={() => setChatOpen(false)}
      />
    </>
  )
}
