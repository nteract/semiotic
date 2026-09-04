/**
 * React inspection surface for Semiotic artifact contracts.
 *
 * Import from `semiotic/artifact/react` to keep the renderer-independent
 * `semiotic/artifact` entry free of React.
 */

export { ArtifactInspector } from "./artifact/ArtifactInspector"
export type {
  ArtifactInspectorProps,
  ArtifactInspectorSection
} from "./artifact/ArtifactInspector"
export { summarizeArtifactInspection } from "./artifact/artifactInspectorSummary"
export type {
  ArtifactInspectionSummary,
  ArtifactInspectorEvaluation,
  ArtifactInspectorOutcome
} from "./artifact/artifactInspectorSummary"
