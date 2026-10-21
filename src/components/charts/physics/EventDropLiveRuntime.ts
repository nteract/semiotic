import {
  EventDropLedger,
  type EventDropLedgerSnapshot,
  type EventDropWatermark
} from "./eventDropLedger"
import {
  compileEventDropPhysics,
  type EventDropProjectionMetadata
} from "./eventDropPhysics"
import {
  choreographEventDropArrival,
  type EventDropArrival
} from "./eventDropArrival"
import type { EventDropSource, EventDropSourceRail } from "./eventDropSources"
import type { PhysicsEngineAdapter } from "../../stream/physics/PhysicsEngineAdapter"
import type { PhysicsQueuedSpawn } from "../../stream/physics/PhysicsPipelineTypes"
import type { PhysicsChartLayout } from "./physicsChartShared"
import type { Datum } from "../shared/datumTypes"
import { cloneSpawn } from "../../stream/physics/physicsPipelineHelpers"
import { validatePhysicsSpawn } from "../../stream/physics/physicsInputValidation"

export interface EventDropLiveOptions {
  follow: "watermark" | "now"
  horizon: number
  retain: number
}

/** Normalized live-board configuration; the HOC resolves datum accessors on input. */
export interface EventDropLiveConfig {
  live: EventDropLiveOptions
  windowSize: number
  size: [number, number]
  ballRadius: number
  seed: number
  timeUnit: "ms" | "s"
  originTime?: number
  watermark?: EventDropWatermark
  arrival?: EventDropArrival
  sources?: readonly EventDropSource[]
  sourceRail?: EventDropSourceRail
}

export interface EventDropLiveSnapshot {
  config: EventDropLiveConfig
  ledger: EventDropLedgerSnapshot
  anchor: number
  elapsed: number
  pending: Array<{ spawn: PhysicsQueuedSpawn; due: number }>
}

/** Bounded runtime state plus changed historical rows, relative to the last frame. */
export interface EventDropLiveDelta extends Omit<
  EventDropLiveSnapshot,
  "config"
> {
  bodiesChanged: boolean
}

/**
 * Incremental admission and bounded geometry. World x coordinates are permanent;
 * only the view translation follows time. Historical counters outlive bodies.
 */
export class EventDropLiveRuntime {
  readonly ledger: EventDropLedger
  private anchor: number
  private elapsed = 0
  private pending = new Map<
    string,
    { spawn: PhysicsQueuedSpawn; due: number }
  >()
  private layout!: PhysicsChartLayout
  private geometryKey = ""
  private laneWidth = 1
  private offset = 0
  private bodiesChanged = false

  constructor(private config: EventDropLiveConfig) {
    this.validate(config)
    this.ledger = new EventDropLedger(
      config.windowSize,
      config.watermark,
      config.sources?.map((s) => s.id)
    )
    this.anchor = config.originTime ?? 0
    this.refresh()
  }

  private validate(config: EventDropLiveConfig): void {
    if (config.originTime != null && !Number.isFinite(config.originTime))
      throw new RangeError("Live originTime must be finite")
    if (
      !["now", "watermark"].includes(config.live.follow) ||
      !Number.isFinite(config.live.horizon) ||
      config.live.horizon <= 0 ||
      !Number.isFinite(config.live.retain) ||
      config.live.retain < 0
    )
      throw new RangeError(
        "live requires follow now/watermark, positive horizon and nonnegative retain"
      )
  }

