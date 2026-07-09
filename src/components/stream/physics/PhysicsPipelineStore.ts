import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import {
  type PhysicsBodyState,
  type PhysicsColliderSpec,
  type PhysicsKernelEvent,
  type PhysicsKernelOptions,
  type PhysicsKernelSnapshot,
  type PhysicsSpringSpec
} from "./PhysicsKernel"
import {
  resolvePhysicsEngineAdapter,
  type PhysicsEngineAdapter,
  type PhysicsEngineAdapterInput
} from "./PhysicsEngineAdapter"
import {
  PhysicsSedimentAccumulator,
  sedimentHeightfield,
  type PhysicsSedimentBinSnapshot,
  type PhysicsSedimentColumn,
  type PhysicsSedimentHeightfieldOptions,
  type PhysicsSedimentTotals
} from "./PhysicsSediment"
import {
  evaluatePhysicsBodyBudget,
  type PhysicsBodyBudgetDecision,
  type PhysicsBodyBudgetOptions
} from "./PhysicsBodyBudget"
import type {
  PhysicsObservationEvent,
  PhysicsObservationRecord,
  PhysicsPipelineConfig,
  PhysicsPipelineControlSurface,
  PhysicsPipelineSnapshot,
  PhysicsPipelineTickResult,
  PhysicsQueuedSpawn,
  PhysicsSimulationState,
  PhysicsSpawnPacingOptions
} from "./PhysicsPipelineTypes"
import {
  DEFAULT_PHYSICS_PIPELINE_CONFIG,
  bodyHitDistanceSquared,
  bodySearchRadius,
  cloneBodyBudgetOptions,
  cloneColliders,
  cloneQueuedSpawn,
  cloneSpawn,
  normalizeObservationConfig,
  parseSensorPairKey,
  requiredKernelOptions,
  schedulePhysicsSpawns,
  sensorPairKey,
  sortQueue,
  type InternalQueuedSpawn,
  type NormalizedObservationConfig,
  type PhysicsPipelineEvictionResult,
  type PhysicsQuadtreeLeaf
} from "./physicsPipelineHelpers"

// Re-export public API for stable import paths
export type {
  PhysicsPlotBounds,
  PhysicsBoundsColliderOptions,
  PhysicsXBinColliderOptions,
  PhysicsSpawnSpringSpec,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacing,
  PhysicsSpawnTimeAccessor,
  PhysicsSpawnPacingOptions,
  PhysicsPipelineQueuedSpawnSnapshot,
  PhysicsObservationEventType,
  PhysicsSimulationState,
  PhysicsObservationEvent,
  PhysicsObservationRecord,
  PhysicsSensorObservationConfig,
  PhysicsPipelineObservationOptions,
  PhysicsPipelineConfig,
  PhysicsPipelineTickResult,
  PhysicsPipelineSnapshot,
  PhysicsPipelineControlSurface
} from "./PhysicsPipelineTypes"

export {
  schedulePhysicsSpawns,
  collidersFromPlotBounds,
  collidersFromXScaleBins
} from "./physicsPipelineHelpers"

export class PhysicsPipelineStore {
  private activeSensorPairs = new Set<string>()
  private accumulator = 0
  private bodyBudget: false | PhysicsBodyBudgetOptions
  private bodyBudgetObservationKey = "ok"
  private config: Required<
    Omit<
      PhysicsPipelineConfig,
      | "bodyBudget"
      | "colliders"
      | "engine"
      | "kernel"
      | "observation"
      | "sediment"
    >
  >
  private engineInput?: PhysicsEngineAdapterInput
  private bodyQuadtree: Quadtree<PhysicsBodyState> | null = null
  private bodyQuadtreeRevision = -1
  private elapsedSeconds = 0
  private liveBodyOrder: string[] = []
  private maxBodySearchRadius = 0
  private nextSequence = 0
  private observation: NormalizedObservationConfig
  private paused = false
  private queue: InternalQueuedSpawn[] = []
  private revision = 0
  private sediment: PhysicsSedimentAccumulator
  private simulationState: PhysicsSimulationState = "settled"
  private visible = true
  private world: PhysicsEngineAdapter

