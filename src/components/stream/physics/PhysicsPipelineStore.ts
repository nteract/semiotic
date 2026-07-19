import {
  type PhysicsBodyState,
  type PhysicsColliderSpec,
  type PhysicsKernelEvent,
  type PhysicsKernelOptions,
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
  cloneBodyBudgetOptions,
  cloneColliders,
  cloneQueuedSpawn,
  cloneSpawn,
  normalizeObservationConfig,
  requiredKernelOptions,
  schedulePhysicsSpawns,
  sortQueue,
  type InternalQueuedSpawn,
  type NormalizedObservationConfig,
  type PhysicsPipelineEvictionResult
} from "./physicsPipelineHelpers"
import {
  type UpdateResult,
  UpdateResultTracker
} from "../pipelineUpdateContract"
import { PhysicsBodySpatialIndex } from "./PhysicsBodySpatialIndex"
import { createPhysicsPipelineControls } from "./physicsPipelineControls"
import {
  classifyPhysicsConfigPatch,
  changedPhysicsConfigKeys,
  physicsKernelOptionsEqual,
  PHYSICS_BODY_INVALIDATIONS,
  PHYSICS_MOTION_INVALIDATIONS,
  PHYSICS_STATE_INVALIDATIONS
} from "./physicsPipelineUpdateResults"
import {
  emitPhysicsSimulationStateTransition,
  observePhysicsKernelEvents,
  observePhysicsSensorTransitions,
  removePhysicsSensorPairsForBodies,
  resolvePhysicsSimulationState
} from "./physicsPipelineObservations"
import { evictPhysicsOverflow } from "./physicsPipelineEviction"
import { PhysicsQuiescenceTracker } from "./physicsPipelineQuiescence"

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

