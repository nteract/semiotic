import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import {
  ChartContainer,
  GroupedBarChart,
  Heatmap,
  LineChart,
  QuadrantChart,
  SankeyDiagram,
} from "semiotic"
import { NetworkCustomChart } from "semiotic/network"
import { BigNumber } from "semiotic/value"
import {
  applyAnnotationLifecycle,
  applyAnnotationStatus,
  recordAnnotationStatusChange,
  useConversationArc,
} from "semiotic/ai"
import {
  auditAccessibility,
  buildNavigationTree,
  buildReaderGrounding,
  configToJSX,
  copyConfig,
  describeChart,
  diagnoseConfig,
  fromConfig,
  fromURL,
  toConfig,
  toURL,
  unwrapDatum,
  useReducedMotion,
  validateProps,
} from "semiotic/utils"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  CARRIERS,
  DATASET_WINDOW,
  FOCAL_INSERT_B_PREDICATE,
  INCIDENT_PREDICATE,
  INCIDENT_WINDOW,
  MINIMUM_OPERATIONAL_VOLUME,
  PACKAGE_DESIGNS,
  PACKAGING_ROLLOUT_DATE,
  PRODUCTS,
  RETURN_REASON_LABELS,
  STORY_STATS,
  SYNTHETIC_DATA_NOTICE,
  TINY_NORTHSTAR_PREDICATE,
  aggregateCohortPoints,
  aggregateDailyReturnRates,
  aggregateProductPackageHeatmap,
  aggregateSankey,
  aggregateSortingShelf,
  compilePredicate,
  fieldsUsedByPredicate,
  fulfillmentDomain,
  orderRecords,
  rowsMatching,
  summarizePredicate,
} from "./insight-forge/insightForgeData"
import {
  FORGE_NOW,
  MATURITY_ROWS,
  RECIPE_ATLAS,
  SCOPE_COLUMNS,
  artifactGridPosition,
  compatibleRecipe,
  craftArtifacts,
  explainCompatibility,
  isSuperseded,
  makeArtifact,
  setArtifactStatus,
} from "./insight-forge/insightForgeArtifacts"
import {
  AUTHORED_DOORS,
  ROOM_ORDER,
  ROOM_TITLES,
  TEAM_ACTORS,
  TEAM_TRANSITIONS,
  deriveSessionPath,
  summarizeTravel,
} from "./insight-forge/insightForgeTravel"
import { EvidencePips, ForgeGlyph } from "./insight-forge/InsightForgeGlyphs"
import "./InsightForgeExamplePage.css"

const STORAGE_KEY = "semiotic:insight-forge:v1"
const ARC_ID = "insight-forge-wayfinder-case"
const BASELINE_RETURN_RATE = STORY_STATS.baselineReturnRate
const ACCEPTED_INSIGHT_PREDICATE = Object.freeze({
  op: "and",
  clauses: Object.freeze([INCIDENT_PREDICATE, FOCAL_INSERT_B_PREDICATE]),
})
const KNOWLEDGE_SCOPE_PREDICATE = Object.freeze({
  op: "and",
  clauses: Object.freeze([
    INCIDENT_PREDICATE,
    Object.freeze({ op: "eq", field: "fulfillment.warehouse", value: "reno" }),
  ]),
})
const PERCENT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const INTEGER = new Intl.NumberFormat("en-US")
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

const ROOMS = [
  {
    id: "watchtower",
    title: "Watchtower",
    short: "Watch",
    icon: "burst",
    componentName: "LineChart",
    question: "When did the problem appear?",
    note: "Locate the signal, then keep its time scope and denominator together.",
    fields: ["shipment.date", "return.returned", "weather.severe", "package.design"],
  },
  {
    id: "sorting-shelf",
    title: "Sorting Shelf",
    short: "Sort",
    icon: "crate",
    componentName: "GroupedBarChart",
    question: "What kind of return grew, and for which product?",
    note: "Decompose the excess without losing the incident window upstream.",
    fields: ["return.reason", "product.id", "fulfillment.warehouse", "package.design"],
  },
  {
    id: "route-ledger",
    title: "Route Ledger",
    short: "Route",
    icon: "route",
    componentName: "SankeyDiagram",
    question: "Through which fulfillment path did it travel?",
    note: "Collect the row predicate behind the full route so the evidence can travel to another chart.",
    fields: [
      "product.id",
      "fulfillment.warehouse",
      "package.design",
      "fulfillment.carrier",
      "return.reason",
    ],
  },
  {
    id: "inspection-bench",
    title: "Inspection Bench",
    short: "Inspect",
    icon: "scales",
    componentName: "QuadrantChart",
    question: "Which rates are both high and supported?",
    note: "Separate dangerous-looking rates from rates with enough observations to act on.",
    fields: ["product.id", "fulfillment.warehouse", "package.design", "fulfillment.carrier"],
  },
  {
    id: "knowledge-lab",
    title: "Knowledge Lab",
    short: "Lab",
    icon: "codex",
    componentName: "Heatmap",
    question: "Can the conclusion survive one more translation?",
    note: "Bind accepted knowledge to a view, then keep its audit and lineage attached.",
    fields: ["product.id", "package.design", "return.reason"],
  },
]

const FEATURE_IDS_BY_ROOM = {
  watchtower: ["incident-anomaly", "incident-denominator", "rollout-context", "watchtower-view"],
  "sorting-shelf": ["damage-segment", "lantern-segment", "sorting-view"],
  "route-ledger": ["swiftship-path", "route-denominator", "route-view"],
  "inspection-bench": [
    "counterevidence",
    "tiny-northstar-anomaly",
    "tiny-northstar-denominator",
    "inspection-view",
  ],
  "knowledge-lab": ["knowledge-cell"],
}

const STAGE_COLORS = {
  product: "#9b613f",
  warehouse: "#597a68",
  package: "#c99a3b",
  carrier: "#55798a",
  outcome: "#9c4940",
}

const PACKAGE_COLORS = {
  "pulp-a": "#5c7e6c",
  "insert-b": "#b64c3e",
  "foam-c": "#597c91",
}

const INITIAL_EVENT = {
  type: "room-entered",
  roomId: "watchtower",
  fromRoomId: null,
  method: "initial",
  label: "Entered the Watchtower",
  at: 0,
}

function newWorkbenchState() {
  return {
    activeRoomId: "watchtower",
    visitedRooms: ["watchtower"],
    artifacts: {},
    inventoryOrder: [],
    selectedArtifactId: null,
    forgeSlots: [null, null],
    globalApplications: [],
    roomApplications: {},
    events: [INITIAL_EVENT],
    eventSeq: 1,
  }
}

function newTimeline() {
  return { past: [], present: newWorkbenchState(), future: [] }
}

function appendEvent(state, event) {
  return {
    ...state,
    eventSeq: state.eventSeq + 1,
    events: [...state.events, { ...event, at: state.eventSeq }],
  }
}

function reduceWorkbench(state, action) {
  switch (action.type) {
    case "ENTER_ROOM": {
      if (state.activeRoomId === action.roomId) return state
      const room = ROOMS.find((candidate) => candidate.id === action.roomId)
      return appendEvent(
        {
          ...state,
          activeRoomId: action.roomId,
          visitedRooms: state.visitedRooms.includes(action.roomId)
            ? state.visitedRooms
            : [...state.visitedRooms, action.roomId],
        },
        {
          type: "room-entered",
          roomId: action.roomId,
          fromRoomId: state.activeRoomId,
          method: action.method ?? "world-map",
          label: `Entered the ${room?.title}`,
        },
      )
    }
    case "COLLECT": {
      const exists = Boolean(state.artifacts[action.artifact.id])
      return appendEvent(
        {
          ...state,
          artifacts: { ...state.artifacts, [action.artifact.id]: action.artifact },
          inventoryOrder: exists
            ? state.inventoryOrder
            : [...state.inventoryOrder, action.artifact.id],
          selectedArtifactId: action.artifact.id,
        },
        {
          type: "artifact-collected",
          artifactId: action.artifact.id,
          label: exists
            ? `Revisited ${action.artifact.title}`
            : `Collected ${action.artifact.title}`,
        },
      )
    }
    case "SELECT_ARTIFACT":
      return { ...state, selectedArtifactId: action.artifactId }
    case "PLACE_IN_FORGE": {
      const slots = [...state.forgeSlots]
      const otherSlot = action.slot === 0 ? 1 : 0
      if (slots[otherSlot] === action.artifactId) slots[otherSlot] = null
      slots[action.slot] = action.artifactId
      return { ...state, forgeSlots: slots, selectedArtifactId: action.artifactId }
    }
    case "CLEAR_FORGE_SLOT": {
      const slots = [...state.forgeSlots]
      slots[action.slot] = null
      return { ...state, forgeSlots: slots }
    }
    case "CRAFT": {
      const artifact = action.result.artifact
      const artifacts = { ...state.artifacts }
      const retiredIds = new Set(
        (action.result.parentUpdates ?? [])
          .filter((update) => update.status === "retracted")
          .map((update) => update.id),
      )
      for (const update of action.result.parentUpdates ?? []) {
        if (artifacts[update.id])
          artifacts[update.id] = setArtifactStatus(artifacts[update.id], update.status)
      }
      artifacts[artifact.id] = artifact
      let next = {
        ...state,
        artifacts,
        inventoryOrder: state.inventoryOrder.includes(artifact.id)
          ? state.inventoryOrder
          : [...state.inventoryOrder, artifact.id],
        selectedArtifactId: artifact.id,
        forgeSlots: [null, null],
        globalApplications: state.globalApplications.filter(
          (application) => !retiredIds.has(application.artifactId),
        ),
        roomApplications: Object.fromEntries(
          Object.entries(state.roomApplications).map(([roomId, applications]) => [
            roomId,
            applications.filter((application) => !retiredIds.has(application.artifactId)),
          ]),
        ),
      }
      next = appendEvent(next, {
        type: "artifact-crafted",
        artifactId: artifact.id,
        recipeId: artifact.lineage.recipeId,
        label: `Crafted ${artifact.title}`,
      })
      for (const update of action.result.parentUpdates ?? []) {
        next = appendEvent(next, {
          type: "artifact-status-changed",
          artifactId: update.id,
          status: update.status,
          label: `${artifacts[update.id]?.title ?? update.id} marked ${update.status}`,
        })
      }
      return next
    }
    case "APPLY": {
      const application = action.application
      const target = action.global
        ? state.globalApplications
        : (state.roomApplications[application.chartId] ?? [])
      const filtered = target.filter(
        (entry) =>
          !(entry.artifactId === application.artifactId && entry.mode === application.mode),
      )
      const nextApplications = [...filtered, application]
      const next = action.global
        ? { ...state, globalApplications: nextApplications }
        : {
            ...state,
            roomApplications: {
              ...state.roomApplications,
              [application.chartId]: nextApplications,
            },
          }
      return appendEvent(next, {
        type: "artifact-applied",
        artifactId: application.artifactId,
        chartId: application.chartId,
        mode: application.mode,
        label: `${action.global ? "Equipped globally" : "Applied"}: ${state.artifacts[application.artifactId]?.title}`,
      })
    }
    case "REMOVE_APPLICATION": {
      if (action.global) {
        return {
          ...state,
          globalApplications: state.globalApplications.filter((entry) => entry.id !== action.id),
        }
      }
      return {
        ...state,
        roomApplications: {
          ...state.roomApplications,
          [action.roomId]: (state.roomApplications[action.roomId] ?? []).filter(
            (entry) => entry.id !== action.id,
          ),
        },
      }
    }
    case "SET_STATUS": {
      const artifact = state.artifacts[action.artifactId]
      if (!artifact) return state
      const retiring = action.status === "retracted"
      return appendEvent(
        {
          ...state,
          artifacts: {
            ...state.artifacts,
            [action.artifactId]: setArtifactStatus(artifact, action.status),
          },
          globalApplications: retiring
            ? state.globalApplications.filter(
                (application) => application.artifactId !== action.artifactId,
              )
            : state.globalApplications,
          roomApplications: retiring
            ? Object.fromEntries(
                Object.entries(state.roomApplications).map(([roomId, applications]) => [
                  roomId,
                  applications.filter(
                    (application) => application.artifactId !== action.artifactId,
                  ),
                ]),
              )
            : state.roomApplications,
        },
        {
          type: "artifact-status-changed",
          artifactId: action.artifactId,
          status: action.status,
          label: `${artifact.title} marked ${action.status}`,
        },
      )
    }
    default:
      return state
  }
}

const EPHEMERAL_ACTIONS = new Set([
  "SELECT_ARTIFACT",
  "PLACE_IN_FORGE",
  "CLEAR_FORGE_SLOT",
  "REMOVE_APPLICATION",
])

function timelineReducer(timeline, action) {
  if (action.type === "RESET") return newTimeline()
  if (action.type === "HYDRATE") {
    return { past: [], present: action.present, future: [] }
  }
  if (action.type === "UNDO") {
    if (!timeline.past.length) return timeline
    return {
      past: timeline.past.slice(0, -1),
      present: timeline.past[timeline.past.length - 1],
      future: [timeline.present, ...timeline.future],
    }
  }
  if (action.type === "REDO") {
    if (!timeline.future.length) return timeline
    return {
      past: [...timeline.past, timeline.present],
      present: timeline.future[0],
      future: timeline.future.slice(1),
    }
  }
  const present = reduceWorkbench(timeline.present, action)
  if (present === timeline.present) return timeline
  if (EPHEMERAL_ACTIONS.has(action.type)) return { ...timeline, present }
  return {
    past: [...timeline.past, timeline.present].slice(-40),
    present,
    future: [],
  }
}

export default function InsightForgeExamplePage() {
  return (
    <ExamplePageLayout title="The Insight Forge">
      <InsightForgeWorkbench />
    </ExamplePageLayout>
  )
}

