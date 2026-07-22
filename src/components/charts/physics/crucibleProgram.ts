/** Pure authoring helpers for explicit Crucible event tapes. */
import type { CrucibleEvent, CrucibleLoss } from "./crucibleTypes"

/** Event metadata that remains wholly authored by the caller. */
export type CrucibleEventStep = Pick<
  CrucibleEvent,
  "at" | "label" | "description" | "summary"
> & {
  /** Optional stable event id; a deterministic id is generated when omitted. */
  id?: string
}

/** Explicit sources admitted while a product is forming. */
export interface CrucibleProductSourceStep extends CrucibleEventStep {
  sourceIds: readonly string[]
  basisRelationIds?: readonly string[]
  loss?: CrucibleLoss
}

/** Explicit completion and routing of an already-formed product. */
export interface CrucibleProductCompletionStep extends CrucibleEventStep {
  outletId?: string
  reason?: string
}

export interface BuildCrucibleProductEventsOptions {
  productId: string
  /** Prefix for generated event ids. Defaults to `productId`. */
  idPrefix?: string
  /** Opens a forming product with a `combine` effect. */
  form: CrucibleProductSourceStep
  /** Ordered later admissions, each represented by one `contribute` effect. */
  contributions?: readonly CrucibleProductSourceStep[]
  /** Required explicit completion; the helper never guesses when to pour. */
  complete: CrucibleProductCompletionStep
}

function eventFromStep(
  step: CrucibleEventStep,
  fallbackId: string,
  effects: CrucibleEvent["effects"]
): CrucibleEvent {
  return {
    id: step.id ?? fallbackId,
    at: { ...step.at },
    effects,
    ...(step.label === undefined ? null : { label: step.label }),
    ...(step.description === undefined
      ? null
      : { description: step.description }),
    ...(step.summary === undefined ? null : { summary: step.summary })
  }
}

function copiedLoss(loss: CrucibleLoss | undefined): CrucibleLoss | undefined {
  if (!loss) return undefined
  return {
    ...loss,
    ...(loss.metrics ? { metrics: { ...loss.metrics } } : null)
  }
}

/**
 * Build the canonical form -> contribute* -> complete lifecycle for one
 * declared product.
 *
 * This is authoring sugar only. The caller supplies every source id,
 * relation id, event position, product id, and outlet. The helper performs no
 * grouping, inference, thresholding, or collision-derived classification.
 */
export function buildCrucibleProductEvents(
  options: BuildCrucibleProductEventsOptions
): CrucibleEvent[] {
  const { productId, form, contributions = [], complete } = options
  const prefix = options.idPrefix ?? productId
  const formLoss = copiedLoss(form.loss)
  const events: CrucibleEvent[] = [
    eventFromStep(form, `${prefix}-form`, [
      {
        type: "combine",
        sourceIds: [...form.sourceIds],
        productId,
        ...(form.basisRelationIds
          ? { basisRelationIds: [...form.basisRelationIds] }
          : null),
        ...(formLoss ? { loss: formLoss } : null),
        complete: false
      }
    ])
  ]

  contributions.forEach((contribution, index) => {
    const loss = copiedLoss(contribution.loss)
    events.push(
      eventFromStep(contribution, `${prefix}-contribute-${index + 1}`, [
        {
          type: "contribute",
          sourceIds: [...contribution.sourceIds],
          productId,
          ...(contribution.basisRelationIds
            ? { basisRelationIds: [...contribution.basisRelationIds] }
            : null),
          ...(loss ? { loss } : null)
        }
      ])
    )
  })

  events.push(
    eventFromStep(complete, `${prefix}-complete`, [
      {
        type: "complete-product",
        productId,
        ...(complete.outletId === undefined
          ? null
          : { outletId: complete.outletId }),
        ...(complete.reason === undefined ? null : { reason: complete.reason })
      }
    ])
  )

  return events
}
