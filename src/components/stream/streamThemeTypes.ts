// Concrete color values (hex strings, not `var(...)`), populated by a
// Stream Frame from the active `SemioticTheme.colors` and threaded
// through `PipelineConfig` -> scene context. Scene builders read these
// as the default fallback before hardcoded hex literals.
//
// Shared between `PipelineConfig` (XY / streaming) and
// `XYSceneConfig`/`OrdinalSceneConfig`/etc. so role additions do not
// drift across the pipeline.
export interface ThemeSemanticColors {
  primary?: string
  secondary?: string
  success?: string
  danger?: string
  warning?: string
  error?: string
  info?: string
  text?: string
  textSecondary?: string
  border?: string
  grid?: string
  surface?: string
}
