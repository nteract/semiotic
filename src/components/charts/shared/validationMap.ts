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
export { VALIDATION_MAP } from "./validationMap.generated"