export function InsightForgeWorkbench() {
  const [timeline, dispatch] = useReducer(timelineReducer, undefined, newTimeline)
  const state = timeline.present
  const [chartWidth, chartHostRef] = useResponsiveWidth(320, 760)
  const [shelfDimension, setShelfDimension] = useState("reason")
  const [routeScope, setRouteScope] = useState("returned")
  const [lowerPanel, setLowerPanel] = useState("forge")
  const [interpreterQuestion, setInterpreterQuestion] = useState("purpose")
  const [currentCandidateId, setCurrentCandidateId] = useState("incident-anomaly")
  const [announcement, setAnnouncement] = useState("")
  const [shareText, setShareText] = useState("")
  const [resumeState, setResumeState] = useState(null)
  const [sharedView, setSharedView] = useState(null)
  const [replayQueue, setReplayQueue] = useState([])
  const [replayRunning, setReplayRunning] = useState(false)
  const reducedMotion = useReducedMotion()
  const {
    history: arcHistory,
    record: recordArc,
    clear: clearArc,
  } = useConversationArc({
    capacity: 240,
    sessionId: "insight-forge-local",
  })
  const activeRoom = ROOMS.find((room) => room.id === state.activeRoomId) ?? ROOMS[0]
  const activeRoomApplications = useMemo(
    () => state.roomApplications[state.activeRoomId] ?? [],
    [state.activeRoomId, state.roomApplications],
  )
  const allApplications = useMemo(
    () => [...state.globalApplications, ...activeRoomApplications],
    [activeRoomApplications, state.globalApplications],
  )

  const inspectionConfig = useMemo(() => {
    const config = toConfig(
      "QuadrantChart",
      {
        data: aggregateCohortPoints(orderRecords),
        xAccessor: "shipments",
        yAccessor: "damageRate",
        sizeBy: "damagedReturns",
        colorBy: "packageDesignId",
        xCenter: MINIMUM_OPERATIONAL_VOLUME,
        yCenter: STORY_STATS.baselineDamageRate * 2,
        showLegend: true,
      },
      { includeData: true },
    )
    return { ...config, createdAt: FORGE_NOW }
  }, [])

  const candidates = useMemo(() => buildCandidateArtifacts(inspectionConfig), [inspectionConfig])
  const collectedArtifacts = state.inventoryOrder.map((id) => state.artifacts[id]).filter(Boolean)
  const selectedArtifact = state.selectedArtifactId
    ? state.artifacts[state.selectedArtifactId]
    : null
  const candidate = currentCandidateId
    ? (candidates[currentCandidateId] ?? candidates[FEATURE_IDS_BY_ROOM[state.activeRoomId][0]])
    : null

  const effectiveFilterApplications = allApplications.filter(
    (application) =>
      application.mode === "filter" && state.artifacts[application.artifactId]?.predicate,
  )
  const scopedRows = useMemo(() => {
    const predicates = [
      ...effectiveFilterApplications
        .map((application) => state.artifacts[application.artifactId]?.predicate)
        .filter(Boolean),
      ...(sharedView?.scopePredicates ?? []),
    ]
    if (!predicates.length) return orderRecords
    const filters = predicates.map((predicate) => compilePredicate(fulfillmentDomain, predicate))
    return orderRecords.filter((row) => filters.every((filter) => filter(row)))
  }, [effectiveFilterApplications, sharedView?.scopePredicates, state.artifacts])

  const acceptedInsight = allApplications
    .map((application) => state.artifacts[application.artifactId])
    .find((artifact) => artifact?.kind === "insight" && artifact.lifecycle.status === "accepted")
  const knowledgeView = collectedArtifacts.find(
    (artifact) => artifact.kind === "knowledge-view" && artifact.lifecycle.status === "accepted",
  )
  const generatedModel = useMemo(
    () =>
      buildChartModel({
        roomId: state.activeRoomId,
        rows: scopedRows,
        allRows: orderRecords,
        chartWidth,
        shelfDimension,
        routeScope,
        applications: allApplications,
        artifacts: state.artifacts,
        acceptedInsight,
        knowledgeView,
      }),
    [
      acceptedInsight,
      allApplications,
      chartWidth,
      knowledgeView,
      routeScope,
      scopedRows,
      shelfDimension,
      state.activeRoomId,
      state.artifacts,
    ],
  )
  const model = useMemo(() => {
    if (!sharedView || sharedView.componentName !== generatedModel.componentName)
      return generatedModel
    return {
      ...generatedModel,
      title: `Shared view · ${generatedModel.title}`,
      configProps: { ...generatedModel.configProps, ...sharedView.props },
      renderProps: { ...generatedModel.renderProps, ...sharedView.props },
      notice: "This chart was restored from the URL through fromURL and fromConfig.",
    }
  }, [generatedModel, sharedView])
  const interpretation = useMemo(
    () => buildInterpretation(model.componentName, model.configProps),
    [model.componentName, model.configProps],
  )

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setResumeState(JSON.parse(stored))
    } catch {
      setResumeState(null)
    }
  }, [])

  useEffect(() => {
    if (!window.location.search.includes("sc=")) return
    try {
      const config = fromURL(window.location.href)
      const restored = fromConfig(config)
      const compactState = new URL(window.location.href).searchParams.get("ifw")
      const portableState = compactState ? JSON.parse(window.atob(compactState)) : {}
      const room = ROOMS.find(
        (candidateRoom) => candidateRoom.componentName === restored.componentName,
      )
      if (!room) throw new Error(`No Insight Forge room renders ${restored.componentName}.`)
      setSharedView({ ...restored, config, scopePredicates: portableState.predicates ?? [] })
      if (portableState.shelfDimension) setShelfDimension(portableState.shelfDimension)
      if (portableState.routeScope) setRouteScope(portableState.routeScope)
      dispatch({ type: "ENTER_ROOM", roomId: room.id, method: "shared-link" })
      setAnnouncement(`Restored a shared ${restored.componentName} view from the URL.`)
    } catch (error) {
      setAnnouncement(`Shared view could not be restored: ${error?.message ?? error}`)
    }
  }, [])

  useEffect(() => {
    if (state.events.length <= 1) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Persistence is additive; private browsing must not break the workbench.
    }
  }, [state])

  useEffect(() => {
    recordArc({
      type: "chart-rendered",
      component: activeRoom.componentName,
      chartId: state.activeRoomId,
      arcId: ARC_ID,
      meta: { room: activeRoom.title, scopedRows: scopedRows.length },
    })
  }, [activeRoom.componentName, activeRoom.title, recordArc, scopedRows.length, state.activeRoomId])

  useEffect(() => {
    const roomFeatures = FEATURE_IDS_BY_ROOM[state.activeRoomId] ?? []
    if (currentCandidateId !== null && !roomFeatures.includes(currentCandidateId)) {
      setCurrentCandidateId(roomFeatures[0] ?? "incident-anomaly")
    }
  }, [currentCandidateId, state.activeRoomId])

  const recordReplayAction = useCallback(
    (action) => {
      if (action.type === "ENTER_ROOM") {
        const room = ROOMS.find((candidateRoom) => candidateRoom.id === action.roomId)
        if (room) {
          recordArc({
            type: "chart-rendered",
            component: room.componentName,
            chartId: room.id,
            arcId: ARC_ID,
            meta: { replay: true, room: room.title },
          })
        }
      }
      if (action.type === "APPLY") {
        const room = ROOMS.find((candidateRoom) => candidateRoom.id === action.application.chartId)
        recordArc({
          type: "chart-edited",
          component: room?.componentName ?? "InsightForge",
          chartId: action.application.chartId,
          arcId: ARC_ID,
          changedProps: [
            action.application.mode === "filter"
              ? "data"
              : action.application.mode === "compare"
                ? "series"
                : "annotations",
          ],
          meta: {
            replay: true,
            artifactId: action.application.artifactId,
            mode: action.application.mode,
          },
        })
      }
      if (action.type === "CRAFT") {
        recordArc({
          type: "chart-edited",
          component: "InsightRecipe",
          chartId: "insight-forge",
          arcId: ARC_ID,
          changedProps: ["artifacts", "annotations", "lineage"],
          meta: {
            replay: true,
            recipeId: action.result.artifact.lineage.recipeId,
            artifactId: action.result.artifact.id,
          },
        })
        for (const update of action.result.parentUpdates ?? []) {
          recordAnnotationStatusChange(update.status, {
            annotationId: update.id,
            chartId: "insight-forge",
            arcId: ARC_ID,
            meta: { replay: true },
          })
        }
      }
    },
    [recordArc],
  )

  useEffect(() => {
    if (!replayRunning || replayQueue.length === 0) {
      if (replayRunning && replayQueue.length === 0) {
        setReplayRunning(false)
        setAnnouncement("Golden path replay complete. The accepted knowledge view is open.")
      }
      return undefined
    }
    const timer = window.setTimeout(() => {
      const [next, ...rest] = replayQueue
      dispatch(next)
      recordReplayAction(next)
      setReplayQueue(rest)
    }, 260)
    return () => window.clearTimeout(timer)
  }, [recordReplayAction, replayQueue, replayRunning])

  const enterRoom = useCallback(
    (roomId, method = "world-map") => {
      setSharedView(null)
      dispatch({ type: "ENTER_ROOM", roomId, method })
      const firstFeature = FEATURE_IDS_BY_ROOM[roomId]?.[0]
      if (firstFeature && candidates[firstFeature]) setCurrentCandidateId(firstFeature)
    },
    [candidates],
  )

  const collectCandidate = useCallback(() => {
    if (!candidate) return
    dispatch({ type: "COLLECT", artifact: candidate })
    setAnnouncement(`Collected ${candidate.title}. It is now in the Analyst’s Satchel.`)
  }, [candidate])

  const sendToForge = useCallback(
    (artifactId) => {
      const empty = state.forgeSlots.findIndex((slot) => slot == null)
      const slot = empty === -1 ? 1 : empty
      dispatch({ type: "PLACE_IN_FORGE", slot, artifactId })
      setLowerPanel("forge")
      setAnnouncement(
        `Placed ${state.artifacts[artifactId]?.title} in ${slot === 0 ? "the first" : "the second"} forge slot.`,
      )
    },
    [state.artifacts, state.forgeSlots],
  )

  const forgeInputs = state.forgeSlots.map((id) => (id ? state.artifacts[id] : null))
  const forgeRecipe = compatibleRecipe(forgeInputs)
  const craft = useCallback(() => {
    const insightInput = forgeInputs.find((artifact) => artifact?.kind === "insight")
    const knowledgeConfig = insightInput ? createKnowledgeChartConfig(insightInput) : undefined
    const result = craftArtifacts(forgeInputs, {
      minimumOperationalVolume: MINIMUM_OPERATIONAL_VOLUME,
      insightPredicate: ACCEPTED_INSIGHT_PREDICATE,
      knowledgeConfig,
      knowledgeAudit: knowledgeConfig ? createKnowledgeAuditSnapshot(knowledgeConfig) : undefined,
    })
    if (!result.ok) {
      setAnnouncement(result.explanation)
      return
    }
    dispatch({ type: "CRAFT", result })
    window.requestAnimationFrame(() => {
      const resultItem = document.querySelector(
        `[data-artifact-id="${CSS.escape(result.artifact.id)}"]`,
      )
      resultItem?.focus()
    })
    for (const update of result.parentUpdates ?? []) {
      const prior = state.artifacts[update.id]
      recordAnnotationStatusChange(update.status, {
        annotationId: prior?.provenance?.stableId,
        fromStatus: prior?.lifecycle?.status,
        chartId: prior?.source?.chartId,
        arcId: ARC_ID,
      })
    }
    recordArc({
      type: "chart-edited",
      component: activeRoom.componentName,
      chartId: state.activeRoomId,
      arcId: ARC_ID,
      changedProps: ["artifacts", "annotations", "lineage"],
      meta: { recipeId: result.artifact.lineage.recipeId, artifactId: result.artifact.id },
    })
    setAnnouncement(`Crafted ${result.artifact.title}. ${result.explanation}`)
  }, [activeRoom.componentName, forgeInputs, recordArc, state.activeRoomId, state.artifacts])

  const applyArtifact = useCallback(
    (artifact, mode, global = false) => {
      if (!artifact) return
      const application = {
        id: `${global ? "global" : state.activeRoomId}:${artifact.id}:${mode}`,
        artifactId: artifact.id,
        chartId: state.activeRoomId,
        mode,
        predicate: artifact.predicate,
        explanation: applicationExplanation(artifact, activeRoom, mode),
        warnings: compatibilityWarnings(artifact, activeRoom),
      }
      dispatch({ type: "APPLY", application, global })
      recordArc({
        type: "chart-edited",
        component: activeRoom.componentName,
        chartId: state.activeRoomId,
        arcId: ARC_ID,
        changedProps: [mode === "filter" ? "data" : mode === "compare" ? "series" : "annotations"],
        meta: { artifactId: artifact.id, mode, global },
      })
      setAnnouncement(
        `${global ? "Equipped globally" : `Applied to ${activeRoom.title}`}: ${artifact.title}.`,
      )
    },
    [activeRoom, recordArc, state.activeRoomId],
  )

  const handleChartDatum = useCallback(
    (input) => {
      const raw = unwrapDatum(input)
      const artifactId = artifactIdFromDatum(state.activeRoomId, raw)
      if (artifactId && candidates[artifactId]) setCurrentCandidateId(artifactId)
      else if (state.activeRoomId === "knowledge-lab") setCurrentCandidateId(null)
    },
    [candidates, state.activeRoomId],
  )

  const handleObservation = useCallback(
    (observation) => {
      if (!observation || observation.type === "hover-end") return
      if (observation.datum) handleChartDatum(observation.datum)
    },
    [handleChartDatum],
  )

  const changeArtifactStatus = useCallback(
    (artifactId, status) => {
      const artifact = state.artifacts[artifactId]
      if (!artifact) return
      dispatch({ type: "SET_STATUS", artifactId, status })
      recordAnnotationStatusChange(status, {
        annotationId: artifact.provenance.stableId,
        fromStatus: artifact.lifecycle.status,
        chartId: artifact.source.chartId,
        arcId: ARC_ID,
      })
      setAnnouncement(`${artifact.title} marked ${status}. Its provenance remains in the trail.`)
    },
    [state.artifacts],
  )

  const resetWorkbench = useCallback(() => {
    dispatch({ type: "RESET" })
    setCurrentCandidateId("incident-anomaly")
    setReplayQueue([])
    setReplayRunning(false)
    clearArc()
    setShareText("")
    setSharedView(null)
    setResumeState(null)
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Reset still succeeds when storage is unavailable.
    }
    setAnnouncement("The case has been reset. All five rooms remain open.")
  }, [clearArc])

  const shareActiveView = useCallback(async () => {
    try {
      const config = toConfig(model.componentName, model.configProps, { includeData: false })
      const encoded = toURL(config)
      const compactState = window.btoa(
        JSON.stringify({
          predicates: [
            ...effectiveFilterApplications
              .map((application) => state.artifacts[application.artifactId]?.predicate)
              .filter(Boolean),
            ...(model.scopePredicate ? [model.scopePredicate] : []),
          ],
          shelfDimension,
          routeScope,
        }),
      )
      const value = `${window.location.origin}${window.location.pathname}?${encoded}&ifw=${encodeURIComponent(compactState)}`
      setShareText(value)
      try {
        if (navigator.clipboard) await navigator.clipboard.writeText(value)
        setAnnouncement(
          "A chart-only share link was copied. Satchel lineage remains in local state.",
        )
      } catch {
        setAnnouncement(
          "The chart-only share link is ready below; clipboard access was unavailable.",
        )
      }
    } catch (error) {
      setShareText(String(error?.message ?? error))
    }
  }, [
    effectiveFilterApplications,
    model.componentName,
    model.configProps,
    model.scopePredicate,
    routeScope,
    shelfDimension,
    state.artifacts,
  ])

  const resumeTrail = useCallback(() => {
    if (!resumeState?.activeRoomId || !resumeState?.artifacts) return
    dispatch({ type: "HYDRATE", present: resumeState })
    setCurrentCandidateId(FEATURE_IDS_BY_ROOM[resumeState.activeRoomId]?.[0] ?? "incident-anomaly")
    setResumeState(null)
    setAnnouncement("Restored the locally preserved evidence trail.")
  }, [resumeState])

  const replayGoldenPath = useCallback(() => {
    const sequence = buildGoldenPathActions(candidates)
    clearArc()
    setSharedView(null)
    setShareText("")
    dispatch({ type: "RESET" })
    setCurrentCandidateId("incident-anomaly")
    if (reducedMotion) {
      sequence.forEach((action) => {
        dispatch(action)
        recordReplayAction(action)
      })
      setAnnouncement("Golden path restored without animation. The Knowledge Lab is open.")
      return
    }
    setReplayQueue(sequence)
    setReplayRunning(true)
    setAnnouncement("Replaying the suggested analytical route.")
  }, [candidates, clearArc, recordReplayAction, reducedMotion])

  const currentQuestionAnswer = interpreterAnswer(
    interpreterQuestion,
    activeRoom,
    interpretation,
    model.scopeRows ?? scopedRows,
    allApplications,
  )
  const visibleRows = model.scopeRows ?? scopedRows
  const filteredCount = visibleRows.length
  const returnedCount = visibleRows.filter((row) => row.returned).length
  const roomFeatures = (FEATURE_IDS_BY_ROOM[state.activeRoomId] ?? [])
    .map((id) => candidates[id])
    .filter(Boolean)
  const activeArcEvents = arcHistory.filter((event) => event.arcId === ARC_ID)

  return (
    <div className="insight-forge">
      <header className="insight-forge__hero">
        <div className="insight-forge__hero-sigil" aria-hidden="true">
          <ForgeGlyph name="lit-lantern" size={76} decorative />
        </div>
        <div>
          <div className="insight-forge__overline">
            Wayfinder Supply Co. · analytical field case
          </div>
          <h2>The Case of the Shattered Lanterns</h2>
          <p>
            A chart can show you something. The hard part is carrying what you saw into the next
            chart without losing the scope, denominator, uncertainty, or chain of reasoning.
          </p>
        </div>
        <div className="insight-forge__hero-actions">
          {resumeState && (
            <button
              type="button"
              className="forge-button forge-button--jewel"
              onClick={resumeTrail}
            >
              Resume trail
            </button>
          )}
          <button type="button" className="forge-button" onClick={shareActiveView}>
            Share view
          </button>
          <button
            type="button"
            className="forge-button forge-button--danger"
            onClick={resetWorkbench}
          >
            Reset case
          </button>
        </div>
      </header>

      <p className="insight-forge__data-notice">
        <strong>Synthetic case file.</strong> {SYNTHETIC_DATA_NOTICE} Outcomes are complete thirty
        days after shipment, so the rates shown here are not right-censored.
      </p>

      <RoomMap
        activeRoomId={state.activeRoomId}
        visitedRooms={state.visitedRooms}
        onEnter={enterRoom}
      />

      <section className="insight-forge__casebar" aria-label="Current analytical question">
        <span>Current question</span>
        <strong>{activeRoom.question}</strong>
        <div
          className="insight-forge__casebar-progress"
          role="progressbar"
          aria-label={`${state.visitedRooms.length} of 5 rooms visited`}
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={state.visitedRooms.length}
        >
          {ROOMS.map((room) => (
            <span
              key={room.id}
              data-visited={state.visitedRooms.includes(room.id)}
              aria-hidden="true"
            />
          ))}
        </div>
      </section>

      <div className="insight-forge__workbench">
        <aside className="insight-forge__objective">
          <div className="forge-panel-heading">
            <span>Objective</span>
            <ForgeGlyph name={activeRoom.icon} size={28} decorative />
          </div>
          <h3>{activeRoom.title}</h3>
          <p>{activeRoom.note}</p>
          <div className="insight-forge__kpis" aria-label="Current data scope">
            <ScopeKpi value={filteredCount} label="orders in scope" />
            <ScopeKpi value={returnedCount} label="returns in scope" />
            <ScopeKpi
              value={filteredCount ? returnedCount / filteredCount : 0}
              label="return rate"
              format="percent"
            />
          </div>
          <div className="insight-forge__objective-note">
            <strong>One cracked lantern</strong>
            <span>= 25 excess damage returns</span>
            <div
              className="insight-forge__lantern-units"
              role="img"
              aria-label="About four cracked-lantern units of excess returns"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <ForgeGlyph key={index} name="burst" size={22} decorative />
              ))}
            </div>
          </div>
          <div className="insight-forge__suggested-path">
            <span>Suggested route</span>
            <ol>
              <li>Collect the incident.</li>
              <li>Cut a damage cohort.</li>
              <li>Frame, then test, the carrier claim.</li>
              <li>Bind the accepted insight to a view.</li>
            </ol>
          </div>
        </aside>

        <section
          id="insight-forge-active-room"
          className="insight-forge__chart-room"
          role="region"
          aria-labelledby={`insight-forge-room-${state.activeRoomId}`}
        >
          <RoomControls
            roomId={state.activeRoomId}
            shelfDimension={shelfDimension}
            setShelfDimension={setShelfDimension}
            routeScope={routeScope}
            setRouteScope={setRouteScope}
            knowledgeView={knowledgeView}
          />
          <ActiveApplications
            applications={allApplications}
            artifacts={state.artifacts}
            matching={filteredCount}
            total={orderRecords.length}
            activeRoomId={state.activeRoomId}
            onRemove={(application) =>
              dispatch({
                type: "REMOVE_APPLICATION",
                id: application.id,
                roomId: state.activeRoomId,
                global: state.globalApplications.some((entry) => entry.id === application.id),
              })
            }
          />
          <div className="insight-forge__chart-host" ref={chartHostRef}>
            <ChartContainer
              className="insight-forge__chart-container"
              title={model.title}
              subtitle={model.subtitle}
              height={model.height}
              status="static"
              chartConfig={{ component: model.componentName, props: model.configProps }}
              describe
              navigable={{ maxLeaves: 80 }}
              actions={{ copyConfig: { format: "jsx" }, fullscreen: true }}
              mobile={{ breakpoint: 520, chartMode: false }}
            >
              <ActiveChart
                model={model}
                onClick={handleChartDatum}
                onObservation={handleObservation}
              />
            </ChartContainer>
          </div>
          <p className="insight-forge__translation-note">
            <ForgeGlyph name="route" size={19} decorative />
            <span>{model.notice}</span>
          </p>

          <ArtifactPreview
            artifact={candidate}
            collected={Boolean(candidate && state.artifacts[candidate.id])}
            onCollect={collectCandidate}
          />

          <InterpreterDrawer
            activeQuestion={interpreterQuestion}
            onQuestion={setInterpreterQuestion}
            answer={currentQuestionAnswer}
            grounding={interpretation.grounding}
          />

          <div
            className="insight-forge__feature-rack"
            aria-label={`${activeRoom.title} collectible features`}
          >
            {roomFeatures.map((feature) => (
              <button
                key={feature.id}
                type="button"
                className="insight-forge__feature-token"
                data-active={feature.id === candidate?.id}
                data-collected={Boolean(state.artifacts[feature.id])}
                onClick={() => setCurrentCandidateId(feature.id)}
              >
                <ForgeGlyph name={feature.icon} size={22} decorative />
                <span>{feature.title}</span>
              </button>
            ))}
          </div>
        </section>

        <InsightInventory
          artifacts={collectedArtifacts}
          selectedArtifactId={state.selectedArtifactId}
          forgeInputs={forgeInputs}
          activeRoom={activeRoom}
          onSelect={(artifactId) => dispatch({ type: "SELECT_ARTIFACT", artifactId })}
          onSendToForge={sendToForge}
          onApply={applyArtifact}
          onStatus={changeArtifactStatus}
        />
      </div>

      <LowerDrawer
        activePanel={lowerPanel}
        onPanel={setLowerPanel}
        forgeInputs={forgeInputs}
        forgeRecipe={forgeRecipe}
        onClearSlot={(slot) => dispatch({ type: "CLEAR_FORGE_SLOT", slot })}
        onCraft={craft}
        interpretation={interpretation}
        selectedArtifact={selectedArtifact}
        events={state.events}
        artifacts={collectedArtifacts}
        activeArcEvents={activeArcEvents}
        onReplay={replayGoldenPath}
        replayRunning={replayRunning}
        onUndo={() => dispatch({ type: "UNDO" })}
        onRedo={() => dispatch({ type: "REDO" })}
        canUndo={timeline.past.length > 0}
        canRedo={timeline.future.length > 0}
        activeRoomId={state.activeRoomId}
        onEnter={enterRoom}
      />

      <div className="insight-forge__live" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {shareText && (
        <div className="insight-forge__share-result" role="status">
          <strong>Chart-only share state</strong>
          <code>{shareText}</code>
        </div>
      )}

      <section className="insight-forge__lesson">
        <div>
          <span>Final lesson</span>
          <blockquote>
            Each chart applies a different layout to the same scoped evidence. The incident window,
            cohort definition, and denominator remain attached as you move between rooms.
          </blockquote>
        </div>
        <div>
          <span>How the forge is built (optional)</span>
          <p>
            The rooms are ordinary Semiotic charts with scoped evidence attached. The satchel and
            forge are plain React. The list below is for people wiring the same pattern—skip it if
            you came for the story.
          </p>
          <ul>
            <li>
              Chart clicks and hovers flow through <code>onObservation</code>.
            </li>
            <li>
              Each room can describe itself and build a screen-reader path (
              <code>describeChart</code>, <code>buildReaderGrounding</code>).
            </li>
            <li>
              The Appraisal Desk runs validation, diagnosis, and accessibility checks.
            </li>
            <li>
              Saved views round-trip through config helpers so an artifact keeps its chart
              definition.
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}

