/**
 * Internal code-splitting boundary for immutable artifact policy tables.
 *
 * The AI facade keeps these compatibility exports, but most chart consumers
 * select recommendation functions only. Keeping the tables in their own
 * sidecar lets a downstream bundler omit their eager deep-freeze work without
 * introducing a second copy of any chart, React, or registry module.
 */
export { ARTIFACT_FIELD_POLICIES } from "../artifact/fieldPolicies"
export { ARTIFACT_POLICIES } from "../artifact/policies"