  constructor(config: PhysicsPipelineConfig = {}) {
    const {
      bodyBudget,
      colliders,
      engine,
      kernel,
      observation,
      sediment,
      ...storeConfig
    } = config
    this.config = { ...DEFAULT_PHYSICS_PIPELINE_CONFIG, ...storeConfig }
    this.bodyBudget = bodyBudget ?? {}
    this.engineInput = engine
    this.observation = normalizeObservationConfig(observation)
    this.sediment = new PhysicsSedimentAccumulator(sediment ?? false)
    this.world = resolvePhysicsEngineAdapter(engine, {
      fixedDt: this.config.fixedDt,
      ...kernel
    })
    if (colliders) this.world.setColliders(cloneColliders(colliders))
  }

  updateConfig(config: PhysicsPipelineConfig): void {
    const {
      colliders,
      bodyBudget,
      engine,
      kernel: _kernel,
      observation,
      sediment,
      ...storeConfig
    } = config
    this.config = { ...this.config, ...storeConfig }
    if (bodyBudget !== undefined) {
      this.bodyBudget = bodyBudget
      if (bodyBudget === false) this.bodyBudgetObservationKey = "ok"
    }
    if (engine && engine !== this.engineInput) {
      const snapshot = this.world.snapshot()
      this.world.dispose()
      this.engineInput = engine
      this.world = resolvePhysicsEngineAdapter(engine, snapshot.options)
      this.world.restore(snapshot)
      this.revision += 1
    }
    if (observation) {
      this.observation = normalizeObservationConfig(
        observation,
        this.observation
      )
    }
    this.sediment.updateConfig(sediment)
    if (colliders) this.setColliders(colliders)
  }

  setColliders(colliders: PhysicsColliderSpec[]): void {
    this.world.setColliders(cloneColliders(colliders))
    this.revision += 1
  }

  enqueue(
    spawn: PhysicsQueuedSpawn | PhysicsQueuedSpawn[],
    pacing?: PhysicsSpawnPacingOptions
  ): void {
    const rawSpawns = Array.isArray(spawn) ? spawn : [spawn]
    const spawns = pacing
      ? schedulePhysicsSpawns(rawSpawns, {
          ...pacing,
          startAt: pacing.startAt ?? this.elapsedSeconds
        })
      : rawSpawns
    for (const next of spawns) {
      this.queue.push({
        ...cloneSpawn(next),
        sequence: this.nextSequence,
        spawnAt: next.spawnAt ?? this.elapsedSeconds
      })
      this.nextSequence += 1
    }
    this.queue.sort(sortQueue)
    if (spawns.length > 0) this.revision += 1
  }

  spawnNow(spawn: PhysicsQueuedSpawn): void {
    this.spawnOne(cloneSpawn(spawn))
    this.nextSequence += 1
    this.observeBodyBudget()
    this.evictOverflow()
    this.revision += 1
  }

  clear(): void {
    const kernelOptions = this.world.snapshot().options
    this.world.init({
      ...kernelOptions,
      fixedDt: this.config.fixedDt
    })
    this.activeSensorPairs.clear()
    this.liveBodyOrder = []
    this.queue = []
    this.accumulator = 0
    this.elapsedSeconds = 0
    this.nextSequence = 0
    this.sediment.clear()
    this.bodyBudgetObservationKey = "ok"
    this.revision += 1
    this.syncSimulationState()
  }

  tick(deltaSeconds: number): PhysicsPipelineTickResult {
    const spawned: string[] = []
    const evicted: string[] = []
    const sedimented: string[] = []
    const events: PhysicsKernelEvent[] = []
    const observations: PhysicsObservationEvent[] = []

    if (this.paused || !this.visible) {
      return this.result(
        0,
        spawned,
        evicted,
        sedimented,
        events,
        observations,
        false
      )
    }

    const delta =
      Math.max(0, Math.min(deltaSeconds, this.config.maxDeltaSeconds)) *
      this.config.timeScale
    this.elapsedSeconds += delta
    this.spawnDue(spawned, observations)
    const budget = this.observeBodyBudget(observations)
    const overflow = this.evictOverflow(observations)
    evicted.push(...overflow.evicted)
    sedimented.push(...overflow.sedimented)
    this.syncSimulationState(observations)
    this.accumulator += delta

    let steps = 0
    while (
      this.accumulator >= this.config.fixedDt &&
      steps < this.config.maxSubsteps
    ) {
      this.world.step(this.config.fixedDt)
      const stepEvents = this.world.events()
      events.push(...stepEvents)
      this.observeKernelEvents(stepEvents, observations)
      this.observeSensorTransitions(observations)
      this.accumulator -= this.config.fixedDt
      steps += 1
    }

    if (steps === this.config.maxSubsteps) {
      this.accumulator = Math.min(this.accumulator, this.config.fixedDt)
    }

    if (
      steps > 0 ||
      spawned.length > 0 ||
      evicted.length > 0 ||
      sedimented.length > 0 ||
      events.length > 0
    ) {
      this.revision += 1
    }
    return this.result(
      steps,
      spawned,
      evicted,
      sedimented,
      events,
      observations,
      undefined,
      budget
    )
  }

