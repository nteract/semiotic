/**
 * Runtime validation map derived from the Chart Spec Registry.
 *
 * The generated module contains only the fields consumed by `validateProps`.
 * Keeping the docs/schema-rich registry out of this runtime import path saves
 * it from every AI and utility bundle while preserving VALIDATION_MAP's public
 * object shape. Regenerate after chart-spec edits with:
 *
 *   npm run docs:chart-specs:schema
 */
import { VALIDATION_MAP as GENERATED_VALIDATION_MAP } from "./validationMap.generated"

// Component names arrive from public JSON/API callers. Preserve the public
// dictionary API without admitting names inherited from Object.prototype.
export const VALIDATION_MAP: typeof GENERATED_VALIDATION_MAP =
  /* @__PURE__ */ Object.assign(Object.create(null), GENERATED_VALIDATION_MAP)