function buildCandidateArtifacts(inspectionConfig) {
  const incidentRows = rowsMatching(INCIDENT_PREDICATE)
  const focalRows = rowsMatching(FOCAL_INSERT_B_PREDICATE)
  const tinyRows = rowsMatching(TINY_NORTHSTAR_PREDICATE)
  const damagePredicate = { op: "eq", field: "return.reason", value: "damaged" }
  const lanternPredicate = { op: "eq", field: "product.id", value: "starlight-lantern" }
  const swiftPathPredicate = {
    op: "and",
    clauses: [
      INCIDENT_PREDICATE,
      lanternPredicate,
      { op: "eq", field: "fulfillment.warehouse", value: "reno" },
      { op: "eq", field: "package.design", value: "insert-b" },
      { op: "eq", field: "fulfillment.carrier", value: "swiftship" },
      damagePredicate,
    ],
  }
  const incidentDamagePredicate = {
    op: "and",
    clauses: [INCIDENT_PREDICATE, damagePredicate],
  }
  const incidentDamageRows = rowsMatching(incidentDamagePredicate)
  const lanternRows = incidentRows.filter((row) => row.productId === "starlight-lantern")
  const swiftPathRows = rowsMatching(swiftPathPredicate)
  const baselineExpectedReturns = STORY_STATS.incidentOrders * STORY_STATS.baselineReturnRate
  const viewSource = (chartId, componentName, config, intent) => ({
    chartId,
    componentName,
    observationType: "saved-view",
    config,
    grounding: {
      description: `${componentName} saved from ${chartId}.`,
      intent,
    },
  })
  const source = (chartId, componentName, observationType, description, intent) => ({
    chartId,
    componentName,
    observationType,
    grounding: { description, intent },
  })

  const watchConfig = {
    ...toConfig("LineChart", {
      data: aggregateDailyReturnRates(orderRecords).map((row) => ({
        time: row.dateValue.getTime(),
        rate: row.rollingReturnRate,
      })),
      xAccessor: "time",
      yAccessor: "rate",
      xScaleType: "time",
      showPoints: true,
    }),
    createdAt: FORGE_NOW,
  }
  const sortingConfig = {
    ...toConfig("GroupedBarChart", {
      data: aggregateSortingShelf(incidentRows),
      categoryAccessor: "category",
      groupBy: "group",
      valueAccessor: "excessReturns",
      orientation: "horizontal",
    }),
    createdAt: FORGE_NOW,
  }
  const incidentRoute = aggregateSankey(incidentDamageRows, { returnedOnly: true })
  const routeConfig = {
    ...toConfig("SankeyDiagram", {
      nodes: incidentRoute.nodes,
      edges: incidentRoute.edges,
      nodeIdAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
    }),
    createdAt: FORGE_NOW,
  }

  return {
    "incident-anomaly": makeArtifact({
      id: "incident-anomaly",
      kind: "anomaly",
      title: "Return-rate spike",
      summary: `${INCIDENT_WINDOW.label}: ${INTEGER.format(STORY_STATS.incidentReturns)} returns among ${INTEGER.format(STORY_STATS.incidentOrders)} completed shipments, ${PERCENT.format(STORY_STATS.incidentReturnRate)} versus a ${PERCENT.format(STORY_STATS.baselineReturnRate)} baseline.`,
      maturity: "raw",
      scope: "dataset",
      predicate: INCIDENT_PREDICATE,
      stats: {
        numerator: STORY_STATS.incidentReturns,
        denominator: STORY_STATS.incidentOrders,
        rate: STORY_STATS.incidentReturnRate,
        baseline: STORY_STATS.baselineReturnRate,
        effectSize: STORY_STATS.incidentReturns - baselineExpectedReturns,
      },
      source: source(
        "watchtower",
        "LineChart",
        "selected-anomaly-band",
        "A seven-day rolling return-rate increase from May 15 through May 29.",
        "Find when the return problem began and decide whether it merits investigation.",
      ),
      provenance: { basis: "statistical-test", source: "computed", authorKind: "system" },
      lifecycle: { status: "proposed", anchor: "fixed", ttlHint: "P90D" },
      tags: ["incident", "time-window"],
    }),
    "incident-denominator": makeArtifact({
      id: "incident-denominator",
      kind: "denominator",
      title: "Incident denominator",
      summary: `${INTEGER.format(STORY_STATS.incidentReturns)} returns / ${INTEGER.format(STORY_STATS.incidentOrders)} shipments with complete thirty-day outcomes.`,
      maturity: "contextualized",
      scope: "dataset",
      predicate: INCIDENT_PREDICATE,
      stats: {
        numerator: STORY_STATS.incidentReturns,
        denominator: STORY_STATS.incidentOrders,
        rate: STORY_STATS.incidentReturnRate,
      },
      source: source(
        "watchtower",
        "LineChart",
        "denominator-readout",
        "Completed shipment and return counts for the selected incident window.",
        "Keep the anomaly’s sample size attached.",
      ),
      provenance: { basis: "computed", source: "computed", authorKind: "system" },
      tags: ["denominator", "complete-outcomes"],
    }),
    "rollout-context": makeArtifact({
      id: "rollout-context",
      kind: "context",
      title: "Insert B rollout",
      summary: `Corrugated Insert B entered the Reno packing line on ${PACKAGING_ROLLOUT_DATE}. This is operational context, not evidence of attribution.`,
      maturity: "contextualized",
      scope: "dataset",
      predicate: { op: "gte", field: "shipment.date", value: PACKAGING_ROLLOUT_DATE },
      source: source(
        "watchtower",
        "LineChart",
        "operational-event",
        "A neutral packaging rollout marker aligned with the start of the incident.",
        "Carry a relevant event into later comparisons without promoting it to a claim.",
      ),
      provenance: { basis: "external-source", source: "system", authorKind: "system" },
      tags: ["packaging", "rollout"],
    }),
    "watchtower-view": makeArtifact({
      id: "watchtower-view",
      kind: "saved-view",
      title: "Watchtower view",
      summary: "A serializable rolling return-rate view with the incident and baseline in frame.",
      maturity: "contextualized",
      scope: "cross-chart",
      source: viewSource("watchtower", "LineChart", watchConfig, "Preserve the temporal context."),
      payload: { config: watchConfig, domainId: fulfillmentDomain.id },
      provenance: { basis: "computed", source: "user", authorKind: "human" },
      tags: ["round-trip", "temporal"],
    }),
    "damage-segment": makeArtifact({
      id: "damage-segment",
      kind: "segment",
      title: "Damaged in transit",
      summary: `${INTEGER.format(incidentDamageRows.length)} damaged returns account for most of the incident’s excess.`,
      maturity: "raw",
      scope: "cohort",
      predicate: damagePredicate,
      stats: {
        numerator: incidentDamageRows.length,
        denominator: STORY_STATS.incidentOrders,
        rate: incidentDamageRows.length / STORY_STATS.incidentOrders,
      },
      source: source(
        "sorting-shelf",
        "GroupedBarChart",
        "bar-selected",
        "The damaged-in-transit category dominates excess returns in the incident window.",
        "Identify the return reason carrying the excess.",
      ),
      tags: ["return-reason"],
    }),
    "lantern-segment": makeArtifact({
      id: "lantern-segment",
      kind: "segment",
      title: "Starlight Lantern",
      summary: `${INTEGER.format(lanternRows.filter((row) => row.returned).length)} returned Starlight Lanterns in the incident window.`,
      maturity: "raw",
      scope: "cohort",
      predicate: lanternPredicate,
      stats: {
        numerator: lanternRows.filter((row) => row.returned).length,
        denominator: lanternRows.length,
        rate: lanternRows.filter((row) => row.returned).length / lanternRows.length,
      },
      source: source(
        "sorting-shelf",
        "GroupedBarChart",
        "bar-selected",
        "The Starlight Lantern contributes most of the incident excess.",
        "Identify the product concentration.",
      ),
      tags: ["product"],
    }),
    "sorting-view": makeArtifact({
      id: "sorting-view",
      kind: "saved-view",
      title: "Sorting Shelf view",
      summary: "A product-by-return-reason decomposition of incident excess.",
      maturity: "contextualized",
      scope: "cross-chart",
      source: viewSource(
        "sorting-shelf",
        "GroupedBarChart",
        sortingConfig,
        "Preserve the decomposition.",
      ),
      payload: { config: sortingConfig, domainId: fulfillmentDomain.id },
      tags: ["round-trip", "ordinal"],
    }),
    "swiftship-path": makeArtifact({
      id: "swiftship-path",
      kind: "path",
      title: "Lantern → Reno → Insert B → SwiftShip → Damaged",
      summary: `${INTEGER.format(swiftPathRows.length)} rows follow this exact incident path. The item stores its predicate, never ribbon coordinates.`,
      maturity: "raw",
      scope: "cohort",
      predicate: swiftPathPredicate,
      stats: { numerator: swiftPathRows.length, denominator: incidentDamageRows.length },
      source: source(
        "route-ledger",
        "SankeyDiagram",
        "route-selected",
        "A thick returned-order route passes through Reno, Insert B, and SwiftShip.",
        "Trace the operational path while keeping it testable elsewhere.",
      ),
      tags: ["route", "carrier"],
    }),
    "route-denominator": makeArtifact({
      id: "route-denominator",
      kind: "denominator",
      title: "Incident damage flow",
      summary: `${INTEGER.format(swiftPathRows.length)} exact-path orders among ${INTEGER.format(incidentDamageRows.length)} incident damage returns.`,
      maturity: "contextualized",
      scope: "cohort",
      predicate: incidentDamagePredicate,
      stats: {
        numerator: swiftPathRows.length,
        denominator: incidentDamageRows.length,
        rate: swiftPathRows.length / incidentDamageRows.length,
      },
      source: source(
        "route-ledger",
        "SankeyDiagram",
        "flow-denominator",
        "The exact route is compared with all damaged returns in the incident.",
        "Keep ribbon width tied to a count.",
      ),
      tags: ["denominator", "flow"],
    }),
    "route-view": makeArtifact({
      id: "route-view",
      kind: "saved-view",
      title: "Route Ledger view",
      summary: "A serializable five-stage returned-order flow for the incident damage cohort.",
      maturity: "contextualized",
      scope: "cross-chart",
      source: viewSource(
        "route-ledger",
        "SankeyDiagram",
        routeConfig,
        "Preserve the fulfillment topology.",
      ),
      payload: { config: routeConfig, domainId: fulfillmentDomain.id },
      tags: ["round-trip", "network"],
    }),
    counterevidence: makeArtifact({
      id: "counterevidence",
      kind: "counterevidence",
      title: "Carrier attribution fails its complement",
      summary: `Insert B damage is ${PERCENT.format(STORY_STATS.insertBDamageRate)} across all three carriers, while SwiftShip without Insert B is ${PERCENT.format(STORY_STATS.swiftShipWithoutInsertBDamageRate)}.`,
      maturity: "contextualized",
      scope: "cross-chart",
      predicate: FOCAL_INSERT_B_PREDICATE,
      stats: {
        numerator: STORY_STATS.focalInsertBDamagedReturns,
        denominator: STORY_STATS.focalInsertBOrders,
        rate: STORY_STATS.insertBDamageRate,
        baseline: STORY_STATS.swiftShipWithoutInsertBDamageRate,
      },
      source: source(
        "inspection-bench",
        "QuadrantChart",
        "comparison-selected",
        "Insert B stays high across carriers; SwiftShip’s complement stays near baseline.",
        "Try to refute the carrier-first hypothesis.",
      ),
      provenance: { basis: "statistical-test", source: "computed", authorKind: "system" },
      tags: ["complement", "across-carriers"],
    }),
    "tiny-northstar-anomaly": makeArtifact({
      id: "tiny-northstar-anomaly",
      kind: "anomaly",
      title: "Northstar 20% alert",
      summary: "A visually alarming 20% damage rate on a tiny Northstar cohort.",
      maturity: "raw",
      scope: "mark",
      predicate: TINY_NORTHSTAR_PREDICATE,
      stats: {
        numerator: STORY_STATS.lowVolumeNorthstarCohort.damagedReturns,
        denominator: STORY_STATS.lowVolumeNorthstarCohort.n,
        rate: STORY_STATS.lowVolumeNorthstarCohort.damageRate,
        baseline: STORY_STATS.baselineDamageRate,
      },
      source: source(
        "inspection-bench",
        "QuadrantChart",
        "point-selected",
        "A Northstar point is high on rate and far left on evidence.",
        "Decide whether the alert clears the operational volume policy.",
      ),
      lifecycle: { status: "proposed", anchor: "fixed", ttlHint: "P30D" },
      tags: ["low-volume", "northstar"],
    }),
    "tiny-northstar-denominator": makeArtifact({
      id: "tiny-northstar-denominator",
      kind: "denominator",
      title: "One return, five shipments",
      summary: "The Northstar alert’s denominator is five completed shipments: one damaged return.",
      maturity: "contextualized",
      scope: "mark",
      predicate: TINY_NORTHSTAR_PREDICATE,
      stats: {
        numerator: STORY_STATS.lowVolumeNorthstarCohort.damagedReturns,
        denominator: STORY_STATS.lowVolumeNorthstarCohort.n,
        rate: STORY_STATS.lowVolumeNorthstarCohort.damageRate,
      },
      source: source(
        "inspection-bench",
        "QuadrantChart",
        "point-denominator",
        "The selected alert is based on one damaged return among five shipments.",
        "Attach evidence volume before classifying the alert.",
      ),
      tags: ["denominator", "minimum-volume"],
    }),
    "inspection-view": makeArtifact({
      id: "inspection-view",
      kind: "saved-view",
      title: "Risk × evidence comparison",
      summary: "A serializable cohort comparison with shipment volume on x and damage rate on y.",
      maturity: "contextualized",
      scope: "cross-chart",
      source: viewSource(
        "inspection-bench",
        "QuadrantChart",
        inspectionConfig,
        "Preserve the risk-versus-evidence comparison.",
      ),
      payload: { config: inspectionConfig, domainId: fulfillmentDomain.id },
      provenance: { basis: "computed", source: "user", authorKind: "human" },
      tags: ["round-trip", "comparison"],
    }),
    "knowledge-cell": makeArtifact({
      id: "knowledge-cell",
      kind: "segment",
      title: "Lantern × Insert B cell",
      summary: `${STORY_STATS.focalInsertBDamagedReturns} damage returns / ${STORY_STATS.focalInsertBOrders} shipments in the accepted product-package cohort.`,
      maturity: "operational",
      scope: "cohort",
      predicate: FOCAL_INSERT_B_PREDICATE,
      stats: {
        numerator: STORY_STATS.focalInsertBDamagedReturns,
        denominator: STORY_STATS.focalInsertBOrders,
        rate: STORY_STATS.insertBDamageRate,
      },
      source: source(
        "knowledge-lab",
        "Heatmap",
        "cell-selected",
        "The accepted product-package cell remains high after translation.",
        "Inspect the concrete view generated from accepted knowledge.",
      ),
      tags: ["product-package", "knowledge"],
    }),
  }
}