  settle(maxSteps = this.config.settleStepLimit): number {
    this.spawnDue([], [])
    const steps = this.world.settle(maxSteps, this.config.fixedDt)
    if (steps > 0) this.revision += 1
    this.syncSimulationState()
    return steps
  }

  settleWithObservations(
    maxSteps = this.config.settleStepLimit
  ): PhysicsPipelineTickResult {
    const spawned: string[] = []
    const evicted: string[] = []
    const sedimented: string[] = []
    const events: PhysicsKernelEvent[] = []
    const observations: PhysicsObservationEvent[] = []

    if (this.paused || !this.visible) {
      return this.result(
        0,
        spawned,
        evicted,
        sedimented,
        events,
        observations,
        false
      )
    }

    this.spawnDue(spawned, observations)
    const budget = this.observeBodyBudget(observations)
    const overflow = this.evictOverflow(observations)
    evicted.push(...overflow.evicted)
    sedimented.push(...overflow.sedimented)
    this.syncSimulationState(observations)

    let steps = 0
    while (steps < maxSteps && !this.world.allSleeping()) {
      this.world.step(this.config.fixedDt)
      const stepEvents = this.world.events()
      events.push(...stepEvents)
      this.observeKernelEvents(stepEvents, observations)
      this.observeSensorTransitions(observations)
      steps += 1
    }

    if (
      steps > 0 ||
      spawned.length > 0 ||
      evicted.length > 0 ||
      sedimented.length > 0 ||
      events.length > 0
    ) {
      this.revision += 1
    }
    return this.result(
      steps,
      spawned,
      evicted,
      sedimented,
      events,
      observations,
      undefined,
      budget
    )
  }

  readBodies(out: PhysicsBodyState[] = []): PhysicsBodyState[] {
    return this.world.readState(out)
  }

  readSediment(): PhysicsSedimentBinSnapshot[] {
    return this.sediment.snapshot()
  }

  bodyBudgetStatus(): PhysicsBodyBudgetDecision {
    return this.evaluateBodyBudget()
  }

  sedimentTotals(): PhysicsSedimentTotals {
    return this.sediment.totals()
  }

  sedimentHeightfield(
    options: PhysicsSedimentHeightfieldOptions = {}
  ): PhysicsSedimentColumn[] {
    return sedimentHeightfield(this.readSediment(), options)
  }

  hitTest(x: number, y: number, radius = 0): PhysicsBodyState | null {
    const tree = this.ensureBodyQuadtree()
    if (!tree) return null

    let best: PhysicsBodyState | null = null
    let bestDistanceSquared = Number.POSITIVE_INFINITY
    const searchRadius = Math.max(0, radius) + this.maxBodySearchRadius
    const minX = x - searchRadius
    const maxX = x + searchRadius
    const minY = y - searchRadius
    const maxY = y + searchRadius

    tree.visit((node, x0, y0, x1, y1) => {
      if (x1 < minX || x0 > maxX || y1 < minY || y0 > maxY) return true
      if (node.length) return false

      let leaf: PhysicsQuadtreeLeaf | undefined = node as PhysicsQuadtreeLeaf
      while (leaf) {
        const body = leaf.data
        if (body) {
          const distanceSquared = bodyHitDistanceSquared(
            body,
            x,
            y,
            Math.max(0, radius)
          )
          if (
            distanceSquared != null &&
            (distanceSquared < bestDistanceSquared ||
              (distanceSquared === bestDistanceSquared &&
                this.liveBodyOrder.indexOf(body.id) >
                  this.liveBodyOrder.indexOf(best?.id ?? "")))
          ) {
            best = body
            bestDistanceSquared = distanceSquared
          }
        }
        leaf = leaf.next
      }
      return false
    })

    return best
  }

