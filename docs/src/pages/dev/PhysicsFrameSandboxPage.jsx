import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { scaleLinear } from "d3-scale"
import { AccessibleNavTree } from "../../../../src/components/AccessibleNavTree"
import { describeChart } from "../../../../src/components/ai/describeChart"
import { auditAccessibility } from "../../../../src/components/charts/shared/auditAccessibility"
import {
  buildPhysicsNavigationTree,
  buildPhysicsSettledProjection,
  physicsObservationAnnouncement,
} from "../../../../src/components/stream/physics/PhysicsAccessibility"
import {
  collidersFromPhysicsAnnotations,
  resolvePhysicsBodyAnnotations,
} from "../../../../src/components/stream/physics/PhysicsAnnotations"
import { resolvePhysicsCanvasTheme } from "../../../../src/components/stream/physics/PhysicsCanvasTheme"
import { buildPhysicsSettledEvidence } from "../../../../src/components/stream/physics/PhysicsEvidence"
import {
  comparePhysicsEngineConformance,
  runPhysicsEngineConformance,
} from "../../../../src/components/stream/physics/PhysicsEngineConformance"
import {
  PhysicsPipelineStore,
  collidersFromPlotBounds,
  collidersFromXScaleBins,
} from "../../../../src/components/stream/physics/PhysicsPipelineStore"
import { createDefaultPhysicsEngineAdapter } from "../../../../src/components/stream/physics/PhysicsEngineAdapter"
import { StreamPhysicsFrame } from "../../../../src/components/stream/physics/StreamPhysicsFrame"
import { EventDropChart } from "../../../../src/components/charts/physics/EventDropChart"
import { GaltonBoardChart } from "../../../../src/components/charts/physics/GaltonBoardChart"
import { PhysicsCustomChart } from "../../../../src/components/charts/physics/PhysicsCustomChart"
import { PhysicsPileChart } from "../../../../src/components/charts/physics/PhysicsPileChart"
import { useFrame } from "../../../../src/components/stream/useFrame"
import "./PhysicsFrameSandboxPage.css"

const FIXED_DT = 1 / 120
const CANVAS_SCALE = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
const EVENTDROP_PROXIMITY_SENSOR_ID = "eventdrop-proximity-signal"
const EVENTDROP_LOG_EVENT_TYPES = new Set([
  "physics-bin-enter",
  "physics-bin-exit",
  "physics-proximity-enter",
  "physics-proximity-exit",
  "physics-late",
  "physics-barrier-cross",
])

function formatTime(value) {
  return `${Math.round(value)}s`
}

function formatObservation(event) {
  if (event.type === "sim-active") return "simulation running"
  if (event.type === "sim-idle") return "simulation settled"
  if (event.type === "physics-late") {
    return `${event.bodyId ?? "body"} late for ${event.binId ?? event.sensorId ?? "closed window"}`
  }
  if (event.type === "physics-barrier-cross") {
    const target =
      event.binId ??
      (typeof event.barrierValue === "number" ? formatTime(event.barrierValue) : "threshold")
    return `${event.barrierId ?? "barrier"} crossed ${target}`
  }
  if (event.type === "physics-proximity-enter" || event.type === "physics-proximity-exit") {
    const direction = event.type === "physics-proximity-enter" ? "entered" : "exited"
    return `${event.bodyId ?? "body"} ${direction} proximity ${event.binId ?? event.sensorId ?? "sensor"}`
  }
  if (event.type === "physics-budget-warning" || event.type === "physics-budget-overflow") {
    const state = event.type === "physics-budget-overflow" ? "overflow" : "warning"
    return `body budget ${state}: ${event.liveBodies ?? "?"}/${event.bodyLimit ?? "hint"} live, ${event.budgetAction ?? "continue"}`
  }
  const direction =
    event.type === "physics-bin-enter"
      ? "entered"
      : event.type === "physics-bin-exit"
        ? "exited"
        : event.type.replace("physics-", "")
  const label = event.binId ?? event.sensorId ?? event.bodyId ?? "sim"
  return `${event.bodyId ?? "body"} ${direction} ${label}`
}

function formatBodyCount(count) {
  return `${count} ${count === 1 ? "body" : "bodies"}`
}

function watermarkDatumLabel(datum) {
  if (!datum || typeof datum !== "object") return undefined
  const label = datum.label ?? datum.id ?? "event"
  const eventTime = typeof datum.eventTime === "number" ? formatTime(datum.eventTime) : "unknown"
  const arrivalTime =
    typeof datum.arrivalTime === "number" ? formatTime(datum.arrivalTime) : "unknown"
  const status = datum.late ? "late" : "on time"
  const proximity =
    datum.proximityState === "near"
      ? ", inside proximity gate"
      : datum.proximityState === "passed"
        ? ", proximity signaled"
        : ""
  return `${label}: event ${eventTime}, arrived ${arrivalTime}, ${status}${proximity}`
}

function watermarkContainerIdForBody(body) {
  const datum = body.datum
  if (!datum || typeof datum !== "object" || typeof datum.windowIndex !== "number") {
    return undefined
  }
  return `window-${datum.windowIndex}`
}

function windowIndexFor(value, windowSize, count) {
  return Math.max(0, Math.min(count - 1, Math.floor(value / windowSize)))
}

function createWatermarkEvents() {
  const events = []
  const lateIndexes = new Set([9, 16, 23, 31, 42, 49])
  for (let i = 0; i < 56; i += 1) {
    const windowSize = 12
    const nominal = (i * 2.8 + (i % 5) * 1.2) % 118
    const delayed = lateIndexes.has(i)
    const eventTime = delayed ? Math.max(2, nominal - 30 - (i % 3) * 4) : nominal
    const arrivalTime = nominal + (delayed ? 28 + (i % 4) * 3 : 5 + (i % 4))
    const windowIndex = windowIndexFor(eventTime, windowSize, 10)
    events.push({
      id: `event-${i}`,
      eventTime,
      arrivalTime,
      windowIndex,
      late: false,
      label: `E${i + 1}`,
    })
  }
  return events.sort((a, b) => a.arrivalTime - b.arrivalTime)
}

function createGaltonSamples() {
  const values = []
  for (let i = 0; i < 120; i += 1) {
    const a = (Math.sin(i * 12.9898) + 1) / 2
    const b = (Math.sin((i + 17) * 7.233) + 1) / 2
    const c = (Math.sin((i + 43) * 3.917) + 1) / 2
    values.push({
      id: `sample-${i}`,
      value: Math.max(2, Math.min(98, (a + b + c) * 33.333)),
    })
  }
  return values
}

function setupCanvas(canvas, width, height) {
  const ctx = canvas.getContext("2d")
  canvas.width = width * CANVAS_SCALE
  canvas.height = height * CANVAS_SCALE
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0)
  ctx.clearRect(0, 0, width, height)
  return ctx
}

function drawCircle(ctx, body, fill, stroke) {
  const radius = body.shape.type === "circle" ? body.shape.radius : 4
  ctx.beginPath()
  ctx.arc(body.x, body.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = stroke ?? fill
  ctx.stroke()
}

function truncateCanvasLabel(label, limit = 46) {
  return label.length > limit ? `${label.slice(0, limit - 3)}...` : label
}

function drawBodyAnnotation(ctx, annotation, width, height, theme) {
  const label = truncateCanvasLabel(annotation.label)
  const pad = 6
  ctx.save()
  ctx.font = "12px system-ui, sans-serif"
  const textWidth = Math.min(210, Math.ceil(ctx.measureText(label).width))
  const boxWidth = Math.max(92, textWidth + pad * 2)
  const boxHeight = 26
  const boxX = Math.max(6, Math.min(width - boxWidth - 6, annotation.labelX))
  const boxY = Math.max(6, Math.min(height - boxHeight - 6, annotation.labelY))
  const leaderX = boxX + (boxX > annotation.anchorX ? 0 : boxWidth)
  const leaderY = boxY + boxHeight / 2

  ctx.beginPath()
  ctx.moveTo(annotation.anchorX, annotation.anchorY)
  ctx.lineTo(leaderX, leaderY)
  ctx.strokeStyle = theme.annotationStroke
  ctx.lineWidth = 1.25
  ctx.stroke()

  ctx.fillStyle = theme.annotationBackground
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight)
  ctx.strokeStyle = theme.annotationStroke
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
  ctx.fillStyle = theme.annotationText
  ctx.fillText(label, boxX + pad, boxY + 17, boxWidth - pad * 2)
  ctx.restore()
}

function useVisibilityPause() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  return hidden
}

function useSandboxFrame(width, height) {
  const themeDirtyRef = useRef(true)
  const frame = useFrame({
    sizeProp: [width, height],
    responsiveWidth: false,
    responsiveHeight: false,
    userMargin: undefined,
    marginDefault: { top: 0, right: 0, bottom: 0, left: 0 },
    themeDirtyRef,
  })
  const { scheduleRender } = frame
  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined
    const scheduleThemePaint = () => {
      themeDirtyRef.current = true
      scheduleRender()
    }
    const observer = new MutationObserver(scheduleThemePaint)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme", "data-semiotic-theme"],
    })
    return () => observer.disconnect()
  }, [scheduleRender])
  return frame
}