function buildGoldenPathActions(candidates) {
  const filterResult = craftArtifacts([
    candidates["incident-anomaly"],
    candidates["damage-segment"],
  ])
  const hypothesisResult = craftArtifacts([filterResult.artifact, candidates["swiftship-path"]])
  const insightResult = craftArtifacts([hypothesisResult.artifact, candidates.counterevidence], {
    insightPredicate: ACCEPTED_INSIGHT_PREDICATE,
  })
  const falsePositiveResult = craftArtifacts([
    candidates["tiny-northstar-anomaly"],
    candidates["tiny-northstar-denominator"],
  ])
  const knowledgeConfig = createKnowledgeChartConfig(insightResult.artifact)
  const knowledgeResult = craftArtifacts([insightResult.artifact, candidates["inspection-view"]], {
    knowledgeConfig,
    knowledgeAudit: createKnowledgeAuditSnapshot(knowledgeConfig),
  })
  return [
    { type: "COLLECT", artifact: candidates["incident-anomaly"] },
    { type: "ENTER_ROOM", roomId: "sorting-shelf", method: "replay" },
    {
      type: "APPLY",
      application: replayApplication(candidates["incident-anomaly"], "sorting-shelf", "filter"),
    },
    { type: "COLLECT", artifact: candidates["damage-segment"] },
    { type: "CRAFT", result: filterResult },
    { type: "ENTER_ROOM", roomId: "route-ledger", method: "replay" },
    {
      type: "APPLY",
      application: replayApplication(filterResult.artifact, "route-ledger", "filter"),
    },
    { type: "COLLECT", artifact: candidates["swiftship-path"] },
    { type: "CRAFT", result: hypothesisResult },
    { type: "ENTER_ROOM", roomId: "inspection-bench", method: "replay" },
    {
      type: "APPLY",
      application: replayApplication(hypothesisResult.artifact, "inspection-bench", "compare"),
    },
    { type: "COLLECT", artifact: candidates.counterevidence },
    { type: "CRAFT", result: insightResult },
    { type: "COLLECT", artifact: candidates["tiny-northstar-anomaly"] },
    { type: "COLLECT", artifact: candidates["tiny-northstar-denominator"] },
    { type: "CRAFT", result: falsePositiveResult },
    { type: "COLLECT", artifact: candidates["inspection-view"] },
    { type: "CRAFT", result: knowledgeResult },
    { type: "ENTER_ROOM", roomId: "knowledge-lab", method: "replay" },
    {
      type: "APPLY",
      application: replayApplication(insightResult.artifact, "knowledge-lab", "annotate"),
    },
  ]
}

function productPackageCells(rows) {
  return aggregateProductPackageHeatmap(rows).map((cell) => ({
    ...cell,
    packageIndex: PACKAGE_DESIGNS.findIndex((design) => design.id === cell.packageDesignId),
    productIndex: PRODUCTS.findIndex((product) => product.id === cell.productId),
  }))
}

function knowledgeAnnotationsFor(insight) {
  const sourceArtifactId = insight?.id
  const sourceStableId = insight?.provenance?.stableId
  return applyAnnotationStatus([
    {
      type: "highlight",
      field: "id",
      value: "starlight-lantern|insert-b",
      r: 25,
      color: "#3e6f5a",
      style: { fill: "none", stroke: "#3e6f5a", strokeWidth: 3 },
      sourceArtifactId,
      sourceStableId,
      provenance: {
        stableId: "wayfinder:knowledge:lantern-insert-b-ring",
        source: "computed",
        authorKind: "system",
        createdAt: FORGE_NOW,
      },
      lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
    },
    {
      type: "callout",
      packageIndex: PACKAGE_DESIGNS.findIndex((design) => design.id === "insert-b"),
      productIndex: PRODUCTS.findIndex((product) => product.id === "starlight-lantern"),
      label: insight ? `Accepted from ${insight.title}` : "Accepted: Lantern × Insert B",
      dx: 24,
      dy: -38,
      color: "#3e6f5a",
      sourceArtifactId,
      sourceStableId,
      provenance: {
        stableId: "wayfinder:knowledge:lantern-insert-b-callout",
        source: "computed",
        authorKind: "system",
        createdAt: FORGE_NOW,
      },
      lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
    },
  ])
}

function createKnowledgeChartConfig(insight) {
  const knowledgeRows = orderRecords.filter(
    compilePredicate(fulfillmentDomain, KNOWLEDGE_SCOPE_PREDICATE),
  )
  const config = toConfig(
    "Heatmap",
    {
      data: productPackageCells(knowledgeRows),
      xAccessor: "packageIndex",
      yAccessor: "productIndex",
      valueAccessor: "damageRate",
      colorScheme: "reds",
      showValues: true,
      showLegend: true,
      annotations: knowledgeAnnotationsFor(insight),
    },
    { includeData: true },
  )
  return { ...config, createdAt: FORGE_NOW }
}

function createKnowledgeAuditSnapshot(config) {
  const restored = fromConfig(config)
  const validation = validateProps(restored.componentName, restored.props)
  const diagnostics = diagnoseConfig(restored.componentName, restored.props)
  const accessibility = auditAccessibility(
    restored.componentName,
    {
      ...restored.props,
      description:
        "Reno incident damage-return rates by product and package with the accepted packaging concentration annotated.",
      accessibleTable: true,
    },
    { inChartContainer: true, describe: true, navigable: true },
  )
  return {
    recordedAt: FORGE_NOW,
    validation: { valid: validation.valid, errors: validation.errors },
    diagnostics: {
      ok: diagnostics.ok,
      diagnoses: diagnostics.diagnoses.map(({ code, severity, message }) => ({
        code,
        severity,
        message,
      })),
    },
    accessibility: accessibility.summary,
  }
}

function replayApplication(artifact, chartId, mode) {
  return {
    id: `${chartId}:${artifact.id}:${mode}`,
    artifactId: artifact.id,
    chartId,
    mode,
    predicate: artifact.predicate,
    explanation: `Replay translated ${artifact.kind} as ${mode}.`,
    warnings: [],
  }
}