  events(): PhysicsKernelEvent[] {
    return this.world.events()
  }

  allSleeping(): boolean {
    return this.world.allSleeping()
  }

  hasPendingWork(): boolean {
    return this.queue.length > 0 || !this.world.allSleeping()
  }

  queueSize(): number {
    return this.queue.length
  }

  liveBodyCount(): number {
    return this.liveBodyOrder.length
  }

  elapsed(): number {
    return this.elapsedSeconds
  }

  recordObservation(record: PhysicsObservationRecord): PhysicsObservationEvent {
    const { timestamp, chartType, chartId, ...rest } = record
    const event: PhysicsObservationEvent = {
      ...rest,
      timestamp: timestamp ?? this.elapsedSeconds,
      chartType: chartType ?? this.observation.chartType,
      chartId: chartId ?? this.observation.chartId
    }
    this.emitObservation(event)
    return event
  }

  version(): number {
    return this.revision
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.syncSimulationState()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.syncSimulationState()
  }

  remove(ids: string[]): string[] {
    const idSet = new Set(ids)
    const liveBefore = new Set(this.liveBodyOrder)
    const queuedBefore = new Set(this.queue.map((spawn) => spawn.id))
    this.queue = this.queue.filter((spawn) => !idSet.has(spawn.id))
    this.liveBodyOrder = this.liveBodyOrder.filter((id) => !idSet.has(id))
    this.world.remove(ids)
    this.removeActiveSensorPairsForBodies(idSet)

    const removed = ids.filter(
      (id) => liveBefore.has(id) || queuedBefore.has(id)
    )
    if (removed.length > 0) {
      this.revision += 1
      this.syncSimulationState()
    }
    return removed
  }

  setConstraint(spec: PhysicsSpringSpec): string {
    const id = this.world.setConstraint(spec)
    this.revision += 1
    return id
  }

  removeConstraint(id: string): void {
    this.world.removeConstraint(id)
    this.revision += 1
  }

  applyImpulse(id: string, ix: number, iy: number): void {
    this.world.applyImpulse(id, ix, iy)
    this.revision += 1
  }

  nextRandom(): number {
    return this.world.nextRandom()
  }

  controls(): PhysicsPipelineControlSurface {
    return {
      applyImpulse: (id, ix, iy) => this.applyImpulse(id, ix, iy),
      clear: () => this.clear(),
      hitTest: (x, y, radius) => this.hitTest(x, y, radius),
      pause: () => this.setPaused(true),
      push: (spawn, pacing) => this.enqueue(spawn, pacing),
      pushMany: (spawns, pacing) => this.enqueue(spawns, pacing),
      bodyBudgetStatus: () => this.bodyBudgetStatus(),
      readBodies: (out) => this.readBodies(out),
      readSediment: () => this.readSediment(),
      recordObservation: (event) => this.recordObservation(event),
      remove: (ids) => this.remove(ids),
      restore: (snapshot) => this.restore(snapshot),
      resume: () => this.setPaused(false),
      settle: (maxSteps) => this.settle(maxSteps),
      settleWithObservations: (maxSteps) =>
        this.settleWithObservations(maxSteps),
      snapshot: () => this.snapshot(),
      sedimentHeightfield: (options) => this.sedimentHeightfield(options),
      sedimentTotals: () => this.sedimentTotals(),
      step: (deltaSeconds) => this.tick(deltaSeconds)
    }
  }

  snapshot(): PhysicsPipelineSnapshot {
    const world = this.world.snapshot()
    return {
      accumulator: this.accumulator,
      activeSensorPairs: Array.from(this.activeSensorPairs).sort(),
      bodyBudget: cloneBodyBudgetOptions(this.bodyBudget),
      config: {
        ...this.config,
        kernel: requiredKernelOptions(world.options)
      },
      elapsedSeconds: this.elapsedSeconds,
      paused: this.paused,
      queue: this.queue.map(cloneQueuedSpawn),
      revision: this.revision,
      sediment: this.readSediment(),
      simulationState: this.simulationState,
      liveBodyOrder: this.liveBodyOrder.slice(),
      visible: this.visible,
      world
    }
  }

