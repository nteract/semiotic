export type PhysicsBodyBudgetState = "ok" | "warning" | "overflow"

export type PhysicsBodyBudgetAction =
  | "continue"
  | "evict"
  | "retain"
  | "sediment"

export interface PhysicsBodyBudgetOptions {
  warnAt?: number
}

export interface PhysicsBodyBudgetInput {
  bodyLimit?: number
  engineMaxBodiesHint?: number
  evictionEnabled?: boolean
  liveBodies: number
  queuedBodies?: number
  sedimentEnabled?: boolean
  options?: false | PhysicsBodyBudgetOptions
}

export interface PhysicsBodyBudgetDecision {
  action: PhysicsBodyBudgetAction
  bodyLimit?: number
  engineMaxBodiesHint?: number
  liveBodies: number
  overflow: number
  projectedBodies: number
  queuedBodies: number
  state: PhysicsBodyBudgetState
  warnAt?: number
}

function finitePositiveInteger(value: unknown): number | undefined {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return undefined
  return Math.floor(number)
}

function resolveWarnAt(
  bodyLimit: number | undefined,
  engineMaxBodiesHint: number | undefined,
  options: false | PhysicsBodyBudgetOptions | undefined
): number | undefined {
  if (options === false) return undefined
  const explicit = finitePositiveInteger(options?.warnAt)
  if (explicit != null) return explicit
  if (bodyLimit != null) return Math.max(1, Math.floor(bodyLimit * 0.8))
  if (engineMaxBodiesHint != null) {
    return Math.max(1, Math.floor(engineMaxBodiesHint * 0.8))
  }
  return undefined
}

export function evaluatePhysicsBodyBudget(
  input: PhysicsBodyBudgetInput
): PhysicsBodyBudgetDecision {
  const liveBodies = Math.max(0, Math.floor(input.liveBodies))
  const queuedBodies = Math.max(0, Math.floor(input.queuedBodies ?? 0))
  const projectedBodies = liveBodies + queuedBodies
  const bodyLimit = finitePositiveInteger(input.bodyLimit)
  const engineMaxBodiesHint = finitePositiveInteger(input.engineMaxBodiesHint)
  const warnAt = resolveWarnAt(bodyLimit, engineMaxBodiesHint, input.options)
  const overflow = bodyLimit == null ? 0 : Math.max(0, liveBodies - bodyLimit)
  const state: PhysicsBodyBudgetState =
    overflow > 0
      ? "overflow"
      : warnAt != null && projectedBodies >= warnAt
        ? "warning"
        : "ok"
  const action: PhysicsBodyBudgetAction =
    state !== "overflow"
      ? "continue"
      : input.sedimentEnabled
        ? "sediment"
        : input.evictionEnabled
          ? "evict"
          : "retain"

  return {
    action,
    bodyLimit,
    engineMaxBodiesHint,
    liveBodies,
    overflow,
    projectedBodies,
    queuedBodies,
    state,
    warnAt
  }
}
