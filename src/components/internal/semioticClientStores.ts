/** Canonical ESM contexts shared by primary and optional chart graphs. */
export * from "../store/categoryColorContext"
export * from "../store/ObservationStore"
export * from "../store/SelectionStore"
export * from "../store/selectionProvenance"
export {
  useSelection, useSelectionActions, useLinkedHover, useBrushSelection, useFilteredData
} from "../store/useSelection"
// Standalone crosshair mutators are test helpers; charts use provider actions.
export {
  LinkedCrosshairProvider, useCrosshairActions, useCrosshairPosition, useLinkedCrosshair
} from "../store/LinkedCrosshairStore"
export * from "../store/TooltipStore"
// Providers and chart encodings consume the same palettes and color helpers.
export {
  SEQUENTIAL_INTERPOLATORS, getSequentialInterpolator, interpolateBrBG,
  interpolatePRGn, interpolatePiYG, interpolateRdBu, interpolateRdYlBu,
  interpolateRdYlGn, interpolateSpectral, interpolateViridis,
  schemeCategory10, schemeSet3, schemeTableau10
} from "../charts/shared/colorPalettes"
export * from "../charts/shared/colorContrast"
export * from "../charts/shared/withDisplayName"