  restore(snapshot: PhysicsPipelineSnapshot): void {
    this.config = {
      bodyLimit: snapshot.config.bodyLimit,
      eviction: snapshot.config.eviction,
      fixedDt: snapshot.config.fixedDt,
      maxDeltaSeconds: snapshot.config.maxDeltaSeconds,
      maxSubsteps: snapshot.config.maxSubsteps,
      settleStepLimit: snapshot.config.settleStepLimit,
      timeScale: snapshot.config.timeScale
    }
    this.bodyBudget = cloneBodyBudgetOptions(snapshot.bodyBudget ?? {})
    this.bodyBudgetObservationKey = "ok"
    this.activeSensorPairs = new Set(snapshot.activeSensorPairs)
    this.accumulator = snapshot.accumulator
    this.elapsedSeconds = snapshot.elapsedSeconds
    this.paused = snapshot.paused
    this.queue = snapshot.queue.map(cloneQueuedSpawn).sort(sortQueue)
    this.revision = snapshot.revision
    this.sediment.restore(snapshot.sediment ?? [])
    this.simulationState = snapshot.simulationState ?? this.currentSimulationState()
    this.liveBodyOrder = snapshot.liveBodyOrder.slice()
    this.visible = snapshot.visible
    this.nextSequence =
      this.queue.reduce((max, spawn) => Math.max(max, spawn.sequence), -1) + 1
    this.world.restore(snapshot.world)
  }

  private spawnDue(
    spawned: string[],
    observations: PhysicsObservationEvent[]
  ): void {
    while (
      this.queue.length > 0 &&
      this.queue[0].spawnAt <= this.elapsedSeconds
    ) {
      const next = this.queue.shift()
      if (!next) return
      this.spawnOne(next, observations)
      spawned.push(next.id)
    }
  }

  private spawnOne(
    spawn: PhysicsQueuedSpawn,
    observations?: PhysicsObservationEvent[]
  ): void {
    this.liveBodyOrder = this.liveBodyOrder.filter((id) => id !== spawn.id)
    this.removeActiveSensorPairsForBodies(new Set([spawn.id]))
    this.world.spawn(spawn)
    this.liveBodyOrder.push(spawn.id)
    for (const spring of spawn.springs ?? []) {
      this.world.setConstraint({
        ...spring,
        bodyId: spawn.id
      })
    }
    const body = this.world.readState().find((state) => state.id === spawn.id)
    this.emitObservation(
      {
        type: "physics-spawn",
        timestamp: this.elapsedSeconds,
        chartType: this.observation.chartType,
        chartId: this.observation.chartId,
        bodyId: spawn.id,
        datum: body?.datum ?? spawn.datum,
        x: body?.x ?? spawn.x,
        y: body?.y ?? spawn.y
      },
      observations
    )
  }

  private result(
    steps: number,
    spawned: string[],
    evicted: string[],
    sedimented: string[],
    events: PhysicsKernelEvent[],
    observations: PhysicsObservationEvent[],
    shouldContinueOverride?: boolean,
    budget: PhysicsBodyBudgetDecision = this.evaluateBodyBudget()
  ): PhysicsPipelineTickResult {
    this.syncSimulationState(observations)
    const sleeping = this.world.allSleeping()
    return {
      budget,
      elapsedSeconds: this.elapsedSeconds,
      evicted,
      events,
      observations,
      queueSize: this.queue.length,
      revision: this.revision,
      shouldContinue:
        shouldContinueOverride ?? (this.queue.length > 0 || !sleeping),
      sleeping,
      sedimented,
      spawned,
      steps
    }
  }

  private observeKernelEvents(
    events: PhysicsKernelEvent[],
    observations: PhysicsObservationEvent[]
  ): void {
    if (events.length === 0) return
    const bodyById = new Map(
      this.world.readState().map((body) => [body.id, body])
    )
    for (const event of events) {
      if (event.type === "sleep") {
        const body = bodyById.get(event.bodyId)
        this.emitObservation(
          {
            type: "physics-settle",
            timestamp: this.elapsedSeconds,
            chartType: this.observation.chartType,
            chartId: this.observation.chartId,
            bodyId: event.bodyId,
            datum: body?.datum,
            x: body?.x,
            y: body?.y
          },
          observations
        )
      }
    }
  }