export type {
  ChangeSet,
  Invalidation,
  RevisionSet,
  UpdateResult
} from "../pipelineUpdateContract"

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
  /** Raw public config references, used only for no-op classification. */
  private configInput: PhysicsPipelineConfig
  private engineInput?: PhysicsEngineAdapterInput
  private bodySpatialIndex = new PhysicsBodySpatialIndex()
  private elapsedSeconds = 0
  private liveBodyOrder: string[] = []
  private nextSequence = 0
  private observation: NormalizedObservationConfig
  private paused = false
  private queue: InternalQueuedSpawn[] = []
  private revision = 0
  private updateResults = new UpdateResultTracker()
  private sediment: PhysicsSedimentAccumulator
  private simulationState: PhysicsSimulationState = "settled"
  private visible = true
  private world: PhysicsEngineAdapter
  private quiescence = new PhysicsQuiescenceTracker()

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
    this.configInput = { ...config }
    this.bodyBudget = bodyBudget ?? {}
    this.engineInput = engine
    this.observation = normalizeObservationConfig(observation)
    this.sediment = new PhysicsSedimentAccumulator(sediment ?? false)
    this.world = resolvePhysicsEngineAdapter(engine, {
      fixedDt: this.config.fixedDt,
      ...kernel
    })
    this.quiescence.setKernelOptions(kernel)
    if (colliders) this.world.setColliders(cloneColliders(colliders))
  }

  updateConfig(config: PhysicsPipelineConfig): void {
    const changedConfigKeys = changedPhysicsConfigKeys(config, this.configInput)
    const {
      colliders,
      bodyBudget,
      engine,
      kernel,
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
    if (kernel && !physicsKernelOptionsEqual(kernel, this.configInput.kernel)) {
      // Preserve bodies, colliders, constraints, and deterministic state while
      // applying the effective merged kernel options. `gravity` is nested,
      // so retain the adapter's effective vector while applying a config
      // update rather than reconstructing the world from defaults.
      const snapshot = this.world.snapshot()
      const nextOptions: Required<PhysicsKernelOptions> = {
        ...snapshot.options,
        ...kernel,
        gravity: {
          ...snapshot.options.gravity,
          ...kernel.gravity
        }
      }
      this.world.restore({ ...snapshot, options: nextOptions })
      this.quiescence.setKernelOptions(nextOptions)
      this.revision += 1
    }
    if (observation) {
      this.observation = normalizeObservationConfig(
        observation,
        this.observation
      )
    }
    this.sediment.updateConfig(sediment)
    if (colliders) {
      // `updateConfigWithResult` should describe one config mutation rather
      // than report an intermediate standalone collider update.
      this.world.setColliders(cloneColliders(colliders))
      this.revision += 1
    }
    this.configInput = { ...this.configInput, ...config }
    const classification = classifyPhysicsConfigPatch(changedConfigKeys)
    this.updateResults.record(
      { kind: "config", keys: changedConfigKeys },
      classification.invalidations
    )
  }

  /** Additive explicit-result form of {@link updateConfig}. */
  updateConfigWithResult(config: PhysicsPipelineConfig): UpdateResult {
    this.updateConfig(config)
    return this.updateResults.last
  }

  setColliders(colliders: PhysicsColliderSpec[]): void {
    this.world.setColliders(cloneColliders(colliders))
    this.revision += 1
    this.updateResults.record(
      { kind: "config", keys: ["colliders"] },
      classifyPhysicsConfigPatch(["colliders"]).invalidations
    )
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
    this.updateResults.record(
      { kind: "enqueue", count: spawns.length },
      spawns.length ? PHYSICS_BODY_INVALIDATIONS : []
    )
  }

  /** Additive explicit-result form of {@link enqueue}. */
  enqueueWithResult(
    spawn: PhysicsQueuedSpawn | PhysicsQueuedSpawn[],
    pacing?: PhysicsSpawnPacingOptions
  ): UpdateResult {
    this.enqueue(spawn, pacing)
    return this.updateResults.last
  }

  spawnNow(spawn: PhysicsQueuedSpawn): void {
    this.spawnOne(cloneSpawn(spawn))
    this.nextSequence += 1
    this.observeBodyBudget()
    this.evictOverflow()
    this.revision += 1
    this.updateResults.record({ kind: "enqueue", count: 1 }, PHYSICS_BODY_INVALIDATIONS)
  }

  /**
   * Materialize already-due queued spawns without advancing simulation time.
   *
   * Unlike {@link tick} / {@link settleWithObservations}, this runs while
   * paused or hidden so seed bodies (`initialSpawns` with `spawnAt <= elapsed`)
   * appear on the first paint of a paused snapshot frame. Future-paced queue
   * items stay queued. Does not step the kernel.
   */
  materializeDueSpawns(): string[] {
    const revisionBefore = this.revision
    const spawned: string[] = []
    const observations: PhysicsObservationEvent[] = []
    this.spawnDue(spawned, observations)
    if (spawned.length === 0) return spawned
    this.observeBodyBudget(observations)
    this.evictOverflow(observations)
    this.syncSimulationState(observations)
    this.revision += 1
    this.updateResults.record(
      { kind: "enqueue", count: spawned.length },
      this.revision !== revisionBefore ? PHYSICS_BODY_INVALIDATIONS : []
    )
    return spawned
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
    this.quiescence.reset()
    this.sediment.clear()
    this.bodyBudgetObservationKey = "ok"
    this.revision += 1
    this.syncSimulationState()
    this.updateResults.record({ kind: "clear" }, PHYSICS_BODY_INVALIDATIONS)
  }

  tick(deltaSeconds: number): PhysicsPipelineTickResult {
    const revisionBefore = this.revision
    const spawned: string[] = []
    const evicted: string[] = []
    const sedimented: string[] = []
    const events: PhysicsKernelEvent[] = []
    const observations: PhysicsObservationEvent[] = []

    if (this.paused || !this.visible) {
      const result = this.result(
        0,
        spawned,
        evicted,
        sedimented,
        events,
        observations,
        false
      )
      this.updateResults.record({ kind: "tick", count: 0 }, [])
      return result
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

    this.quiescence.refresh(this.world, delta, spawned.length)

    if (
      steps > 0 ||
      spawned.length > 0 ||
      evicted.length > 0 ||
      sedimented.length > 0 ||
      events.length > 0
    ) {
      this.revision += 1
    }
    const result = this.result(
      steps,
      spawned,
      evicted,
      sedimented,
      events,
      observations,
      undefined,
      budget
    )
    this.updateResults.record(
      { kind: "tick", count: steps },
      this.revision !== revisionBefore
        ? spawned.length || evicted.length || sedimented.length
          ? PHYSICS_BODY_INVALIDATIONS
          : PHYSICS_MOTION_INVALIDATIONS
        : []
    )
    return result
  }

  settle(maxSteps = this.config.settleStepLimit): number {
    const revisionBefore = this.revision
    this.spawnDue([], [])
    const steps = this.world.settle(maxSteps, this.config.fixedDt)
    if (steps > 0) this.revision += 1
    this.syncSimulationState()
    this.updateResults.record(
      { kind: "settle", count: steps },
      this.revision !== revisionBefore ? PHYSICS_MOTION_INVALIDATIONS : []
    )
    return steps
  }

  settleWithObservations(
    maxSteps = this.config.settleStepLimit
  ): PhysicsPipelineTickResult {
    const revisionBefore = this.revision
    const spawned: string[] = []
    const evicted: string[] = []
    const sedimented: string[] = []
    const events: PhysicsKernelEvent[] = []
    const observations: PhysicsObservationEvent[] = []

    if (this.paused || !this.visible) {
      const result = this.result(
        0,
        spawned,
        evicted,
        sedimented,
        events,
        observations,
        false
      )
      this.updateResults.record({ kind: "settle", count: 0 }, [])
      return result
    }

    this.spawnDue(spawned, observations)
    const budget = this.observeBodyBudget(observations)
    const overflow = this.evictOverflow(observations)
    evicted.push(...overflow.evicted)
    sedimented.push(...overflow.sedimented)
    this.syncSimulationState(observations)

    let steps = 0
    if (spawned.length > 0) this.quiescence.reset()
    while (steps < maxSteps && !this.atRest()) {
      this.world.step(this.config.fixedDt)
      const stepEvents = this.world.events()
      events.push(...stepEvents)
      this.observeKernelEvents(stepEvents, observations)
      this.observeSensorTransitions(observations)
      steps += 1
      // Break early on sustained quiescence so a bounded settle doesn't spin to
      // the step limit on stragglers that never formally sleep.
      this.quiescence.refresh(this.world, this.config.fixedDt, 0)
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
    const result = this.result(
      steps,
      spawned,
      evicted,
      sedimented,
      events,
      observations,
      undefined,
      budget
    )
    this.updateResults.record(
      { kind: "settle", count: steps },
      this.revision !== revisionBefore
        ? spawned.length || evicted.length || sedimented.length
          ? PHYSICS_BODY_INVALIDATIONS
          : PHYSICS_MOTION_INVALIDATIONS
        : []
    )
    return result
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
    return this.bodySpatialIndex.hitTest(
      this.world,
      this.revision,
      this.liveBodyOrder,
      x,
      y,
      radius
    )
  }

  events(): PhysicsKernelEvent[] {
    return this.world.events()
  }

  allSleeping(): boolean {
    return this.world.allSleeping()
  }

  /**
   * True when the world is done moving — either every body has formally slept,
   * or the whole system has stayed quiescent long enough that never-sleeping
   * stragglers (mutually-leaning bodies, force-equilibrium tethers) should still
   * count as settled. This is the gate for `shouldContinue` and the "settled"
   * simulation state, so it decides when `rerunMS` re-arms.
   */
  atRest(): boolean {
    return this.world.allSleeping() || this.quiescence.isAtRest()
  }

  hasPendingWork(): boolean {
    return this.queue.length > 0 || !this.atRest()
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
    this.updateResults.record({ kind: "update", count: 1 }, ["evidence"])
    return event
  }

  /** Most recent explicit update result for a revision-aware host or tool. */
  getLastUpdateResult(): UpdateResult {
    return this.updateResults.last
  }

  getUpdateSnapshot(): UpdateResult {
    return this.updateResults.last
  }

  subscribeUpdateResult(listener: () => void): () => void {
    return this.updateResults.subscribe(listener)
  }

  version(): number {
    return this.revision
  }

  setPaused(paused: boolean): void {
    const changed = this.paused !== paused
    this.paused = paused
    this.syncSimulationState()
    this.updateResults.record({ kind: "pause" }, changed ? PHYSICS_STATE_INVALIDATIONS : [])
  }

  setVisible(visible: boolean): void {
    const changed = this.visible !== visible
    this.visible = visible
    this.syncSimulationState()
    this.updateResults.record(
      { kind: "visibility" },
      changed ? PHYSICS_STATE_INVALIDATIONS : []
    )
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
    this.updateResults.record(
      { kind: "remove", keys: removed, count: removed.length },
      removed.length ? PHYSICS_BODY_INVALIDATIONS : []
    )
    return removed
  }

  setConstraint(spec: PhysicsSpringSpec): string {
    const id = this.world.setConstraint(spec)
    this.revision += 1
    this.updateResults.record(
      { kind: "constraint", keys: [id] },
      PHYSICS_MOTION_INVALIDATIONS
    )
    return id
  }

  removeConstraint(id: string): void {
    this.world.removeConstraint(id)
    this.revision += 1
    this.updateResults.record(
      { kind: "constraint", keys: [id] },
      PHYSICS_MOTION_INVALIDATIONS
    )
  }

  applyImpulse(id: string, ix: number, iy: number): void {
    this.world.applyImpulse(id, ix, iy)
    this.revision += 1
    this.updateResults.record(
      { kind: "impulse", keys: [id] },
      PHYSICS_MOTION_INVALIDATIONS
    )
  }

  nextRandom(): number {
    return this.world.nextRandom()
  }

  controls(): PhysicsPipelineControlSurface {
    return createPhysicsPipelineControls(this)
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
    this.configInput = {
      ...snapshot.config,
      bodyBudget: cloneBodyBudgetOptions(snapshot.bodyBudget ?? {}),
      kernel: requiredKernelOptions(snapshot.world.options)
    }
    this.bodyBudget = cloneBodyBudgetOptions(snapshot.bodyBudget ?? {})
    this.bodyBudgetObservationKey = "ok"
    this.quiescence.setKernelOptions(snapshot.world.options)
    this.quiescence.reset()
    this.activeSensorPairs = new Set(snapshot.activeSensorPairs)
    this.accumulator = snapshot.accumulator
    this.elapsedSeconds = snapshot.elapsedSeconds
    this.paused = snapshot.paused
    this.queue = snapshot.queue.map(cloneQueuedSpawn).sort(sortQueue)
    this.revision = snapshot.revision
    this.sediment.restore(snapshot.sediment ?? [])
    this.simulationState = snapshot.simulationState ?? resolvePhysicsSimulationState(
      snapshot.paused,
      snapshot.visible,
      snapshot.queue.length > 0,
      snapshot.world.bodies.every((body) => body.sleeping)
    )
    this.liveBodyOrder = snapshot.liveBodyOrder.slice()
    this.visible = snapshot.visible
    this.nextSequence =
      this.queue.reduce((max, spawn) => Math.max(max, spawn.sequence), -1) + 1
    this.world.restore(snapshot.world)
    this.updateResults.record({ kind: "restore" }, PHYSICS_BODY_INVALIDATIONS)
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
        shouldContinueOverride ?? (this.queue.length > 0 || !this.atRest()),
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
    observePhysicsKernelEvents(this.world, events, this.observationContext(observations))
  }

  private observeSensorTransitions(
    observations: PhysicsObservationEvent[]
  ): void {
    this.activeSensorPairs = observePhysicsSensorTransitions(
      this.world,
      this.activeSensorPairs,
      this.observationContext(observations)
    )
  }

  private removeActiveSensorPairsForBodies(bodyIds: Set<string>): void {
    removePhysicsSensorPairsForBodies(this.activeSensorPairs, bodyIds)
  }

  private observationContext(observations?: PhysicsObservationEvent[]) {
    return {
      elapsedSeconds: this.elapsedSeconds,
      observation: this.observation,
      emit: (event: PhysicsObservationEvent) => this.emitObservation(event, observations)
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

  private syncSimulationState(
    observations?: PhysicsObservationEvent[]
  ): void {
    const next = resolvePhysicsSimulationState(
      this.paused,
      this.visible,
      this.queue.length > 0,
      this.atRest()
    )
    if (next === this.simulationState) return
    const previous = this.simulationState
    this.simulationState = next
    emitPhysicsSimulationStateTransition(
      previous,
      next,
      this.observationContext(observations)
    )
  }

  private evictOverflow(
    observations?: PhysicsObservationEvent[]
  ): PhysicsPipelineEvictionResult {
    const { evicted, sedimented, liveBodyOrder } = evictPhysicsOverflow(
      this.world,
      this.sediment,
      this.config.eviction,
      this.config.bodyLimit,
      this.liveBodyOrder,
      this.observationContext(observations)
    )
    if (evicted.length > 0) {
      this.liveBodyOrder = liveBodyOrder
      this.removeActiveSensorPairsForBodies(new Set(evicted))
    }
    return { evicted, sedimented }
  }
}
