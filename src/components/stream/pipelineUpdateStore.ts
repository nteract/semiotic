import type { UpdateResult } from "./pipelineUpdateContract"
import type { CustomLayoutSelection } from "./customLayoutSelection"

export type { UpdateResult } from "./pipelineUpdateContract"

/** Shared additive update-result read and subscription surface for stream stores. */
export interface PipelineUpdateResultSource {
  readonly last: UpdateResult
  subscribe(listener: () => void): () => void
}

/** Public lifecycle surface shared by every stream store. */
export interface UpdateResultStore {
  getLastUpdateResult(): UpdateResult
  getUpdateSnapshot(): UpdateResult
  subscribeUpdateResult(listener: () => void): () => void
  setLayoutSelection(selection: CustomLayoutSelection | null): void
  markStylePaintPending(): void
  consumeStylePaintPending(): boolean
}

const stylePaintPending = new WeakMap<object, boolean>()

/**
 * Shared lifecycle methods for every stream store.
 *
 * A method-only base class (no fields, no constructor work) instead of a
 * prototype mixin: a module-scope `Object.assign(Store.prototype, ...)` call is
 * a side effect that consumer bundlers must retain, which pinned each store
 * (and everything it references) into any bundle that touched its chunk.
 */
export abstract class UpdateResultStoreBase implements UpdateResultStore {
  protected abstract updateResults: PipelineUpdateResultSource

  getLastUpdateResult(): UpdateResult {
    return this.updateResults.last
  }

  getUpdateSnapshot(): UpdateResult {
    return this.updateResults.last
  }

  subscribeUpdateResult(listener: () => void): () => void {
    return this.updateResults.subscribe(listener)
  }

  setLayoutSelection(selection: CustomLayoutSelection | null): void {
    // Each store keeps its config private; the selection slot is the only
    // shared field this lifecycle writes.
    ;(this as unknown as { config: { layoutSelection?: CustomLayoutSelection | null } }).config.layoutSelection = selection
  }

  markStylePaintPending(): void {
    stylePaintPending.set(this, true)
  }

  consumeStylePaintPending(): boolean {
    const pending = stylePaintPending.get(this) === true
    stylePaintPending.delete(this)
    return pending
  }
}