  update(config: EventDropLiveConfig, world?: PhysicsEngineAdapter): void {
    this.validate(config)
    if (config.windowSize !== this.config.windowSize)
      throw new RangeError(
        "Changing live windows.size requires a new run (remount with a new key)"
      )
    if (
      config.timeUnit !== this.config.timeUnit ||
      config.originTime !== this.config.originTime
    )
      throw new RangeError(
        "Changing live timeUnit or origin requires a new run (remount with a new key)"
      )
    this.ledger.setWatermark(config.watermark ?? {})
    const before = this.layout
      .metadata as unknown as EventDropProjectionMetadata
    const oldLane = this.laneWidth
    this.config = config
    this.geometryKey = ""
    this.refresh()
    const after = this.layout.metadata as unknown as EventDropProjectionMetadata
    if (
      world &&
      (oldLane !== this.laneWidth ||
        before.plot.y !== after.plot.y ||
        before.plot.height !== after.plot.height ||
        before.windowPlot.x !== after.windowPlot.x)
    ) {
      const sx = this.laneWidth / oldLane
      const sy = after.plot.height / before.plot.height
      const point = (p: { x: number; y: number }) => ({
        x: after.windowPlot.x + (p.x - before.windowPlot.x) * sx,
        y: after.plot.y + (p.y - before.plot.y) * sy
      })
      const move = <T extends PhysicsQueuedSpawn>(body: T): T => ({
        ...body,
        ...point(body),
        ...(body.travel && {
          travel: { ...body.travel, points: body.travel.points.map(point) }
        })
      })
      const saved = world.snapshot()
      world.restore({
        ...saved,
        bodies: saved.bodies.map((body) => ({
          ...move(body),
          prevX: point({ x: body.prevX, y: body.prevY }).x,
          prevY: point({ x: body.prevX, y: body.prevY }).y,
          vx: body.vx * sx,
          vy: body.vy * sy
        }))
      })
      this.pending = new Map(
        Array.from(this.pending, ([id, entry]) => [
          id,
          { ...entry, spawn: move(entry.spawn) }
        ])
      )
    }
  }

  private get unit(): number {
    return this.config.timeUnit === "ms" ? 1000 : 1
  }
  private get now(): number {
    return (this.config.originTime ?? 0) + this.elapsed * this.unit
  }

  private refresh(): void {
    const {
      windowSize,
      live,
      size,
      ballRadius,
      seed,
      sources,
      sourceRail,
      timeUnit
    } = this.config
    const start =
      Math.floor((this.anchor - live.retain) / windowSize) * windowSize
    const count = Math.ceil((live.retain + live.horizon) / windowSize) + 1
    const watermark = this.ledger.getWatermark()
    const key = `${start}:${Math.floor(watermark / windowSize)}`
    if (key === this.geometryKey) return
    this.geometryKey = key
    this.layout = compileEventDropPhysics(
      {
        data: [],
        timeAccessor: "time",
        arrivalAccessor: "arrivalTime",
        windows: { size: windowSize },
        size,
        ballRadius,
        seed,
        sources,
        sourceRail,
        timeUnit,
        timeExtent: [start, start + (count - 1) * windowSize]
      },
      {
        events: [],
        watermarkValue: watermark,
        ledger: [],
        lifecycleEvents: []
      },
      true
    )
    const metadata = this.layout
      .metadata as unknown as EventDropProjectionMetadata
    this.laneWidth = metadata.windowPlot.width / count
    this.offset = (start / windowSize) * this.laneWidth
    // The compiler's local board becomes a permanent event-time world.
    for (const collider of this.layout.config.colliders ?? []) {
      const shape = collider.shape
      if (shape.type === "segment") {
        shape.x1 += this.offset
        shape.x2 += this.offset
      } else shape.x += this.offset
      collider.id = `${collider.id}:${start}`
    }
  }

  viewTransform(): { x: number; y: number } {
    return {
      x:
        (-(this.anchor - this.config.live.retain) / this.config.windowSize) *
        this.laneWidth,
      y: 0
    }
  }

  metadata(): EventDropProjectionMetadata {
    const base = this.layout.metadata as unknown as EventDropProjectionMetadata
    const dx = this.offset + this.viewTransform().x
    const region = <T extends { x: number }>(r: T): T => ({ ...r, x: r.x + dx })
    return {
      ...base,
      plot: region(base.plot),
      windowPlot: region(base.windowPlot),
      gutter: region(base.gutter),
      lidSegments: base.lidSegments.map((s) => ({
        ...s,
        x1: s.x1 + dx,
        x2: s.x2 + dx
      })),
      windowWalls: base.windowWalls?.map(region),
      watermarkValue: this.ledger.getWatermark(),
      eventTimeFrontier: this.ledger.getLatestEventTime(),
      arrivalFrontier: this.ledger.getArrivalFrontier(),
      ledger: this.ledger.getLedger(),
      lateCount: this.ledger.getLedger().reduce((sum, row) => sum + row.late, 0)
    }
  }

