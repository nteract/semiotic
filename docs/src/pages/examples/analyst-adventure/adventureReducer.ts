import type {
  AdventureAction,
  AdventureChoiceEffect,
  AdventureChoiceOutcome,
  AdventureCondition,
  AdventureEvent,
  AdventureInputType,
  AdventureSnapshot,
  AnalystAdventureState,
  RoomId,
} from "./adventureTypes"
import {
  getAvailableChoices,
  getAvailableDestinations,
  getEvidenceTemplate,
  isAdventureChoiceDisabled,
  roomRegistry,
} from "./roomRegistry"
import {
  ANALYST_ADVENTURE_SEED,
  eventTimeForIndex,
  hintFlagForRoom,
  materializeEvidence,
} from "./storySeed1984"

const ORDINARY_SECRET_ANNOTATIONS = [
  "executive-cached-roof",
  "records-archivist-2",
  "map-service-tunnel",
  "server-presentation-daemon",
] as const

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

function cloneEvidence(
  evidence: AnalystAdventureState["evidence"],
): AnalystAdventureState["evidence"] {
  return evidence.map((artifact) => ({
    ...artifact,
    provenance: { ...artifact.provenance },
    chartConfig: artifact.chartConfig ? structuredClone(artifact.chartConfig) : undefined,
  }))
}

export function snapshotAdventureState(
  state: Pick<
    AnalystAdventureState,
    | "seed"
    | "currentRoomId"
    | "visitedRoomIds"
    | "completedRoomIds"
    | "evidence"
    | "credibility"
    | "hintsUsed"
    | "inspectedDatumIds"
    | "activatedAnnotationIds"
    | "secretFragments"
    | "flags"
    | "endingId"
  >,
): AdventureSnapshot {
  return {
    seed: state.seed,
    currentRoomId: state.currentRoomId,
    visitedRoomIds: [...state.visitedRoomIds],
    completedRoomIds: [...state.completedRoomIds],
    evidence: cloneEvidence(state.evidence),
    credibility: state.credibility,
    hintsUsed: state.hintsUsed,
    inspectedDatumIds: [...state.inspectedDatumIds],
    activatedAnnotationIds: [...state.activatedAnnotationIds],
    secretFragments: [...state.secretFragments],
    flags: { ...state.flags },
    ...(state.endingId ? { endingId: state.endingId } : {}),
  }
}

export function createInitialAdventureState(): AnalystAdventureState {
  return {
    seed: ANALYST_ADVENTURE_SEED,
    currentRoomId: "executive-suite",
    visitedRoomIds: ["executive-suite"],
    completedRoomIds: [],
    evidence: [],
    credibility: 100,
    hintsUsed: 0,
    inspectedDatumIds: [],
    activatedAnnotationIds: [],
    secretFragments: [],
    flags: { storyStarted: false },
    path: [],
  }
}

function stateFromSnapshot(
  snapshot: AdventureSnapshot,
  path: AdventureEvent[],
): AnalystAdventureState {
  return {
    ...snapshotAdventureState(snapshot),
    path,
  }
}

function eventTypeForAction(
  action: Exclude<AdventureAction, { type: "RESTART" }>,
): AdventureEvent["type"] {
  switch (action.type) {
    case "START":
      return "start"
    case "CHOOSE":
      return "choice"
    case "NAVIGATE":
      return "navigation"
    case "DEBUG_WARP":
      return "navigation"
    case "ACTIVATE_ANNOTATION":
      return "annotation"
    case "USE_HINT":
      return "hint"
    case "INSPECT_DATUM":
      return "inspection"
    case "SHOW_SETTLED_PROJECTION":
      return "projection"
    case "REWIND":
      return "rewind"
  }
}

function commit(
  state: AnalystAdventureState,
  action: Exclude<AdventureAction, { type: "RESTART" }>,
  nextSnapshot: AdventureSnapshot,
): AnalystAdventureState {
  const before = snapshotAdventureState(state)
  const after = snapshotAdventureState(nextSnapshot)
  const eventIndex = state.path.length + 1
  const event: AdventureEvent = {
    id: `event-${String(eventIndex).padStart(4, "0")}`,
    type: eventTypeForAction(action),
    occurredAt: eventTimeForIndex(eventIndex),
    action,
    before,
    after,
  }
  return stateFromSnapshot(after, [...state.path, event])
}

function conditionMatches(
  condition: AdventureCondition | undefined,
  state: AnalystAdventureState,
): boolean {
  if (!condition || condition.type === "always") return true
  if (condition.type === "flag") {
    return Boolean(state.flags[condition.flag]) === (condition.value ?? true)
  }
  const evidenceIds = new Set(state.evidence.map((artifact) => artifact.id))
  if (condition.type === "all-evidence") {
    return condition.evidenceIds.every((id) => evidenceIds.has(id))
  }
  return evidenceIds.size >= condition.count
}

