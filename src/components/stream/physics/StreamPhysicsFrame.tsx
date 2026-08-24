"use client"

import * as React from "react"
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useRef
} from "react"
import type { FrameMargin } from "../useFrame"
import { useFrame } from "../useFrame"
import { useHydration, useWasHydratingFromSSR } from "../useHydration"
import {
  CanvasFrameBackground,
  useFrameCanvasHost
} from "../useCanvasFrameHost"
import { isServerEnvironment } from "../isServerEnvironment"
import { getDevicePixelRatio, prepareCanvas, subscribeToCanvasFontInvalidation } from "../canvasSetup"
import { FlippingTooltip } from "../../Tooltip/FlippingTooltip"
import {
  createPhysicsCanvasThemeCache,
  physicsCanvasColorWithAlpha,
  physicsCanvasThemeCSSValue
} from "./PhysicsCanvasTheme"
import { resolveCanvasPaint } from "../renderers/canvasRenderHelpers"
import {
  PhysicsSVGOverlay,
  bodiesToAnnotationAnchors,
  type PhysicsAnnotationAnchorNode
} from "./PhysicsSVGOverlay"
import type { PhysicsBodyState } from "./PhysicsKernel"
import {
  PhysicsWorkerSession,
  canUsePhysicsWorker
} from "./PhysicsWorkerClient"
import {
  PhysicsPipelineStore,
  type PhysicsObservationEvent,
  type PhysicsPipelineSnapshot,
  type PhysicsPipelineTickResult
} from "./PhysicsPipelineStore"
import {
  createPhysicsFrameStore,
  defaultPhysicsFrameClock
} from "./physicsFrameSetup"
import { createPhysicsSettledSVG } from "./PhysicsSettledSVGElement"
import type { PhysicsSettledBodyStyleContext } from "./PhysicsSettledScene"
import { renderPhysicsSettledChrome } from "./physicsSettledChrome"
import { composePhysicsControllers } from "./PhysicsControllers"
import {
  DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD,
  isPhysicsWorkerConfigSupported,
  isPhysicsWorkerPacingSupported,
  shouldUsePhysicsWorker,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"
import {
  isPhysicsDocumentVisible,
  usePhysicsFrameLifecyclePolicy
} from "./usePhysicsFrameLifecyclePolicy"
import { FocusRing } from "../FocusRing"
import {
  SceneRevisionDiagnosticsObserver,
  useSceneRevisionDiagnostics
} from "../sceneRevisionDiagnostics"
import {
  AccessibleTablePortal,
  AriaLiveTooltip,
  ScreenReaderSummary,
  SkipToTableLink
} from "../AccessibleDataTable"
import {
  drawBody,
  drawPopAnimations,
  physicsBodyRadius,
  type StreamPhysicsPopAnimation
} from "./physicsBodyCanvas"
import {
  cloneRegionStateSnapshot,
  ensureInternalRegionState,
  mergeRegionAttributes,
  publicRegionState,
  regionSensorId,
  regionToSemanticItem,
  regionRuntimeEffectsRequireSync,
  resolveRegionCharge,
  resolveRegionVector,
  resolveStyle,
  runPhysicsPostTick,
  runPhysicsReducedMotionPasses,
  type InternalStreamPhysicsBodyRegionState,
  type PhysicsPostTickOutcome
} from "./physicsRegionRuntime"
import type {
  PhysicsCanvasPaintContext,
  PhysicsSemanticItem,
  StreamPhysicsBodyForce,
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEffectContext,
  StreamPhysicsRegionEvent,
  StreamPhysicsRegionVector
} from "./StreamPhysicsTypes"
import { usePhysicsFrameObservationEmitter } from "./physicsFrameObservations"
import { resolvePhysicsFramePipelineConfig } from "./physicsFramePipelineConfig"
import { usePhysicsCanvasPointer } from "./usePhysicsCanvasPointer"
import { usePhysicsSemanticNavigation } from "./usePhysicsSemanticNavigation"

export type {
  PhysicsBodyMark,
  StreamPhysicsPopOptions
} from "./physicsBodyCanvas"
export type {
  PhysicsBodySelection,
  PhysicsBodySemanticItemAccessor,
  PhysicsBodySemanticItemContext,
  PhysicsBodyStyleContext,
  PhysicsCanvasPaintContext,
  PhysicsHoverData,
  PhysicsSemanticItem,
  StreamPhysicsBodyForce,
  StreamPhysicsBodyForceContext,
  StreamPhysicsBodyRegionState,
  StreamPhysicsExecutionState,
  StreamPhysicsFrameHandle,
  StreamPhysicsFrameProps,
  StreamPhysicsRegionEffect,
  StreamPhysicsRegionEffectContext,
  StreamPhysicsRegionEvent,
  StreamPhysicsRegionKind,
  StreamPhysicsRegionVector
} from "./StreamPhysicsTypes"

import {
  DefaultPhysicsTooltip,
  PhysicsSemanticDataTable,
  SR_ONLY_STYLE
} from "./physicsSemanticUI"

const DEFAULT_SIZE: [number, number] = [640, 360]
const DEFAULT_MARGIN: FrameMargin = { top: 0, right: 0, bottom: 0, left: 0 }
const CHART_TYPE = "StreamPhysicsFrame"
const SETTLED_THEME_BACKGROUND = physicsCanvasThemeCSSValue("background")
const SETTLED_THEME_PRIMARY = physicsCanvasThemeCSSValue("primary")
const SETTLED_THEME_TEXT = physicsCanvasThemeCSSValue("text")
const DEFAULT_SELECTED_BODY_STYLE = {
  stroke: SETTLED_THEME_TEXT,
  strokeWidth: 2,
  opacity: 1
}

export const StreamPhysicsFrame = memo(
  forwardRef<StreamPhysicsFrameHandle, StreamPhysicsFrameProps>(
    function StreamPhysicsFrame(props, ref) {
      const {
        accessibleTable = true,
        annotations,
        onAnnotationActivate,
        autoPlaceAnnotations,
        background,
        backgroundGraphics,
        backgroundGraphicsBackdrop,
        maxDevicePixelRatio,
        bodySemanticItemLimit = 200,
        bodySemanticItems = false,
        bodySemanticUpdateMs = 200,
        bodyForces,
        bodyStyle,
        chartId,
        className,
        frameScheduler,
        clock,
        random,
        seed,
        color,
        config,
        controllers,
        continuous = false,
        description,
        emphasis,
        chartMode,
        enableHover = true,
        foregroundGraphics,
        hoverRadius = 16,
        initialSpawns,
        initialSpawnPacing,
        legend,
        legendClickBehavior,
        legendHighlightedCategory,
        legendHoverBehavior,
        legendIsolatedCategories,
        legendLayout,
        legendPosition,
        margin: marginProp,
        onClick,
        onObservation,
        onRegionEvent,
        onSimulationExecutionChange,
        onBodyHover,
        onBodyPointerDown,
        onSemanticItemActivate,
        onSemanticItemFocus,
        onTick,
        opacity,
        paused = false,
        regionEffects = [],
        responsiveHeight,
        responsiveWidth,
        selectedBodyStyle = DEFAULT_SELECTED_BODY_STYLE,
        selection,
        semanticItems = [],
        simulationExecution = "auto",
        size: sizeProp = DEFAULT_SIZE,
        stroke,
        strokeWidth,
        summary,
        suspendWhenHidden = true,
        svgAnnotationRules,
        title,
        tooltipContent,
        workerBodyThreshold = DEFAULT_PHYSICS_WORKER_BODY_THRESHOLD,
        renderBody: renderBodyProp,
        beforePaint,
        afterPaint
      } = props
      const stylePrimitives = React.useMemo(
        () => ({ color, stroke, strokeWidth, opacity }),
        [color, opacity, stroke, strokeWidth]
      )
      const onObservationRef = useRef(onObservation)
      onObservationRef.current = onObservation
      const chartIdRef = useRef(chartId)
      chartIdRef.current = chartId

      const regionStateRef = useRef<
        Map<string, InternalStreamPhysicsBodyRegionState>
      >(new Map())
      const regionEffectsRef = useRef(regionEffects)
      regionEffectsRef.current = regionEffects
      const bodyForcesRef = useRef(bodyForces)
      const onTickRef = useRef(onTick)
      onTickRef.current = onTick
      const composedControllers = React.useMemo(
        () => composePhysicsControllers(controllers),
        [controllers]
      )
      const composedControllersRef = useRef(composedControllers)
      composedControllersRef.current = composedControllers
      const continuousEffective =
        continuous || Boolean(composedControllers?.continuous)
      const continuousRef = useRef(continuousEffective)
      continuousRef.current = continuousEffective

      const composedBodyForces = React.useMemo<
        StreamPhysicsBodyForce | undefined
      >(() => {
        if (!bodyForces && !composedControllers?.bodyForce) return bodyForces
        if (!composedControllers?.bodyForce) return bodyForces
        if (!bodyForces) return composedControllers.bodyForce
        const controllerForce = composedControllers.bodyForce
        return (context) => {
          const a =
            typeof bodyForces === "function" ? bodyForces(context) : bodyForces
          const b =
            typeof controllerForce === "function"
              ? controllerForce(context)
              : controllerForce
          if (!a && !b) return null
          return {
            x: (a?.x ?? 0) + (b?.x ?? 0),
            y: (a?.y ?? 0) + (b?.y ?? 0)
          }
        }
      }, [bodyForces, composedControllers])
      bodyForcesRef.current = composedBodyForces

      const regionBySensorId = React.useMemo(() => {
        return new Map(
          regionEffects.map((region) => [regionSensorId(region), region])
        )
      }, [regionEffects])
      const regionById = React.useMemo(() => {
        return new Map(regionEffects.map((region) => [region.id, region]))
      }, [regionEffects])
      const regionSemanticItems = React.useMemo(
        () =>
          regionEffects
            .map(regionToSemanticItem)
            .filter((item): item is PhysicsSemanticItem => item != null),
        [regionEffects]
      )
      const [bodySemanticItemsSnapshot, setBodySemanticItemsSnapshot] =
        React.useState<PhysicsSemanticItem[]>([])
      const allSemanticItems = React.useMemo(
        () =>
          bodySemanticItemsSnapshot.length || regionSemanticItems.length
            ? [
                ...semanticItems,
                ...bodySemanticItemsSnapshot,
                ...regionSemanticItems
              ]
            : semanticItems,
        [bodySemanticItemsSnapshot, regionSemanticItems, semanticItems]
      )
      const hasRuntimeRegionEffects = React.useMemo(
        () => regionRuntimeEffectsRequireSync(regionEffects),
        [regionEffects]
      )
      const hasRuntimeBodyForces = Boolean(composedBodyForces)
      const storeRef = useRef<PhysicsPipelineStore | null>(null)
      const wallClockRef = useRef<() => number>(
        clock ?? defaultPhysicsFrameClock
      )
      wallClockRef.current = clock ?? defaultPhysicsFrameClock

      const applyRegionImpulse = useCallback(
        (
          bodyId: string,
          region: StreamPhysicsRegionEffect,
          vector:
            | StreamPhysicsRegionVector
            | ((
                context: StreamPhysicsRegionEffectContext
              ) => StreamPhysicsRegionVector | null | undefined)
            | undefined
        ) => {
          const store = storeRef.current
          if (!store || !vector) return false
          const body = store
            .readBodies()
            .find((candidate) => candidate.id === bodyId)
          const internalState = regionStateRef.current.get(bodyId)
          const regionState = publicRegionState(internalState)
          if (!body || !regionState) return false
          const resolved = resolveRegionVector(vector, {
            body,
            region,
            regionState
          })
          if (!resolved || (!resolved.x && !resolved.y)) return false
          store.applyImpulse(bodyId, resolved.x ?? 0, resolved.y ?? 0)
          return true
        },
        []
      )

      const emitRegionEvent = useCallback(
        (
          type: StreamPhysicsRegionEvent["type"],
          region: StreamPhysicsRegionEffect,
          observation: PhysicsObservationEvent
        ) => {
          if (!observation.bodyId) return
          const publicState = publicRegionState(
            regionStateRef.current.get(observation.bodyId)
          )
          if (!publicState) return
          const event: StreamPhysicsRegionEvent = {
            bodyId: observation.bodyId,
            datum: observation.datum,
            observation,
            region,
            regionState: publicState,
            type
          }
          if (type === "region-enter") region.onEnter?.(event)
          else region.onExit?.(event)
          onRegionEvent?.(event)
        },
        [onRegionEvent]
      )

      const handleRegionObservation = useCallback(
        (event: PhysicsObservationEvent) => {
          const region = event.sensorId
            ? regionBySensorId.get(event.sensorId)
            : undefined
          if (!region || !event.bodyId) return
          const internalState = ensureInternalRegionState(
            regionStateRef.current,
            event.bodyId
          )
          const body = storeRef.current
            ?.readBodies()
            .find((candidate) => candidate.id === event.bodyId)
          const publicStateBefore = publicRegionState(internalState)
          const context =
            body && publicStateBefore
              ? { body, region, regionState: publicStateBefore }
              : null

          if (event.type === "physics-proximity-enter") {
            internalState.activeRegionIds.add(region.id)
            internalState.regionIds.add(region.id)
            internalState.energy += region.energyDelta ?? 0
            if (context) {
              mergeRegionAttributes(region, context, internalState)
              const charge = resolveRegionCharge(region, context)
              if (charge !== undefined)
                internalState.charges[region.id] = charge
            }
            applyRegionImpulse(event.bodyId, region, region.impulseOnEnter)
            emitRegionEvent("region-enter", region, event)
          } else if (event.type === "physics-proximity-exit") {
            internalState.activeRegionIds.delete(region.id)
            applyRegionImpulse(event.bodyId, region, region.impulseOnExit)
            emitRegionEvent("region-exit", region, event)
          }
        },
        [applyRegionImpulse, emitRegionEvent, regionBySensorId]
      )

      const dirtyRef = useRef(true)
      const frame = useFrame({
        sizeProp,
        responsiveWidth,
        responsiveHeight,
        userMargin: marginProp,
        marginDefault: DEFAULT_MARGIN,
        legend,
        legendPosition,
        legendLayout,
        themeDirtyRef: dirtyRef,
        skipInitialThemeInvalidation: true,
        foregroundGraphics,
        backgroundGraphics,
        frameScheduler,
        clock,
        random,
        seed,
        paused,
        suspendWhenHidden
      })
      const {
        margin,
        rafRef,
        reducedMotion,
        reducedMotionRef,
        renderFnRef,
        cancelRender,
        resolvedBackground,
        resolvedForeground,
        responsiveRef,
        scheduleRender,
        size,
        frameRuntime
      } = frame

      useEffect(() => subscribeToCanvasFontInvalidation(() => {
        dirtyRef.current = true
        scheduleRender()
      }), [scheduleRender])

      const frameWidth = size[0]
      const frameHeight = size[1]
      const plotWidth = Math.max(1, frameWidth - margin.left - margin.right)
      const plotHeight = Math.max(1, frameHeight - margin.top - margin.bottom)

      const augmentedConfig = React.useMemo(
        () =>
          resolvePhysicsFramePipelineConfig({
            annotations,
            chartId,
            chartType: CHART_TYPE,
            config,
            onRegionObservation: handleRegionObservation,
            regionEffects,
            seed,
            size: [plotWidth, plotHeight]
          }),
        [
          annotations,
          chartId,
          config,
          handleRegionObservation,
          regionEffects,
          seed,
          plotWidth,
          plotHeight
        ]
      )
      const hadConfiguredCollidersRef = useRef(
        augmentedConfig?.colliders !== undefined
      )

      if (!storeRef.current) {
        const store = createPhysicsFrameStore(
          augmentedConfig,
          initialSpawns,
          initialSpawnPacing
        )
        store.setPaused(paused)
        if (suspendWhenHidden) store.setVisible(isPhysicsDocumentVisible())
        storeRef.current = store
      }

      const lastFrameTimeRef = useRef<number | null>(null)
      const themeCacheRef = useRef<ReturnType<
        typeof createPhysicsCanvasThemeCache
      > | null>(null)
      if (!themeCacheRef.current) {
        themeCacheRef.current = createPhysicsCanvasThemeCache()
      }
      const sceneRevisionDiagnosticsRef =
        useSceneRevisionDiagnostics("StreamPhysicsFrame")
      const executionStateKeyRef = useRef("")
      const svgInstanceId = useId().replace(/:/g, "")
      const workerActiveRef = useRef(false)
      const workerFailedRef = useRef(false)
      const workerGenerationRef = useRef(0)
      const workerPendingRef = useRef(false)
      const workerRenderRequestedRef = useRef(false)
      const workerSessionRef = useRef<PhysicsWorkerSession | null>(null)
      const workerStartingRef = useRef(false)
      const logicalClockRef = useRef<() => number>(frameRuntime.now)
      logicalClockRef.current = frameRuntime.now
      const hydrated = useHydration()
      const wasHydratingFromSSR = useWasHydratingFromSSR()
      const popAnimationsRef = useRef(
        new Map<string, StreamPhysicsPopAnimation>()
      )
      const liveRegionId = `${svgInstanceId}-physics-live`
      const emitObservation = usePhysicsFrameObservationEmitter({
        onObservationRef,
        chartIdRef,
        wallClockRef
      })
      const {
        clearHover,
        focusedBodyIdRef,
        focusedSemanticItem,
        handleCanvasPointerDown,
        hoverData,
        onKeyDown,
        setFocusedSemanticItem,
        setHoverData,
        syncBodySemanticItems
      } = usePhysicsSemanticNavigation({
        allSemanticItems,
        bodySemanticItemLimit,
        bodySemanticItems,
        bodySemanticUpdateMs,
        emitObservation,
        enableHover,
        hoverRadius,
        logicalClockRef,
        onBodyHover,
        onBodyPointerDown,
        onClick,
        onSemanticItemActivate,
        onSemanticItemFocus,
        setBodySemanticItemsSnapshot,
        storeRef
      })

      const [annotationAnchors, setAnnotationAnchors] = React.useState<
        PhysicsAnnotationAnchorNode[]
      >([])
      const lastAnnotationAnchorUpdateRef = useRef(0)
      const needsLiveAnnotationAnchors =
        Boolean(annotations?.length) &&
        annotations!.some(
          (ann) =>
            ann.pointId != null || ann.bodyId != null || ann.anchor === "latest"
        )

      const { canvasRef, resolutionDirtyRef } = useFrameCanvasHost(frame, {
        hydrated,
        wasHydratingFromSSR,
        storeRef,
        dirtyRef,
        manageFrameRuntime: false,
        skipInitialCanvasPaintInvalidation: true,
        maxDevicePixelRatio,
        // Physics always paints via its own loop; resolutionDirty covers zoom/DPR
        // without a full dirty rebuild. maxDevicePixelRatio is host-owned.
        canvasPaintDependencies: [
          background,
          backgroundGraphics,
          scheduleRender
        ]
      })
      const physicsCanvasPointer = usePhysicsCanvasPointer({
        canvasRef,
        clearHover,
        emitObservation,
        enableHover,
        hoverRadius,
        onBodyHover,
        setHoverData,
        storeRef
      })

      const paint = useCallback(() => {
        const canvas = canvasRef.current
        const store = storeRef.current
        if (!canvas || !store) return
        const sceneRevisionCheck =
          sceneRevisionDiagnosticsRef.current.beforeCompute(
            store.getLastUpdateResult(),
            false
          )
        // Consume resolution dirty (browser zoom) so a paint-only invalidation
        // does not stick; physics paint always re-rasterizes when scheduled.
        resolutionDirtyRef.current = false
        const dpr = getDevicePixelRatio(maxDevicePixelRatio)
        const ctx = prepareCanvas(canvas, size, margin, dpr)
        if (!ctx) {
          sceneRevisionDiagnosticsRef.current.afterCompute(
            sceneRevisionCheck,
            false,
            false
          )
          return
        }

        const theme = themeCacheRef.current!.resolve(ctx)
        const paintContext: PhysicsCanvasPaintContext = {
          theme,
          resolvePaint: (paint, fallback) =>
            resolveCanvasPaint(ctx, paint, fallback),
          withAlpha: physicsCanvasColorWithAlpha
        }
        ctx.clearRect(-margin.left, -margin.top, size[0], size[1])
        if (!backgroundGraphics && background !== "transparent") {
          ctx.fillStyle =
            background == null
              ? theme.background
              : paintContext.resolvePaint(background, theme.background)
          ctx.fillRect(-margin.left, -margin.top, size[0], size[1])
        }
        // Physics bodies render in plot-local coordinates just like the other
        // frame families. Keep that scene inside the legend/title-reserved
        // rectangle rather than letting a direct-frame legend paint over it.
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, plotWidth, plotHeight)
        ctx.clip()

        const snapshot = store.snapshot()
        const bodies = store.readBodies()
        const bodyCursors = physicsCanvasPointer.begin()
        syncBodySemanticItems(bodies, snapshot.simulationState)
        if (needsLiveAnnotationAnchors) {
          const now = logicalClockRef.current()
          if (now - lastAnnotationAnchorUpdateRef.current >= 100) {
            lastAnnotationAnchorUpdateRef.current = now
            const next = bodiesToAnnotationAnchors(bodies)
            setAnnotationAnchors((prev) => {
              if (
                prev.length === next.length &&
                prev.every(
                  (row, i) =>
                    row.pointId === next[i].pointId &&
                    Math.round(row.x) === Math.round(next[i].x) &&
                    Math.round(row.y) === Math.round(next[i].y)
                )
              ) {
                return prev
              }
              return next
            })
          }
        }
        if (beforePaint) {
          ctx.save()
          beforePaint(ctx, bodies, paintContext)
          ctx.restore()
        }
        for (const body of bodies) {
          const internalRegionState = regionStateRef.current.get(body.id)
          const activeRegions = internalRegionState
            ? Array.from(internalRegionState.activeRegionIds)
                .map((id) => regionById.get(id))
                .filter(
                  (region): region is StreamPhysicsRegionEffect =>
                    region != null
                )
            : []
          const style = resolveStyle(
            body,
            snapshot.simulationState,
            bodyStyle,
            selectedBodyStyle,
            selection,
            publicRegionState(internalRegionState),
            activeRegions,
            theme.primary,
            theme.text,
            stylePrimitives
          )
          physicsCanvasPointer.collect(
            bodyCursors,
            body,
            style,
            !!renderBodyProp
          )
          if (renderBodyProp) {
            ctx.save()
            renderBodyProp(ctx, body, style, paintContext)
            ctx.restore()
          } else {
            drawBody(ctx, body, style)
          }
        }
        physicsCanvasPointer.syncBodyCursors(canvas, store, bodyCursors)
        if (afterPaint) {
          ctx.save()
          afterPaint(ctx, bodies, paintContext)
          ctx.restore()
        }
        drawPopAnimations(
          ctx,
          popAnimationsRef.current,
          logicalClockRef.current()
        )
        ctx.restore()
        sceneRevisionDiagnosticsRef.current.afterCompute(
          sceneRevisionCheck,
          true,
          false
        )
        dirtyRef.current = false
      }, [
        canvasRef,
        resolutionDirtyRef,
        sceneRevisionDiagnosticsRef,
        size,
        margin,
        plotWidth,
        plotHeight,
        backgroundGraphics,
        background,
        maxDevicePixelRatio,
        syncBodySemanticItems,
        needsLiveAnnotationAnchors,
        beforePaint,
        afterPaint,
        bodyStyle,
        selectedBodyStyle,
        selection,
        stylePrimitives,
        renderBodyProp,
        regionById,
        physicsCanvasPointer
      ])

      const reportExecutionState = useCallback(
        (execution: "sync" | "worker", reason?: string) => {
          const store = storeRef.current
          const key = `${simulationExecution}:${execution}:${reason ?? ""}`
          if (executionStateKeyRef.current === key) return
          executionStateKeyRef.current = key
          onSimulationExecutionChange?.({
            execution,
            liveBodies: store?.liveBodyCount() ?? 0,
            queuedBodies: store?.queueSize() ?? 0,
            reason,
            requested: simulationExecution
          })
        },
        [onSimulationExecutionChange, simulationExecution]
      )

      const stopWorker = useCallback(
        (reason?: string, report = true) => {
          workerGenerationRef.current += 1
          workerActiveRef.current = false
          workerPendingRef.current = false
          workerRenderRequestedRef.current = false
          workerStartingRef.current = false
          workerSessionRef.current?.terminate()
          workerSessionRef.current = null
          if (report) reportExecutionState("sync", reason)
        },
        [reportExecutionState]
      )

      const workerUnsupportedReason = useCallback((): string | null => {
        if (!hydrated) return "hydrating"
        if (!canUsePhysicsWorker()) return "worker unavailable"
        if (hasRuntimeRegionEffects)
          return "runtime region effects require sync"
        if (hasRuntimeBodyForces) return "body forces require sync"
        if (composedControllers) return "physics controllers require sync"
        if (!isPhysicsWorkerConfigSupported(augmentedConfig ?? {})) {
          return "config is not worker-cloneable"
        }
        if (!isPhysicsWorkerPacingSupported(initialSpawnPacing)) {
          return "spawn pacing is not worker-cloneable"
        }
        if (workerFailedRef.current) return "worker fallback"
        return null
      }, [
        augmentedConfig,
        composedControllers,
        hasRuntimeBodyForces,
        hasRuntimeRegionEffects,
        hydrated,
        initialSpawnPacing
      ])

      const workerChoice = useCallback(() => {
        const store = storeRef.current
        const reason = workerUnsupportedReason()
        if (!store || reason) return { reason, useWorker: false }
        const liveBodies = store.liveBodyCount()
        const queuedBodies = store.queueSize()
        const useWorker = shouldUsePhysicsWorker(
          simulationExecution,
          liveBodies,
          queuedBodies,
          workerBodyThreshold
        )
        return {
          reason: useWorker
            ? simulationExecution === "worker"
              ? "forced worker"
              : "body threshold"
            : "below threshold",
          useWorker
        }
      }, [simulationExecution, workerBodyThreshold, workerUnsupportedReason])

      const applyWorkerFrame = useCallback((frame: PhysicsWorkerFrame) => {
        const store = storeRef.current
        if (!store || !frame.snapshot) return store
        store.restore(frame.snapshot)
        dirtyRef.current = true
        return store
      }, [])

      const finishWorkerFrame = useCallback(
        (frame: PhysicsWorkerFrame, notifyTick = true) => {
          const store = applyWorkerFrame(frame)
          if (!store) return
          if (notifyTick) onTick?.(frame.result, store.controls())
          paint()

          const latest = store.snapshot()
          const popAnimationsActive = popAnimationsRef.current.size > 0
          if (
            (frame.result.shouldContinue || popAnimationsActive) &&
            !latest.paused &&
            latest.visible &&
            !reducedMotionRef.current
          ) {
            scheduleRender()
          }
        },
        [applyWorkerFrame, onTick, paint, reducedMotionRef, scheduleRender]
      )

      const handleWorkerError = useCallback(
        (error: unknown) => {
          workerFailedRef.current = true
          const message = error instanceof Error ? error.message : String(error)
          stopWorker(`worker failed: ${message || "unknown error"}`)
        },
        [stopWorker]
      )

      const startWorkerIfNeeded = useCallback(() => {
        const store = storeRef.current
        if (!store) return false

        const choice = workerChoice()
        if (!choice.useWorker) {
          if (workerActiveRef.current || workerStartingRef.current) {
            stopWorker(choice.reason ?? "sync fallback")
          } else {
            reportExecutionState("sync", choice.reason ?? "sync")
          }
          return false
        }

        if (workerActiveRef.current || workerStartingRef.current) return true

        const session = workerSessionRef.current ?? new PhysicsWorkerSession()
        workerSessionRef.current = session
        workerStartingRef.current = true
        const generation = workerGenerationRef.current + 1
        workerGenerationRef.current = generation

        session
          .initFromSnapshot(augmentedConfig ?? {}, store.snapshot())
          .then((frame) => {
            if (workerGenerationRef.current !== generation) return
            workerStartingRef.current = false
            workerActiveRef.current = true
            workerFailedRef.current = false
            applyWorkerFrame(frame)
            reportExecutionState("worker", choice.reason ?? "worker")
            paint()
            const latest = storeRef.current?.snapshot()
            if (
              frame.result.shouldContinue &&
              latest &&
              !latest.paused &&
              latest.visible &&
              !reducedMotionRef.current
            ) {
              lastFrameTimeRef.current = null
              scheduleRender()
            }
          })
          .catch((error) => {
            if (workerGenerationRef.current !== generation) return
            handleWorkerError(error)
          })

        return true
      }, [
        applyWorkerFrame,
        augmentedConfig,
        handleWorkerError,
        paint,
        reducedMotionRef,
        reportExecutionState,
        scheduleRender,
        stopWorker,
        workerChoice
      ])

      const frameFromPayload = useCallback(
        (payload: PhysicsWorkerResponsePayload): PhysicsWorkerFrame | null => {
          if (payload.type === "frame" || payload.type === "removed") {
            return payload.frame
          }
          return null
        },
        []
      )

      const postWorkerCommand = useCallback(
        (command: PhysicsWorkerCommand, notifyTick = true) => {
          const session = workerSessionRef.current
          if (!session || !workerActiveRef.current) return
          const generation = workerGenerationRef.current
          session
            .request(command)
            .then((payload) => {
              if (workerGenerationRef.current !== generation) return
              const frame = frameFromPayload(payload)
              if (frame) finishWorkerFrame(frame, notifyTick)
            })
            .catch(handleWorkerError)
        },
        [finishWorkerFrame, frameFromPayload, handleWorkerError]
      )

      const requestRender = useCallback(() => {
        const store = storeRef.current
        if (!store) return
        const usingWorker = startWorkerIfNeeded()
        const snapshot = store.snapshot()
        const frameDrivenWork =
          continuousEffective ||
          hasRuntimeBodyForces ||
          hasRuntimeRegionEffects ||
          Boolean(composedControllers)
        if (
          snapshot.paused ||
          !snapshot.visible ||
          (!store.hasPendingWork() && !frameDrivenWork) ||
          reducedMotionRef.current
        ) {
          renderFnRef.current()
          return
        }
        if (usingWorker && workerStartingRef.current) return
        // Do NOT null lastFrameTime here. Pause/resume/visibility already reset
        // the clock; wiping it on every kick (React re-renders, push, config
        // patches) forces zero-delta ticks and stalls motion under thrash.
        scheduleRender()
      }, [
        composedControllers,
        continuousEffective,
        hasRuntimeBodyForces,
        hasRuntimeRegionEffects,
        reducedMotionRef,
        renderFnRef,
        scheduleRender,
        startWorkerIfNeeded
      ])

      const renderFrame = useCallback(() => {
        cancelRender()
        rafRef.current = null
        const store = storeRef.current
        if (!store) return

        // A reduced-motion settle does not advance from the RAF clock. Clear the
        // animated-path timestamp before both worker and sync settles so the first
        // frame after the preference is disabled resumes with a zero delta.
        const reducedMotionForFrame = reducedMotionRef.current
        if (reducedMotionForFrame) {
          lastFrameTimeRef.current = null
        }

        if (workerActiveRef.current && workerSessionRef.current) {
          if (workerPendingRef.current) {
            // A media-query change can arrive while the previous worker frame is
            // in flight. Remember the request so entering reduced motion still
            // settles, and leaving it still restarts the RAF path after the worker
            // response lands.
            workerRenderRequestedRef.current = true
            return
          }
          let deltaSeconds = 0
          if (!reducedMotionForFrame) {
            const now = logicalClockRef.current()
            deltaSeconds =
              lastFrameTimeRef.current !== null
                ? (now - lastFrameTimeRef.current) / 1000
                : 0
            lastFrameTimeRef.current = now
          }
          const session = workerSessionRef.current
          const generation = workerGenerationRef.current
          workerPendingRef.current = true
          const request = reducedMotionForFrame
            ? session.settle()
            : session.tick(deltaSeconds)
          request
            .then((frame) => {
              workerPendingRef.current = false
              const renderRequested = workerRenderRequestedRef.current
              workerRenderRequestedRef.current = false
              if (workerGenerationRef.current !== generation) return
              finishWorkerFrame(frame)
              if (renderRequested) requestRender()
            })
            .catch((error) => {
              workerPendingRef.current = false
              const renderRequested = workerRenderRequestedRef.current
              workerRenderRequestedRef.current = false
              if (workerGenerationRef.current !== generation) return
              handleWorkerError(error)

              const result = reducedMotionForFrame
                ? store.settleWithObservations()
                : store.tick(deltaSeconds)
              runPhysicsPostTick({
                store,
                result,
                regionEffects: regionEffectsRef.current,
                regionState: regionStateRef.current,
                bodyForces: bodyForcesRef.current,
                composed: composedControllersRef.current,
                onTick: onTickRef.current
              })
              paint()
              if (renderRequested) requestRender()
            })
          return
        }

        const composed = composedControllersRef.current
        const runPostTick = (result: PhysicsPipelineTickResult) =>
          runPhysicsPostTick({
            store,
            result,
            composed,
            regionEffects: regionEffectsRef.current,
            regionState: regionStateRef.current,
            bodyForces: bodyForcesRef.current,
            onTick: onTickRef.current
          })

        let outcome: PhysicsPostTickOutcome
        if (reducedMotionForFrame) {
          outcome = runPhysicsReducedMotionPasses(store, runPostTick)
        } else {
          const now = logicalClockRef.current()
          const last = lastFrameTimeRef.current
          lastFrameTimeRef.current = now
          const result = store.tick(last === null ? 0 : (now - last) / 1000)
          outcome = { ...runPostTick(result), result }
        }
        const {
          result,
          regionEffectsApplied,
          bodyForcesApplied,
          snapshot: latest
        } = outcome
        paint()

        const popAnimationsActive = popAnimationsRef.current.size > 0
        if (
          (continuousRef.current ||
            result.shouldContinue ||
            regionEffectsApplied ||
            bodyForcesApplied ||
            Boolean(composed) ||
            popAnimationsActive) &&
          !latest.paused &&
          latest.visible &&
          !reducedMotionRef.current
        ) {
          scheduleRender()
        }
      }, [
        finishWorkerFrame,
        handleWorkerError,
        paint,
        cancelRender,
        requestRender,
        scheduleRender,
        reducedMotionRef,
        rafRef
      ])

      renderFnRef.current = renderFrame

      useEffect(() => {
        workerFailedRef.current = false
        if (workerActiveRef.current || workerStartingRef.current) {
          stopWorker("config changed", false)
        }
        const store = storeRef.current
        store?.updateConfig(augmentedConfig ?? {})
        // Frame props describe the complete authored + frame-owned collider
        // set. Clear the world once when the last configured collider source
        // disappears, without revising collider-free worlds on every rerender.
        if (
          store &&
          augmentedConfig?.colliders === undefined &&
          hadConfiguredCollidersRef.current
        ) {
          store.setColliders([])
        }
        hadConfiguredCollidersRef.current =
          augmentedConfig?.colliders !== undefined
        requestRender()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [augmentedConfig, stopWorker])

      useEffect(() => {
        workerFailedRef.current = false
        requestRender()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [hydrated, simulationExecution, workerBodyThreshold])

      useEffect(() => {
        // `reducedMotionRef` keeps frame closures current, while this reactive
        // value makes a runtime media-query change actively enter the settle path
        // or restart RAF work when motion is allowed again.
        requestRender()
      }, [reducedMotion, requestRender])

      usePhysicsFrameLifecyclePolicy({
        cancelRender,
        frameRuntime,
        lastFrameTimeRef,
        paused,
        postWorkerCommand,
        requestRender,
        storeRef,
        suspendWhenHidden
      })

      useEffect(() => {
        return () => stopWorker("unmount", false)
      }, [stopWorker])

      useEffect(() => {
        paint()
      }, [paint])

      useImperativeHandle(
        ref,
        (): StreamPhysicsFrameHandle => ({
          ...storeRef.current!.controls(),
          applyImpulse: (id, ix, iy) => {
            storeRef.current!.applyImpulse(id, ix, iy)
            postWorkerCommand({ type: "applyImpulse", id, ix, iy })
            requestRender()
          },
          clear: () => {
            storeRef.current!.clear()
            regionStateRef.current.clear()
            popAnimationsRef.current.clear()
            postWorkerCommand({ type: "clear" })
            requestRender()
          },
          clearRegionState: (bodyId) => {
            if (bodyId) regionStateRef.current.delete(bodyId)
            else regionStateRef.current.clear()
            requestRender()
          },
          getData: () => storeRef.current!.readBodies(),
          getRegionState: (bodyId) =>
            bodyId
              ? publicRegionState(regionStateRef.current.get(bodyId))
              : cloneRegionStateSnapshot(regionStateRef.current),
          getStore: () => storeRef.current!,
          pause: () => {
            frameRuntime.setPaused(true)
            lastFrameTimeRef.current = null
            cancelRender()
            storeRef.current!.setPaused(true)
            postWorkerCommand({ type: "setPaused", paused: true }, false)
            requestRender()
          },
          push: (spawn, pacing) => {
            storeRef.current!.enqueue(spawn, pacing)
            if (isPhysicsWorkerPacingSupported(pacing)) {
              postWorkerCommand({ type: "enqueue", spawns: [spawn], pacing })
            } else if (workerActiveRef.current || workerStartingRef.current) {
              stopWorker("spawn pacing is not worker-cloneable")
            }
            requestRender()
          },
          pushMany: (spawns, pacing) => {
            storeRef.current!.enqueue(spawns, pacing)
            if (isPhysicsWorkerPacingSupported(pacing)) {
              postWorkerCommand({ type: "enqueue", spawns, pacing })
            } else if (workerActiveRef.current || workerStartingRef.current) {
              stopWorker("spawn pacing is not worker-cloneable")
            }
            requestRender()
          },
          popBodies: (ids, options = {}) => {
            const store = storeRef.current!
            const bodyById = new Map(
              store.readBodies().map((body) => [body.id, body])
            )
            const removed = store.remove(ids)
            const now = logicalClockRef.current()
            for (const id of removed) {
              const body = bodyById.get(id)
              if (!body) continue
              regionStateRef.current.delete(id)
              popAnimationsRef.current.set(id, {
                body,
                color: options.color ?? "#f59e0b",
                durationMs: Math.max(120, options.durationMs ?? 520),
                radius: options.radius ?? physicsBodyRadius(body),
                scale:
                  options.scale != null && options.scale > 0
                    ? options.scale
                    : 1,
                startedAt: now
              })
              if (focusedBodyIdRef.current === id) {
                focusedBodyIdRef.current = null
                setFocusedSemanticItem(null)
              }
              setHoverData((current) => (current?.id === id ? null : current))
            }
            if (removed.length) {
              postWorkerCommand({ type: "remove", ids: removed })
              requestRender()
            }
            return removed
          },
          remove: (ids) => {
            const removed = storeRef.current!.remove(ids)
            for (const id of ids) regionStateRef.current.delete(id)
            postWorkerCommand({ type: "remove", ids })
            requestRender()
            return removed
          },
          restore: (snapshot: PhysicsPipelineSnapshot) => {
            storeRef.current!.restore(snapshot)
            regionStateRef.current.clear()
            popAnimationsRef.current.clear()
            postWorkerCommand({ type: "restore", snapshot }, false)
            requestRender()
          },
          resume: () => {
            frameRuntime.setPaused(false)
            lastFrameTimeRef.current = null
            storeRef.current!.setPaused(false)
            postWorkerCommand({ type: "setPaused", paused: false }, false)
            requestRender()
          },
          settle: (maxSteps) => {
            const steps = storeRef.current!.settle(maxSteps)
            postWorkerCommand({ type: "settle", maxSteps })
            requestRender()
            return steps
          },
          settleWithObservations: (maxSteps) => {
            const result = storeRef.current!.settleWithObservations(maxSteps)
            postWorkerCommand({ type: "settle", maxSteps })
            requestRender()
            return result
          },
          step: (deltaSeconds) => {
            const store = storeRef.current!
            const result = store.tick(deltaSeconds)
            runPhysicsPostTick({
              store,
              result,
              regionEffects: regionEffectsRef.current,
              regionState: regionStateRef.current,
              bodyForces: bodyForcesRef.current,
              composed: composedControllersRef.current,
              onTick: onTickRef.current
            })
            postWorkerCommand({ type: "tick", deltaSeconds })
            paint()
            return result
          }
        }),
        [
          cancelRender,
          focusedBodyIdRef,
          frameRuntime,
          paint,
          postWorkerCommand,
          requestRender,
          setFocusedSemanticItem,
          setHoverData,
          stopWorker
        ]
      )

      const serverLikeRender =
        isServerEnvironment || (!hydrated && wasHydratingFromSSR)
      const wrapperClassName = [
        "stream-physics-frame",
        chartMode ? `stream-physics-frame--mode-${chartMode}` : null,
        emphasis ? `stream-physics-frame--emphasis-${emphasis}` : null,
        className
      ]
        .filter(Boolean)
        .join(" ")
      const ariaLabel =
        description ??
        (typeof title === "string" ? title : undefined) ??
        "Physics chart"
      const tableId = `${svgInstanceId}-physics-table`
      const tooltipRendered =
        enableHover && hoverData ? (
          tooltipContent ? (
            tooltipContent(hoverData)
          ) : (
            <DefaultPhysicsTooltip hover={hoverData} />
          )
        ) : null
      const tooltipElement =
        tooltipRendered && hoverData ? (
          <FlippingTooltip
            x={hoverData.x - margin.left}
            y={hoverData.y - margin.top}
            containerWidth={plotWidth}
            containerHeight={plotHeight}
            margin={margin}
            className="stream-physics-tooltip"
          >
            {tooltipRendered}
          </FlippingTooltip>
        ) : null

      if (serverLikeRender) {
        const store =
          storeRef.current ??
          createPhysicsFrameStore(
            augmentedConfig,
            initialSpawns,
            initialSpawnPacing
          )
        const titleText = typeof title === "string" ? title : undefined
        const settledBodyStyle = (
          body: PhysicsBodyState,
          context: PhysicsSettledBodyStyleContext
        ) => {
          const internalRegionState = regionStateRef.current.get(body.id)
          const activeRegions = internalRegionState
            ? Array.from(internalRegionState.activeRegionIds)
                .map((id) => regionById.get(id))
                .filter(
                  (region): region is StreamPhysicsRegionEffect =>
                    region != null
                )
            : []
          return resolveStyle(
            body,
            context.simulationState,
            bodyStyle,
            selectedBodyStyle,
            selection,
            publicRegionState(internalRegionState),
            activeRegions,
            SETTLED_THEME_PRIMARY,
            SETTLED_THEME_TEXT,
            stylePrimitives
          )
        }
        const { element } = createPhysicsSettledSVG(store, {
          width: size[0],
          height: size[1],
          title: titleText,
          description,
          background:
            backgroundGraphics || background === "transparent"
              ? undefined
              : (background ?? SETTLED_THEME_BACKGROUND),
          backgroundGraphics: resolvedBackground,
          backgroundGraphicsBackdrop,
          className: "stream-physics-frame__svg",
          foregroundGraphics: resolvedForeground,
          idPrefix: `physics-${svgInstanceId}`,
          margin,
          bodyStyle: settledBodyStyle,
          renderChrome: (scene) =>
            renderPhysicsSettledChrome(scene, props, size, margin, CHART_TYPE)
        })
        return (
          <div
            ref={responsiveRef}
            className={wrapperClassName}
            data-semiotic-mode={chartMode}
            role="img"
            aria-label={ariaLabel}
            style={{
              width: responsiveWidth ? "100%" : size[0],
              height: responsiveHeight ? "100%" : size[1]
            }}
          >
            <ScreenReaderSummary summary={summary} />
            {element}
          </div>
        )
      }

      return (
        <div
          ref={responsiveRef}
          className={wrapperClassName}
          data-semiotic-mode={chartMode}
          role="group"
          aria-label={ariaLabel}
          aria-describedby={focusedSemanticItem ? liveRegionId : undefined}
          tabIndex={0}
          style={{
            position: "relative",
            width: responsiveWidth ? "100%" : size[0],
            height: responsiveHeight ? "100%" : size[1]
          }}
          onKeyDown={onKeyDown}
        >
          {process.env.NODE_ENV !== "production" && storeRef.current && (
            <SceneRevisionDiagnosticsObserver
              store={storeRef.current}
              diagnostics={sceneRevisionDiagnosticsRef.current}
            />
          )}
          {accessibleTable ? (
            <AccessibleTablePortal accessibleTable={accessibleTable}>
              <SkipToTableLink tableId={tableId} />
              <PhysicsSemanticDataTable
                chartTitle={
                  typeof title === "string" ? title : description
                }
                items={allSemanticItems}
                tableId={tableId}
              />
            </AccessibleTablePortal>
          ) : null}
          <ScreenReaderSummary summary={summary} />
          {/* Live region must sit outside role="img" so AT announces hover/focus. */}
          <AriaLiveTooltip hoverPoint={hoverData} />
          <div
            id={liveRegionId}
            aria-live="polite"
            aria-atomic="true"
            style={SR_ONLY_STYLE}
          >
            {focusedSemanticItem
              ? (focusedSemanticItem.description ?? focusedSemanticItem.label)
              : ""}
          </div>
          <div
            role="img"
            aria-label={ariaLabel}
            style={{ position: "relative", width: "100%", height: "100%" }}
          >
            <CanvasFrameBackground
              size={size}
              margin={margin}
              backdropFill={backgroundGraphicsBackdrop}
            >
              {resolvedBackground}
            </CanvasFrameBackground>
            <canvas
              ref={canvasRef}
              width={size[0]}
              height={size[1]}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                display: "block"
              }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={physicsCanvasPointer.handlePointerMove}
              onPointerLeave={physicsCanvasPointer.handlePointerLeave}
            />
            {resolvedForeground}
            <PhysicsSVGOverlay
              width={plotWidth}
              height={plotHeight}
              totalWidth={size[0]}
              totalHeight={size[1]}
              margin={margin}
              title={title}
              legend={legend}
              legendPosition={legendPosition}
              legendLayout={legendLayout}
              legendHoverBehavior={legendHoverBehavior}
              legendClickBehavior={legendClickBehavior}
              legendHighlightedCategory={legendHighlightedCategory}
              legendIsolatedCategories={legendIsolatedCategories}
              pointNodes={annotationAnchors}
              annotations={annotations}
              onAnnotationActivate={onAnnotationActivate}
              onObservation={onObservation}
              chartId={chartId}
              chartType={CHART_TYPE}
              autoPlaceAnnotations={autoPlaceAnnotations}
              svgAnnotationRules={svgAnnotationRules}
            />
            <FocusRing
              active={focusedSemanticItem != null}
              hoverPoint={
                focusedSemanticItem
                  ? { x: focusedSemanticItem.x, y: focusedSemanticItem.y }
                  : null
              }
              margin={margin}
              size={size}
              shape={focusedSemanticItem?.shape}
              width={focusedSemanticItem?.width}
              height={focusedSemanticItem?.height}
              pathData={focusedSemanticItem?.pathData}
            />
            {tooltipElement}
          </div>
        </div>
      )
    }
  )
)

StreamPhysicsFrame.displayName = "StreamPhysicsFrame"

export default StreamPhysicsFrame