  colliders() {
    return this.layout.config.colliders ?? []
  }

  /** Called once for each newly materialized input, including worker emitters. */
  prepare(input: PhysicsQueuedSpawn, elapsed: number): PhysicsQueuedSpawn {
    this.bodiesChanged = true
    const datum = input.datum as Datum
    const eventTime = Number(datum.eventTime ?? datum.time)
    if (!Number.isFinite(eventTime))
      throw new RangeError("Live EventDrop requires a finite event time")
    const { windowSize, ballRadius, arrival, sources, sourceRail, size } =
      this.config
    const metadata = this.layout
      .metadata as unknown as EventDropProjectionMetadata
    const index = Math.floor(eventTime / windowSize)
    const inset = Math.min(this.laneWidth / 2, ballRadius + 3)
    const local = Math.max(
      inset,
      Math.min(
        this.laneWidth - inset,
        (eventTime / windowSize - index) * this.laneWidth
      )
    )
    const spawn: PhysicsQueuedSpawn = {
      ...input,
      x: metadata.windowPlot.x + index * this.laneWidth + local,
      y: metadata.plot.y + ballRadius + 2,
      vx: 0,
      vy: 0,
      datum: {
        ...datum,
        id: input.id,
        eventTime,
        time: eventTime,
        arrivalTime: this.now,
        windowIndex: index,
        windowId: `${index * windowSize}-${(index + 1) * windowSize}`,
        __phase: "travel",
        late: false
      }
    }
    // Choreography accepts screen coordinates. Convert the resulting path back
    // into world coordinates, keeping the source rail fixed on screen.
    const camera = this.viewTransform().x
    spawn.x += camera
    choreographEventDropArrival([spawn], {
      arrival:
        arrival && arrival !== "drop"
          ? { ...arrival, history: "travel" }
          : arrival,
      sources,
      sourceRail,
      size,
      secondsPerUnit: 1 / this.unit,
      timeScale: 1,
      firstArrival: elapsed,
      closedWindowCount: 0
    })
    spawn.x -= camera
    if (spawn.travel)
      spawn.travel.points = spawn.travel.points.map((p) => ({
        ...p,
        x: p.x - camera
      }))
    const due = elapsed + (spawn.travel?.durationSeconds ?? 0)
    this.pending.set(spawn.id, { spawn, due })
    return spawn
  }

