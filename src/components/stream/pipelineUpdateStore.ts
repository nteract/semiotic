import type { UpdateResult } from "./pipelineUpdateContract"
import type { CustomLayoutSelection } from "./customLayoutSelection"

export type { UpdateResult } from "./pipelineUpdateContract"

/** Shared additive update-result read and subscription surface for stream stores. */
export interface PipelineUpdateResultSource {
  readonly last: UpdateResult
  subscribe(listener: () => void): () => void
}

/** Public lifecycle surface installed on each stream store prototype. */
export interface UpdateResultStore {
  getLastUpdateResult(): UpdateResult
  getUpdateSnapshot(): UpdateResult
  subscribeUpdateResult(listener: () => void): () => void
  setLayoutSelection(selection: CustomLayoutSelection | null): void
  markStylePaintPending(): void
  consumeStylePaintPending(): boolean
}

const stylePaintPending = new WeakMap<object, boolean>()

function getLastUpdateResult(
  this: { updateResults: PipelineUpdateResultSource }
): UpdateResult {
  return this.updateResults.last
}

function getUpdateSnapshot(
  this: { updateResults: PipelineUpdateResultSource }
): UpdateResult {
  return this.updateResults.last
}

function subscribeUpdateResult(
  this: { updateResults: PipelineUpdateResultSource },
  listener: () => void
): () => void {
  return this.updateResults.subscribe(listener)
}

function setLayoutSelection(
  this: { config: { layoutSelection?: CustomLayoutSelection | null } },
  selection: CustomLayoutSelection | null
): void {
  this.config.layoutSelection = selection
}

function markStylePaintPending(this: object): void {
  stylePaintPending.set(this, true)
}

function consumeStylePaintPending(this: object): boolean {
  const pending = stylePaintPending.get(this) === true
  stylePaintPending.delete(this)
  return pending
}

/** Adds the shared lifecycle methods without imposing a base-class constructor. */
export function attachUpdateResultStore(target: { prototype: object }): void {
  Object.assign(target.prototype, {
    getLastUpdateResult,
    getUpdateSnapshot,
    subscribeUpdateResult,
    setLayoutSelection,
    markStylePaintPending,
    consumeStylePaintPending
  })
}