function resolveOutcome(
  outcomes: AdventureChoiceOutcome[],
  state: AnalystAdventureState,
): AdventureChoiceEffect | undefined {
  return outcomes.find((outcome) => conditionMatches(outcome.when, state))?.effect
}

function addEvidenceToSnapshot(
  snapshot: AdventureSnapshot,
  evidenceIds: readonly string[],
): AdventureSnapshot {
  const existing = new Set(snapshot.evidence.map((artifact) => artifact.id))
  const additions = evidenceIds
    .filter((id) => !existing.has(id))
    .map((id) => {
      const template = getEvidenceTemplate(id)
      return materializeEvidence(
        template,
        Boolean(snapshot.flags[hintFlagForRoom(template.roomId)]),
      )
    })
  return {
    ...snapshot,
    evidence: [...snapshot.evidence, ...additions],
  }
}

function applyChoiceEffect(
  state: AnalystAdventureState,
  effect: AdventureChoiceEffect,
): AdventureSnapshot {
  let next = snapshotAdventureState(state)

  if (effect.evidenceIds?.length) {
    next = addEvidenceToSnapshot(next, effect.evidenceIds)
  }
  if (effect.completeRoom) {
    next.completedRoomIds = unique([...next.completedRoomIds, state.currentRoomId])
  }
  if (effect.credibilityDelta) {
    next.credibility = Math.max(0, Math.min(100, next.credibility + effect.credibilityDelta))
  }
  if (effect.setFlags) {
    next.flags = { ...next.flags, ...effect.setFlags }
  }
  if (effect.secretFragments) {
    next.secretFragments = [...next.secretFragments, ...effect.secretFragments]
  }
  if (effect.activateAnnotationId) {
    next.activatedAnnotationIds = unique([
      ...next.activatedAnnotationIds,
      effect.activateAnnotationId,
    ])
  }
  if (effect.navigateTo) {
    next.currentRoomId = effect.navigateTo
    next.visitedRoomIds = unique([...next.visitedRoomIds, effect.navigateTo])
  }
  if (effect.endingId) next.endingId = effect.endingId

  return next
}

function findAnnotation(roomId: RoomId, annotationId: string) {
  return roomRegistry[roomId].secretAnnotations.find((annotation) => annotation.id === annotationId)
}

function activateAnnotationSnapshot(
  state: AnalystAdventureState,
  annotationId: string,
): AdventureSnapshot | undefined {
  const annotation = findAnnotation(state.currentRoomId, annotationId)
  if (!annotation) return undefined

  const alreadyActivated = state.activatedAnnotationIds.includes(annotationId)
  const isDaemonSecondPhase =
    annotationId === "server-presentation-daemon" &&
    alreadyActivated &&
    state.flags.hasTunnelMap &&
    !state.flags.vaultUnlocked

  if (alreadyActivated && !isDaemonSecondPhase) return undefined

  const next = snapshotAdventureState(state)
  next.activatedAnnotationIds = unique([...next.activatedAnnotationIds, annotationId])
  if (!alreadyActivated && annotation.fragment) {
    next.secretFragments.push(annotation.fragment)
  }
  if (annotation.flag) next.flags[annotation.flag] = true

  if (annotationId === "server-presentation-daemon") {
    next.flags.daemonAnnotated = true
    if (next.flags.hasTunnelMap) {
      next.flags.vaultUnlocked = true
      next.flags.daemonNeedsTunnel = false
      next.secretFragments.push("Z", "Y")
    } else {
      next.flags.daemonNeedsTunnel = true
    }
  }

  const foundEveryOrdinaryAnnotation = ORDINARY_SECRET_ANNOTATIONS.every((id) =>
    next.activatedAnnotationIds.includes(id),
  )
  if (foundEveryOrdinaryAnnotation) {
    next.flags.annotationCabalFound = true
  }

  if (
    annotationId === "server-presentation-daemon" &&
    next.flags.hasTunnelMap &&
    next.flags.vaultUnlocked
  ) {
    next.currentRoomId = "forecast-vault"
    next.visitedRoomIds = unique([...next.visitedRoomIds, "forecast-vault"])
  }

  if (annotationId === "vault-janitor") {
    next.completedRoomIds = unique([...next.completedRoomIds, "forecast-vault"])
    next.endingId = "janitors-monte-carlo"
  }

  return next
}