function WatermarkSandbox() {
  const width = 760
  const height = 370
  const margin = { top: 34, right: 96, bottom: 48, left: 38 }
  const plot = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  }
  const windowCount = 10
  const windowSize = 12
  const yFloor = plot.y + plot.height - 30
  const yLid = plot.y + 112
  const lateGutterY = plot.y + 54
  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, windowCount * windowSize])
        .range([plot.x, plot.x + plot.width]),
    [plot.width, plot.x],
  )
  const events = useMemo(createWatermarkEvents, [])
  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const spawnedRef = useRef(0)
  const lastTimeRef = useRef(0)
  const simTimeRef = useRef(0)
  const currentWatermarkRef = useRef(0)
  const closedWindowsRef = useRef(new Set())
  const countedSensorsRef = useRef(new Set())
  const activeProximityRef = useRef(new Set())
  const signaledProximityRef = useRef(new Set())
  const stepsRunRef = useRef(0)
  const forceTickRef = useRef(0)
  const observationCountRef = useRef(0)
  const observationLogRef = useRef([])
  const hidden = useVisibilityPause()
  const { rafRef, reducedMotionRef, renderFnRef, scheduleRender } = useSandboxFrame(width, height)
  const [paused, setPaused] = useState(false)
  const [version, setVersion] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [observationLog, setObservationLog] = useState([])
  const [readerAnnouncement, setReaderAnnouncement] = useState("Waiting for physics observations.")
  const [stats, setStats] = useState(() => ({
    simTime: 0,
    watermark: 0,
    spawned: 0,
    late: 0,
    observations: 0,
    proximityActive: 0,
    proximitySignaled: 0,
    stepsRun: 0,
    settled: false,
    bins: Array.from({ length: windowCount }, () => ({ onTime: 0, late: 0, sensor: 0 })),
  }))

  const observationSensors = useMemo(
    () => ({
      ...Object.fromEntries(
        Array.from({ length: windowCount }, (_, index) => [
          `sensor-${index}`,
          {
            binId: `${index * windowSize}-${(index + 1) * windowSize}s`,
          },
        ]),
      ),
      [EVENTDROP_PROXIMITY_SENSOR_ID]: {
        binId: "arrival gate",
        enterType: "physics-proximity-enter",
        exitType: "physics-proximity-exit",
      },
    }),
    [windowCount, windowSize],
  )

  const projectionRows = useMemo(
    () =>
      buildPhysicsSettledProjection(
        stats.bins.map((bin, index) => ({
          id: `window-${index}`,
          label: `${index * windowSize}-${(index + 1) * windowSize}s`,
          count: bin.onTime + bin.late,
          secondary: bin.late,
          secondaryLabel: "late",
          observed: bin.sensor,
        })),
        {
          bodies: worldRef.current?.readBodies() ?? [],
          getContainerId: watermarkContainerIdForBody,
          getBodyLabel: (body) => watermarkDatumLabel(body.datum),
          recentBodyLimit: 4,
        },
      ),
    [stats.bins, windowSize],
  )

  const readerTree = useMemo(
    () =>
      buildPhysicsNavigationTree(projectionRows, {
        chartId: "watermark-reader-tree",
        chartType: "EventDropChart",
        projectionLabel: "event-time window table",
      }),
    [projectionRows],
  )

  const auditResult = useMemo(
    () =>
      auditAccessibility(
        "EventDropChart",
        {
          title: "EventDrop watermarks",
          description: "Events fall into event-time windows while a watermark closes old windows.",
          summary:
            "Closed windows become physical lids. Late arrivals collect in the gutter; the settled projection is a window table.",
          accessibleTable: true,
          responsiveWidth: true,
          physics: {
            pauseControl: true,
            settledProjection: true,
            reducedMotionSettle: true,
          },
        },
        { describe: true, inChartContainer: true, navigable: true },
      ),
    [],
  )

  const descriptionResult = useMemo(
    () =>
      describeChart(
        "EventDropChart",
        {
          title: "EventDrop watermarks",
          summary:
            "Closed windows become physical lids. Late arrivals collect in the gutter; the settled projection is a window table.",
          physics: { settledProjectionRows: projectionRows },
        },
        { levels: ["l1", "l2", "l3"] },
      ),
    [projectionRows],
  )

  const evidenceResult = useMemo(() => {
    const store = worldRef.current
    if (!store) return null
    return buildPhysicsSettledEvidence(store.snapshot(), {
      bodies: store.readBodies(),
      projectionRows,
      stepsRun: stats.stepsRun,
    })
  }, [projectionRows, stats.stepsRun])

  const staticAnnotations = useMemo(
    () => [
      {
        id: "watermark-barrier",
        label: `watermark ${formatTime(stats.watermark)}`,
        x: xScale(stats.watermark),
        y: plot.y + 10,
        dx: 12,
        dy: 32,
        physics: "barrier",
      },
      {
        id: "late-gutter",
        label: "late gutter",
        x: plot.x + plot.width - 10,
        y: lateGutterY + 24,
        dx: -118,
        dy: -18,
      },
      {
        id: EVENTDROP_PROXIMITY_SENSOR_ID,
        label: `${stats.proximityActive} near arrival gate`,
        x: plot.x + 12,
        y: yLid + 46,
        x1: plot.x + 8,
        x2: plot.x + plot.width - 8,
        axis: "y",
        thickness: 28,
        dx: 12,
        dy: -14,
        physics: "sensor",
      },
    ],
    [
      lateGutterY,
      plot.width,
      plot.x,
      plot.y,
      stats.proximityActive,
      stats.watermark,
      xScale,
      yLid,
    ],
  )

  const buildColliders = useCallback(
    (watermark) => {
      const colliders = [
        ...collidersFromPlotBounds(
          { x: plot.x, y: plot.y, width: plot.width, height: yFloor - plot.y },
          { idPrefix: "event-drop", wallThickness: 20, floorThickness: 20 },
        ),
        ...collidersFromXScaleBins({
          idPrefix: "window",
          count: windowCount,
          domainStart: 0,
          domainStep: windowSize,
          xScale,
          yTop: yLid,
          yBottom: yFloor,
          wallThickness: 4,
          closedBefore: watermark,
          lidY: yLid,
          lidThickness: 7,
        }).map((collider) =>
          collider.id.includes("-lid-")
            ? { ...collider, restitution: 0.02, friction: 0.18 }
            : collider,
        ),
        ...collidersFromPhysicsAnnotations([
          {
            id: EVENTDROP_PROXIMITY_SENSOR_ID,
            label: "arrival gate",
            x: plot.x + 12,
            y: yLid + 46,
            x1: plot.x + 8,
            x2: plot.x + plot.width - 8,
            axis: "y",
            thickness: 28,
            physics: "sensor",
          },
        ]),
      ]
      for (let i = 0; i < windowCount; i += 1) {
        const start = i * windowSize
        const end = start + windowSize
        const x0 = xScale(start)
        const x1 = xScale(end)
        colliders.push({
          id: `sensor-${i}`,
          sensor: true,
          shape: { type: "aabb", x: (x0 + x1) / 2, y: yLid + 44, width: x1 - x0 - 8, height: 68 },
        })
      }
      return colliders
    },
    [plot.width, plot.x, plot.y, windowCount, windowSize, xScale, yFloor, yLid],
  )

  const reset = useCallback(() => {
    const store = new PhysicsPipelineStore({
      fixedDt: FIXED_DT,
      maxSubsteps: 8,
      colliders: buildColliders(0),
      observation: {
        chartId: "watermark-sandbox",
        chartType: "EventDropChart",
        sensors: observationSensors,
      },
      kernel: {
        seed: 7,
        gravity: { x: 0, y: 640 },
        cellSize: 36,
        collisionIterations: 3,
        velocityDamping: 0.998,
        restitution: 0.08,
        friction: 0.1,
        sleepSpeed: 7,
        sleepAfter: 0.4,
      },
    })
    spawnedRef.current = 0
    simTimeRef.current = 0
    currentWatermarkRef.current = 0
    closedWindowsRef.current = new Set()
    countedSensorsRef.current = new Set()
    activeProximityRef.current = new Set()
    signaledProximityRef.current = new Set()
    stepsRunRef.current = 0
    forceTickRef.current += 1
    observationCountRef.current = 0
    observationLogRef.current = []
    worldRef.current = store
    setSelectedEventId(null)
    setObservationLog([])
    setReaderAnnouncement("Waiting for physics observations.")
    setStats({
      simTime: 0,
      watermark: 0,
      spawned: 0,
      late: 0,
      observations: 0,
      proximityActive: 0,
      proximitySignaled: 0,
      stepsRun: 0,
      settled: false,
      bins: Array.from({ length: windowCount }, () => ({ onTime: 0, late: 0, sensor: 0 })),
    })
  }, [buildColliders, observationSensors, windowCount])

  useEffect(() => {
    reset()
  }, [reset, version])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const store = worldRef.current
    if (!canvas || !store) return
    const ctx = setupCanvas(canvas, width, height)
    const theme = resolvePhysicsCanvasTheme(ctx)
    const state = store.readBodies()
    const watermark = currentWatermarkRef.current
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < windowCount; i += 1) {
      const x0 = xScale(i * windowSize)
      const x1 = xScale((i + 1) * windowSize)
      const closed = (i + 1) * windowSize < watermark
      ctx.fillStyle = closed ? theme.closedWindowFill : theme.openWindowFill
      ctx.fillRect(x0, yLid, x1 - x0, yFloor - yLid)
      ctx.strokeStyle = closed ? theme.closedWindowStroke : theme.openWindowStroke
      ctx.lineWidth = 1
      ctx.strokeRect(x0, yLid, x1 - x0, yFloor - yLid)
      if (closed) {
        ctx.beginPath()
        ctx.moveTo(x0 + 3, yLid)
        ctx.lineTo(x1 - 3, yLid)
        ctx.lineWidth = 5
        ctx.strokeStyle = theme.danger
        ctx.stroke()
      }
    }

    ctx.fillStyle = theme.gutterFill
    ctx.fillRect(plot.x, lateGutterY + 18, plot.width, 12)
    ctx.fillStyle = theme.textSecondary
    ctx.font = "11px system-ui, sans-serif"
    ctx.fillText("late gutter", plot.x + 8, lateGutterY + 14)

    ctx.save()
    ctx.globalAlpha = 0.12
    ctx.fillStyle = theme.success
    ctx.fillRect(plot.x + 8, yLid + 32, plot.width - 16, 28)
    ctx.restore()
    ctx.strokeStyle = theme.success
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(plot.x + 8, yLid + 46)
    ctx.lineTo(plot.x + plot.width - 8, yLid + 46)
    ctx.stroke()
    ctx.setLineDash([])

    const wmX = xScale(watermark)
    ctx.beginPath()
    ctx.moveTo(wmX, plot.y + 8)
    ctx.lineTo(wmX, yFloor + 16)
    ctx.lineWidth = 2
    ctx.strokeStyle = theme.danger
    ctx.setLineDash([5, 4])
    ctx.stroke()
    ctx.setLineDash([])

    for (const body of state) {
      const selected = body.id === selectedEventId
      const nearProximity = activeProximityRef.current.has(body.id)
      const signaledProximity = signaledProximityRef.current.has(body.id)
      drawCircle(
        ctx,
        body,
        selected
          ? theme.selectedFill
          : nearProximity
            ? theme.success
            : signaledProximity
              ? theme.warning
              : body.datum?.late
                ? theme.lateFill
                : theme.primary,
        selected ? theme.selectedStroke : nearProximity ? theme.success : theme.text,
      )
      if (nearProximity || signaledProximity) {
        ctx.beginPath()
        ctx.arc(body.x, body.y, nearProximity ? 13 : 9, 0, Math.PI * 2)
        ctx.strokeStyle = nearProximity ? theme.success : theme.warning
        ctx.lineWidth = nearProximity ? 2.5 : 1.25
        ctx.stroke()
      }
      if (selected) {
        ctx.beginPath()
        ctx.arc(body.x, body.y, 11, 0, Math.PI * 2)
        ctx.strokeStyle = theme.focus
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    const selectedBody = selectedEventId
      ? state.find((body) => body.id === selectedEventId)
      : null
    if (selectedBody) {
      const [annotation] = resolvePhysicsBodyAnnotations(
        [
          {
            id: "selected-event",
            bodyId: selectedBody.id,
            label: watermarkDatumLabel(selectedBody.datum) ?? selectedBody.id,
            dx: selectedBody.x > width - 230 ? -220 : 18,
            dy: selectedBody.y < 58 ? 28 : -32,
          },
        ],
        state,
      )
      if (annotation) drawBodyAnnotation(ctx, annotation, width, height, theme)
    }

    ctx.strokeStyle = theme.border
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(plot.x, yFloor + 20)
    ctx.lineTo(plot.x + plot.width, yFloor + 20)
    ctx.stroke()
  }, [
    height,
    lateGutterY,
    plot.width,
    plot.x,
    plot.y,
    selectedEventId,
    width,
    windowCount,
    windowSize,
    xScale,
    yFloor,
    yLid,
  ])

  const appendObservationLog = useCallback((observations) => {
    const notableObservations = observations.filter((event) =>
      EVENTDROP_LOG_EVENT_TYPES.has(event.type),
    )
    if (notableObservations.length === 0) return
    const announcement = physicsObservationAnnouncement(
      notableObservations[notableObservations.length - 1],
      { getDatumLabel: watermarkDatumLabel },
    )
    if (announcement) setReaderAnnouncement(announcement)
    observationCountRef.current += notableObservations.length
    observationLogRef.current = [...notableObservations, ...observationLogRef.current].slice(0, 6)
    setObservationLog(observationLogRef.current)
  }, [])

  const onCanvasPointerDown = useCallback(
    (event) => {
      const canvas = canvasRef.current
      const store = worldRef.current
      if (!canvas || !store) return
      const rect = canvas.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * width
      const y = ((event.clientY - rect.top) / rect.height) * height
      const hit = store.hitTest(x, y, 18)
      setSelectedEventId(hit?.id ?? null)
      if (hit) {
        const label = watermarkDatumLabel(hit.datum) ?? hit.id
        setReaderAnnouncement(`Selected ${label}.`)
      }
      scheduleRender()
    },
    [height, scheduleRender, width],
  )

  const tick = useCallback(() => {
    rafRef.current = 0
    const store = worldRef.current
    if (!store) return
    const now = performance.now()
    if (!lastTimeRef.current) lastTimeRef.current = now
    const elapsed = Math.min(0.05, (now - lastTimeRef.current) / 1000)
    lastTimeRef.current = now

    if (!paused && !hidden) {
      const domainObservations = []
      simTimeRef.current += elapsed * 12
      const maxSeenEventTime = events
        .slice(0, spawnedRef.current)
        .reduce((max, event) => Math.max(max, event.eventTime), 0)
      const watermark = Math.max(0, maxSeenEventTime - 14)
      currentWatermarkRef.current = watermark
      store.setColliders(buildColliders(watermark))
      for (let i = 0; i < windowCount; i += 1) {
        const start = i * windowSize
        const end = start + windowSize
        const windowId = `window-${i}`
        if (end >= watermark || closedWindowsRef.current.has(windowId)) continue
        closedWindowsRef.current.add(windowId)
        domainObservations.push(
          store.recordObservation({
            type: "physics-barrier-cross",
            barrierId: "watermark",
            barrierValue: watermark,
            binId: `${start}-${end}s`,
          }),
        )
      }

      while (
        spawnedRef.current < events.length &&
        events[spawnedRef.current].arrivalTime <= simTimeRef.current
      ) {
        const event = events[spawnedRef.current]
        const late = event.eventTime < watermark
        const x = xScale(event.eventTime)
        const binCenter = xScale(event.windowIndex * windowSize + windowSize / 2)
        const targetY = late ? lateGutterY : yFloor - 22
        const targetX = late ? x : binCenter
        const datum = { ...event, late }
        const binId = `${event.windowIndex * windowSize}-${(event.windowIndex + 1) * windowSize}s`
        if (late) {
          domainObservations.push(
            store.recordObservation({
              type: "physics-late",
              bodyId: event.id,
              datum,
              x,
              y: plot.y + 10,
              binId,
            }),
          )
        }
        store.spawnNow({
          id: event.id,
          x,
          y: plot.y + 10,
          vx: late ? -35 : -18 + (spawnedRef.current % 5) * 9,
          vy: 20,
          mass: 1,
          shape: { type: "circle", radius: 5 },
          datum,
          springs: [
            {
              id: `target-${event.id}`,
              target: { type: "point", x: targetX, y: targetY },
              restLength: late ? 18 : 0,
              stiffness: late ? 16 : 9,
              damping: 2.6,
            },
          ],
        })
        spawnedRef.current += 1
      }

      const stepResult = reducedMotionRef.current
        ? store.settleWithObservations()
        : store.tick(FIXED_DT * 2)
      stepsRunRef.current += stepResult.steps
      const observations = [...domainObservations, ...stepResult.observations]
      appendObservationLog(observations)
      const hasProximityObservation = observations.some(
        (event) =>
          event.type === "physics-proximity-enter" || event.type === "physics-proximity-exit",
      )
      for (const event of observations) {
        if (event.type === "physics-proximity-enter" && event.bodyId) {
          activeProximityRef.current.add(event.bodyId)
          signaledProximityRef.current.add(event.bodyId)
          if (event.datum && typeof event.datum === "object") {
            event.datum.proximityState = "near"
          }
          continue
        }
        if (event.type === "physics-proximity-exit" && event.bodyId) {
          activeProximityRef.current.delete(event.bodyId)
          if (event.datum && typeof event.datum === "object") {
            event.datum.proximityState = "passed"
          }
          continue
        }
        if (event.type !== "physics-bin-enter" || !event.sensorId?.startsWith("sensor-")) continue
        const key = `${event.sensorId}:${event.bodyId}`
        if (!countedSensorsRef.current.has(key)) countedSensorsRef.current.add(key)
      }

      if (
        reducedMotionRef.current ||
        hasProximityObservation ||
        forceTickRef.current % 8 === 0 ||
        spawnedRef.current === events.length
      ) {
        const bins = Array.from({ length: windowCount }, () => ({ onTime: 0, late: 0, sensor: 0 }))
        for (let i = 0; i < spawnedRef.current; i += 1) {
          const event = events[i]
          const wasLate = store.readBodies().find((body) => body.id === event.id)?.datum?.late
          bins[event.windowIndex][wasLate ? "late" : "onTime"] += 1
        }
        for (const key of countedSensorsRef.current) {
          const sensorId = key.split(":")[0]
          const index = Number(sensorId.replace("sensor-", ""))
          if (Number.isFinite(index) && bins[index]) bins[index].sensor += 1
        }
        setStats({
          simTime: simTimeRef.current,
          watermark,
          spawned: spawnedRef.current,
          late: bins.reduce((sum, bin) => sum + bin.late, 0),
          observations: observationCountRef.current,
          proximityActive: activeProximityRef.current.size,
          proximitySignaled: signaledProximityRef.current.size,
          stepsRun: stepsRunRef.current,
          settled: spawnedRef.current === events.length && store.allSleeping(),
          bins,
        })
      }
      forceTickRef.current += 1
    }

    draw()
    const shouldContinue =
      !paused &&
      !hidden &&
      (spawnedRef.current < events.length || !store.allSleeping() || simTimeRef.current < 150)
    if (shouldContinue) {
      scheduleRender()
    }
  }, [
    appendObservationLog,
    buildColliders,
    draw,
    events,
    hidden,
    lateGutterY,
    paused,
    plot.y,
    rafRef,
    reducedMotionRef,
    scheduleRender,
    windowCount,
    windowSize,
    xScale,
    yFloor,
  ])

  useEffect(() => {
    renderFnRef.current = tick
    draw()
    if (!paused && !hidden && !rafRef.current) {
      lastTimeRef.current = 0
      scheduleRender()
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [draw, hidden, paused, rafRef, renderFnRef, scheduleRender, tick, version])

  return (
    <section className="physics-sandbox__panel" data-testid="physics-watermark-sandbox">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>EventDrop watermarks</h2>
          <p>Closed windows become physical lids; late arrivals collect above the bins.</p>
        </div>
        <div className="physics-sandbox__controls">
          <button type="button" onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => setVersion((value) => value + 1)}>
            Reset
          </button>
        </div>
      </div>
      <div className="physics-sandbox__stage">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          aria-label="Watermark physics sandbox"
          onPointerDown={onCanvasPointerDown}
        />
        <svg
          className="physics-sandbox__axis"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          {xScale.ticks(10).map((tickValue) => (
            <g key={tickValue} transform={`translate(${xScale(tickValue)},${yFloor + 26})`}>
              <line y2="5" stroke="currentColor" />
              <text y="20" textAnchor="middle">
                {formatTime(tickValue)}
              </text>
            </g>
          ))}
          <StaticAnnotationOverlay annotations={staticAnnotations} />
        </svg>
      </div>
      <div className="physics-sandbox__stats physics-sandbox__stats--six">
        <div>
          <strong>{stats.spawned}</strong>
          <span>spawned</span>
        </div>
        <div>
          <strong>{stats.late}</strong>
          <span>late</span>
        </div>
        <div>
          <strong>{stats.observations}</strong>
          <span>observed</span>
        </div>
        <div>
          <strong>{stats.proximityActive}/{stats.proximitySignaled}</strong>
          <span>near/signaled</span>
        </div>
        <div>
          <strong>{formatTime(stats.simTime)}</strong>
          <span>replay</span>
        </div>
        <div>
          <strong>{stats.settled ? "idle" : paused || hidden ? "paused" : "running"}</strong>
          <span>state</span>
        </div>
      </div>
      <ObservationLog observations={observationLog} />
      <ReaderStructure announcement={readerAnnouncement} tree={readerTree} />
      <EvidenceReadout evidence={evidenceResult} />
      <DescriptionReadout result={descriptionResult} />
      <AuditReadout result={auditResult} />
      <ProjectionTable
        columns={projectionRows.map((row) => ({
          label: row.label,
          value: row.count,
          secondary: row.secondary,
          sensor: row.observed,
        }))}
        secondaryLabel="late"
      />
    </section>
  )
}

