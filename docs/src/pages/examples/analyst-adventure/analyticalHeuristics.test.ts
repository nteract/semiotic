import { describe, expect, it } from "vitest"
import { suggestCharts, type IntentId } from "semiotic/ai"
import { auditAccessibility, diagnoseConfig } from "semiotic/utils"
import {
  adventureDiagnosticProps,
  adventureSuggestionInput,
} from "./analyticalHeuristics"
import { badgePacketFlows, campusPoints } from "./data/campusFlows"
import { departmentRecords } from "./data/departmentRecords"
import { executiveTelemetry } from "./data/executiveTelemetry"
import { forecastBodies } from "./data/forecastPhysics"
import { presentationFlows, presentationNodes } from "./data/presentationLineage"

const campusNodes = campusPoints.map((point) => ({
  ...point,
  lon: point.coordinates[0],
  lat: point.coordinates[1],
}))

const CASES: Array<{
  room: string
  componentName: string
  diagnosticComponentName: string
  intendedSuggestion: string
  intent: IntentId | IntentId[]
  data: Array<Record<string, any>>
  props: Record<string, any>
}> = [
  {
    room: "Executive Suite",
    componentName: "LineChart",
    diagnosticComponentName: "LineChart",
    intendedSuggestion: "LineChart",
    intent: ["compare-series", "change-detection"],
    data: executiveTelemetry,
    props: {
      data: executiveTelemetry,
      xAccessor: "timestamp",
      yAccessor: "floor",
      xScaleType: "time",
      lineBy: "source",
      colorBy: "source",
      showPoints: true,
      showGrid: true,
      title: "The Calendar That Lies",
    },
  },
  {
    room: "Records Catacombs",
    componentName: "BarChart",
    diagnosticComponentName: "BarChart",
    intendedSuggestion: "BarChart",
    intent: "compare-categories",
    data: departmentRecords,
    props: {
      data: departmentRecords,
      categoryAccessor: "department",
      valueAccessor: "cancellationsPerEmployee",
      orientation: "horizontal",
      title: "Cancellations per employee",
    },
  },
  {
    room: "Corporate Map Room",
    componentName: "FlowMap",
    diagnosticComponentName: "FlowMap",
    intendedSuggestion: "FlowMap",
    intent: ["geo", "flow"],
    data: badgePacketFlows,
    props: {
      nodes: campusNodes,
      flows: badgePacketFlows,
      valueAccessor: "packets",
      lineIdAccessor: "id",
      title: "Campus packet origin trace",
    },
  },
  {
    room: "Server Cathedral",
    componentName: "SankeyDiagram",
    diagnosticComponentName: "SankeyDiagram",
    intendedSuggestion: "SankeyDiagram",
    intent: "flow",
    data: presentationFlows,
    props: {
      nodes: presentationNodes,
      edges: presentationFlows,
      nodeIdAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "confidenceUnits",
      orientation: "horizontal",
      title: "Presentation lineage",
    },
  },
  {
    room: "Hidden Forecast Vault",
    componentName: "StreamPhysicsFrame",
    diagnosticComponentName: "GauntletChart",
    intendedSuggestion: "GauntletChart",
    intent: ["flow", "distribution"],
    data: forecastBodies,
    props: {
      data: forecastBodies,
      title: "The Room Where Forecasts Fall Down",
      paused: true,
    },
  },
]

const FATAL_CAVEAT = /\b(?:cannot render|does not support|unsupported data|fatal)\b/i

describe("Analyst Adventure analytical contracts", () => {
  it.each(CASES)(
    "$room keeps its intended chart eligible without a fatal caveat",
    ({ componentName, intendedSuggestion, intent, data, props }) => {
      const suggestions = suggestCharts(data, {
        intent,
        maxResults: 50,
        rawInput: adventureSuggestionInput(componentName, props),
      })
      const intended = suggestions.find(
        (suggestion) => suggestion.component === intendedSuggestion,
      )

      expect(intended).toBeDefined()
      expect(intended?.caveats.some((caveat) => FATAL_CAVEAT.test(caveat))).toBe(false)
    },
  )

  it.each(CASES)(
    "$room has a diagnosable configuration and a non-failing static audit",
    ({ componentName, diagnosticComponentName, data, props }) => {
      const diagnosticProps = adventureDiagnosticProps(
        diagnosticComponentName,
        props,
        data,
      )
      const diagnosis = diagnoseConfig(diagnosticComponentName, diagnosticProps)
      expect(
        diagnosis.diagnoses.filter((finding) => finding.severity === "error"),
      ).toEqual([])

      const auditComponent =
        componentName === "StreamPhysicsFrame" ? "StreamPhysicsFrame" : diagnosticComponentName
      const auditProps =
        componentName === "StreamPhysicsFrame"
          ? {
              ...props,
              pauseControl: true,
              settledProjection: true,
              reducedMotion: "settle",
            }
          : diagnosticProps
      const audit = auditAccessibility(auditComponent, auditProps, {
        inChartContainer: true,
        describe: true,
        navigable: true,
      })

      expect(audit.ok).toBe(true)
      expect(audit.findings.length).toBeGreaterThan(0)
    },
  )
})