function buildChartModel({
  roomId,
  rows,
  allRows,
  chartWidth,
  shelfDimension,
  routeScope,
  applications,
  artifacts,
  acceptedInsight,
  knowledgeView,
}) {
  const common = {
    width: chartWidth,
    enableHover: true,
    accessibleTable: true,
    mobileInteraction: {
      tapToSelect: true,
      tapToLockTooltip: true,
      targetSize: 44,
    },
  }

  if (roomId === "watchtower") {
    const compareApplication = applications.find((application) => application.mode === "compare")
    let seriesRows
    if (compareApplication && artifacts[compareApplication.artifactId]?.predicate) {
      const predicate = artifacts[compareApplication.artifactId].predicate
      const filter = compilePredicate(fulfillmentDomain, predicate)
      const matching = rows.filter(filter)
      const complement = rows.filter((row) => !filter(row))
      seriesRows = [
        ...dailySeries(matching, "Carried cohort"),
        ...dailySeries(complement, "Complement"),
      ]
    } else if (rows.length !== allRows.length) {
      seriesRows = [...dailySeries(allRows, "All shipments"), ...dailySeries(rows, "Active scope")]
    } else {
      seriesRows = dailySeries(allRows, "Seven-day return rate")
    }
    const annotations = watchtowerAnnotations(Boolean(acceptedInsight))
    const maxRate = Math.max(0.16, ...seriesRows.map((row) => row.rate * 1.12))
    const configProps = {
      data: seriesRows,
      xAccessor: "time",
      yAccessor: "rate",
      lineBy: "series",
      colorBy: "series",
      colorScheme: ["#9b4337", "#6f7f80", "#a84134", "#55798a"],
      xScaleType: "time",
      showPoints: true,
      showLegend: seriesRows.some((row) => row.series !== "Seven-day return rate"),
      annotations,
    }
    return {
      componentName: "LineChart",
      title: "Thirty-day return rate by shipment date",
      subtitle: `${INCIDENT_WINDOW.label} · completed outcomes · baseline ${PERCENT.format(BASELINE_RETURN_RATE)}`,
      height: 380,
      configProps,
      renderProps: {
        ...configProps,
        ...common,
        height: 380,
        chartId: "watchtower",
        colorScheme: {
          "Seven-day return rate": "#9b4337",
          "All shipments": "#6f7f80",
          "Active scope": "#a84134",
          "Carried cohort": "#a84134",
          Complement: "#55798a",
        },
        yExtent: [0, maxRate],
        pointIdAccessor: "id",
        yFormat: (value) => PERCENT.format(value),
        xFormat: (value) => SHORT_DATE.format(new Date(value)),
        tooltip: lineTooltip,
        description:
          "Seven-day rolling thirty-day return rate by shipment date for completed Wayfinder orders, with the May incident and Insert B rollout marked.",
        summary: `The incident rises to ${PERCENT.format(STORY_STATS.incidentReturnRate)} against a ${PERCENT.format(STORY_STATS.baselineReturnRate)} nonincident baseline.`,
        frameProps: { background: "transparent" },
      },
      notice: acceptedInsight
        ? "Accepted packaging insight translated to an incident band."
        : "Incident band is proposed; collect and test it before accepting a claim.",
    }
  }

  if (roomId === "sorting-shelf") {
    const shelfRows = aggregateSortingShelf(rows, { dimension: shelfDimension })
    const configProps = {
      data: shelfRows,
      categoryAccessor: "category",
      groupBy: "group",
      valueAccessor: "excessReturns",
      orientation: "horizontal",
      sort: "desc",
      showLegend: true,
      barPadding: 24,
    }
    const highlight = Boolean(acceptedInsight)
    return {
      componentName: "GroupedBarChart",
      title: "Excess returns above the nonincident baseline",
      subtitle: `${titleCase(shelfDimension)} view · bars keep counts and denominators in their tooltips`,
      height: 430,
      configProps,
      renderProps: {
        ...configProps,
        ...common,
        height: 430,
        chartId: "sorting-shelf",
        colorBy: "group",
        colorScheme: ["#a84134", "#c48736", "#587d6e", "#56788a", "#856d8e", "#7c684d"],
        valueLabel: "Excess returns",
        categoryLabel: titleCase(shelfDimension),
        valueFormat: (value) => `${Math.round(value)}`,
        tooltip: shelfTooltip,
        description:
          "Grouped bars decompose excess returns above the nonincident baseline by return reason, product, or warehouse.",
        summary: "Damaged-in-transit returns and Starlight Lanterns dominate the incident excess.",
        frameProps: {
          background: "transparent",
          pieceStyle: highlight
            ? (datum) => {
                const raw = unwrapDatum(datum)
                const match =
                  shelfDimension === "reason"
                    ? raw.categoryId === "damaged" || raw.groupId === "starlight-lantern"
                    : shelfDimension === "product"
                      ? raw.categoryId === "starlight-lantern" || raw.groupId === "damaged"
                      : raw.categoryId === "reno" || raw.groupId === "damaged"
                return {
                  opacity: match ? 1 : 0.24,
                  stroke: match ? "#33251d" : "transparent",
                  strokeWidth: match ? 1.5 : 0,
                }
              }
            : undefined,
        },
      },
      notice: highlight
        ? shelfDimension === "warehouse"
          ? "Accepted insight translated to the Reno and damaged-return bars."
          : "Accepted insight translated to the damaged and Starlight Lantern bars."
        : "Dimension toggles change the decomposition, not the upstream row scope.",
    }
  }

  if (roomId === "route-ledger") {
    const routeRows = routeScope === "all" ? rows : rows.filter((row) => row.returned)
    const sankey = aggregateSankey(routeRows, { returnedOnly: false })
    const hasHypothesis = applications.some((application) => {
      const artifact = artifacts[application.artifactId]
      return artifact?.kind === "hypothesis" && artifact.lifecycle.status !== "retracted"
    })
    const focusMode = acceptedInsight ? "accepted" : hasHypothesis ? "swiftship" : "none"
    const intelligenceAnnotations = acceptedInsight
      ? [
          {
            type: "callout",
            pointId: "package:insert-b",
            label: "Accepted packaging concentration",
            dx: 24,
            dy: -28,
            color: "#3e6f5a",
            provenance: {
              stableId: "wayfinder:route:accepted-insert-b",
              source: "computed",
              createdAt: FORGE_NOW,
            },
            lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
          },
        ]
      : []
    const configProps = {
      nodes: sankey.nodes,
      edges: sankey.edges,
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      nodeIdAccessor: "id",
      nodeLabel: "label",
      showLabels: chartWidth >= 520,
      nodeWidth: 12,
      edgeOpacity: 0.54,
      annotations: intelligenceAnnotations,
    }
    return {
      componentName: "SankeyDiagram",
      title: "Product → warehouse → package → carrier → outcome",
      subtitle: `${INTEGER.format(routeRows.length)} ${routeScope === "all" ? "orders" : "returned orders"} in the active scope`,
      height: 440,
      configProps,
      renderProps: {
        ...configProps,
        ...common,
        height: 440,
        chartId: "route-ledger",
        colorBy: "stage",
        colorScheme: STAGE_COLORS,
        edgeColorBy: "source",
        showLegend: false,
        tooltip: sankeyTooltip,
        description:
          "A five-stage Sankey diagram traces products through warehouse, packaging, carrier, and completed return outcome.",
        summary:
          "The incident damage flow concentrates through Starlight Lantern, Reno, and Corrugated Insert B before reaching multiple carriers.",
        frameProps: {
          background: "transparent",
          annotations: intelligenceAnnotations,
          nodeStyle: (datum) => networkNodeStyle(datum, focusMode),
          edgeStyle: (datum) => networkEdgeStyle(datum, focusMode),
        },
      },
      notice:
        focusMode === "accepted"
          ? "Accepted insight highlights Insert B across carriers; unrelated routes remain as context."
          : focusMode === "swiftship"
            ? "Proposed carrier path is highlighted with a dashed analytical status outside the chart."
            : "Collecting a route saves its semantic row predicate, not this ribbon geometry.",
    }
  }

  if (roomId === "inspection-bench") {
    const points = aggregateCohortPoints(rows)
    const activeComparison = applications
      .map((application) => artifacts[application.artifactId])
      .find(
        (artifact) =>
          ["hypothesis", "counterevidence"].includes(artifact?.kind) &&
          artifact.lifecycle.status !== "retracted",
      )
    const falsePositive = Object.values(artifacts).find(
      (artifact) => artifact.kind === "false-positive" && artifact.lifecycle.status === "accepted",
    )
    const annotations = []
    if (activeComparison?.kind === "hypothesis") {
      const proposed = points.find(
        (point) =>
          point.productId === "starlight-lantern" &&
          point.warehouseId === "reno" &&
          point.packageDesignId === "insert-b" &&
          point.carrierId === "swiftship",
      )
      if (proposed) {
        annotations.push({
          type: "highlight",
          field: "id",
          value: proposed.id,
          style: {
            fill: "none",
            stroke: "#b4782d",
            strokeWidth: 2.5,
            strokeDasharray: "5 3",
          },
          shipments: proposed.shipments,
          damageRate: proposed.damageRate,
          label: "Proposed carrier attribution",
          provenance: {
            stableId: `wayfinder:bench:proposed:${proposed.id}`,
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "proposed", anchor: "fixed", ttlHint: "P30D" },
        })
        annotations.push({
          type: "callout",
          shipments: proposed.shipments,
          damageRate: proposed.damageRate,
          label: "Proposed carrier attribution",
          dx: 26,
          dy: -32,
          color: "#b4782d",
          provenance: {
            stableId: `wayfinder:bench:proposed-callout:${proposed.id}`,
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "proposed", anchor: "fixed", ttlHint: "P30D" },
        })
      }
    }
    if (activeComparison?.kind === "counterevidence") {
      const matchingPoints = points.filter((point) => point.isFocalInsertB)
      matchingPoints.forEach((point) => {
        annotations.push({
          type: "highlight",
          field: "id",
          value: point.id,
          style: { fill: "none", stroke: "#55798a", strokeWidth: 3 },
          shipments: point.shipments,
          damageRate: point.damageRate,
          sourceArtifactId: activeComparison.id,
          sourceStableId: activeComparison.provenance.stableId,
          provenance: {
            stableId: `wayfinder:bench:counterevidence:${point.id}`,
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
        })
      })
      const calloutTarget = matchingPoints[0]
      if (calloutTarget) {
        annotations.push({
          type: "callout",
          shipments: calloutTarget.shipments,
          damageRate: calloutTarget.damageRate,
          label: "Counterevidence: Insert B across carriers",
          dx: 28,
          dy: -34,
          color: "#55798a",
          sourceArtifactId: activeComparison.id,
          sourceStableId: activeComparison.provenance.stableId,
          provenance: {
            stableId: "wayfinder:bench:counterevidence-callout",
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
        })
      }
    }
    if (acceptedInsight) {
      points
        .filter((point) => point.isFocalInsertB)
        .forEach((point) => {
          annotations.push({
            type: "highlight",
            field: "id",
            value: point.id,
            style: { fill: "none", stroke: "#3e6f5a", strokeWidth: 3 },
            shipments: point.shipments,
            damageRate: point.damageRate,
            label: "Insert B across carriers",
            provenance: {
              stableId: `wayfinder:bench:${point.id}`,
              source: "computed",
              createdAt: FORGE_NOW,
            },
            lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P90D" },
          })
        })
    }
    if (falsePositive) {
      const tiny = points.find((point) => point.isTinyNorthstar)
      if (tiny) {
        annotations.push({
          type: "highlight",
          field: "id",
          value: tiny.id,
          style: {
            fill: "none",
            stroke: "#8d4d49",
            strokeWidth: 2,
            strokeDasharray: "3 3",
            opacity: 0.42,
          },
          shipments: tiny.shipments,
          damageRate: tiny.damageRate,
          label: "Alert retracted · raw point retained",
          provenance: {
            stableId: "wayfinder:bench:tiny-northstar-alert",
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "retracted", anchor: "fixed", ttlHint: "P30D" },
        })
        annotations.push({
          type: "callout",
          shipments: tiny.shipments,
          damageRate: tiny.damageRate,
          label: "Retracted alert · 1 / 5 retained",
          dx: 30,
          dy: 28,
          color: "#8d4d49",
          provenance: {
            stableId: "wayfinder:bench:tiny-northstar-callout",
            source: "computed",
            createdAt: FORGE_NOW,
          },
          lifecycle: { status: "retracted", anchor: "fixed", ttlHint: "P30D" },
        })
      }
    }
    const treated = applyAnnotationStatus(annotations, { showRetractedAnnotations: true })
    const configProps = {
      data: points,
      xAccessor: "shipments",
      yAccessor: "damageRate",
      sizeBy: "damagedReturns",
      colorBy: "packageDesignId",
      colorScheme: Object.values(PACKAGE_COLORS),
      xCenter: MINIMUM_OPERATIONAL_VOLUME,
      yCenter: STORY_STATS.baselineDamageRate * 2,
      quadrants: {
        topRight: { label: "ACT · high rate, enough evidence", color: "#6f8b62", opacity: 0.12 },
        topLeft: { label: "VERIFY · high rate, low volume", color: "#c88b38", opacity: 0.13 },
        bottomRight: { label: "MONITOR · volume, lower rate", color: "#5a7c8b", opacity: 0.09 },
        bottomLeft: { label: "BACKGROUND", color: "#7b746b", opacity: 0.07 },
      },
      annotations: treated,
      showLegend: true,
    }
    const maxShipments = Math.max(50, ...points.map((point) => point.shipments))
    return {
      componentName: "QuadrantChart",
      title: "Risk versus evidence",
      subtitle: `Operational minimum n = ${MINIMUM_OPERATIONAL_VOLUME} · size = damaged returns`,
      height: 420,
      configProps,
      renderProps: {
        ...configProps,
        ...common,
        height: 420,
        chartId: "inspection-bench",
        pointIdAccessor: "id",
        xLabel: "Completed shipments",
        yLabel: "Damage-return rate",
        yFormat: (value) => PERCENT.format(value),
        sizeRange: [6, 17],
        pointOpacity: 0.86,
        tooltip: quadrantTooltip,
        description:
          "Each point is a product, warehouse, package, and carrier cohort; x is completed shipments, y is damage-return rate, and size is damaged returns.",
        summary:
          "Insert B cohorts appear in the high-rate adequate-volume region across carriers. A 20 percent Northstar point contains only five shipments.",
        frameProps: {
          background: "transparent",
          xExtent: [0, maxShipments * 1.08],
          yExtent: [0, 0.23],
        },
      },
      notice: falsePositive
        ? "The low-volume alert is retracted under policy; its raw 1/5 point is deliberately still here."
        : "High rate is not enough. Read every point against the evidence threshold at n = 25.",
    }
  }

  const knowledgeRows = knowledgeView
    ? rows.filter(compilePredicate(fulfillmentDomain, KNOWLEDGE_SCOPE_PREDICATE))
    : rows
  const cells = productPackageCells(knowledgeRows)
  let restoredProps = {}
  if (knowledgeView?.payload?.config) {
    try {
      const restored = fromConfig(knowledgeView.payload.config)
      if (restored.componentName === "Heatmap") restoredProps = restored.props
    } catch {
      restoredProps = {}
    }
  }
  const sourceInsight =
    acceptedInsight ??
    knowledgeView?.lineage?.parentIds
      .map((artifactId) => artifacts[artifactId])
      .find((artifact) => artifact?.kind === "insight")
  const annotations = knowledgeView ? knowledgeAnnotationsFor(sourceInsight) : []
  const configProps = {
    ...restoredProps,
    data: cells,
    xAccessor: "packageIndex",
    yAccessor: "productIndex",
    valueAccessor: "damageRate",
    colorScheme: "reds",
    showValues: true,
    showLegend: true,
    annotations,
  }
  return {
    componentName: "Heatmap",
    title: "Product × package damage-return rate",
    subtitle: knowledgeView
      ? `${INCIDENT_WINDOW.label} · Reno · accepted annotation · config lineage attached`
      : "The view is open; craft an insight + saved view to bind knowledge",
    height: 440,
    scopeRows: knowledgeRows,
    scopePredicate: knowledgeView ? KNOWLEDGE_SCOPE_PREDICATE : undefined,
    configProps,
    renderProps: {
      ...configProps,
      ...common,
      height: 440,
      chartId: "knowledge-lab",
      xExtent: [-0.5, PACKAGE_DESIGNS.length - 0.5],
      yExtent: [-0.5, PRODUCTS.length - 0.5],
      xLabel: "Package design",
      yLabel: "Product",
      xFormat: (index) => PACKAGE_DESIGNS[Math.round(index)]?.name ?? "",
      yFormat: (index) => PRODUCTS[Math.round(index)]?.name ?? "",
      valueFormat: (value) => PERCENT.format(value),
      tooltip: heatmapTooltip,
      description:
        "A product by package-design heatmap of damage-return rates, with every cell retaining its numerator and denominator. The crafted instance scopes the comparison to Reno during the incident window.",
      summary:
        "During the incident at Reno, Starlight Lantern with Corrugated Insert B records 128 damage returns among 920 completed shipments.",
      frameProps: {
        background: "transparent",
        axes: [
          {
            orient: "left",
            tickValues: PRODUCTS.map((_, index) => index),
            tickFormat: (index) => PRODUCTS[Math.round(index)]?.name ?? "",
            label: "Product",
          },
          {
            orient: "bottom",
            tickValues: PACKAGE_DESIGNS.map((_, index) => index),
            tickFormat: (index) => PACKAGE_DESIGNS[Math.round(index)]?.name ?? "",
            label: "Package design",
          },
        ],
      },
    },
    notice: knowledgeView
      ? "The saved comparison round-tripped through config, then received the incident scope, accepted predicate, and annotation."
      : "Nothing is gated: inspect the Heatmap now, then craft a durable annotated instance.",
  }
}

function dailySeries(rows, series) {
  return aggregateDailyReturnRates(rows).map((row) => ({
    id: `${series}:${row.date}`,
    time: row.dateValue.getTime(),
    date: row.date,
    rate: row.rollingReturnRate,
    dailyRate: row.returnRate,
    n: row.rollingOrders,
    returns: row.rollingReturns,
    dailyOrders: row.orders,
    series,
  }))
}

function watchtowerAnnotations(accepted) {
  const raw = [
    {
      type: "y-threshold",
      value: BASELINE_RETURN_RATE,
      label: `Nonincident baseline ${PERCENT.format(BASELINE_RETURN_RATE)}`,
      color: "#577a6a",
      strokeDasharray: "5 4",
      provenance: {
        stableId: "wayfinder:watchtower:baseline",
        source: "computed",
        createdAt: `${DATASET_WINDOW.end}T00:00:00.000Z`,
      },
      lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P180D" },
    },
    {
      type: "x-band",
      x0: Date.parse(`${INCIDENT_WINDOW.start}T00:00:00.000Z`),
      x1: Date.parse(`${INCIDENT_WINDOW.end}T00:00:00.000Z`),
      label: accepted ? "Accepted incident window" : "Incident window",
      fill: "#a94336",
      color: "#7a2f28",
      fillOpacity: accepted ? 0.16 : 0.1,
      provenance: {
        stableId: "wayfinder:watchtower:incident",
        source: "computed",
        createdAt: `${INCIDENT_WINDOW.end}T00:00:00.000Z`,
      },
      lifecycle: { status: accepted ? "accepted" : "proposed", anchor: "fixed", ttlHint: "P120D" },
    },
    {
      type: "x-threshold",
      value: Date.parse(`${PACKAGING_ROLLOUT_DATE}T00:00:00.000Z`),
      label: "Insert B rollout",
      color: "#b98a32",
      strokeDasharray: "2 3",
      provenance: {
        stableId: "wayfinder:watchtower:rollout",
        source: "system",
        createdAt: `${PACKAGING_ROLLOUT_DATE}T00:00:00.000Z`,
      },
      lifecycle: { status: "accepted", anchor: "fixed", ttlHint: "P180D" },
    },
  ]
  return applyAnnotationStatus(
    applyAnnotationLifecycle(raw, { now: `${DATASET_WINDOW.end}T00:00:00.000Z` }),
  )
}

function networkNodeStyle(datum, focusMode) {
  const raw = datum?.data ?? datum
  const stage = raw?.stage ?? "product"
  const focusIds = new Set([
    "product:starlight-lantern",
    "warehouse:reno",
    "package:insert-b",
    ...(focusMode === "swiftship"
      ? ["carrier:swiftship", "outcome:damaged"]
      : focusMode === "accepted"
        ? ["carrier:swiftship", "carrier:northstar", "carrier:parcelpost", "outcome:damaged"]
        : []),
  ])
  const active = focusMode === "none" || focusIds.has(raw?.id)
  return {
    fill: STAGE_COLORS[stage] ?? "#6e756f",
    stroke: active ? "#2c2119" : "#b8aa91",
    strokeWidth: active ? 1.4 : 0.7,
    opacity: active ? 1 : 0.24,
  }
}

function networkEdgeStyle(datum, focusMode) {
  const raw = datum?.data ?? datum
  const source = typeof raw?.source === "string" ? raw.source : raw?.source?.id
  const target = typeof raw?.target === "string" ? raw.target : raw?.target?.id
  const acceptedPairs = [
    ["product:starlight-lantern", "warehouse:reno"],
    ["warehouse:reno", "package:insert-b"],
    ["package:insert-b", "carrier:swiftship"],
    ["package:insert-b", "carrier:northstar"],
    ["package:insert-b", "carrier:parcelpost"],
    ["carrier:swiftship", "outcome:damaged"],
    ["carrier:northstar", "outcome:damaged"],
    ["carrier:parcelpost", "outcome:damaged"],
  ]
  const swiftPairs = acceptedPairs.filter(
    ([from, to]) =>
      !from.includes("northstar") &&
      !to.includes("northstar") &&
      !from.includes("parcelpost") &&
      !to.includes("parcelpost"),
  )
  const pairs =
    focusMode === "accepted" ? acceptedPairs : focusMode === "swiftship" ? swiftPairs : []
  const active =
    focusMode === "none" || pairs.some(([from, to]) => from === source && to === target)
  const sourceStage = raw?.sourceStage ?? source?.split(":")[0] ?? "product"
  return {
    fill: STAGE_COLORS[sourceStage] ?? "#7b756a",
    fillOpacity: active ? 0.65 : 0.08,
    stroke: active && focusMode !== "none" ? "#493628" : "none",
    strokeWidth: active && focusMode !== "none" ? 0.7 : 0,
  }
}

function buildInterpretation(componentName, configProps) {
  try {
    const description = describeChart(componentName, configProps)
    const grounding = buildReaderGrounding(componentName, configProps, {
      includeStructure: true,
      maxLeaves: 80,
    })
    const tree = buildNavigationTree(componentName, configProps, { maxLeaves: 80 })
    const validation = validateProps(componentName, configProps)
    const diagnostics = diagnoseConfig(componentName, configProps)
    const accessibility = auditAccessibility(
      componentName,
      {
        ...configProps,
        description: description.text,
        accessibleTable: true,
      },
      { inChartContainer: true, describe: true, navigable: true },
    )
    return { description, grounding, tree, validation, diagnostics, accessibility, error: null }
  } catch (error) {
    return {
      description: { text: "Interpretation unavailable for this view.", levels: {} },
      grounding: { text: "The deterministic room interpretation remains available below." },
      tree: null,
      validation: { valid: false, errors: [String(error?.message ?? error)] },
      diagnostics: { ok: false, diagnoses: [] },
      accessibility: null,
      error,
    }
  }
}

function ActiveChart({ model, onClick, onObservation }) {
  const props = { ...model.renderProps, onClick, onObservation }
  if (model.componentName === "LineChart") return <LineChart {...props} />
  if (model.componentName === "GroupedBarChart") return <GroupedBarChart {...props} />
  if (model.componentName === "SankeyDiagram") return <SankeyDiagram {...props} />
  if (model.componentName === "QuadrantChart") return <QuadrantChart {...props} />
  return <Heatmap {...props} />
}

function ScopeKpi({ value, label, format = "number" }) {
  return (
    <div className="insight-forge__kpi">
      <BigNumber
        value={value}
        label={label}
        format={format}
        precision={format === "percent" ? 1 : 0}
        mode="thumbnail"
        width="100%"
        background="transparent"
        borderColor="transparent"
        color="#f0cc6a"
        animate={false}
        description={`${format === "percent" ? PERCENT.format(value) : INTEGER.format(value)} ${label}`}
      />
      <span>{label}</span>
    </div>
  )
}

function RoomMap({ activeRoomId, visitedRooms, onEnter }) {
  return (
    <nav className="insight-forge__rooms" aria-label="Insight Forge authored room map">
      <span className="insight-forge__rooms-label">Authored map</span>
      <div
        role="group"
        aria-label="Analytical rooms; each door states the question its room answers"
      >
        {ROOMS.map((room, index) => (
          <React.Fragment key={room.id}>
            <button
              id={`insight-forge-room-${room.id}`}
              type="button"
              aria-current={activeRoomId === room.id ? "page" : undefined}
              aria-controls="insight-forge-active-room"
              aria-label={`${room.title}: ${room.question}${visitedRooms.includes(room.id) ? " (visited)" : ""}`}
              title={room.question}
              className="insight-forge__room-button"
              data-active={activeRoomId === room.id}
              data-visited={visitedRooms.includes(room.id)}
              onClick={() => onEnter(room.id, "world-map")}
            >
              <ForgeGlyph name={room.icon} size={27} decorative />
              <span>{room.title}</span>
              <small>{room.question}</small>
            </button>
            {index < ROOMS.length - 1 && (
              <span
                className="insight-forge__room-connector"
                title={
                  AUTHORED_DOORS.find(
                    (door) => door.from === room.id && door.to === ROOMS[index + 1].id,
                  )?.label
                }
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  )
}

function RoomControls({
  roomId,
  shelfDimension,
  setShelfDimension,
  routeScope,
  setRouteScope,
  knowledgeView,
}) {
  if (roomId === "sorting-shelf") {
    return (
      <div
        className="insight-forge__room-controls"
        role="group"
        aria-label="Sorting Shelf dimension"
      >
        <span>Arrange shelf by</span>
        {["reason", "product", "warehouse"].map((dimension) => (
          <button
            key={dimension}
            type="button"
            aria-pressed={shelfDimension === dimension}
            onClick={() => setShelfDimension(dimension)}
          >
            {titleCase(dimension)}
          </button>
        ))}
      </div>
    )
  }
  if (roomId === "route-ledger") {
    return (
      <div
        className="insight-forge__room-controls"
        role="group"
        aria-label="Route Ledger order scope"
      >
        <span>Flow shows</span>
        {["returned", "all"].map((scope) => (
          <button
            key={scope}
            type="button"
            aria-pressed={routeScope === scope}
            onClick={() => setRouteScope(scope)}
          >
            {scope === "returned" ? "Returned orders" : "All orders"}
          </button>
        ))}
      </div>
    )
  }
  if (roomId === "knowledge-lab") {
    return (
      <div className="insight-forge__room-controls insight-forge__room-controls--status">
        <span>Knowledge binding</span>
        <strong data-ready={Boolean(knowledgeView)}>
          {knowledgeView ? "Accepted view instantiated" : "Awaiting insight + saved view"}
        </strong>
      </div>
    )
  }
  return null
}

function ActiveApplications({ applications, artifacts, matching, total, activeRoomId, onRemove }) {
  if (!applications.length) {
    const boundScope = matching !== total
    return (
      <div className="insight-forge__scopebar insight-forge__scopebar--empty">
        <span>{boundScope ? "View-bound semantic scope" : "Full dataset in view"}</span>
        <strong>
          {INTEGER.format(matching)} / {INTEGER.format(total)} rows
        </strong>
      </div>
    )
  }
  return (
    <div className="insight-forge__scopebar">
      <div>
        <span>Active loadout</span>
        <strong>
          {INTEGER.format(matching)} matching / {INTEGER.format(total)} total rows
        </strong>
      </div>
      <div className="insight-forge__application-chips">
        {applications.map((application) => (
          <button
            key={application.id}
            type="button"
            title={`${application.explanation} Remove from ${activeRoomId}.`}
            onClick={() => onRemove(application)}
          >
            <span>{application.mode}</span>
            {artifacts[application.artifactId]?.title ?? application.artifactId}
            <b aria-hidden="true">×</b>
          </button>
        ))}
      </div>
    </div>
  )
}

function ArtifactPreview({ artifact, collected, onCollect }) {
  if (!artifact) return null
  return (
    <section className="insight-forge__artifact-preview" aria-label="Current semantic observation">
      <div className="insight-forge__artifact-preview-icon">
        <ForgeGlyph name={artifact.icon} size={38} label={`${artifact.kind} artifact`} />
      </div>
      <div>
        <span>Current semantic artifact · {artifact.kind}</span>
        <strong>{artifact.title}</strong>
        <p>{artifact.summary}</p>
      </div>
      <div className="insight-forge__artifact-preview-actions">
        {artifact.stats?.denominator != null && (
          <small>n = {INTEGER.format(artifact.stats.denominator)}</small>
        )}
        <button type="button" className="forge-button forge-button--collect" onClick={onCollect}>
          {collected ? "Refresh item" : "Collect clue"}
        </button>
      </div>
    </section>
  )
}

function InterpreterDrawer({ activeQuestion, onQuestion, answer, grounding }) {
  const questions = [
    ["purpose", "What is this chart for?"],
    ["changed", "What changed?"],
    ["denominator", "What is the denominator?"],
    ["weaken", "What would weaken this?"],
  ]
  return (
    <details className="insight-forge__interpreter">
      <summary>
        <span>Rule-based interpreter</span>
        <strong>Rule-based grounding</strong>
      </summary>
      <div className="insight-forge__interpreter-body">
        <div role="group" aria-label="Interpreter questions">
          {questions.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={activeQuestion === id}
              onClick={() => onQuestion(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="insight-forge__interpreter-answer">{answer}</p>
        <p className="insight-forge__grounding-excerpt">
          <span>Reader grounding</span>
          {grounding?.description?.text ?? grounding?.text ?? "Grounding unavailable."}
        </p>
      </div>
    </details>
  )
}

function InsightInventory({
  artifacts,
  selectedArtifactId,
  forgeInputs,
  activeRoom,
  onSelect,
  onSendToForge,
  onApply,
  onStatus,
}) {
  const activeArtifacts = artifacts.filter(
    (artifact) =>
      !["retracted", "retired"].includes(artifact.lifecycle.status) &&
      artifact.maturity !== "retired",
  )
  const archivedArtifacts = artifacts.filter(
    (artifact) =>
      ["retracted", "retired"].includes(artifact.lifecycle.status) ||
      artifact.maturity === "retired",
  )
  const selected = artifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null
  const firstForgeInput = forgeInputs.find(Boolean)

  const focusArtifact = (targetId) => {
    const element = document.querySelector(`[data-artifact-id="${CSS.escape(targetId)}"]`)
    element?.focus()
  }

  const handleItemKey = (event, artifact) => {
    const ordered = [...activeArtifacts].sort(compareArtifactGrid)
    const index = ordered.findIndex((candidate) => candidate.id === artifact.id)
    if (index < 0) return
    const position = artifactGridPosition(artifact)
    let nextIndex = index
    if (event.key === "ArrowRight") nextIndex = Math.min(ordered.length - 1, index + 1)
    else if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1)
    else if (event.key === "ArrowDown") {
      const next = ordered.findIndex((candidate) => {
        const candidatePosition = artifactGridPosition(candidate)
        return candidatePosition.row > position.row && candidatePosition.column >= position.column
      })
      if (next >= 0) nextIndex = next
    } else if (event.key === "ArrowUp") {
      for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
        if (artifactGridPosition(ordered[cursor]).row < position.row) {
          nextIndex = cursor
          break
        }
      }
    } else if (event.key === "Home" && event.ctrlKey) nextIndex = 0
    else if (event.key === "Home") {
      nextIndex = ordered.findIndex(
        (candidate) => artifactGridPosition(candidate).row === position.row,
      )
    } else if (event.key === "End") {
      const rowArtifacts = ordered
        .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
        .filter(({ candidate }) => artifactGridPosition(candidate).row === position.row)
      nextIndex = rowArtifacts[rowArtifacts.length - 1]?.candidateIndex ?? index
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault()
      onSelect(artifact.id)
      return
    } else return
    event.preventDefault()
    focusArtifact(ordered[nextIndex].id)
  }

  return (
    <aside className="insight-forge__satchel" aria-label="Analyst’s Satchel">
      <div className="forge-panel-heading forge-panel-heading--satchel">
        <div>
          <span>Analyst’s Satchel</span>
          <strong>{artifacts.length} artifacts</strong>
        </div>
        <ForgeGlyph name="scroll" size={30} decorative />
      </div>
      <p className="insight-forge__satchel-intro">
        Position is meaning: left to right is portability; top to bottom is epistemic maturity.
      </p>
      <div
        className="insight-forge__inventory-axis insight-forge__inventory-axis--columns"
        aria-hidden="true"
      >
        {SCOPE_COLUMNS.map((label) => (
          <span key={label}>{titleCase(label)}</span>
        ))}
      </div>
      <div
        className="insight-forge__inventory-grid"
        role="grid"
        aria-label="Artifacts by epistemic maturity and scope"
        aria-rowcount={4}
        aria-colcount={4}
      >
        {MATURITY_ROWS.map((rowLabel, row) => (
          <div
            key={rowLabel}
            className="insight-forge__inventory-row"
            role="row"
            aria-rowindex={row + 1}
          >
            {SCOPE_COLUMNS.map((columnLabel, column) => {
              const cellArtifacts = activeArtifacts.filter((artifact) => {
                const position = artifactGridPosition(artifact)
                return position.row === row && position.column === column
              })
              return (
                <div
                  key={`${rowLabel}-${columnLabel}`}
                  className="insight-forge__inventory-cell"
                  role="gridcell"
                  aria-label={`${titleCase(rowLabel)}, ${titleCase(columnLabel)} scope`}
                  aria-colindex={column + 1}
                  data-row={rowLabel}
                >
                  {column === 0 && (
                    <span className="insight-forge__row-label" aria-hidden="true">
                      {inventoryRowLabel(row)}
                    </span>
                  )}
                  {cellArtifacts.map((artifact, stackIndex) => (
                    <InventoryItem
                      key={artifact.id}
                      artifact={artifact}
                      stackIndex={stackIndex}
                      selected={artifact.id === selectedArtifactId}
                      compatible={Boolean(
                        firstForgeInput && compatibleRecipe([firstForgeInput, artifact]),
                      )}
                      onSelect={() => onSelect(artifact.id)}
                      onKeyDown={(event) => handleItemKey(event, artifact)}
                    />
                  ))}
                  {cellArtifacts.length > 1 && (
                    <div
                      className="insight-forge__stack-picker"
                      aria-label="Choose stacked artifact"
                    >
                      {cellArtifacts.map((artifact, index) => (
                        <button
                          key={artifact.id}
                          type="button"
                          aria-label={`Show stacked artifact ${index + 1}: ${artifact.title}`}
                          aria-pressed={artifact.id === selectedArtifactId}
                          onClick={() => onSelect(artifact.id)}
                        >
                          {index + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div
        className="insight-forge__archive"
        role="region"
        aria-label="Archived and retracted artifacts"
      >
        <span>Archive</span>
        {archivedArtifacts.length === 0 ? (
          <em>Retracted evidence remains here.</em>
        ) : (
          archivedArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              type="button"
              data-status={artifact.lifecycle.status}
              onClick={() => onSelect(artifact.id)}
            >
              <ForgeGlyph name={artifact.icon} size={19} decorative />
              {artifact.title}
              <small>{artifact.lifecycle.status}</small>
            </button>
          ))
        )}
      </div>
      <ArtifactDetails
        artifact={selected}
        activeRoom={activeRoom}
        onSendToForge={onSendToForge}
        onApply={onApply}
        onStatus={onStatus}
      />
    </aside>
  )
}

function InventoryItem({ artifact, stackIndex, selected, compatible, onSelect, onKeyDown }) {
  const evidenceCount = Math.max(1, artifact.evidence?.length ?? 0)
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${artifact.title}; ${artifact.kind}; ${artifact.lifecycle.status}; ${artifact.scope} scope`}
      className="insight-forge__inventory-item"
      data-artifact-id={artifact.id}
      data-kind={artifact.kind}
      data-status={artifact.lifecycle.status}
      data-compatible={compatible}
      style={{ "--stack-index": stackIndex }}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      <span className="insight-forge__inventory-glyph">
        <ForgeGlyph name={artifact.icon} size={30} decorative />
      </span>
      <span className="insight-forge__inventory-title">{artifact.title}</span>
      <span className="insight-forge__inventory-meta">
        {artifact.stats?.denominator != null
          ? `n=${INTEGER.format(artifact.stats.denominator)}`
          : artifact.kind}
      </span>
      <EvidencePips count={evidenceCount} />
      {compatible && (
        <span
          className="insight-forge__compatible-rune"
          aria-label="Compatible with current forge item"
        >
          +
        </span>
      )}
      <span className="insight-forge__status-ribbon">{artifact.lifecycle.status}</span>
    </button>
  )
}

function ArtifactDetails({ artifact, activeRoom, onSendToForge, onApply, onStatus }) {
  const [tab, setTab] = useState("meaning")
  if (!artifact) {
    return (
      <div className="insight-forge__artifact-details insight-forge__artifact-details--empty">
        <ForgeGlyph name="unlit-lantern" size={28} decorative />
        <p>
          Select an item to inspect its meaning, scope, audit, lineage, and executable behavior.
        </p>
      </div>
    )
  }
  const fields = artifact.predicate ? fieldsUsedByPredicate(artifact.predicate) : []
  const warnings = compatibilityWarnings(artifact, activeRoom)
  let configText = "This artifact is semantic evidence, not a saved chart configuration."
  if (artifact.payload?.config) {
    try {
      const roundTrip = fromConfig(artifact.payload.config)
      configText = `${configToJSX(artifact.payload.config)}\n\nRound-trip: ${roundTrip.componentName} · ${Object.keys(roundTrip.props).length} props`
    } catch (error) {
      configText = `Config could not round-trip: ${error?.message ?? error}`
    }
  } else if (artifact.payload?.baseConfig) {
    try {
      configText = configToJSX(artifact.payload.baseConfig)
    } catch (error) {
      configText = String(error?.message ?? error)
    }
  }
  return (
    <section className="insight-forge__artifact-details" aria-label={`${artifact.title} details`}>
      <header>
        <ForgeGlyph name={artifact.icon} size={34} decorative />
        <div>
          <span>
            {artifact.kind} · {artifact.source.chartId}
          </span>
          <h4>{artifact.title}</h4>
        </div>
        <b data-status={artifact.lifecycle.status}>{artifact.lifecycle.status}</b>
      </header>
      <div className="insight-forge__detail-tabs" role="group" aria-label="Artifact detail views">
        {["meaning", "scope", "audit", "lineage", "config"].map((id) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {titleCase(id)}
          </button>
        ))}
      </div>
      {tab === "meaning" && (
        <div className="insight-forge__detail-copy">
          <p>{artifact.summary}</p>
          {artifact.stats?.denominator != null && (
            <dl>
              <div>
                <dt>Numerator</dt>
                <dd>{INTEGER.format(artifact.stats.numerator ?? 0)}</dd>
              </div>
              <div>
                <dt>Denominator</dt>
                <dd>{INTEGER.format(artifact.stats.denominator)}</dd>
              </div>
              {artifact.stats.rate != null && (
                <div>
                  <dt>Rate</dt>
                  <dd>{PERCENT.format(artifact.stats.rate)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
      {tab === "scope" && (
        <div className="insight-forge__detail-copy">
          <p>
            <strong>Portable scope:</strong> {artifact.scope}
          </p>
          <p>
            {artifact.predicate
              ? summarizePredicate(artifact.predicate)
              : "No row predicate: this item carries a serializable view."}
          </p>
          {fields.length > 0 && (
            <p>
              <strong>Fields:</strong> {fields.join(" · ")}
            </p>
          )}
          <CompatibilityPreview artifact={artifact} room={activeRoom} warnings={warnings} />
        </div>
      )}
      {tab === "audit" && (
        <>
          <ul className="insight-forge__finding-list">
            {artifact.audit.findings.map((finding) => (
              <li key={finding.id} data-status={finding.status}>
                <span>{finding.status}</span>
                <div>
                  <strong>{finding.id}</strong>
                  <p>{finding.message}</p>
                </div>
              </li>
            ))}
          </ul>
          {artifact.payload?.auditSnapshot && (
            <pre className="insight-forge__config-preview">
              {JSON.stringify(artifact.payload.auditSnapshot, null, 2)}
            </pre>
          )}
        </>
      )}
      {tab === "lineage" && (
        <div className="insight-forge__detail-copy">
          <p>
            <strong>Recipe:</strong> {artifact.lineage.recipeId ?? "Collected directly"}
          </p>
          <p>
            <strong>Parents:</strong> {artifact.lineage.parentIds.join(", ") || "None"}
          </p>
          <p>
            <strong>Stable ID:</strong> <code>{artifact.provenance.stableId}</code>
          </p>
          <p>
            <strong>Basis:</strong> {artifact.provenance.basis} · {artifact.provenance.authorKind}
          </p>
        </div>
      )}
      {tab === "config" && <pre className="insight-forge__config-preview">{configText}</pre>}
      <div className="insight-forge__detail-actions">
        <button
          type="button"
          className="forge-button forge-button--jewel"
          disabled={artifact.lifecycle.status === "retracted"}
          title={
            artifact.lifecycle.status === "retracted"
              ? "Reopen this artifact before using it in a recipe"
              : "Place this artifact in the forge"
          }
          onClick={() => onSendToForge(artifact.id)}
        >
          {artifact.lifecycle.status === "retracted" ? "Archived evidence" : "Send to Forge"}
        </button>
        {artifact.predicate && (
          <>
            <button
              type="button"
              className="forge-button"
              onClick={() => onApply(artifact, defaultModeFor(artifact, activeRoom), false)}
            >
              Apply here
            </button>
            <button
              type="button"
              className="forge-button"
              onClick={() => onApply(artifact, defaultModeFor(artifact, activeRoom), true)}
            >
              Equip globally
            </button>
            {supportsCompare(artifact, activeRoom) &&
              defaultModeFor(artifact, activeRoom) !== "compare" && (
                <button
                  type="button"
                  className="forge-button"
                  onClick={() => onApply(artifact, "compare", false)}
                >
                  Compare to rest
                </button>
              )}
          </>
        )}
        {artifact.lifecycle.status !== "retracted" ? (
          <button
            type="button"
            className="forge-button forge-button--danger"
            onClick={() => onStatus(artifact.id, "retracted")}
          >
            Retract
          </button>
        ) : (
          <button
            type="button"
            className="forge-button"
            onClick={() => onStatus(artifact.id, "disputed")}
          >
            Reopen as disputed
          </button>
        )}
        {artifact.payload?.config && (
          <button
            type="button"
            className="forge-button"
            onClick={() => copyConfig(artifact.payload.config, "jsx")}
          >
            Copy view JSX
          </button>
        )}
      </div>
    </section>
  )
}

function CompatibilityPreview({ artifact, room, warnings }) {
  const fields = artifact.predicate ? fieldsUsedByPredicate(artifact.predicate) : []
  return (
    <div className="insight-forge__compatibility">
      <strong>This item carries</strong>
      <ul>
        {fields.length ? (
          fields.map((field) => <li key={field}>✓ {field}</li>)
        ) : (
          <li>✓ serializable chart configuration</li>
        )}
      </ul>
      <strong>{room.title} will translate it as</strong>
      <ul>
        <li>✓ {applicationExplanation(artifact, room, defaultModeFor(artifact, room))}</li>
        {supportsCompare(artifact, room) && defaultModeFor(artifact, room) !== "compare" && (
          <li>✓ optional cohort-versus-complement comparison</li>
        )}
        {warnings.map((warning) => (
          <li key={warning}>— {warning}</li>
        ))}
      </ul>
    </div>
  )
}

function LowerDrawer({
  activePanel,
  onPanel,
  forgeInputs,
  forgeRecipe,
  onClearSlot,
  onCraft,
  interpretation,
  selectedArtifact,
  events,
  artifacts,
  activeArcEvents,
  onReplay,
  replayRunning,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  activeRoomId,
  onEnter,
}) {
  const panels = [
    ["forge", "The Forge", "lit-lantern"],
    ["appraisal", "Appraisal Desk", "abacus"],
    ["quest", "Quest Log", "scroll"],
    ["paths", "Traveled paths", "route"],
    ["lineage", "Recipes & lineage", "codex"],
  ]
  return (
    <section className="insight-forge__drawer" aria-label="Workbench lower drawer">
      <div className="insight-forge__drawer-tabs">
        <div className="insight-forge__drawer-tablist" role="group" aria-label="Workbench tools">
          {panels.map(([id, label, icon]) => (
            <button
              key={id}
              id={`insight-forge-tool-${id}`}
              type="button"
              aria-pressed={activePanel === id}
              aria-controls="insight-forge-tool-panel"
              onClick={() => onPanel(id)}
            >
              <ForgeGlyph name={icon} size={22} decorative />
              {label}
              {id === "quest" && <small>{events.length}</small>}
            </button>
          ))}
        </div>
        <div className="insight-forge__history-controls">
          <button type="button" disabled={!canUndo} onClick={onUndo}>
            Undo
          </button>
          <button type="button" disabled={!canRedo} onClick={onRedo}>
            Redo
          </button>
        </div>
      </div>
      <div
        id="insight-forge-tool-panel"
        className="insight-forge__drawer-body"
        role="region"
        aria-labelledby={`insight-forge-tool-${activePanel}`}
      >
        {activePanel === "forge" && (
          <CraftingBench
            inputs={forgeInputs}
            recipe={forgeRecipe}
            onClearSlot={onClearSlot}
            onCraft={onCraft}
          />
        )}
        {activePanel === "appraisal" && (
          <AppraisalDesk interpretation={interpretation} artifact={selectedArtifact} />
        )}
        {activePanel === "quest" && (
          <QuestLog
            events={events}
            arcEvents={activeArcEvents}
            onReplay={onReplay}
            replayRunning={replayRunning}
          />
        )}
        {activePanel === "paths" && (
          <TraveledPathMap events={events} activeRoomId={activeRoomId} onEnter={onEnter} />
        )}
        {activePanel === "lineage" && (
          <div className="insight-forge__recipes-panel">
            <RecipeAtlas artifacts={artifacts} />
            <LineageGraph artifacts={artifacts} />
          </div>
        )}
      </div>
    </section>
  )
}

function CraftingBench({ inputs, recipe, onClearSlot, onCraft }) {
  const compat = explainCompatibility(inputs)
  return (
    <div className="insight-forge__crafting">
      <div
        className="insight-forge__forge-scene"
        aria-label="Two-slot deterministic crafting bench"
      >
        {inputs.map((artifact, slot) => (
          <div key={slot} className="insight-forge__forge-slot" data-filled={Boolean(artifact)}>
            <span>{slot === 0 ? "First ingredient" : "Second ingredient"}</span>
            {artifact ? (
              <button
                type="button"
                onClick={() => onClearSlot(slot)}
                title="Remove from forge slot; item remains in satchel"
              >
                <ForgeGlyph name={artifact.icon} size={35} decorative />
                <strong>{artifact.title}</strong>
                <small>Referenced · not consumed</small>
              </button>
            ) : (
              <div>
                <ForgeGlyph name="unlit-lantern" size={33} decorative />
                <em>Select an item in the satchel</em>
              </div>
            )}
          </div>
        ))}
        <div className="insight-forge__forge-fire" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="insight-forge__forge-result">
          <span>Recipe result</span>
          <ForgeGlyph
            name={recipe ? recipeIcon(recipe.resultKind) : "scroll"}
            size={42}
            decorative
          />
          <strong>{recipe?.label ?? "No compatible recipe yet"}</strong>
        </div>
      </div>
      <div className="insight-forge__recipe-preview">
        <span>Compatibility preview</span>
        <p data-compatible={compat.compatible} role="status">
          {compat.reason}
        </p>
        <button
          type="button"
          className="forge-button forge-button--craft"
          disabled={!recipe}
          onClick={onCraft}
        >
          {recipe ? `Craft: ${recipe.label}` : "Choose a compatible pair"}
        </button>
      </div>
      <div className="insight-forge__recipe-list" aria-label="Available recipes">
        {RECIPE_ATLAS.map((step) => (
          <div key={step.id} data-active={compat.recipe?.id === step.id}>
            <span>
              {titleCase(step.inputKinds[0])} + {titleCase(step.inputKinds[1])}
            </span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppraisalDesk({ interpretation, artifact }) {
  const validation = interpretation.validation
  const diagnostics = interpretation.diagnostics
  const accessibility = interpretation.accessibility
  const chartFindings = [
    {
      label: "Property validation",
      status: validation.valid ? "pass" : "fail",
      detail: validation.valid
        ? "Serializable chart props are valid."
        : validation.errors.join(" "),
    },
    {
      label: "Configuration diagnosis",
      status: diagnostics.ok ? "pass" : "warn",
      detail: diagnostics.ok
        ? "No blocking configuration diagnosis."
        : `${diagnostics.diagnoses.length} diagnosis${diagnostics.diagnoses.length === 1 ? "" : "es"}; inspect before publishing.`,
    },
    {
      label: "Accessibility audit",
      status: accessibility?.ok ? "pass" : "warn",
      detail: accessibility
        ? `${accessibility.summary.fails} fails · ${accessibility.summary.warnings} advisories · ${accessibility.summary.manual} manual checks.`
        : "Accessibility audit unavailable.",
    },
  ]
  return (
    <div className="insight-forge__appraisal">
      <section>
        <header>
          <ForgeGlyph name="scales" size={28} decorative />
          <div>
            <span>Chart audit</span>
            <strong>Does this view behave responsibly?</strong>
          </div>
        </header>
        <ul>
          {chartFindings.map((finding) => (
            <li key={finding.label} data-status={finding.status}>
              <span>{finding.status}</span>
              <div>
                <strong>{finding.label}</strong>
                <p>{finding.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <header>
          <ForgeGlyph name={artifact?.icon ?? "unlit-lantern"} size={28} decorative />
          <div>
            <span>Artifact audit</span>
            <strong>{artifact?.title ?? "Select a satchel item"}</strong>
          </div>
        </header>
        {artifact ? (
          <ul>
            {artifact.audit.findings.map((finding) => (
              <li key={finding.id} data-status={finding.status}>
                <span>{finding.status}</span>
                <div>
                  <strong>{finding.id}</strong>
                  <p>{finding.message}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Artifact audit checks denominator, semantic scope, data version, volume, and causal
            wording separately from chart configuration.
          </p>
        )}
      </section>
    </div>
  )
}

function QuestLog({ events, arcEvents, onReplay, replayRunning }) {
  return (
    <div className="insight-forge__quest">
      <div className="insight-forge__quest-toolbar">
        <div>
          <span>Temporal trail</span>
          <strong>
            {events.length} durable workbench events · {arcEvents.length} compatible Semiotic arc
            events
          </strong>
        </div>
        <button
          type="button"
          className="forge-button forge-button--jewel"
          onClick={onReplay}
          disabled={replayRunning}
        >
          {replayRunning ? "Replaying…" : "Replay suggested route"}
        </button>
      </div>
      <ol tabIndex={0} aria-label="Temporal event trail; scroll horizontally for later events">
        {events.map((event, index) => (
          <li key={`${event.type}-${event.at}-${index}`} data-type={event.type}>
            <span>{String(event.at + 1).padStart(2, "0")}</span>
            <ForgeGlyph name={eventGlyph(event.type)} size={22} decorative />
            <div>
              <strong>{event.label ?? titleCase(event.type)}</strong>
              <small>{event.type}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className="insight-forge__quest-note">
        Hover events are deliberately absent. The trail records explicit selection, collection,
        application, crafting, and status changes; logical lineage lives in the next drawer.
      </p>
    </div>
  )
}

function LineageGraph({ artifacts }) {
  if (!artifacts.length) {
    return (
      <div className="insight-forge__lineage-empty">
        <ForgeGlyph name="route" size={42} decorative />
        <p>
          Crafted parent-child relationships will appear here. Collection order stays in the Quest
          Log.
        </p>
      </div>
    )
  }
  const depths = lineageDepths(artifacts)
  const rowsByDepth = new Map()
  artifacts.forEach((artifact) => {
    const depth = depths.get(artifact.id) ?? 0
    const row = rowsByDepth.get(depth) ?? []
    row.push(artifact)
    rowsByDepth.set(depth, row)
  })
  const positioned = artifacts.map((artifact) => {
    const depth = depths.get(artifact.id) ?? 0
    const row = rowsByDepth.get(depth)
    const index = row.findIndex((candidate) => candidate.id === artifact.id)
    return { artifact, x: 24 + depth * 188, y: 28 + index * 58 }
  })
  const byId = new Map(positioned.map((entry) => [entry.artifact.id, entry]))
  const supersededIds = new Set(
    artifacts
      .filter((artifact) => isSuperseded(artifact, artifacts))
      .map((artifact) => artifact.id),
  )
  const width = Math.max(760, 210 + Math.max(...positioned.map((entry) => entry.x)))
  const height = Math.max(190, 90 + Math.max(...positioned.map((entry) => entry.y)))
  const stateOf = (artifact) => {
    if (artifact.lifecycle.status === "retracted") return "retracted"
    if (supersededIds.has(artifact.id)) return "superseded"
    if (artifact.lifecycle.status === "accepted") return "accepted"
    if (artifact.lifecycle.status === "proposed") return "proposed"
    return "collected"
  }
  return (
    <div className="insight-forge__lineage">
      <ul className="insight-forge__lineage-legend" aria-label="Lineage state legend">
        <li data-state="accepted">Accepted</li>
        <li data-state="proposed">Crafted, unaccepted</li>
        <li data-state="superseded">Superseded</li>
        <li data-state="retracted">Retracted</li>
      </ul>
      <div className="insight-forge__lineage-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Logical artifact lineage graph"
        >
          <defs>
            <marker
              id="insight-forge-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0 0 8 4 0 8Z" fill="#b78b42" />
            </marker>
            <pattern
              id="insight-forge-hatch"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="#7c3d36" strokeWidth="2" />
            </pattern>
          </defs>
          {positioned.flatMap(({ artifact: child, x, y }) =>
            child.lineage.parentIds.map((parentId) => {
              const parent = byId.get(parentId)
              if (!parent) return null
              return (
                <path
                  key={`${parentId}-${child.id}`}
                  d={`M${parent.x + 142},${parent.y + 17} C${parent.x + 164},${parent.y + 17} ${x - 22},${y + 17} ${x},${y + 17}`}
                  fill="none"
                  stroke="#b78b42"
                  strokeWidth="1.5"
                  markerEnd="url(#insight-forge-arrow)"
                />
              )
            }),
          )}
          {positioned.map(({ artifact, x, y }) => {
            const state = stateOf(artifact)
            return (
              <g key={artifact.id} transform={`translate(${x} ${y})`}>
                <rect
                  width="142"
                  height="35"
                  rx="2"
                  fill={state === "retracted" ? "url(#insight-forge-hatch)" : "#eee0ba"}
                  stroke={
                    state === "accepted"
                      ? "#42644e"
                      : state === "proposed"
                        ? "#b48332"
                        : state === "superseded"
                          ? "#7c6b8a"
                          : "#6e4b3d"
                  }
                  strokeWidth={state === "accepted" ? 2.5 : 1.4}
                  strokeDasharray={
                    state === "proposed" ? "4 3" : state === "superseded" ? "2 3" : undefined
                  }
                  opacity={state === "superseded" ? 0.85 : 1}
                />
                <text x="8" y="14" fontSize="8" fontWeight="800" fill="#423128">
                  {artifact.kind.toUpperCase()}
                </text>
                <text x="8" y="27" fontSize="9" fill="#2c241f">
                  {truncate(artifact.title, 23)}
                </text>
                {state === "superseded" && (
                  <text
                    x="134"
                    y="10"
                    fontSize="6.5"
                    fontWeight="800"
                    textAnchor="end"
                    fill="#5c4a70"
                  >
                    SUPERSEDED
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <ul className="sr-only">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            {artifact.title} ({stateOf(artifact)}); derived from{" "}
            {artifact.lineage.parentIds.join(", ") || "direct observation"}.
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Traveled Path Map ──────────────────────────────────────────────────────
// The essay's second map: how analysts actually move, laid over the authored
// spine. Rooms sit left→right in authored order; the intended route is the
// straight baseline, your session is solid arcs above, the team aggregate is
// dashed arcs below. Direction is shown with arrowheads, magnitude with width,
// and the two audiences are separated in space AND texture (never color alone).
const TRAVEL_INK = "#3d2f24"
const TRAVEL_PAPER = "#f4ecd6"
const TRAVEL_SPINE = "#c3b287"
const TRAVEL_SESSION = "#2f6f57"
const TRAVEL_TEAM = "#9a6a2f"
const TRAVEL_CURRENT = "#7c3d36"

function arcPoints(xa, xb, baselineY, up, span) {
  const bow = (26 + span * 22) * (up ? -1 : 1)
  const cx = (xa + xb) / 2
  const cy = baselineY + bow
  return { cx, cy, pathD: `M${xa},${baselineY} Q${cx},${cy} ${xb},${baselineY}` }
}

// Arrowhead triangle seated at the target end of a quadratic arc, oriented
// along the curve's tangent (2·(P2−P1) at t=1).
function arcArrowhead(xb, baselineY, cx, cy, size = 6) {
  const dx = xb - cx
  const dy = baselineY - cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const bx = xb - ux * size
  const by = baselineY - uy * size
  return `${xb},${baselineY} ${bx + nx * size * 0.6},${by + ny * size * 0.6} ${bx - nx * size * 0.6},${by - ny * size * 0.6}`
}

function traveledPathLayout(ctx) {
  const { plot } = ctx.dimensions
  const cfg = ctx.config
  const order = cfg.roomOrder
  const n = order.length
  const indexOf = (id) => order.indexOf(id)
  const baselineY = plot.y + plot.height * 0.56
  const xAt = (i) => plot.x + plot.width * ((i + 0.5) / n)
  const posX = order.map((_, i) => xAt(i))
  const maxCount = Math.max(1, ...cfg.session.map((t) => t.count), ...cfg.team.map((t) => t.count))
  const widthFor = (count) => 1.4 + (count / maxCount) * 5.2

  const sceneEdges = []
  const arrows = []

  // Authored spine — the intended route, drawn straight along the baseline.
  for (let i = 0; i < n - 1; i += 1) {
    sceneEdges.push({
      type: "line",
      x1: posX[i],
      y1: baselineY,
      x2: posX[i + 1],
      y2: baselineY,
      style: { stroke: TRAVEL_SPINE, strokeWidth: 2.4, opacity: 0.9 },
      datum: { __kind: "authored", from: order[i], to: order[i + 1] },
    })
  }

  // Session arcs above the baseline.
  for (const t of cfg.session) {
    const ia = indexOf(t.from)
    const ib = indexOf(t.to)
    if (ia < 0 || ib < 0) continue
    const { cx, cy, pathD } = arcPoints(posX[ia], posX[ib], baselineY, true, Math.abs(ib - ia))
    sceneEdges.push({
      type: "curved",
      pathD,
      style: { stroke: TRAVEL_SESSION, strokeWidth: widthFor(t.count), opacity: 0.92 },
      datum: { ...t, __kind: "session" },
    })
    arrows.push({
      key: `s-${t.id}`,
      color: TRAVEL_SESSION,
      points: arcArrowhead(posX[ib], baselineY, cx, cy),
    })
  }

  // Team arcs below the baseline, dashed.
  for (const t of cfg.team) {
    const ia = indexOf(t.from)
    const ib = indexOf(t.to)
    if (ia < 0 || ib < 0) continue
    const { cx, cy, pathD } = arcPoints(posX[ia], posX[ib], baselineY, false, Math.abs(ib - ia))
    sceneEdges.push({
      type: "curved",
      pathD,
      style: {
        stroke: TRAVEL_TEAM,
        strokeWidth: widthFor(t.count),
        opacity: 0.72,
        strokeDasharray: "5 4",
      },
      datum: { ...t, __kind: "team" },
    })
    arrows.push({
      key: `t-${t.id}`,
      color: TRAVEL_TEAM,
      points: arcArrowhead(posX[ib], baselineY, cx, cy),
    })
  }

  const sceneNodes = ctx.nodes.map((node) => {
    const current = node.id === cfg.activeRoomId
    const visited = cfg.visited.has(node.id)
    return {
      type: "circle",
      cx: posX[Math.max(0, indexOf(node.id))],
      cy: baselineY,
      r: current ? 13 : 10,
      style: {
        fill: current ? TRAVEL_CURRENT : visited ? TRAVEL_PAPER : "#e2d5b4",
        stroke: current ? TRAVEL_CURRENT : TRAVEL_INK,
        strokeWidth: current ? 3 : 1.6,
        opacity: 1,
      },
      datum: node.data || node,
      id: node.id,
      label: cfg.titles[node.id],
    }
  })

  const labels = ctx.nodes.map((node) => ({
    x: posX[Math.max(0, indexOf(node.id))],
    y: baselineY + 28,
    text: cfg.titles[node.id] ?? node.id,
    anchor: "middle",
    fontSize: 11,
    fill: TRAVEL_INK,
    stroke: TRAVEL_PAPER,
    strokeWidth: 3,
    paintOrder: "stroke",
  }))

  const overlays = (
    <g aria-hidden="true">
      {arrows.map((a) => (
        <polygon
          key={a.key}
          points={a.points}
          fill={a.color}
          opacity={a.color === TRAVEL_TEAM ? 0.72 : 0.92}
        />
      ))}
      <text x={plot.x + 2} y={plot.y + 14} fontSize="10" fill={TRAVEL_SESSION} fontWeight="700">
        ▲ your route (above the spine)
      </text>
      <text
        x={plot.x + 2}
        y={plot.y + plot.height - 4}
        fontSize="10"
        fill={TRAVEL_TEAM}
        fontWeight="700"
      >
        ▼ team aggregate (below the spine)
      </text>
    </g>
  )

  return { sceneNodes, sceneEdges, labels, overlays }
}

function traveledPathTooltip(input) {
  const datum = unwrapDatum(input) ?? {}
  if (datum.__kind === "session" || datum.__kind === "team") {
    return (
      <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
        <strong>
          {ROOM_TITLES[datum.from]} → {ROOM_TITLES[datum.to]}
        </strong>
        <span>{datum.__kind === "session" ? "your route" : "team aggregate"}</span>
        <b>
          {datum.count} transition{datum.count === 1 ? "" : "s"}
        </b>
        <small>A repeated move marks a decision point, not a cause.</small>
      </div>
    )
  }
  if (datum.__kind === "authored") {
    return (
      <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
        <strong>Authored door</strong>
        <span>
          {ROOM_TITLES[datum.from]} → {ROOM_TITLES[datum.to]}
        </span>
        <small>The route the dashboard designer intended.</small>
      </div>
    )
  }
  const title = ROOM_TITLES[datum.id] ?? datum.title ?? datum.id
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>{title}</strong>
      <small>Select to enter this room.</small>
    </div>
  )
}

function TraveledPathMap({ events, activeRoomId, onEnter }) {
  const [width, hostRef] = useResponsiveWidth(360, 720)
  const session = useMemo(() => deriveSessionPath(events), [events])
  const summary = useMemo(
    () => summarizeTravel({ sessionTransitions: session.transitions }),
    [session.transitions],
  )
  const roomNodes = useMemo(() => ROOM_ORDER.map((id) => ({ id, title: ROOM_TITLES[id] })), [])
  const layoutConfig = useMemo(
    () => ({
      roomOrder: ROOM_ORDER,
      titles: ROOM_TITLES,
      session: session.transitions,
      team: TEAM_TRANSITIONS,
      activeRoomId,
      visited: new Set(session.path),
    }),
    [session.transitions, session.path, activeRoomId],
  )

  return (
    <div className="insight-forge__pathmap">
      <div className="insight-forge__pathmap-head">
        <div>
          <span>Authored spine vs traveled reality</span>
          <strong>How this session moved through the rooms</strong>
        </div>
        <dl className="insight-forge__pathmap-stats">
          <div>
            <dt>On authored spine</dt>
            <dd>
              {summary.onSpine}/{session.transitions.length || 0}
            </dd>
          </div>
          <div>
            <dt>Loops</dt>
            <dd>{session.loops}</dd>
          </div>
          <div>
            <dt>Shared with team</dt>
            <dd>{summary.sharedWithTeam}</dd>
          </div>
        </dl>
      </div>
      <div className="insight-forge__pathmap-host" ref={hostRef}>
        <NetworkCustomChart
          nodes={roomNodes}
          edges={[]}
          nodeIDAccessor="id"
          layout={traveledPathLayout}
          layoutConfig={layoutConfig}
          width={width}
          height={230}
          title="Traveled path map"
          description="Rooms in authored order, with the intended route as a straight spine, this session's transitions as arcs above, and the team's aggregate as dashed arcs below."
          enableHover
          onClick={(datum) => {
            const raw = unwrapDatum(datum) ?? datum
            if (raw?.id && raw.id !== activeRoomId) onEnter?.(raw.id, "world-map")
          }}
          frameProps={{ background: "transparent", tooltipContent: traveledPathTooltip }}
        />
      </div>
      <p className="insight-forge__pathmap-summary">{summary.text}</p>
      <ul className="sr-only">
        <li>Authored spine: {ROOM_ORDER.map((id) => ROOM_TITLES[id]).join(" → ")}.</li>
        {session.transitions.length ? (
          session.transitions.map((t) => (
            <li key={t.id}>
              You moved from {ROOM_TITLES[t.from]} to {ROOM_TITLES[t.to]} {t.count} time
              {t.count === 1 ? "" : "s"} via {t.method}.
            </li>
          ))
        ) : (
          <li>No room-to-room transitions recorded yet.</li>
        )}
        {TEAM_TRANSITIONS.map((t) => (
          <li key={`team-${t.id}`}>
            The team moved from {ROOM_TITLES[t.from]} to {ROOM_TITLES[t.to]} {t.count} time
            {t.count === 1 ? "" : "s"}.
          </li>
        ))}
      </ul>
      <p className="insight-forge__pathmap-team" aria-hidden="true">
        Team aggregate seeded from {TEAM_ACTORS.map((actor) => actor.name.toLowerCase()).join(", ")}
        .
      </p>
    </div>
  )
}

// ── Recipe Atlas ─────────────────────────────────────────────────────────────
// The canonical crafting tree: what the Forge *can* make, from raw clue to
// preserved knowledge. Distinct from the instance lineage (what you *have*
// made). Completed steps light up as their recipe is crafted.
function RecipeAtlas({ artifacts }) {
  const craftedRecipeIds = useMemo(
    () => new Set(artifacts.map((artifact) => artifact.lineage?.recipeId).filter(Boolean)),
    [artifacts],
  )
  return (
    <div className="insight-forge__atlas" aria-label="Canonical recipe atlas">
      <div className="insight-forge__atlas-head">
        <span>Recipe atlas</span>
        <strong>The full Shattered Lanterns crafting tree</strong>
      </div>
      <ol className="insight-forge__atlas-steps">
        {RECIPE_ATLAS.map((step, index) => {
          const done = craftedRecipeIds.has(step.id)
          return (
            <li key={step.id} data-done={done}>
              <div className="insight-forge__atlas-step">
                <span className="insight-forge__atlas-num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="insight-forge__atlas-io">
                  <span className="insight-forge__atlas-chip">{titleCase(step.inputKinds[0])}</span>
                  <span className="insight-forge__atlas-plus" aria-hidden="true">
                    +
                  </span>
                  <span className="insight-forge__atlas-chip">{titleCase(step.inputKinds[1])}</span>
                  <ForgeGlyph name="route" size={16} decorative />
                  <span className="insight-forge__atlas-chip insight-forge__atlas-chip--result">
                    {titleCase(step.resultKind)}
                  </span>
                </div>
                <span className="insight-forge__atlas-state" data-done={done}>
                  {done ? "crafted" : "available"}
                </span>
              </div>
              <p className="insight-forge__atlas-role">
                <strong>{step.label}.</strong> {step.storyRole}
              </p>
            </li>
          )
        })}
      </ol>
      <p className="insight-forge__atlas-note">
        Each step is a pure function of its inputs and the data version; ingredients are referenced,
        never consumed. The instance lineage below records only what you have crafted.
      </p>
    </div>
  )
}

function lineTooltip(input) {
  const datum = unwrapDatum(input) ?? {}
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>{datum.series ?? "Return rate"}</strong>
      <span>{datum.time != null ? SHORT_DATE.format(new Date(datum.time)) : datum.date}</span>
      <b>{PERCENT.format(datum.rate ?? 0)}</b>
      <small>
        {INTEGER.format(datum.returns ?? 0)} returns / n = {INTEGER.format(datum.n ?? 0)} rolling
        shipments
      </small>
    </div>
  )
}

function shelfTooltip(input) {
  const datum = unwrapDatum(input) ?? {}
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>{datum.category}</strong>
      <span>{datum.group}</span>
      <b>{Number(datum.excessReturns ?? 0).toFixed(1)} excess returns</b>
      <small>
        {INTEGER.format(datum.returns ?? datum.value ?? 0)} observed / n ={" "}
        {INTEGER.format(datum.orders ?? 0)}
      </small>
    </div>
  )
}

function sankeyTooltip(input) {
  const wrapped = input?.data ?? input
  const datum = unwrapDatum(wrapped) ?? wrapped ?? {}
  const isEdge = datum.source != null && datum.target != null
  // Edges carry the flow count on `value`; nodes carry it on `valueCount`.
  // Coerce and guard so a non-numeric field can never surface as "NaN orders".
  const rawCount = isEdge ? datum.value : (datum.valueCount ?? datum.value)
  const numericCount = Number(rawCount)
  const orders = Number.isFinite(numericCount) ? numericCount : 0
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>
        {isEdge
          ? `${datum.sourceLabel ?? datum.source} → ${datum.targetLabel ?? datum.target}`
          : (datum.label ?? datum.id)}
      </strong>
      <span>{isEdge ? "fulfillment flow" : (datum.stage ?? input?.type ?? "route node")}</span>
      <b>{INTEGER.format(orders)} orders</b>
      <small>Collecting stores a row predicate, not this geometry.</small>
    </div>
  )
}

function quadrantTooltip(input) {
  const datum = unwrapDatum(input) ?? {}
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>{datum.productName}</strong>
      <span>
        {datum.warehouseName} · {datum.packageDesignName} · {datum.carrierName}
      </span>
      <b>{PERCENT.format(datum.damageRate ?? 0)} damage rate</b>
      <small>
        {INTEGER.format(datum.damagedReturns ?? 0)} damaged / n ={" "}
        {INTEGER.format(datum.shipments ?? 0)}
      </small>
    </div>
  )
}

function heatmapTooltip(input) {
  const datum = unwrapDatum(input) ?? {}
  return (
    <div className="insight-forge__tooltip" data-semiotic-tooltip-chrome>
      <strong>{datum.productName}</strong>
      <span>{datum.packageDesignName}</span>
      <b>{PERCENT.format(datum.damageRate ?? 0)}</b>
      <small>
        {datum.numeratorLabel ?? `${datum.damagedReturns ?? 0} / ${datum.shipments ?? 0}`} damaged
        returns / shipments
      </small>
    </div>
  )
}

function artifactIdFromDatum(roomId, datum) {
  if (!datum || typeof datum !== "object") return null
  if (roomId === "watchtower") {
    const time = datum.time ?? (datum.date ? Date.parse(`${datum.date}T00:00:00.000Z`) : NaN)
    const start = Date.parse(`${INCIDENT_WINDOW.start}T00:00:00.000Z`)
    const end = Date.parse(`${INCIDENT_WINDOW.end}T23:59:59.999Z`)
    return time >= start && time <= end ? "incident-anomaly" : "incident-denominator"
  }
  if (roomId === "sorting-shelf") {
    if (datum.reason === "damaged" || datum.categoryId === "damaged" || datum.groupId === "damaged")
      return "damage-segment"
    if (
      (datum.dimension === "reason" && datum.groupId === "starlight-lantern") ||
      (datum.dimension === "product" && datum.categoryId === "starlight-lantern")
    )
      return "lantern-segment"
    return "sorting-view"
  }
  if (roomId === "route-ledger") {
    return "route-denominator"
  }
  if (roomId === "inspection-bench") {
    if (datum.isTinyNorthstar || (datum.carrierId === "northstar" && datum.shipments <= 5))
      return "tiny-northstar-anomaly"
    return "inspection-view"
  }
  return datum.isFocus ||
    (datum.productId === "starlight-lantern" && datum.packageDesignId === "insert-b")
    ? "knowledge-cell"
    : null
}

function interpreterAnswer(question, room, interpretation, scopedRows, applications) {
  if (question === "purpose") {
    return (
      interpretation.grounding?.intent?.sentence ??
      `This ${room.componentName} answers: ${room.question}`
    )
  }
  if (question === "changed") {
    if (!applications.length)
      return "No durable artifact is applied. The chart reads the full synthetic dataset and preserves its default context."
    return `${applications.length} carried artifact${applications.length === 1 ? " is" : "s are"} active. The recipient room re-aggregated ${INTEGER.format(scopedRows.length)} matching raw rows rather than reusing source-chart marks.`
  }
  if (question === "denominator") {
    const returns = scopedRows.filter((row) => row.returned).length
    return `${INTEGER.format(returns)} returned orders among ${INTEGER.format(scopedRows.length)} completed shipments in the current row scope. Every displayed rate retains its numerator and denominator in the tooltip or artifact detail.`
  }
  const roomCaveats = {
    watchtower:
      "A later rollout date, incomplete outcomes, or a stable denominator-adjusted series would weaken the incident reading.",
    "sorting-shelf":
      "A decomposition that disappears under another denominator or is spread evenly across products would weaken the concentration.",
    "route-ledger":
      "A thick path can reflect volume alone. Compare rates and complements before attributing the problem to a carrier.",
    "inspection-bench":
      "If Insert B were high for only one carrier, or SwiftShip’s other packaging were also high, the packaging-first interpretation would weaken.",
    "knowledge-lab":
      "A view is not stronger evidence by itself. Changed source data, missing predicate fields, or dropped counterevidence would weaken the knowledge artifact.",
  }
  return roomCaveats[room.id]
}

function applicationExplanation(artifact, room, mode) {
  const translations = {
    watchtower:
      mode === "compare"
        ? "cohort versus complement lines"
        : mode === "filter"
          ? "recomputed temporal rows"
          : "a lifecycle-aware incident annotation",
    "sorting-shelf": mode === "filter" ? "an upstream row filter" : "category emphasis",
    "route-ledger": mode === "filter" ? "recomputed flow edges" : "a semantic path callout",
    "inspection-bench":
      mode === "compare"
        ? "a matching-cohort callout retained against its complement"
        : mode === "filter"
          ? "recomputed cohort points"
          : "a lifecycle-aware point annotation",
    "knowledge-lab":
      mode === "filter"
        ? "recomputed product-package cells"
        : "a highlighted product-package cell with accepted provenance",
  }
  return `${artifact.title} becomes ${translations[room.id]}; its original predicate remains unchanged.`
}

function supportsCompare(artifact, room) {
  return (
    room.id === "watchtower" ||
    (room.id === "inspection-bench" && ["hypothesis", "counterevidence"].includes(artifact.kind))
  )
}

function compatibilityWarnings(artifact, room) {
  if (!artifact.predicate)
    return artifact.kind === "saved-view" ? [] : ["No executable predicate is available."]
  const supported = new Set(room.fields)
  const unsupported = fieldsUsedByPredicate(artifact.predicate).filter(
    (field) => !supported.has(field),
  )
  if (!unsupported.length) return []
  return unsupported.map(
    (field) =>
      `${field} has no direct mark channel here; it is preserved in the upstream row filter.`,
  )
}

function defaultModeFor(artifact, room) {
  if (["insight", "false-positive"].includes(artifact.kind)) return "annotate"
  if (["hypothesis", "counterevidence", "comparison"].includes(artifact.kind))
    return room && supportsCompare(artifact, room) ? "compare" : "filter"
  return "filter"
}

function compareArtifactGrid(left, right) {
  const a = artifactGridPosition(left)
  const b = artifactGridPosition(right)
  return (
    a.row - b.row ||
    a.column - b.column ||
    left.collectedAt.localeCompare(right.collectedAt) ||
    left.id.localeCompare(right.id)
  )
}

function inventoryRowLabel(row) {
  return ["CLUES", "LENSES", "CLAIMS", "KNOWLEDGE"][row] ?? "ITEMS"
}

function recipeIcon(kind) {
  return (
    {
      filter: "sieve",
      hypothesis: "unlit-lantern",
      insight: "lit-lantern",
      "false-positive": "decoy",
      "knowledge-view": "codex",
    }[kind] ?? "scroll"
  )
}

function eventGlyph(type) {
  if (type.includes("room")) return "route"
  if (type.includes("crafted")) return "lit-lantern"
  if (type.includes("status")) return "shield"
  if (type.includes("applied")) return "sieve"
  return "scroll"
}

export {
  artifactIdFromDatum,
  buildChartModel,
  createKnowledgeChartConfig,
  defaultModeFor,
  supportsCompare,
}

function lineageDepths(artifacts) {
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]))
  const memo = new Map()
  const visiting = new Set()
  const depthFor = (artifact) => {
    if (memo.has(artifact.id)) return memo.get(artifact.id)
    if (visiting.has(artifact.id)) return 0
    visiting.add(artifact.id)
    const parents = artifact.lineage.parentIds.map((id) => byId.get(id)).filter(Boolean)
    const depth = parents.length ? 1 + Math.max(...parents.map(depthFor)) : 0
    visiting.delete(artifact.id)
    memo.set(artifact.id, depth)
    return depth
  }
  artifacts.forEach(depthFor)
  return memo
}

function titleCase(value) {
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function truncate(value, length) {
  const text = String(value)
  return text.length > length ? `${text.slice(0, length - 1)}…` : text
}
