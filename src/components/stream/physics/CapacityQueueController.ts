/** FIFO capacity-queue controller: stateful region service riding StreamPhysicsFrame's live heartbeat. */

import type { PhysicsBodyState, PhysicsColliderBodyFilter } from "./PhysicsKernel"
import type {
  PhysicsController,
  PhysicsControllerTickContext
} from "./PhysicsControllers"
import type {
  CapacityBlockedEntry as BlockedEntry,
  CapacityMetricSlice,
  CapacityQueueAbandonedInfo,
  CapacityQueueControllerOptions,
  CapacityQueueEntry as QueueEntry,
  CapacityQueueProcessedInfo,
  CapacityQueueSnapshot,
  CapacityQueueVisitInfo,
  CapacityQueueWindowSnapshot
} from "./CapacityQueueTypes"

function readUnitWork(
  body: PhysicsBodyState,
  unitAccessor: CapacityQueueControllerOptions["unitAccessor"]
): number {
  if (typeof unitAccessor === "function") {
    const value = unitAccessor(body)
    return Number.isFinite(value) && value > 0 ? Number(value) : 1
  }
  const datum = body.datum as Record<string, unknown> | undefined
  if (unitAccessor && datum && typeof datum === "object") {
    const value = Number(datum[unitAccessor])
    if (Number.isFinite(value) && value > 0) return value
  }
  const work = Number(datum?.work ?? datum?.reviewWork ?? datum?.value)
  if (Number.isFinite(work) && work > 0) return work
  return 1
}

function readCapacityJobId(
  body: PhysicsBodyState,
  accessor: CapacityQueueControllerOptions["jobKey"]
): string {
  if (typeof accessor === "function") {
    const value = accessor(body)
    if (value != null && String(value).length > 0) return String(value)
  } else if (accessor) {
    const datumValue = valueAtPath(body.datum, accessor)
    const bodyValue = valueAtPath(body, accessor)
    const value = datumValue ?? bodyValue
    if (value != null && String(value).length > 0) return String(value)
  }
  return body.id
}