function EvidenceReadout({ evidence }) {
  const topBins = evidence
    ? evidence.binCounts
        .filter((bin) => bin.count > 0 || (bin.observed ?? 0) > 0)
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    : []

  return (
    <div className="physics-sandbox__evidence" data-testid="physics-evidence-readout">
      <h3>Computed evidence</h3>
      {evidence ? (
        <>
          <div className="physics-sandbox__evidence-grid">
            <div>
              <strong>{evidence.bodyCount}</strong>
              <span>bodies</span>
            </div>
            <div>
              <strong>{evidence.sleepingCount}</strong>
              <span>sleeping</span>
            </div>
            <div>
              <strong>{evidence.settled ? "yes" : "no"}</strong>
              <span>settled</span>
            </div>
            <div>
              <strong>{evidence.stepsRun}</strong>
              <span>stepsRun</span>
            </div>
            <div>
              <strong>{evidence.seed}</strong>
              <span>seed</span>
            </div>
          </div>
          <ol>
            {topBins.length > 0 ? (
              topBins.map((bin) => (
                <li key={bin.id}>
                  <strong>{bin.label}</strong>
                  <span>
                    {formatBodyCount(bin.count)}
                    {bin.secondary != null
                      ? ` · ${bin.secondary} ${bin.secondaryLabel ?? "secondary"}`
                      : ""}
                    {bin.observed != null ? ` · ${bin.observed} observed` : ""}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <strong>waiting</strong>
                <span>0 bins populated</span>
              </li>
            )}
          </ol>
        </>
      ) : (
        <p>Waiting for computed scene evidence.</p>
      )}
    </div>
  )
}

function StaticAnnotationOverlay({ annotations }) {
  return (
    <g className="physics-sandbox__static-annotations">
      {annotations.map((annotation) => {
        const dx = annotation.dx ?? 12
        const dy = annotation.dy ?? -18
        const labelX = annotation.x + dx
        const labelY = annotation.y + dy
        const span =
          annotation.axis === "y" &&
          Number.isFinite(annotation.x1) &&
          Number.isFinite(annotation.x2)
            ? {
                x1: annotation.x1,
                y1: annotation.y,
                x2: annotation.x2,
                y2: annotation.y,
              }
            : annotation.axis === "x" &&
                Number.isFinite(annotation.y1) &&
                Number.isFinite(annotation.y2)
              ? {
                  x1: annotation.x,
                  y1: annotation.y1,
                  x2: annotation.x,
                  y2: annotation.y2,
                }
              : null
        return (
          <g
            className="physics-sandbox__static-annotation"
            data-physics-role={annotation.physics ?? undefined}
            key={annotation.id}
          >
            {span ? (
              <line
                className="physics-sandbox__annotation-span"
                x1={span.x1}
                y1={span.y1}
                x2={span.x2}
                y2={span.y2}
              />
            ) : null}
            <line x1={annotation.x} y1={annotation.y} x2={labelX} y2={labelY - 4} />
            <circle cx={annotation.x} cy={annotation.y} r="3" />
            <text x={labelX} y={labelY} textAnchor={dx < 0 ? "end" : "start"}>
              {annotation.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function DescriptionReadout({ result }) {
  const levels = [
    ["l1", "L1"],
    ["l2", "L2"],
    ["l3", "L3"],
  ].filter(([level]) => result.levels[level])

  return (
    <div className="physics-sandbox__description" data-testid="physics-description-readout">
      <h3>Settled projection description</h3>
      <ol>
        {levels.map(([level, label]) => (
          <li key={level}>
            <strong>{label}</strong>
            <span>{result.levels[level]}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AuditReadout({ result }) {
  const findingIds = [
    "flexible.sim-pause-control",
    "flexible.settled-projection",
    "flexible.reduced-motion-settle",
    "compromising.navigable-structure",
  ]
  const findings = findingIds
    .map((id) => result.findings.find((finding) => finding.id === id))
    .filter(Boolean)

  return (
    <div className="physics-sandbox__audit" data-testid="physics-audit-readout">
      <h3>Accessibility contract audit</h3>
      <div className="physics-sandbox__audit-grid">
        {findings.map((finding) => (
          <div className={`physics-sandbox__audit-item is-${finding.status}`} key={finding.id}>
            <strong>{finding.status}</strong>
            <span>{finding.id.replace("flexible.", "").replace("compromising.", "")}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReaderStructure({ announcement, tree }) {
  return (
    <div className="physics-sandbox__reader" data-testid="physics-reader-structure">
      <div
        className="physics-sandbox__reader-live"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <div className="physics-sandbox__reader-tree">
        <AccessibleNavTree
          tree={tree}
          label="Physics settled projection navigation"
          visible
          chartId="watermark-sandbox"
        />
      </div>
    </div>
  )
}

function ObservationLog({ observations }) {
  return (
    <div className="physics-sandbox__observation-log" data-testid="physics-observation-log">
      <h3>Observation log</h3>
      <ol>
        {observations.length > 0 ? (
          observations.map((event, index) => (
            <li key={`${event.timestamp}-${event.type}-${event.bodyId}-${event.sensorId}-${index}`}>
              <strong>{formatObservation(event)}</strong>
              <span>
                {formatTime(event.timestamp)} · {event.chartType}
              </span>
            </li>
          ))
        ) : (
          <li>
            <strong>waiting for EventDrop events</strong>
            <span>EventDropChart</span>
          </li>
        )}
      </ol>
    </div>
  )
}

function GaltonSandbox() {
  const width = 760
  const height = 390
  const margin = { top: 30, right: 36, bottom: 54, left: 38 }
  const plot = {
    x: margin.left,
    y: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  }
  const binCount = 15
  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 100])
        .range([plot.x, plot.x + plot.width]),
    [plot.width, plot.x],
  )
  const samples = useMemo(createGaltonSamples, [])
  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const spawnedRef = useRef(0)
  const lastTimeRef = useRef(0)
  const frameRef = useRef(0)
  const hidden = useVisibilityPause()
  const { rafRef, reducedMotionRef, renderFnRef, scheduleRender } = useSandboxFrame(width, height)
  const [paused, setPaused] = useState(false)
  const [version, setVersion] = useState(0)
  const [stats, setStats] = useState(() => ({
    spawned: 0,
    settled: false,
    bins: Array.from({ length: binCount }, () => ({ count: 0 })),
  }))

  const projectionRows = useMemo(
    () =>
      stats.bins.map((bin, index) => ({
        id: `galton-bin-${index}`,
        label: `${Math.round((index / binCount) * 100)}-${Math.round(((index + 1) / binCount) * 100)}`,
        count: bin.count,
      })),
    [binCount, stats.bins],
  )

  const descriptionResult = useMemo(
    () =>
      describeChart(
        "GaltonBoardChart",
        { settledProjectionRows: projectionRows },
        { levels: ["l1", "l2", "l3"] },
      ),
    [projectionRows],
  )

  const buildColliders = useCallback(() => {
    const yFloor = plot.y + plot.height - 26
    const colliders = [
      ...collidersFromPlotBounds(
        { x: plot.x, y: plot.y, width: plot.width, height: yFloor - plot.y },
        { idPrefix: "galton", wallThickness: 20, floorThickness: 20 },
      ),
      ...collidersFromXScaleBins({
        idPrefix: "galton-bin",
        count: binCount,
        domainStart: 0,
        domainStep: 100 / binCount,
        xScale,
        yTop: yFloor - 84,
        yBottom: yFloor,
        wallThickness: 3,
      }).map((collider) => ({
        ...collider,
        restitution: 0.02,
        friction: 0.16,
      })),
    ]
    for (let row = 0; row < 8; row += 1) {
      const pegs = 9 + row
      const y = plot.y + 64 + row * 24
      for (let col = 0; col < pegs; col += 1) {
        const t = pegs === 1 ? 0.5 : col / (pegs - 1)
        const x = plot.x + plot.width * (0.12 + t * 0.76)
        colliders.push({
          id: `peg-${row}-${col}`,
          shape: { type: "aabb", x, y, width: 6, height: 6 },
          restitution: 0.16,
          friction: 0.05,
        })
      }
    }
    return colliders
  }, [binCount, plot.height, plot.width, plot.x, plot.y, xScale])

  const reset = useCallback(() => {
    const store = new PhysicsPipelineStore({
      fixedDt: FIXED_DT,
      maxSubsteps: 8,
      colliders: buildColliders(),
      kernel: {
        seed: 11,
        gravity: { x: 0, y: 700 },
        cellSize: 30,
        collisionIterations: 3,
        velocityDamping: 0.998,
        restitution: 0.08,
        friction: 0.08,
        sleepSpeed: 7,
        sleepAfter: 0.35,
      },
    })
    worldRef.current = store
    spawnedRef.current = 0
    frameRef.current = 0
    setStats({
      spawned: 0,
      settled: false,
      bins: Array.from({ length: binCount }, () => ({ count: 0 })),
    })
  }, [binCount, buildColliders])

  useEffect(() => {
    reset()
  }, [reset, version])

  const binsForSpawned = useCallback(() => {
    const bins = Array.from({ length: binCount }, () => ({ count: 0 }))
    for (let i = 0; i < spawnedRef.current; i += 1) {
      const sample = samples[i]
      const index = windowIndexFor(sample.value, 100 / binCount, binCount)
      bins[index].count += 1
    }
    return bins
  }, [binCount, samples])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const store = worldRef.current
    if (!canvas || !store) return
    const ctx = setupCanvas(canvas, width, height)
    const theme = resolvePhysicsCanvasTheme(ctx)
    const state = store.readBodies()
    const yFloor = plot.y + plot.height - 26
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)

    const bins = binsForSpawned()
    const max = Math.max(1, ...bins.map((bin) => bin.count))
    for (let i = 0; i < binCount; i += 1) {
      const x0 = xScale((i / binCount) * 100)
      const x1 = xScale(((i + 1) / binCount) * 100)
      const barHeight = (bins[i].count / max) * 92
      ctx.fillStyle = theme.openWindowFill
      ctx.fillRect(x0 + 3, yFloor - barHeight, x1 - x0 - 6, barHeight)
      ctx.strokeStyle = theme.openWindowStroke
      ctx.strokeRect(x0 + 3, yFloor - barHeight, x1 - x0 - 6, barHeight)
    }

    for (let row = 0; row < 8; row += 1) {
      const pegs = 9 + row
      const y = plot.y + 64 + row * 24
      for (let col = 0; col < pegs; col += 1) {
        const t = pegs === 1 ? 0.5 : col / (pegs - 1)
        const x = plot.x + plot.width * (0.12 + t * 0.76)
        ctx.beginPath()
        ctx.arc(x, y, 3.2, 0, Math.PI * 2)
        ctx.fillStyle = theme.textSecondary
        ctx.fill()
      }
    }

    for (const body of state) {
      drawCircle(ctx, body, theme.success, theme.text)
    }

    ctx.strokeStyle = theme.border
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(plot.x, yFloor + 18)
    ctx.lineTo(plot.x + plot.width, yFloor + 18)
    ctx.stroke()
  }, [binCount, binsForSpawned, height, plot.height, plot.width, plot.x, plot.y, width, xScale])

  const tick = useCallback(() => {
    rafRef.current = 0
    const store = worldRef.current
    if (!store) return
    const now = performance.now()
    if (!lastTimeRef.current) lastTimeRef.current = now
    const elapsed = Math.min(0.05, (now - lastTimeRef.current) / 1000)
    lastTimeRef.current = now

    if (!paused && !hidden) {
      const spawnBudget = Math.max(1, Math.floor(elapsed * 42))
      for (let i = 0; i < spawnBudget && spawnedRef.current < samples.length; i += 1) {
        const sample = samples[spawnedRef.current]
        const targetX = xScale(sample.value)
        const targetY = plot.y + plot.height - 42
        const jitter = (store.nextRandom() - 0.5) * 46
        store.spawnNow({
          id: sample.id,
          x: targetX + jitter,
          y: plot.y + 12,
          vx: -25 + store.nextRandom() * 50,
          vy: 10,
          shape: { type: "circle", radius: 4.5 },
          datum: sample,
          springs: [
            {
              id: `target-${sample.id}`,
              target: { type: "point", x: targetX, y: targetY },
              restLength: 0,
              stiffness: 10,
              damping: 2.2,
            },
          ],
        })
        spawnedRef.current += 1
      }
      if (reducedMotionRef.current) {
        store.settleWithObservations()
      } else {
        store.tick(FIXED_DT * 2)
      }
      if (
        reducedMotionRef.current ||
        frameRef.current % 8 === 0 ||
        spawnedRef.current === samples.length
      ) {
        setStats({
          spawned: spawnedRef.current,
          settled: spawnedRef.current === samples.length && store.allSleeping(),
          bins: binsForSpawned(),
        })
      }
      frameRef.current += 1
    }

    draw()
    if (!paused && !hidden && (spawnedRef.current < samples.length || !store.allSleeping())) {
      scheduleRender()
    }
  }, [
    binsForSpawned,
    draw,
    hidden,
    paused,
    plot.height,
    plot.y,
    rafRef,
    reducedMotionRef,
    samples,
    scheduleRender,
    xScale,
  ])

  useEffect(() => {
    renderFnRef.current = tick
    draw()
    if (!paused && !hidden && !rafRef.current) {
      lastTimeRef.current = 0
      scheduleRender()
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [draw, hidden, paused, rafRef, renderFnRef, scheduleRender, tick, version])

  return (
    <section className="physics-sandbox__panel" data-testid="physics-galton-sandbox">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>Galton quantile process</h2>
          <p>
            Each body carries a fixed sample value; the settled projection is the histogram below.
          </p>
        </div>
        <div className="physics-sandbox__controls">
          <button type="button" onClick={() => setPaused((value) => !value)}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={() => setVersion((value) => value + 1)}>
            Reset
          </button>
        </div>
      </div>
      <div className="physics-sandbox__stage">
        <canvas ref={canvasRef} width={width} height={height} aria-label="Galton physics sandbox" />
        <svg
          className="physics-sandbox__axis"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          {xScale.ticks(10).map((tickValue) => (
            <g
              key={tickValue}
              transform={`translate(${xScale(tickValue)},${plot.y + plot.height})`}
            >
              <line y2="5" stroke="currentColor" />
              <text y="20" textAnchor="middle">
                {tickValue}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="physics-sandbox__stats">
        <div>
          <strong>{stats.spawned}</strong>
          <span>samples</span>
        </div>
        <div>
          <strong>{binCount}</strong>
          <span>bins</span>
        </div>
        <div>
          <strong>{stats.settled ? "idle" : paused || hidden ? "paused" : "running"}</strong>
          <span>state</span>
        </div>
      </div>
      <DescriptionReadout result={descriptionResult} />
      <ProjectionTable
        columns={projectionRows.map((row) => ({
          label: row.label,
          value: row.count,
        }))}
      />
    </section>
  )
}

function StoreControlsSandbox() {
  const width = 760
  const height = 330
  const plot = { x: 38, y: 28, width: 686, height: 246 }
  const yFloor = plot.y + plot.height - 20
  const xScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 4])
        .range([plot.x, plot.x + plot.width]),
    [plot.width, plot.x],
  )
  const canvasRef = useRef(null)
  const storeRef = useRef(null)
  const snapshotRef = useRef(null)
  const lifecycleLogRef = useRef([])
  const bodyCounterRef = useRef(0)
  const evictedTotalRef = useRef(0)
  const lastBudgetDecisionRef = useRef(null)
  const lastTimeRef = useRef(0)
  const hidden = useVisibilityPause()
  const { rafRef, renderFnRef, scheduleRender } = useSandboxFrame(width, height)
  const [bodyLimit, setBodyLimit] = useState(14)
  const [eviction, setEviction] = useState("oldest")
  const [paused, setPaused] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [version, setVersion] = useState(0)
  const [lifecycleLog, setLifecycleLog] = useState([])
  const [stats, setStats] = useState(() => ({
    budget: null,
    evicted: 0,
    sediment: 0,
    sedimentBins: 0,
    sedimentColumns: [],
    sedimentTotal: 0,
    live: 0,
    queued: 0,
    selected: "none",
    snapshot: "empty",
    state: "running",
  }))

  const buildColliders = useCallback(
    () => [
      ...collidersFromPlotBounds(
        { x: plot.x, y: plot.y, width: plot.width, height: yFloor - plot.y },
        { idPrefix: "controls", wallThickness: 20, floorThickness: 20 },
      ),
      ...collidersFromXScaleBins({
        idPrefix: "controls-bin",
        count: 4,
        domainStart: 0,
        domainStep: 1,
        xScale,
        yTop: plot.y + 118,
        yBottom: yFloor,
        wallThickness: 4,
      }).map((collider) => ({
        ...collider,
        restitution: 0.02,
        friction: 0.16,
      })),
    ],
    [plot.width, plot.x, plot.y, xScale, yFloor],
  )

  const appendLifecycleEvent = useCallback((event) => {
    if (event.type !== "sim-active" && event.type !== "sim-idle") return
    lifecycleLogRef.current = [event, ...lifecycleLogRef.current].slice(0, 6)
    setLifecycleLog(lifecycleLogRef.current)
  }, [])

  const readSedimentColumns = useCallback(
    (store = storeRef.current) =>
      store?.sedimentHeightfield({
        baselineY: 72,
        binWidth: 30,
        gap: 6,
        maxHeight: 68,
        value: "count",
      }) ?? [],
    [],
  )

  const readPanelStats = useCallback(
    (store = storeRef.current, selected = "none", budgetOverride = null) => {
      const sediment = store?.sedimentTotals() ?? { bins: 0, count: 0, total: 0 }
      return {
        budget: budgetOverride ?? lastBudgetDecisionRef.current ?? store?.bodyBudgetStatus() ?? null,
        evicted: evictedTotalRef.current,
        sediment: sediment.count,
        sedimentBins: sediment.bins,
        sedimentColumns: readSedimentColumns(store),
        sedimentTotal: Math.round(sediment.total),
        live: store?.liveBodyCount() ?? 0,
        queued: store?.queueSize() ?? 0,
        selected,
        snapshot: snapshotRef.current ? "saved" : "empty",
        state: paused || hidden ? "paused" : store?.allSleeping() ? "idle" : "running",
      }
    },
    [hidden, paused, readSedimentColumns],
  )

  const updateStats = useCallback(
    (store = storeRef.current, selected = selectedId ?? "none", budget = null) => {
      const rank = { ok: 0, warning: 1, overflow: 2 }
      let effectiveBudget = budget ?? lastBudgetDecisionRef.current
      if (budget) {
        const current = lastBudgetDecisionRef.current
        if (
          budget.state === "ok" ||
          !current ||
          rank[budget.state] >= rank[current.state]
        ) {
          lastBudgetDecisionRef.current = budget.state === "ok" ? null : budget
        }
        effectiveBudget = lastBudgetDecisionRef.current ?? budget
      }
      setStats(readPanelStats(store, selected, effectiveBudget))
    },
    [readPanelStats, selectedId],
  )

  const createSpawns = useCallback(
    (store, count) => {
      const spawns = []
      for (let i = 0; i < count; i += 1) {
        const id = `control-${bodyCounterRef.current}`
        bodyCounterRef.current += 1
        const lane = bodyCounterRef.current % 4
        spawns.push({
          id,
          x: xScale(lane + 0.5) + (store.nextRandom() - 0.5) * 52,
          y: plot.y + 14,
          vx: -45 + store.nextRandom() * 90,
          vy: 0,
          mass: 1,
          shape: { type: "circle", radius: 6 },
          datum: { lane },
        })
      }
      return spawns
    },
    [plot.y, xScale],
  )

  const spawnBatch = useCallback(
    (count = 8) => {
      const store = storeRef.current
      if (!store) return
      const controls = store.controls()
      const spawns = createSpawns(store, count)
      controls.pushMany(spawns)
      const result = controls.step(0)
      evictedTotalRef.current += result.evicted.length
      const nextSelected = selectedId && result.evicted.includes(selectedId) ? "none" : selectedId
      if (nextSelected === "none") setSelectedId(null)
      updateStats(store, nextSelected ?? "none", result.budget)
      scheduleRender()
    },
    [createSpawns, scheduleRender, selectedId, updateStats],
  )

  const paceBatch = useCallback(
    (count = 10) => {
      const store = storeRef.current
      if (!store) return
      const controls = store.controls()
      const spawns = createSpawns(store, count)
      controls.pushMany(spawns, { pacing: { ratePerSec: 2 } })
      const result = controls.step(0)
      evictedTotalRef.current += result.evicted.length
      const nextSelected = selectedId && result.evicted.includes(selectedId) ? "none" : selectedId
      if (nextSelected === "none") setSelectedId(null)
      updateStats(store, nextSelected ?? "none", result.budget)
      scheduleRender()
    },
    [createSpawns, scheduleRender, selectedId, updateStats],
  )

  const reset = useCallback(() => {
    const store = new PhysicsPipelineStore({
      bodyLimit,
      bodyBudget: {
        warnAt: Math.max(1, bodyLimit - 2),
      },
      eviction,
      sediment: {
        binAccessor: "lane",
        labelAccessor: (body) => `lane ${Number(body.datum?.lane ?? 0) + 1}`,
        retainBodyIds: 4,
      },
      fixedDt: FIXED_DT,
      maxSubsteps: 8,
      colliders: buildColliders(),
      observation: {
        chartId: "controls-sandbox",
        chartType: "StreamPhysicsFrame",
        onObservation: appendLifecycleEvent,
      },
      kernel: {
        seed: 29,
        gravity: { x: 0, y: 760 },
        cellSize: 34,
        collisionIterations: 3,
        velocityDamping: 0.998,
        restitution: 0.08,
        friction: 0.12,
        sleepSpeed: 8,
        sleepAfter: 0.35,
      },
    })
    storeRef.current = store
    bodyCounterRef.current = 0
    evictedTotalRef.current = 0
    lastBudgetDecisionRef.current = null
    snapshotRef.current = null
    lifecycleLogRef.current = []
    setLifecycleLog([])
    setSelectedId(null)
    setPaused(false)
    const controls = store.controls()
    controls.pushMany(createSpawns(store, 10))
    const result = controls.step(0)
    evictedTotalRef.current += result.evicted.length
    setStats(readPanelStats(store, "none", result.budget))
  }, [
    appendLifecycleEvent,
    bodyLimit,
    buildColliders,
    createSpawns,
    eviction,
    readPanelStats,
  ])

  useEffect(() => {
    reset()
  }, [reset, version])

  useEffect(() => {
    const store = storeRef.current
    if (!store) return
    store.updateConfig({
      bodyLimit,
      bodyBudget: {
        warnAt: Math.max(1, bodyLimit - 2),
      },
      eviction,
    })
    const result = store.tick(0)
    evictedTotalRef.current += result.evicted.length
    const nextSelected = selectedId && result.evicted.includes(selectedId) ? "none" : selectedId
    if (nextSelected === "none") setSelectedId(null)
    updateStats(store, nextSelected ?? "none", result.budget)
    scheduleRender()
  }, [bodyLimit, eviction, scheduleRender, selectedId, updateStats])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const store = storeRef.current
    if (!canvas || !store) return
    const ctx = setupCanvas(canvas, width, height)
    const theme = resolvePhysicsCanvasTheme(ctx)
    const state = store.readBodies()

    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, width, height)

    for (let i = 0; i < 4; i += 1) {
      const x0 = xScale(i)
      const x1 = xScale(i + 1)
      ctx.fillStyle = i % 2 ? theme.openWindowFill : theme.gutterFill
      ctx.fillRect(x0, plot.y + 118, x1 - x0, yFloor - plot.y - 118)
      ctx.strokeStyle = theme.grid
      ctx.strokeRect(x0, plot.y + 118, x1 - x0, yFloor - plot.y - 118)
    }

    const sedimentColumns = store.sedimentHeightfield({
      baselineY: yFloor + 18,
      binWidth: 38,
      maxHeight: 84,
      value: "count",
      x: (bin, index) => {
        const lane = Number(bin.id)
        const laneCenter = Number.isFinite(lane) ? lane + 0.5 : index + 0.5
        return xScale(laneCenter) - 19
      },
    })
    for (const column of sedimentColumns) {
      ctx.fillStyle = theme.success
      ctx.globalAlpha = 0.34
      ctx.fillRect(column.x, column.y, column.width, column.height)
      ctx.globalAlpha = 1
      ctx.strokeStyle = theme.success
      ctx.lineWidth = 1
      ctx.strokeRect(column.x, column.y, column.width, column.height)
      ctx.fillStyle = theme.textSecondary
      ctx.font = "11px system-ui, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(String(column.count), column.x + column.width / 2, column.y - 4)
    }

    ctx.strokeStyle = theme.border
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(plot.x, yFloor + 18)
    ctx.lineTo(plot.x + plot.width, yFloor + 18)
    ctx.stroke()

    for (const body of state) {
      const selected = body.id === selectedId
      drawCircle(
        ctx,
        body,
        selected ? theme.selectedFill : theme.primary,
        selected ? theme.selectedStroke : theme.text,
      )
      if (selected) {
        ctx.beginPath()
        ctx.arc(body.x, body.y, 10, 0, Math.PI * 2)
        ctx.strokeStyle = theme.focus
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }, [height, plot.width, plot.x, plot.y, selectedId, width, xScale, yFloor])

  const tick = useCallback(() => {
    rafRef.current = 0
    const store = storeRef.current
    if (!store) return
    const now = performance.now()
    if (!lastTimeRef.current) lastTimeRef.current = now
    const elapsed = Math.min(0.05, (now - lastTimeRef.current) / 1000)
    lastTimeRef.current = now

    if (!paused && !hidden) {
      const result = store.tick(elapsed)
      evictedTotalRef.current += result.evicted.length
      const nextSelected = selectedId && result.evicted.includes(selectedId) ? "none" : selectedId
      if (nextSelected === "none") setSelectedId(null)
      updateStats(store, nextSelected ?? "none", result.budget)
    }

    draw()
    if (!paused && !hidden && store.hasPendingWork()) scheduleRender()
  }, [draw, hidden, paused, rafRef, scheduleRender, selectedId, updateStats])

  useEffect(() => {
    renderFnRef.current = tick
    draw()
    if (!paused && !hidden && !rafRef.current) {
      lastTimeRef.current = 0
      scheduleRender()
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [draw, hidden, paused, rafRef, renderFnRef, scheduleRender, tick, version])

  const onCanvasPointerDown = useCallback(
    (event) => {
      const canvas = canvasRef.current
      const store = storeRef.current
      if (!canvas || !store) return
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const hit = store.hitTest(x, y, 160)
      setSelectedId(hit?.id ?? null)
      setStats(readPanelStats(store, hit?.id ?? "none"))
      draw()
    },
    [draw, readPanelStats],
  )

  const togglePaused = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    const controls = store.controls()
    setPaused((value) => {
      if (value) controls.resume()
      else controls.pause()
      return !value
    })
    scheduleRender()
  }, [scheduleRender])

  const saveSnapshot = useCallback(() => {
    const store = storeRef.current
    if (!store) return
    snapshotRef.current = {
      bodyCounter: bodyCounterRef.current,
      evicted: evictedTotalRef.current,
      selectedId,
      store: store.snapshot(),
    }
    updateStats(store)
  }, [selectedId, updateStats])

  const restoreSnapshot = useCallback(() => {
    const store = storeRef.current
    const snapshot = snapshotRef.current
    if (!store || !snapshot) return
    store.restore(snapshot.store)
    bodyCounterRef.current = snapshot.bodyCounter
    evictedTotalRef.current = snapshot.evicted
    setSelectedId(snapshot.selectedId)
    updateStats(store)
    scheduleRender()
  }, [scheduleRender, updateStats])

  const nudgeSelected = useCallback(() => {
    const store = storeRef.current
    if (!store || !selectedId) return
    const direction = store.nextRandom() < 0.5 ? -1 : 1
    store.controls().applyImpulse(selectedId, direction * 110, -190)
    updateStats(store)
    scheduleRender()
  }, [scheduleRender, selectedId, updateStats])

  return (
    <section className="physics-sandbox__panel" data-testid="physics-store-controls-sandbox">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>Pipeline controls</h2>
        </div>
        <div className="physics-sandbox__controls">
          <button type="button" onClick={() => spawnBatch(8)}>
            Add 8
          </button>
          <button type="button" onClick={() => paceBatch(10)}>
            Pace 10
          </button>
          <button type="button" onClick={togglePaused}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={saveSnapshot}>
            Snapshot
          </button>
          <button type="button" onClick={restoreSnapshot} disabled={!snapshotRef.current}>
            Restore
          </button>
          <button type="button" onClick={nudgeSelected} disabled={!selectedId}>
            Nudge
          </button>
          <button type="button" onClick={() => setVersion((value) => value + 1)}>
            Reset
          </button>
        </div>
      </div>
      <div className="physics-sandbox__control-row">
        <label>
          <span>Body limit</span>
          <input
            type="number"
            min="4"
            max="40"
            step="1"
            value={bodyLimit}
            onChange={(event) => setBodyLimit(Number(event.target.value))}
          />
        </label>
        <label>
          <span>Eviction</span>
          <select value={eviction} onChange={(event) => setEviction(event.target.value)}>
            <option value="oldest">oldest</option>
            <option value="sleeping-first">sleeping-first</option>
          </select>
        </label>
      </div>
      <div className="physics-sandbox__stage">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          aria-label="Pipeline control physics sandbox"
          onPointerDown={onCanvasPointerDown}
        />
      </div>
      <div className="physics-sandbox__stats physics-sandbox__stats--eight">
        <div>
          <strong>{stats.live}</strong>
          <span>live</span>
        </div>
        <div>
          <strong>{stats.sediment}</strong>
          <span>absorbed</span>
        </div>
        <div>
          <strong>{stats.evicted}</strong>
          <span>budgeted</span>
        </div>
        <div>
          <strong>{stats.sedimentBins}</strong>
          <span>sediment bins</span>
        </div>
        <div>
          <strong>{stats.queued}</strong>
          <span>queued</span>
        </div>
        <div>
          <strong>{stats.selected}</strong>
          <span>selected</span>
        </div>
        <div>
          <strong>{stats.snapshot}</strong>
          <span>snapshot</span>
        </div>
        <div>
          <strong>{stats.state}</strong>
          <span>state</span>
        </div>
      </div>
      <BudgetPolicyReadout decision={stats.budget} />
      <SedimentLedger
        bins={stats.sedimentBins}
        columns={stats.sedimentColumns}
        count={stats.sediment}
        total={stats.sedimentTotal}
      />
      <SimulationLifecycleLog events={lifecycleLog} />
    </section>
  )
}

function BudgetPolicyReadout({ decision }) {
  const state = decision?.state ?? "ok"
  const action = decision?.action ?? "continue"
  return (
    <div
      className={`physics-sandbox__budget-policy physics-sandbox__budget-policy--${state}`}
      data-testid="physics-budget-policy"
    >
      <div>
        <h3>Body budget policy</h3>
        <strong>
          {state} · {action}
        </strong>
      </div>
      <dl>
        <div>
          <dt>live</dt>
          <dd>{decision?.liveBodies ?? 0}</dd>
        </div>
        <div>
          <dt>projected</dt>
          <dd>{decision?.projectedBodies ?? 0}</dd>
        </div>
        <div>
          <dt>warn</dt>
          <dd>{decision?.warnAt ?? "none"}</dd>
        </div>
        <div>
          <dt>limit</dt>
          <dd>{decision?.bodyLimit ?? "hint"}</dd>
        </div>
      </dl>
    </div>
  )
}

function SedimentLedger({ bins, columns, count, total }) {
  return (
    <div className="physics-sandbox__sediment-ledger" data-testid="physics-sediment-ledger">
      <div className="physics-sandbox__sediment-head">
        <h3>Sediment ledger</h3>
        <span>
          {count} absorbed · {bins} bins · total {total}
        </span>
      </div>
      <div className="physics-sandbox__sediment-bars">
        {columns.length > 0 ? (
          columns.map((column) => (
            <div className="physics-sandbox__sediment-bin" key={column.binId}>
              <span style={{ height: `${Math.max(2, column.height)}px` }} />
              <em>{column.label}</em>
            </div>
          ))
        ) : (
          <p>0 absorbed</p>
        )}
      </div>
    </div>
  )
}

function SimulationLifecycleLog({ events }) {
  return (
    <div className="physics-sandbox__observation-log" data-testid="physics-lifecycle-log">
      <h3>Simulation lifecycle</h3>
      <ol>
        {events.length > 0 ? (
          events.map((event, index) => (
            <li key={`${event.timestamp}-${event.type}-${index}`}>
              <strong>{formatObservation(event)}</strong>
              <span>
                {formatTime(event.timestamp)} · {event.previousSimulationState ?? "start"} to{" "}
                {event.simulationState ?? "state"}
              </span>
            </li>
          ))
        ) : (
          <li>
            <strong>waiting for state changes</strong>
            <span>StreamPhysicsFrame</span>
          </li>
        )}
      </ol>
    </div>
  )
}

function FrameApiSandbox() {
  const width = 760
  const height = 260
  const frameRef = useRef(null)
  const bodyCounterRef = useRef(0)
  const [executionMode, setExecutionMode] = useState("auto")
  const [workerThreshold, setWorkerThreshold] = useState(12)
  const [executionState, setExecutionState] = useState({
    execution: "sync",
    reason: "below threshold",
    requested: "auto",
  })
  const [paused, setPaused] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [stats, setStats] = useState({
    live: 0,
    queued: 0,
    selected: "none",
    snapshot: "settled",
    state: "idle",
    time: "0s",
    runtime: "sync",
  })

  const config = useMemo(
    () => ({
      fixedDt: FIXED_DT,
      maxDeltaSeconds: 0.5,
      maxSubsteps: 8,
      bodyLimit: 24,
      colliders: collidersFromPlotBounds(
        { x: 24, y: 24, width: width - 48, height: height - 58 },
        {
          idPrefix: "frame-api",
          wallThickness: 20,
          floorThickness: 20,
          includeCeiling: true,
        },
      ),
      observation: {
        chartId: "frame-api-sandbox",
        chartType: "StreamPhysicsFrame",
      },
      kernel: {
        seed: 77,
        gravity: { x: 0, y: 720 },
        cellSize: 34,
        collisionIterations: 3,
        velocityDamping: 0.998,
        restitution: 0.12,
        friction: 0.12,
        sleepSpeed: 8,
        sleepAfter: 0.35,
      },
    }),
    [],
  )

  const readStats = useCallback(
    (controls = frameRef.current) => {
      if (!controls) {
        return {
          live: 0,
          queued: 0,
          selected: selectedId ?? "none",
          snapshot: "settled",
          state: paused ? "paused" : "idle",
          time: "0s",
        }
      }
      const snapshot = controls.snapshot()
      return {
        live: controls.readBodies().length,
        queued: snapshot.queue.length,
        selected: selectedId ?? "none",
        snapshot: snapshot.queue.length === 0 && snapshot.world.bodies.every((body) => body.sleeping)
          ? "settled"
          : "active",
        state: snapshot.simulationState,
        time: `${snapshot.elapsedSeconds.toFixed(1)}s`,
        runtime: executionState.execution,
      }
    },
    [executionState.execution, paused, selectedId],
  )

  const updateStats = useCallback(
    (controls = frameRef.current) => {
      setStats(readStats(controls))
    },
    [readStats],
  )

  const createFrameSpawns = useCallback((count, kind = "immediate") => {
    const spawns = []
    for (let i = 0; i < count; i += 1) {
      const id = `frame-${bodyCounterRef.current}`
      bodyCounterRef.current += 1
      spawns.push({
        id,
        x: 70 + (bodyCounterRef.current % 8) * 82,
        y: 36,
        vx: -70 + (bodyCounterRef.current % 5) * 35,
        vy: 0,
        mass: 1,
        shape: { type: "circle", radius: 7 },
        datum: { kind, lane: bodyCounterRef.current % 8 },
      })
    }
    return spawns
  }, [])

  const pushImmediate = useCallback(() => {
    frameRef.current?.pushMany(createFrameSpawns(6, "immediate"))
    updateStats()
  }, [createFrameSpawns, updateStats])

  const pushPaced = useCallback(() => {
    frameRef.current?.pushMany(createFrameSpawns(6, "paced"), {
      pacing: { ratePerSec: 3 },
    })
    updateStats()
  }, [createFrameSpawns, updateStats])

  const pushBurst = useCallback(() => {
    frameRef.current?.pushMany(createFrameSpawns(30, "worker-burst"))
    updateStats()
  }, [createFrameSpawns, updateStats])

  const settle = useCallback(() => {
    const controls = frameRef.current
    if (!controls) return
    let snapshot = controls.snapshot()
    let guard = 0
    while (snapshot.queue.length > 0 && guard < 32) {
      controls.step(0.5)
      snapshot = controls.snapshot()
      guard += 1
    }
    controls.settleWithObservations()
    updateStats()
  }, [updateStats])

  const clear = useCallback(() => {
    frameRef.current?.clear()
    bodyCounterRef.current = 0
    setSelectedId(null)
    updateStats()
  }, [updateStats])

  const togglePaused = useCallback(() => {
    setPaused((value) => !value)
  }, [])

  useEffect(() => {
    updateStats()
  }, [executionState, paused, selectedId, updateStats])

  return (
    <section className="physics-sandbox__panel" data-testid="physics-stream-frame-sandbox">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>Frame API</h2>
        </div>
        <div className="physics-sandbox__controls">
          <button type="button" onClick={pushImmediate}>
            Push 6
          </button>
          <button type="button" onClick={pushPaced}>
            Pace 6
          </button>
          <button type="button" onClick={pushBurst}>
            Burst 30
          </button>
          <button type="button" onClick={togglePaused}>
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={settle}>
            Settle
          </button>
          <button type="button" onClick={clear}>
            Clear
          </button>
        </div>
      </div>
      <div className="physics-sandbox__control-row">
        <label>
          Execution
          <select value={executionMode} onChange={(event) => setExecutionMode(event.target.value)}>
            <option value="auto">auto</option>
            <option value="worker">worker</option>
            <option value="sync">sync</option>
          </select>
        </label>
        <label>
          Worker threshold
          <input
            min="1"
            max="2500"
            type="number"
            value={workerThreshold}
            onChange={(event) =>
              setWorkerThreshold(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </label>
      </div>
      <div className="physics-sandbox__stage physics-sandbox__stage--frame">
        <StreamPhysicsFrame
          ref={frameRef}
          size={[width, height]}
          title="StreamPhysicsFrame API sandbox"
          config={config}
          paused={paused}
          simulationExecution={executionMode}
          workerBodyThreshold={workerThreshold}
          selection={{
            isActive: selectedId != null,
            predicate: (body) => body.id === selectedId,
          }}
          bodyStyle={(body) => ({
            fill: body.datum?.kind === "paced" ? "#59a14f" : "#4e79a7",
            stroke: "#111827",
            strokeWidth: body.id === selectedId ? 2 : 1,
          })}
          onBodyPointerDown={(body) => {
            setSelectedId(body?.id ?? null)
          }}
          onSimulationExecutionChange={setExecutionState}
          onTick={(_result, controls) => {
            updateStats(controls)
          }}
        />
      </div>
      <div className="physics-sandbox__stats physics-sandbox__stats--eight">
        <div>
          <strong>{stats.live}</strong>
          <span>live</span>
        </div>
        <div>
          <strong>{stats.queued}</strong>
          <span>queued</span>
        </div>
        <div>
          <strong>{stats.selected}</strong>
          <span>selected</span>
        </div>
        <div>
          <strong>{stats.snapshot}</strong>
          <span>snapshot</span>
        </div>
        <div>
          <strong>{stats.state}</strong>
          <span>state</span>
        </div>
        <div>
          <strong>{stats.time}</strong>
          <span>clock</span>
        </div>
        <div>
          <strong>{stats.runtime}</strong>
          <span>runtime</span>
        </div>
        <div>
          <strong>{executionState.reason ?? executionState.requested}</strong>
          <span>execution</span>
        </div>
      </div>
    </section>
  )
}

function HocGallerySandbox() {
  const customRef = useRef(null)
  const customCounterRef = useRef(12)
  const [customStatus, setCustomStatus] = useState("ready")
  const galtonData = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: `sample-${index}`,
        value: 20 + ((index * 17) % 61),
        group: index % 3 === 0 ? "forecast" : "observed",
      })),
    [],
  )
  const eventData = useMemo(
    () => [
      { id: "e0", time: 2, arrivalTime: 3, source: "a" },
      { id: "e1", time: 8, arrivalTime: 11, source: "b" },
      { id: "e2", time: 15, arrivalTime: 16, source: "a" },
      { id: "e3", time: 18, arrivalTime: 29, source: "c" },
      { id: "e4", time: 25, arrivalTime: 26, source: "b" },
      { id: "e5", time: 4, arrivalTime: 33, source: "late" },
    ],
    [],
  )
  const pileData = useMemo(
    () => [
      { id: "orders", category: "Orders", value: 6 },
      { id: "queue", category: "Queue", value: 4 },
      { id: "done", category: "Done", value: 9 },
    ],
    [],
  )
  const customData = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const routes = ["left", "center", "right"]
        const route = routes[index % routes.length]
        return {
          id: `packet-${index}`,
          route,
          priority: index % 4 === 0 ? "rush" : "normal",
        }
      }),
    [],
  )
  const customLayout = useCallback((ctx) => {
    const { plot, width, height } = ctx.dimensions
    const laneKeys = ["left", "center", "right"]
    const laneWidth = plot.width / laneKeys.length
    const laneX = (route) => {
      const laneIndex = Math.max(0, laneKeys.indexOf(route))
      return plot.x + laneWidth * laneIndex + laneWidth / 2
    }
    const bodies = ctx.data.map((datum, index) => {
      const jitter = (ctx.world.nextRandom() - 0.5) * 18
      return {
        id: datum.id,
        x: laneX(datum.route) + jitter,
        y: plot.y + 8 + (index % 5) * 2,
        vx: (ctx.world.nextRandom() - 0.5) * 44,
        vy: 0,
        mass: datum.priority === "rush" ? 1.4 : 1,
        shape: { type: "circle", radius: datum.priority === "rush" ? 6 : 5 },
        datum,
      }
    })
    const sensorY = plot.y + plot.height - 30
    const sensors = laneKeys.map((lane, index) => ({
      id: `custom-sensor-${lane}`,
      shape: {
        type: "aabb",
        x: plot.x + laneWidth * index + laneWidth / 2,
        y: sensorY,
        width: laneWidth - 12,
        height: 20,
      },
    }))

    return {
      bodies,
      sensors,
      colliders: [
        ...collidersFromPlotBounds(plot, {
          idPrefix: "custom",
          wallThickness: 14,
          floorThickness: 16,
          includeCeiling: true,
        }),
        {
          id: "custom-left-deflector",
          restitution: 0.35,
          shape: {
            type: "segment",
            x1: plot.x + plot.width * 0.5,
            y1: plot.y + 48,
            x2: plot.x + plot.width * 0.24,
            y2: plot.y + 96,
            thickness: 8,
          },
        },
        {
          id: "custom-right-deflector",
          restitution: 0.35,
          shape: {
            type: "segment",
            x1: plot.x + plot.width * 0.5,
            y1: plot.y + 48,
            x2: plot.x + plot.width * 0.76,
            y2: plot.y + 96,
            thickness: 8,
          },
        },
      ],
      config: {
        fixedDt: FIXED_DT,
        maxSubsteps: 8,
        observation: {
          chartType: "PhysicsCustomChart",
          sensors: Object.fromEntries(
            laneKeys.map((lane) => [
              `custom-sensor-${lane}`,
              {
                binId: `${lane} lane`,
                enterType: "physics-proximity-enter",
                exitType: "physics-proximity-exit",
              },
            ]),
          ),
        },
        kernel: {
          seed: 91,
          gravity: { x: 0, y: 680 },
          cellSize: 30,
          collisionIterations: 3,
          velocityDamping: 0.998,
          restitution: 0.18,
          friction: 0.12,
          sleepSpeed: 9,
          sleepAfter: 0.35,
        },
      },
      overlays: (
        <svg
          className="physics-sandbox__custom-overlay"
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          {sensors.map((sensor, index) => (
            <g key={sensor.id}>
              <rect
                x={sensor.shape.x - sensor.shape.width / 2}
                y={sensor.shape.y - sensor.shape.height / 2}
                width={sensor.shape.width}
                height={sensor.shape.height}
                rx="4"
              />
              <text x={plot.x + laneWidth * index + laneWidth / 2} y={sensorY + 5}>
                {laneKeys[index]}
              </text>
            </g>
          ))}
          <path
            d={`M ${plot.x + plot.width * 0.5} ${plot.y + 48} L ${plot.x + plot.width * 0.24} ${plot.y + 96}`}
          />
          <path
            d={`M ${plot.x + plot.width * 0.5} ${plot.y + 48} L ${plot.x + plot.width * 0.76} ${plot.y + 96}`}
          />
        </svg>
      ),
    }
  }, [])
  const pushCustomPacket = useCallback(() => {
    const routes = ["left", "center", "right"]
    const index = customCounterRef.current
    customCounterRef.current += 1
    const route = routes[index % routes.length]
    customRef.current?.push({
      id: `packet-${index}`,
      route,
      priority: index % 4 === 0 ? "rush" : "normal",
    })
    setCustomStatus(`${route} packet pushed`)
  }, [])

  return (
    <section className="physics-sandbox__panel" data-testid="physics-hoc-gallery">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>M3 chart HOCs</h2>
        </div>
      </div>
      <div className="physics-sandbox__hoc-grid">
        <div>
          <h3>GaltonBoardChart</h3>
          <GaltonBoardChart
            data={galtonData}
            valueAccessor="value"
            colorBy="group"
            bins={9}
            ballRadius={4}
            seed={11}
            size={[280, 190]}
          />
        </div>
        <div>
          <h3>EventDropChart</h3>
          <EventDropChart
            data={eventData}
            timeAccessor="time"
            arrivalAccessor="arrivalTime"
            colorBy="source"
            windows={{ size: 10 }}
            watermark={{ delay: 8 }}
            timeScale={0.05}
            size={[280, 190]}
          />
        </div>
        <div>
          <h3>PhysicsPileChart</h3>
          <PhysicsPileChart
            data={pileData}
            categoryAccessor="category"
            valueAccessor="value"
            colorBy="category"
            unitValue={1}
            ballRadius={5}
            seed={23}
            size={[280, 190]}
          />
        </div>
        <div>
          <div className="physics-sandbox__hoc-card-head">
            <h3>PhysicsCustomChart</h3>
            <button type="button" onClick={pushCustomPacket}>
              Push packet
            </button>
          </div>
          <PhysicsCustomChart
            ref={customRef}
            data={customData}
            layout={customLayout}
            colorBy="route"
            size={[280, 190]}
            title="Custom route sorter"
            frameProps={{
              workerBodyThreshold: 18,
            }}
          />
          <div className="physics-sandbox__hoc-status">{customStatus}</div>
        </div>
      </div>
    </section>
  )
}

function EngineAdapterSandbox() {
  const capabilities = useMemo(
    () => createDefaultPhysicsEngineAdapter().capabilities,
    [],
  )
  const conformance = useMemo(() => {
    const factory = (options) => createDefaultPhysicsEngineAdapter(options)
    const expected = runPhysicsEngineConformance(factory, { determinism: "strict" })
    const actual = runPhysicsEngineConformance(factory, { determinism: "strict" })
    const failures = comparePhysicsEngineConformance(actual, expected, {
      determinism: "strict",
    })
    return {
      failures,
      bodyCount: actual.deterministicReplay.length,
      sensorEvents: actual.sensorEvents.length,
    }
  }, [])
  const adapterConfig = useMemo(
    () => ({
      engine: (options) => createDefaultPhysicsEngineAdapter(options),
      fixedDt: FIXED_DT,
      bodyLimit: 8,
      colliders: collidersFromPlotBounds(
        { x: 24, y: 18, width: 232, height: 136 },
        { idPrefix: "adapter", wallThickness: 14 },
      ),
      kernel: {
        seed: 41,
        gravity: { x: 0, y: 620 },
        velocityDamping: 0.998,
        collisionIterations: 3,
        sleepSpeed: 10,
        sleepAfter: 0.4,
      },
    }),
    [],
  )
  const adapterSpawns = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        id: `adapter-${index}`,
        x: 82 + index * 28,
        y: 26,
        vx: (index - 2) * 12,
        vy: 0,
        mass: 1,
        shape: { type: "circle", radius: 6 },
        spawnAt: 0,
        datum: { label: `Adapter body ${index + 1}` },
      })),
    [],
  )

  return (
    <section className="physics-sandbox__panel" data-testid="physics-engine-adapter-sandbox">
      <div className="physics-sandbox__panel-head">
        <div>
          <h2>M4 engine adapter</h2>
          <p>Factory-backed frame using the public adapter contract.</p>
        </div>
      </div>
      <div className="physics-sandbox__adapter-grid">
        <div className="physics-sandbox__stats physics-sandbox__stats--five">
          <div>
            <strong>{capabilities.engine}</strong>
            <span>engine</span>
          </div>
          <div>
            <strong>{capabilities.determinism}</strong>
            <span>determinism</span>
          </div>
          <div>
            <strong>{capabilities.sensors ? "yes" : "no"}</strong>
            <span>sensors</span>
          </div>
          <div>
            <strong>{capabilities.worker ? "yes" : "no"}</strong>
            <span>worker</span>
          </div>
          <div>
            <strong>{capabilities.maxBodiesHint}</strong>
            <span>body hint</span>
          </div>
        </div>
        <div className="physics-sandbox__adapter-proof">
          <strong>{conformance.failures.length === 0 ? "pass" : "fail"}</strong>
          <span>conformance tape</span>
          <em>
            {conformance.bodyCount} bodies · {conformance.sensorEvents} sensor events
          </em>
        </div>
        <div className="physics-sandbox__adapter-frame">
          <h3>Custom factory</h3>
          <StreamPhysicsFrame
            config={adapterConfig}
            initialSpawns={adapterSpawns}
            size={[280, 190]}
            bodyStyle={{ fill: "#4e79a7", stroke: "#111827", strokeWidth: 1 }}
            title="Factory-backed physics adapter"
          />
        </div>
      </div>
    </section>
  )
}

function ProjectionTable({ columns, secondaryLabel = "secondary" }) {
  const max = Math.max(1, ...columns.map((column) => column.value))
  return (
    <div className="physics-sandbox__projection" aria-label="Settled projection table">
      {columns.map((column) => (
        <div className="physics-sandbox__projection-cell" key={column.label}>
          <span
            className="physics-sandbox__projection-bar"
            style={{ height: `${Math.max(4, (column.value / max) * 72)}px` }}
          />
          <strong>{column.value}</strong>
          <span>{column.label}</span>
          {column.secondary ? (
            <em>
              {column.secondary} {secondaryLabel}
            </em>
          ) : null}
          {column.sensor ? <em>{column.sensor} entered</em> : null}
        </div>
      ))}
    </div>
  )
}

export default function PhysicsFrameSandboxPage() {
  return (
    <main className="physics-sandbox">
      <header className="physics-sandbox__hero">
        <p className="physics-sandbox__eyebrow">Internal M0 sandbox</p>
        <h1>StreamPhysicsFrame mechanics</h1>
        <p>
          Kernel-driven prototypes for the two proof cases in the plan: watermark lateness and a
          data-true Galton board.
        </p>
      </header>
      <WatermarkSandbox />
      <GaltonSandbox />
      <HocGallerySandbox />
      <EngineAdapterSandbox />
      <StoreControlsSandbox />
      <FrameApiSandbox />
    </main>
  )
}