  private observeSensorTransitions(
    observations: PhysicsObservationEvent[]
  ): void {
    const currentPairs = new Set(
      this.world
        .activeSensorPairs()
        .map((pair) => sensorPairKey(pair.sensorId, pair.bodyId))
    )
    if (currentPairs.size === 0 && this.activeSensorPairs.size === 0) return

    const bodyById = new Map(
      this.world.readState().map((body) => [body.id, body])
    )

    for (const key of Array.from(currentPairs).sort()) {
      if (this.activeSensorPairs.has(key)) continue
      const { sensorId, bodyId } = parseSensorPairKey(key)
      this.emitSensorObservation(
        "enter",
        sensorId,
        bodyId,
        bodyById.get(bodyId),
        observations
      )
    }

    for (const key of Array.from(this.activeSensorPairs).sort()) {
      if (currentPairs.has(key)) continue
      const { sensorId, bodyId } = parseSensorPairKey(key)
      this.emitSensorObservation(
        "exit",
        sensorId,
        bodyId,
        bodyById.get(bodyId),
        observations
      )
    }

    this.activeSensorPairs = currentPairs
  }

  private emitSensorObservation(
    direction: "enter" | "exit",
    sensorId: string,
    bodyId: string,
    body: PhysicsBodyState | undefined,
    observations: PhysicsObservationEvent[]
  ): void {
    const sensor = this.observation.sensors[sensorId]
    this.emitObservation(
      {
        type:
          direction === "enter"
            ? (sensor?.enterType ?? "physics-bin-enter")
            : (sensor?.exitType ?? "physics-bin-exit"),
        timestamp: this.elapsedSeconds,
        chartType: this.observation.chartType,
        chartId: this.observation.chartId,
        bodyId,
        datum: body?.datum,
        x: body?.x,
        y: body?.y,
        sensorId,
        binId: sensor?.binId ?? sensorId
      },
      observations
    )
  }

  private removeActiveSensorPairsForBodies(bodyIds: Set<string>): void {
    for (const key of Array.from(this.activeSensorPairs)) {
      if (bodyIds.has(parseSensorPairKey(key).bodyId)) {
        this.activeSensorPairs.delete(key)
      }
    }
  }

  private emitObservation(
    event: PhysicsObservationEvent,
    observations?: PhysicsObservationEvent[]
  ): void {
    observations?.push(event)
    this.observation.onObservation?.(event)
  }

  private evaluateBodyBudget(): PhysicsBodyBudgetDecision {
    return evaluatePhysicsBodyBudget({
      bodyLimit: this.config.bodyLimit,
      engineMaxBodiesHint: this.world.capabilities.maxBodiesHint,
      evictionEnabled: this.config.eviction !== false,
      liveBodies: this.liveBodyOrder.length,
      queuedBodies: this.queue.length,
      sedimentEnabled: this.sediment.isEnabled(),
      options: this.bodyBudget
    })
  }

  private observeBodyBudget(
    observations?: PhysicsObservationEvent[]
  ): PhysicsBodyBudgetDecision {
    const decision = this.evaluateBodyBudget()
    if (decision.state === "ok" || this.bodyBudget === false) {
      this.bodyBudgetObservationKey = "ok"
      return decision
    }

    const key = `${decision.state}:${decision.action}`
    if (key === this.bodyBudgetObservationKey) return decision
    this.bodyBudgetObservationKey = key
    this.emitObservation(
      {
        type:
          decision.state === "overflow"
            ? "physics-budget-overflow"
            : "physics-budget-warning",
        timestamp: this.elapsedSeconds,
        chartType: this.observation.chartType,
        chartId: this.observation.chartId,
        budgetAction: decision.action,
        bodyLimit: decision.bodyLimit,
        engineMaxBodiesHint: decision.engineMaxBodiesHint,
        liveBodies: decision.liveBodies,
        overflow: decision.overflow,
        projectedBodies: decision.projectedBodies,
        queuedBodies: decision.queuedBodies,
        warnAt: decision.warnAt
      },
      observations
    )
    return decision
  }