function quantile(sorted: readonly number[], probability: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const position = Math.max(0, Math.min(1, probability)) * (sorted.length - 1)
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const fraction = position - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction
}

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return undefined
  let current = source
  for (const part of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function bodyMatchesFilter(
  body: PhysicsBodyState,
  filter: PhysicsColliderBodyFilter | undefined
): boolean {
  if (!filter) return true
  if (typeof filter === "function") return filter(body)

  const value = valueAtPath(body, filter.property)
  if ("equals" in filter && !Object.is(value, filter.equals)) return false
  if ("notEquals" in filter && Object.is(value, filter.notEquals)) return false
  if (
    filter.oneOf &&
    !filter.oneOf.some((candidate) => Object.is(value, candidate))
  ) {
    return false
  }
  if (
    filter.notOneOf &&
    filter.notOneOf.some((candidate) => Object.is(value, candidate))
  ) {
    return false
  }
  return true
}

/** FIFO region service with visit evidence, overflow staging, and live metrics. */
export function createCapacityQueueController(
  options: CapacityQueueControllerOptions
): PhysicsController {
  const regionId = options.regionId
  const unitsPerSecond = Math.max(0, options.unitsPerSecond)
  const queueLayout = options.queueLayout ?? "lane"
  const slotSpacing = options.queueSlotSpacing ?? 14
  const stiffness = options.queueStiffness ?? 0.35
  const maxQueue = Number.isFinite(options.maxQueue)
    ? Math.max(0, Math.floor(Number(options.maxQueue)))
    : Number.POSITIVE_INFINITY
  const metricWindowSeconds = Math.max(0.25, options.metricWindowSeconds ?? 30)
  const snapshotIntervalSeconds = Math.max(
    1 / 60,
    options.snapshotIntervalSeconds ?? 0.25
  )
  const releaseImpulse = options.releaseImpulse ?? { x: 90, y: 0 }
  const queue = new Map<string, QueueEntry>()
  const blocked = new Map<string, BlockedEntry>()
  const activeVisits = new Map<string, CapacityQueueVisitInfo>()
  const visitCountByJob = new Map<string, number>()
  const lastBodyByJob = new Map<string, PhysicsBodyState>()
  const queuedJobByBodyId = new Map<string, string>()
  const blockedJobByBodyId = new Map<string, string>()
  const metricSlices: CapacityMetricSlice[] = []
  let sequence = 0
  let rankByBodyId = new Map<string, number>()
  let blockedRankByBodyId = new Map<string, number>()
  let queueLength = 0
  let processedCount = 0
  let currentTime = 0
  let metricStartedAt: number | null = null
  let arrivalCount = 0
  let admittedCount = 0
  let admittedWork = 0
  let processedWork = 0
  let completedWork = 0
  let blockedCount = 0
  let abandonedCount = 0
  let abandonedWork = 0
  let peakQueueDepth = 0
  let peakRemainingWork = 0
  let completedQueueSeconds = 0
  let metricRevision = 0
  let lastMetricBucket = -1
  let clockInitialized = false

  function inRegion(
    bodyId: string,
    getRegionState: PhysicsControllerTickContext["getRegionState"]
  ): boolean {
    const state = getRegionState(bodyId)
    if (!state) return false
    return state.activeRegionIds.includes(regionId)
  }

  function markMetricChange(): void {
    metricRevision += 1
  }

  function visitInfo(entry: QueueEntry): CapacityQueueVisitInfo {
    return {
      bodyId: entry.bodyId,
      jobId: entry.jobId,
      visitId: entry.visitId,
      visit: entry.visit,
      regionId,
      work: entry.total,
      queuedAt: entry.queuedAt
    }
  }

  function recordQueued(
    body: PhysicsBodyState,
    entry: QueueEntry,
    ctx: PhysicsControllerTickContext
  ): void {
    const info = visitInfo(entry)
    options.onQueued?.(body, info)
    ctx.controls.recordObservation({
      type: "physics-capacity-queued",
      bodyId: body.id,
      datum: body.datum,
      x: body.x,
      y: body.y,
      regionId,
      work: entry.total,
      jobId: entry.jobId,
      visitId: entry.visitId,
      visit: entry.visit,
      queuedAt: entry.queuedAt,
      queueDepth: queue.size
    })
  }

  function admit(
    body: PhysicsBodyState,
    info: CapacityQueueVisitInfo,
    ctx: PhysicsControllerTickContext,
    order: number
  ): QueueEntry {
    const entry: QueueEntry = {
      bodyId: body.id,
      jobId: info.jobId,
      visitId: info.visitId,
      visit: info.visit,
      remaining: info.work,
      total: info.work,
      queuedAt: info.queuedAt,
      sequence: order
    }
    queue.set(info.jobId, entry)
    blockedJobByBodyId.delete(body.id)
    queuedJobByBodyId.set(body.id, info.jobId)
    admittedCount += 1
    admittedWork += info.work
    markMetricChange()
    recordQueued(body, entry, ctx)
    return entry
  }

  function admitBlocked(ctx: PhysicsControllerTickContext): void {
    if (queue.size >= maxQueue || blocked.size === 0) return
    const waiting = Array.from(blocked.values()).sort(
      (a, b) => a.sequence - b.sequence
    )
    for (const entry of waiting) {
      if (queue.size >= maxQueue) break
      const body = lastBodyByJob.get(entry.jobId)
      if (!body || !activeVisits.has(entry.jobId)) {
        blocked.delete(entry.jobId)
        continue
      }
      blocked.delete(entry.jobId)
      blockedJobByBodyId.delete(entry.bodyId)
      admit(body, entry, ctx, entry.sequence)
    }
  }

  function remainingQueuedWork(): number {
    let total = 0
    for (const entry of queue.values()) total += entry.remaining
    return total
  }

  function currentBlockedWork(): number {
    let total = 0
    for (const entry of blocked.values()) total += entry.work
    return total
  }

  function updatePeaks(): void {
    peakQueueDepth = Math.max(peakQueueDepth, queue.size)
    peakRemainingWork = Math.max(peakRemainingWork, remainingQueuedWork())
  }

  function rebuildRanks(): void {
    const ordered = Array.from(queue.values()).sort(
      (a, b) => a.sequence - b.sequence
    )
    rankByBodyId = new Map(ordered.map((entry, index) => [entry.bodyId, index]))
    const blockedEntries = Array.from(blocked.values()).sort(
      (a, b) => a.sequence - b.sequence
    )
    blockedRankByBodyId = new Map(
      blockedEntries.map((entry, index) => [entry.bodyId, index])
    )
    queueLength = ordered.length
  }

  function appendMetricSlice(slice: CapacityMetricSlice): void {
    if (
      slice.end > slice.start ||
      slice.arrivals > 0 ||
      slice.completions > 0 ||
      slice.processedWork > 0
    ) {
      metricSlices.push(slice)
    }
    const cutoff = currentTime - metricWindowSeconds
    while (metricSlices.length > 0 && metricSlices[0].end < cutoff) {
      metricSlices.shift()
    }
  }

  function windowSnapshot(): CapacityQueueWindowSnapshot {
    const cutoff = currentTime - metricWindowSeconds
    const seconds = Math.max(
      0,
      Math.min(
        metricWindowSeconds,
        currentTime - (metricStartedAt ?? currentTime)
      )
    )
    let arrivals = 0
    let arrivalWork = 0
    let completions = 0
    let completed = 0
    let processed = 0
    for (const slice of metricSlices) {
      if (slice.end < cutoff) continue
      arrivals += slice.arrivals
      arrivalWork += slice.arrivalWork
      completions += slice.completions
      completed += slice.completedWork
      const duration = slice.end - slice.start
      if (duration <= 0 || slice.start >= cutoff) {
        processed += slice.processedWork
      } else {
        const overlap = Math.max(0, slice.end - cutoff)
        processed += slice.processedWork * Math.min(1, overlap / duration)
      }
    }
    const arrivalsPerSecond = seconds > 0 ? arrivals / seconds : 0
    const throughputPerSecond = seconds > 0 ? completions / seconds : 0
    const arrivalWorkRate = seconds > 0 ? arrivalWork / seconds : 0
    return {
      seconds,
      arrivals,
      arrivalWork,
      completions,
      completedWork: completed,
      processedWork: processed,
      arrivalsPerSecond,
      throughputPerSecond,
      utilization:
        seconds > 0 && unitsPerSecond > 0
          ? Math.max(0, Math.min(1, processed / (unitsPerSecond * seconds)))
          : 0,
      pressure: unitsPerSecond > 0 ? arrivalWorkRate / unitsPerSecond : 0
    }
  }

  return {
    id: options.id ?? `capacity-queue:${regionId}`,
    continuous: options.continuous !== false,
    tick: (ctx) => {
      const bodies = ctx.controls.readBodies()
      const bodyById = new Map<string, PhysicsBodyState>()
      const presentByJob = new Map<string, PhysicsBodyState[]>()
      for (const body of bodies) {
        bodyById.set(body.id, body)
        if (!inRegion(body.id, ctx.getRegionState)) continue
        if (!bodyMatchesFilter(body, options.bodyFilter)) continue
        const jobId = readCapacityJobId(body, options.jobKey)
        const candidates = presentByJob.get(jobId) ?? []
        candidates.push(body)
        presentByJob.set(jobId, candidates)
      }

      const dt = Number.isFinite(ctx.dt) ? Math.max(0, ctx.dt) : 0
      if (!clockInitialized) {
        const elapsed = Number.isFinite(ctx.elapsed)
          ? Math.max(0, ctx.elapsed)
          : dt
        currentTime = Math.max(0, elapsed - dt)
        clockInitialized = true
      }
      const tickStart = currentTime
      const tickEnd = tickStart + dt
      currentTime = tickEnd
      metricStartedAt =
        metricStartedAt == null
          ? tickStart
          : Math.min(metricStartedAt, tickStart)
      const metricSlice: CapacityMetricSlice = {
        start: tickStart,
        end: tickEnd,
        arrivals: 0,
        arrivalWork: 0,
        completions: 0,
        completedWork: 0,
        processedWork: 0
      }

      const selectedByJob = new Map<string, PhysicsBodyState>()
      for (const [jobId, candidates] of presentByJob) {
        const activeBodyId = activeVisits.get(jobId)?.bodyId
        const selected =
          candidates.find((candidate) => candidate.id === activeBodyId) ??
          candidates[0]
        selectedByJob.set(jobId, selected)
        lastBodyByJob.set(jobId, selected)
      }

      for (const [jobId, active] of activeVisits) {
        if (selectedByJob.has(jobId)) continue
        const queued = queue.get(jobId)
        const body = bodyById.get(active.bodyId) ?? lastBodyByJob.get(jobId)
        if (queued) {
          queue.delete(jobId)
          queuedJobByBodyId.delete(queued.bodyId)
          abandonedCount += 1
          abandonedWork += queued.remaining
          markMetricChange()
          const info: CapacityQueueAbandonedInfo = {
            ...visitInfo(queued),
            abandonedAt: currentTime,
            remainingWork: queued.remaining,
            queueSeconds: Math.max(0, currentTime - queued.queuedAt)
          }
          if (body) options.onAbandoned?.(body, info)
          ctx.controls.recordObservation({
            type: "physics-capacity-abandoned",
            bodyId: active.bodyId,
            datum: body?.datum,
            x: body?.x,
            y: body?.y,
            regionId,
            work: queued.total,
            remainingWork: queued.remaining,
            jobId,
            visitId: queued.visitId,
            visit: queued.visit,
            queuedAt: queued.queuedAt,
            completedAt: currentTime,
            queueSeconds: info.queueSeconds,
            queueDepth: queue.size
          })
        }
        blocked.delete(jobId)
        blockedJobByBodyId.delete(active.bodyId)
        activeVisits.delete(jobId)
        lastBodyByJob.delete(jobId)
      }

      for (const [jobId, body] of selectedByJob) {
        if (activeVisits.has(jobId)) continue
        const visit = (visitCountByJob.get(jobId) ?? 0) + 1
        visitCountByJob.set(jobId, visit)
        const work = readUnitWork(body, options.unitAccessor)
        const info: CapacityQueueVisitInfo = {
          bodyId: body.id,
          jobId,
          visitId: `${regionId}:${jobId}:${visit}`,
          visit,
          regionId,
          work,
          queuedAt: currentTime
        }
        activeVisits.set(jobId, info)
        arrivalCount += 1
        metricSlice.arrivals += 1
        metricSlice.arrivalWork += work
        const order = sequence++
        if (queue.size < maxQueue) {
          admit(body, info, ctx, order)
        } else {
          const blockedEntry: BlockedEntry = {
            ...info,
            blockedAt: currentTime,
            sequence: order
          }
          blocked.set(jobId, blockedEntry)
          blockedJobByBodyId.set(body.id, jobId)
          blockedCount += 1
          markMetricChange()
          options.onBlocked?.(body, blockedEntry)
          ctx.controls.recordObservation({
            type: "physics-capacity-blocked",
            bodyId: body.id,
            datum: body.datum,
            x: body.x,
            y: body.y,
            regionId,
            work,
            jobId,
            visitId: info.visitId,
            visit,
            queuedAt: currentTime,
            queueDepth: queue.size,
            blockedDepth: blocked.size
          })
        }
      }

      admitBlocked(ctx)
      updatePeaks()

      const ordered = Array.from(queue.values()).sort(
        (a, b) => a.sequence - b.sequence
      )
      let budget = unitsPerSecond * dt

      for (const entry of ordered) {
        if (!(budget > 0)) break
        const take = Math.min(entry.remaining, budget)
        entry.remaining -= take
        budget -= take
        processedWork += take
        metricSlice.processedWork += take
        if (entry.remaining > 1e-6) continue

        queue.delete(entry.jobId)
        queuedJobByBodyId.delete(entry.bodyId)
        processedCount += 1
        completedWork += entry.total
        metricSlice.completions += 1
        metricSlice.completedWork += entry.total
        const queueSeconds = Math.max(0, currentTime - entry.queuedAt)
        completedQueueSeconds += queueSeconds
        markMetricChange()
        const body = bodyById.get(entry.bodyId)
        if (!body) continue
        ctx.controls.applyImpulse(
          entry.bodyId,
          releaseImpulse.x ?? 0,
          releaseImpulse.y ?? 0
        )
        const info: CapacityQueueProcessedInfo = {
          ...visitInfo(entry),
          completedAt: currentTime,
          queueSeconds
        }
        options.onProcessed?.(body, info)
        ctx.controls.recordObservation({
          type: "physics-capacity-processed",
          bodyId: entry.bodyId,
          datum: body.datum,
          x: body.x,
          y: body.y,
          regionId,
          work: entry.total,
          jobId: entry.jobId,
          visitId: entry.visitId,
          visit: entry.visit,
          queuedAt: entry.queuedAt,
          completedAt: currentTime,
          queueSeconds,
          queueDepth: queue.size
        })
      }

      admitBlocked(ctx)
      updatePeaks()
      rebuildRanks()
      appendMetricSlice(metricSlice)
      const bucket = Math.floor(currentTime / snapshotIntervalSeconds)
      if (bucket !== lastMetricBucket) {
        lastMetricBucket = bucket
        markMetricChange()
      }
    },
    getSnapshot: (): CapacityQueueSnapshot => {
      const remainingWork = remainingQueuedWork()
      const blockedWork = currentBlockedWork()
      const depth = queue.size
      const ages = Array.from(queue.values())
        .map((entry) => Math.max(0, currentTime - entry.queuedAt))
        .sort((a, b) => a - b)
      const ageTotal = ages.reduce((sum, age) => sum + age, 0)
      return {
        regionId,
        queueDepth: depth,
        processedCount,
        unitsPerSecond,
        remainingWork,
        meanRemainingWork: depth > 0 ? remainingWork / depth : 0,
        waitingWork: remainingWork + blockedWork,
        blockedDepth: blocked.size,
        blockedWork,
        arrivalCount,
        admittedCount,
        admittedWork,
        processedWork,
        completedWork,
        blockedCount,
        abandonedCount,
        abandonedWork,
        peakQueueDepth,
        peakRemainingWork,
        queueAge: {
          count: ages.length,
          meanSeconds: ages.length > 0 ? ageTotal / ages.length : 0,
          p50Seconds: quantile(ages, 0.5),
          p95Seconds: quantile(ages, 0.95),
          oldestSeconds: ages.at(-1) ?? 0
        },
        meanCompletedQueueSeconds:
          processedCount > 0 ? completedQueueSeconds / processedCount : 0,
        window: windowSnapshot(),
        simulatedAt: currentTime,
        metricRevision
      }
    },
    bodyForce: (context) => {
      if (queueLayout === "none") return null
      const queuedJobId = queuedJobByBodyId.get(context.body.id)
      const blockedJobId = blockedJobByBodyId.get(context.body.id)
      const entry = queuedJobId ? queue.get(queuedJobId) : undefined
      const blockedEntry = blockedJobId ? blocked.get(blockedJobId) : undefined
      if (!entry && !blockedEntry) return null
      const rank = entry
        ? rankByBodyId.get(context.body.id)
        : blockedRankByBodyId.get(context.body.id)
      if (rank == null) return null

      // Stack queued bodies slightly upstream so release is visible.
      let shape: { x: number; y: number; width: number } | undefined
      const regions = context.regions
      if (regions) {
        for (let i = 0; i < regions.length; i += 1) {
          if (regions[i].id === regionId) {
            const candidate = regions[i].shape
            if (candidate && candidate.type === "aabb") {
              shape = candidate
            }
            break
          }
        }
      }
      if (!shape) {
        // Soft hold: damp forward motion while queued.
        return { x: -Math.sign(context.body.vx || 1) * 8, y: 0 }
      }

      const slotX = blockedEntry
        ? shape.x - shape.width * 0.44
        : shape.x - shape.width * 0.22 - rank * (slotSpacing * 0.15)
      const slotY =
        shape.y -
        ((rank - ((blockedEntry ? blocked.size : queueLength) - 1) / 2) *
          slotSpacing) /
          Math.max(1, Math.sqrt(blockedEntry ? blocked.size : queueLength))
      const dx = slotX - context.body.x
      const dy = slotY - context.body.y
      return {
        x: dx * stiffness,
        y: dy * stiffness * 0.85
      }
    }
  }
}