  /** Runs at every fixed boundary, before the next integration step. */
  advance(world: PhysicsEngineAdapter, elapsed: number): string[] {
    const delta = Math.max(0, elapsed - this.elapsed)
    this.elapsed = elapsed
    for (const { spawn, due } of Array.from(this.pending.values())
      .filter((entry) => entry.due <= elapsed + 1e-9)
      .sort((a, b) => a.due - b.due)) {
      this.pending.delete(spawn.id)
      const datum = spawn.datum as Datum
      const arrivalTime = (this.config.originTime ?? 0) + due * this.unit
      const decision = this.ledger.append({
        eventTime: Number(datum.eventTime),
        arrivalTime: Math.max(arrivalTime, this.ledger.getArrivalFrontier()),
        source: String(datum.source ?? "")
      })
      const body =
        world.readBody?.(spawn.id) ??
        world.readState().find((b) => b.id === spawn.id)
      if (body) {
        this.bodiesChanged = true
        const metadata = this.layout
          .metadata as unknown as EventDropProjectionMetadata
        const closed = decision.end <= this.ledger.getWatermark()
        const to = decision.late
          ? {
              x: metadata.gutter.x + metadata.gutter.width / 2 + this.offset,
              y: metadata.plot.y + metadata.plot.height * 0.55
            }
          : {
              x: spawn.travel?.points.at(-1)?.x ?? spawn.x,
              y:
                metadata.plot.y +
                metadata.plot.height * (closed ? 0.58 : 0) +
                this.config.ballRadius +
                2
            }
        world.spawn({
          ...body,
          ...to,
          travel: undefined,
          datum: {
            ...datum,
            ...decision,
            arrivalTime,
            __phase: decision.late ? "late" : "board"
          }
        })
      }
    }
    this.ledger.advance(this.now)
    const target =
      this.config.live.follow === "now" ? this.now : this.ledger.getWatermark()
    if (Number.isFinite(target))
      this.anchor += Math.max(
        0,
        Math.min(target - this.anchor, (this.config.live.horizon * delta) / 2)
      )
    const previous = this.geometryKey
    this.refresh()
    if (previous !== this.geometryKey) world.setColliders(this.colliders())
    const cutoff = this.anchor - this.config.live.retain
    const retired = world
      .readState()
      .filter((body) => {
        if (this.pending.has(body.id)) return false
        const datum = body.datum as Datum
        return datum.late
          ? Number(datum.arrivalTime) < this.now - this.config.windowSize
          : Math.floor(Number(datum.eventTime) / this.config.windowSize) *
              this.config.windowSize +
              this.config.windowSize <
              cutoff
      })
      .map((body) => body.id)
    this.bodiesChanged ||= retired.length > 0
    return retired
  }

  drainWorkerDelta(): EventDropLiveDelta {
    const delta = {
      ...this.runtimeState(),
      ledger: this.ledger.drainDelta(),
      bodiesChanged: this.bodiesChanged
    }
    this.bodiesChanged = false
    return delta
  }

  applyWorkerDelta(
    delta: EventDropLiveDelta,
    world: PhysicsEngineAdapter
  ): void {
    validateLiveState(delta)
    this.ledger.applyDelta(delta.ledger)
    const previous = this.geometryKey
    this.applyState(delta)
    if (previous !== this.geometryKey) world.setColliders(this.colliders())
  }

  snapshot(): EventDropLiveSnapshot {
    return {
      config: this.config,
      ledger: this.ledger.snapshot(),
      ...this.runtimeState()
    }
  }

  private runtimeState() {
    return {
      anchor: this.anchor,
      elapsed: this.elapsed,
      pending: Array.from(this.pending.values(), (entry) => ({
        due: entry.due,
        spawn: cloneSpawn(entry.spawn)
      }))
    }
  }

  static restore(snapshot: EventDropLiveSnapshot): EventDropLiveRuntime {
    validateLiveState(snapshot)
    const runtime = new EventDropLiveRuntime(snapshot.config)
    runtime.ledger.restore(snapshot.ledger)
    runtime.applyState(snapshot)
    return runtime
  }

  private applyState(
    snapshot: Pick<EventDropLiveSnapshot, "anchor" | "elapsed" | "pending">
  ): void {
    this.anchor = snapshot.anchor
    this.elapsed = snapshot.elapsed
    this.pending = new Map(
      snapshot.pending.map((p) => [
        p.spawn.id,
        { due: p.due, spawn: cloneSpawn(p.spawn) }
      ])
    )
    this.refresh()
  }
}

function validateLiveState(
  snapshot: Pick<EventDropLiveSnapshot, "anchor" | "elapsed" | "pending">
): void {
  if (
    !Number.isFinite(snapshot.anchor) ||
    !Number.isFinite(snapshot.elapsed) ||
    snapshot.elapsed < 0 ||
    new Set(snapshot.pending.map((p) => p.spawn.id)).size !==
      snapshot.pending.length
  )
    throw new RangeError("Invalid live EventDrop snapshot")
  for (const pending of snapshot.pending) {
    if (!Number.isFinite(pending.due) || pending.due < 0)
      throw new RangeError("Invalid live EventDrop handoff")
    validatePhysicsSpawn(pending.spawn)
  }
}