function rewindSnapshot(state: AnalystAdventureState): AdventureSnapshot | undefined {
  if (state.endingId) {
    const endingEvent = [...state.path]
      .reverse()
      .find((event) => !event.before.endingId && event.after.endingId === state.endingId)
    return endingEvent ? snapshotAdventureState(endingEvent.before) : undefined
  }

  const roomEntryEvent = [...state.path]
    .reverse()
    .find(
      (event) =>
        event.type !== "rewind" &&
        event.before.currentRoomId !== event.after.currentRoomId &&
        event.after.currentRoomId === state.currentRoomId,
    )
  return roomEntryEvent ? snapshotAdventureState(roomEntryEvent.before) : undefined
}

export function adventureReducer(
  state: AnalystAdventureState,
  action: AdventureAction,
): AnalystAdventureState {
  if (action.type === "RESTART") return createInitialAdventureState()

  if (action.type === "REWIND") {
    const target = rewindSnapshot(state)
    return target ? commit(state, action, target) : state
  }

  // Secret debug warps work even after an ending (otherwise the freeze below
  // would leave you stuck on the end card). Always produce a new path event so
  // re-clicking the same room still mutates state.
  if (action.type === "DEBUG_WARP") {
    const next = snapshotAdventureState(state)
    next.flags.storyStarted = true
    next.flags.debugWarpNonce = (Number(state.flags.debugWarpNonce) || 0) + 1
    delete next.endingId
    next.currentRoomId = action.roomId
    next.visitedRoomIds = unique([...next.visitedRoomIds, action.roomId])
    return commit(state, action, next)
  }

  if (state.endingId) return state

  switch (action.type) {
    case "START": {
      if (state.flags.storyStarted) return state
      const next = snapshotAdventureState(state)
      next.flags.storyStarted = true
      return commit(state, action, next)
    }
    case "CHOOSE": {
      if (!state.flags.storyStarted) return state
      const choice = getAvailableChoices(state).find(
        (candidate) => candidate.id === action.choiceId,
      )
      if (!choice || isAdventureChoiceDisabled(state, choice.id)) return state
      const effect = resolveOutcome(choice.outcomes, state)
      if (!effect) return state
      return commit(state, action, applyChoiceEffect(state, effect))
    }
    case "NAVIGATE": {
      if (!getAvailableDestinations(state).includes(action.roomId)) return state
      const next = snapshotAdventureState(state)
      next.currentRoomId = action.roomId
      next.visitedRoomIds = unique([...next.visitedRoomIds, action.roomId])
      return commit(state, action, next)
    }
    case "ACTIVATE_ANNOTATION": {
      if (!state.flags.storyStarted) return state
      const next = activateAnnotationSnapshot(state, action.annotationId)
      return next ? commit(state, action, next) : state
    }
    case "USE_HINT": {
      if (
        !state.flags.storyStarted ||
        action.roomId !== state.currentRoomId ||
        state.flags[hintFlagForRoom(action.roomId)]
      ) {
        return state
      }
      const next = snapshotAdventureState(state)
      next.hintsUsed += 1
      next.flags[hintFlagForRoom(action.roomId)] = true
      return commit(state, action, next)
    }
    case "INSPECT_DATUM": {
      if (!state.flags.storyStarted || state.inspectedDatumIds.includes(action.datumId)) {
        return state
      }
      const next = snapshotAdventureState(state)
      next.inspectedDatumIds.push(action.datumId)
      next.flags[`inspected-with:${action.inputType}`] = true
      return commit(state, action, next)
    }
    case "SHOW_SETTLED_PROJECTION": {
      // Visual only — parks the board and unlocks option 2. Evidence is claimed
      // when the player selects “Read the settled projection…”.
      if (state.currentRoomId !== "forecast-vault" || state.flags.settledProjectionShown) {
        return state
      }
      const next = snapshotAdventureState(state)
      next.flags.settledProjectionShown = true
      return commit(state, action, next)
    }
  }
}

export const adventureActions = {
  start: (): AdventureAction => ({ type: "START" }),
  choose: (choiceId: string): AdventureAction => ({
    type: "CHOOSE",
    choiceId,
  }),
  navigate: (roomId: RoomId): AdventureAction => ({
    type: "NAVIGATE",
    roomId,
  }),
  debugWarp: (roomId: RoomId): AdventureAction => ({
    type: "DEBUG_WARP",
    roomId,
  }),
  activateAnnotation: (annotationId: string): AdventureAction => ({
    type: "ACTIVATE_ANNOTATION",
    annotationId,
  }),
  useHint: (roomId: RoomId): AdventureAction => ({
    type: "USE_HINT",
    roomId,
  }),
  inspectDatum: (datumId: string, inputType: AdventureInputType = "pointer"): AdventureAction => ({
    type: "INSPECT_DATUM",
    datumId,
    inputType,
  }),
  showSettledProjection: (): AdventureAction => ({
    type: "SHOW_SETTLED_PROJECTION",
  }),
  rewind: (): AdventureAction => ({ type: "REWIND" }),
  restart: (): AdventureAction => ({ type: "RESTART" }),
} as const
