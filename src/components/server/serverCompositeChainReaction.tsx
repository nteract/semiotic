import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import type { Datum } from "../charts/shared/datumTypes"
import { ChainReactionOverlay } from "../charts/physics/chainReactionOverlay"
import {
  initialRuntime,
  numericTime
} from "../charts/physics/chainReactionRuntime"
import {
  calculateBlockerAmplification,
  compileDependencyMachine,
  routeDependencyTracks
} from "../charts/physics/dependencyMachine"
import { themeToCSSVariables } from "../store/themeCSSVariables"
import { buildCompositeEvidence, type EvidenceSink } from "./renderEvidence"
import type { ServerChartData } from "./serverChartConfigShared"
import { chartUID } from "./staticSVGChrome"
import { resolveTheme, themeStyles } from "./themeResolver"

interface ChainReactionPayload {
  data: ServerChartData
  common: Datum
  rest: Datum
}

function readPayload(frameProps: Datum): ChainReactionPayload {
  return frameProps.__composite as ChainReactionPayload
}

function rows(value: ServerChartData): Datum[] {
  return Array.isArray(value)
    ? value.filter(
        (datum): datum is Datum =>
          datum != null && typeof datum === "object" && !Array.isArray(datum)
      )
    : []
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function chainDescription(
  machine: ReturnType<typeof compileDependencyMachine>,
  runtime: ReturnType<typeof initialRuntime>,
  authored: unknown
): string {
  const base =
    typeof authored === "string"
      ? authored
      : "Tasks are arranged by workstream and dependency depth. Completed tasks deliver their authored prerequisites; task completion remains an explicit data event."
  const blockers = [...runtime.blockers.keys()]
    .map((taskID) => {
      const result = calculateBlockerAmplification(machine, taskID, {
        completedTaskIDs: runtime.completed
      })
      const label = machine.byID.get(taskID)?.label ?? taskID
      return `${label} affects ${result.downstreamTaskCount} unfinished tasks across ${result.affectedLaneCount} lanes.`
    })
    .join(" ")
  return blockers
    ? `${base} ${blockers}`
    : `${base} No explicit blockers are active.`
}

export function renderChainReaction(
  frameProps: Datum,
  sink?: EvidenceSink
): string {
  const { data: input, common, rest } = readPayload(frameProps)
  const data = rows(input)
  const [width, height] = (common.size as [number, number]) ?? [920, 620]
  const title =
    typeof common.title === "string"
      ? common.title
      : "Dependency chain reaction"
  const machine = compileDependencyMachine({
    data,
    taskIDAccessor: rest.taskIDAccessor as never,
    labelAccessor: rest.labelAccessor as never,
    laneAccessor: rest.laneAccessor as never,
    dependencyAccessor: rest.dependencyAccessor as never,
    startAccessor: rest.startAccessor as never,
    endAccessor: rest.endAccessor as never,
    progressAccessor: rest.progressAccessor as never,
    statusAccessor: rest.statusAccessor as never,
    completionTimeAccessor: rest.completionTimeAccessor as never,
    blockerAccessor: rest.blockerAccessor as never,
    milestoneAccessor: rest.milestoneAccessor as never
  })
  const theme = resolveTheme(common.theme as Parameters<typeof resolveTheme>[0])
  const styles = themeStyles(theme)
  const idPrefix = chartUID(common)
  const titleId = `${idPrefix}-title`
  const descriptionId = `${idPrefix}-description`

  if (!machine.valid) {
    const description = machine.diagnostics
      .map((diagnostic) => diagnostic.message)
      .join(" ")
    const svg = ReactDOMServer.renderToStaticMarkup(
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="chain-reaction-chart"
        width={width}
        height={height}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
        style={{ fontFamily: styles.fontFamily }}
      >
        <title id={titleId}>{title}</title>
        <desc id={descriptionId}>{description}</desc>
        <rect width={width} height={height} fill={styles.background} />
        <text x={24} y={36} fontSize={16} fontWeight={700} fill={styles.text}>
          {title}
        </text>
        {machine.diagnostics.map((diagnostic, index) => (
          <text
            key={`${diagnostic.code}-${index}`}
            x={24}
            y={72 + index * 22}
            fontSize={12}
            fill={theme.colors.error}
          >
            {diagnostic.message}
          </text>
        ))}
      </svg>
    )
    if (sink) {
      sink.evidence = buildCompositeEvidence({
        frameType: "physics",
        width,
        height,
        parts: [],
        title,
        description,
        nodeCount: machine.nodes.length,
        edgeCount: machine.edges.length,
        extraWarnings: ["INVALID_DEPENDENCY_GRAPH"]
      })
    }
    return svg
  }

  const layout = routeDependencyTracks(machine, { width, height })
  // A static export always resolves the authored state at currentTime. Replay
  // controls and in-flight delivery balls are temporal affordances; freezing
  // their arbitrary first frame would conceal the dependency reading.
  const runtime = initialRuntime(
    machine,
    "snapshot",
    numericTime(rest.currentTime as number | Date | undefined, Infinity),
    true
  )
  const selectedTaskIDs = Array.isArray(rest.selectedTaskIDs)
    ? rest.selectedTaskIDs.map(String)
    : []
  const selectedSet = new Set(selectedTaskIDs)
  const selectedInsightID = selectedTaskIDs[0] ?? null
  const amplification =
    selectedInsightID && rest.insight !== "none"
      ? calculateBlockerAmplification(machine, selectedInsightID, {
          completedTaskIDs: runtime.completed
        })
      : null
  const downstreamSet = new Set(amplification?.downstreamTaskIDs ?? [])
  const seed = finiteNumber(rest.seed, 31)
  const description = chainDescription(machine, runtime, common.description)
  const overlay = ReactDOMServer.renderToStaticMarkup(
    <ChainReactionOverlay
      machine={machine}
      layout={layout}
      runtime={runtime}
      downstreamSet={downstreamSet}
      selectedSet={selectedSet}
      width={width}
      height={height}
      seed={seed}
      reduced
      onSelectTask={() => {}}
    />
  )
  // Match StreamPhysicsFrame's default-theme behavior: the overlay's
  // documented fallbacks are the default palette, while an explicitly
  // supplied theme materializes CSS variables on both client and server.
  const cssVariables = (
    common.theme === undefined ? {} : themeToCSSVariables(theme)
  ) as React.CSSProperties
  const svg = ReactDOMServer.renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="chain-reaction-chart"
      width={width}
      height={height}
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      style={{ ...cssVariables, fontFamily: styles.fontFamily }}
    >
      <title id={titleId}>{title}</title>
      <desc id={descriptionId}>{description}</desc>
      <rect width={width} height={height} fill={styles.background} />
      <text
        x={width / 2}
        y={22}
        textAnchor="middle"
        fontSize={styles.titleFontSize}
        fontFamily={styles.titleFontFamily}
        fontWeight={styles.titleFontWeight}
        fill={styles.text}
      >
        {title}
      </text>
      <g dangerouslySetInnerHTML={{ __html: overlay }} />
    </svg>
  )

  if (sink) {
    sink.evidence = buildCompositeEvidence({
      frameType: "physics",
      width,
      height,
      parts: [],
      additionalMarkCountByType: {
        task: machine.nodes.length,
        dependency: machine.edges.length
      },
      title,
      description,
      categories: machine.lanes,
      nodeCount: machine.nodes.length,
      edgeCount: machine.edges.length
    })
  }
  return svg
}