  private currentSimulationState(): PhysicsSimulationState {
    if (this.paused || !this.visible) return "paused"
    return this.queue.length > 0 || !this.world.allSleeping()
      ? "running"
      : "settled"
  }

  private syncSimulationState(
    observations?: PhysicsObservationEvent[]
  ): void {
    const next = this.currentSimulationState()
    if (next === this.simulationState) return
    const previous = this.simulationState
    this.simulationState = next
    this.observation.onSimulationStateChange?.(next, previous)
    if (next === "running") {
      this.emitObservation(
        {
          type: "sim-active",
          timestamp: this.elapsedSeconds,
          chartType: this.observation.chartType,
          chartId: this.observation.chartId,
          simulationState: next,
          previousSimulationState: previous
        },
        observations
      )
    } else if (next === "settled") {
      this.emitObservation(
        {
          type: "sim-idle",
          timestamp: this.elapsedSeconds,
          chartType: this.observation.chartType,
          chartId: this.observation.chartId,
          simulationState: next,
          previousSimulationState: previous
        },
        observations
      )
    }
  }

  private evictOverflow(
    observations?: PhysicsObservationEvent[]
  ): PhysicsPipelineEvictionResult {
    if (this.config.eviction === false) {
      return { evicted: [], sedimented: [] }
    }
    const limit = Math.max(0, Math.floor(this.config.bodyLimit))
    if (!Number.isFinite(limit)) return { evicted: [], sedimented: [] }
    const overflow = this.liveBodyOrder.length - limit
    if (overflow <= 0) return { evicted: [], sedimented: [] }

    const candidates =
      this.config.eviction === "sleeping-first"
        ? this.sleepingFirstEvictionOrder()
        : this.liveBodyOrder.slice()
    const evicted = candidates.slice(0, overflow)
    if (evicted.length === 0) return { evicted: [], sedimented: [] }

    const sedimented = this.absorbSediment(evicted, observations)

    this.world.remove(evicted)
    const evictedSet = new Set(evicted)
    this.liveBodyOrder = this.liveBodyOrder.filter((id) => !evictedSet.has(id))
    this.removeActiveSensorPairsForBodies(evictedSet)
    return { evicted, sedimented }
  }

  private absorbSediment(
    ids: string[],
    observations?: PhysicsObservationEvent[]
  ): string[] {
    const bodyById = new Map(
      this.world.readState().map((body) => [body.id, body])
    )
    const sedimented: string[] = []
    for (const id of ids) {
      const body = bodyById.get(id)
      if (!body) continue
      const bin = this.sediment.add(body)
      if (!bin) continue
      sedimented.push(id)
      this.emitObservation(
        {
          type: "physics-sediment",
          timestamp: this.elapsedSeconds,
          chartType: this.observation.chartType,
          chartId: this.observation.chartId,
          bodyId: id,
          datum: body.datum,
          x: body.x,
          y: body.y,
          binId: bin.id,
          count: bin.count,
          total: bin.total
        },
        observations
      )
    }
    return sedimented
  }

  private sleepingFirstEvictionOrder(): string[] {
    const sleepState = new Map(
      this.world.readState().map((body) => [body.id, body.sleeping])
    )
    const sleeping: string[] = []
    const awake: string[] = []
    for (const id of this.liveBodyOrder) {
      if (sleepState.get(id)) sleeping.push(id)
      else awake.push(id)
    }
    return [...sleeping, ...awake]
  }

  private ensureBodyQuadtree(): Quadtree<PhysicsBodyState> | null {
    if (this.bodyQuadtree && this.bodyQuadtreeRevision === this.revision) {
      return this.bodyQuadtree
    }

    const bodies = this.world.readState()
    if (bodies.length === 0) {
      this.bodyQuadtree = null
      this.maxBodySearchRadius = 0
      this.bodyQuadtreeRevision = this.revision
      return null
    }

    this.maxBodySearchRadius = bodies.reduce(
      (max, body) => Math.max(max, bodySearchRadius(body)),
      0
    )
    this.bodyQuadtree = d3Quadtree<PhysicsBodyState>()
      .x((body) => body.x)
      .y((body) => body.y)
      .addAll(bodies)
    this.bodyQuadtreeRevision = this.revision
    return this.bodyQuadtree
  }
}
