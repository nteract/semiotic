/**
 * Machine-readable contract for props emitted by chart suggestions.
 *
 * `componentKind` lets generic renderers route value cards separately from
 * chart HOCs without maintaining their own component-name set.
 * `commonChartProps` says whether it is safe to layer chart-HOC defaults onto
 * `Suggestion.props`; component-specific consumers must consult the selected
 * component's schema instead. `headingProp` and `modeValues` cover the two
 * common defaults that otherwise tend to leak across component families.
 */
export interface SuggestionPropContract {
  readonly componentKind: "chart-hoc" | "chart-recipe" | "value-component"
  readonly commonChartProps: "supported" | "component-specific"
  readonly headingProp: string
  readonly modeValues: ReadonlyArray<string>
}

const CHART_HOC_SUGGESTION_PROP_CONTRACT: SuggestionPropContract = {
  componentKind: "chart-hoc",
  commonChartProps: "supported",
  headingProp: "title",
  modeValues: ["primary", "context", "sparkline", "mobile"],
}

export const PHYSICS_SAMPLE_SUGGESTION_PROP_CONTRACT: SuggestionPropContract = {
  ...CHART_HOC_SUGGESTION_PROP_CONTRACT,
  modeValues: ["primary", "context", "sparkline", "mobile", "sample", "mechanical"],
}

export const CHAIN_REACTION_SUGGESTION_PROP_CONTRACT: SuggestionPropContract = {
  ...CHART_HOC_SUGGESTION_PROP_CONTRACT,
  modeValues: ["snapshot", "replay", "mechanical"],
}

export const BIG_NUMBER_SUGGESTION_PROP_CONTRACT: SuggestionPropContract = {
  componentKind: "value-component",
  commonChartProps: "component-specific",
  headingProp: "label",
  modeValues: ["tile", "presentation", "inline", "thumbnail"],
}

const VALUE_COMPONENT_SUGGESTION_PROP_CONTRACT: SuggestionPropContract = {
  componentKind: "value-component",
  commonChartProps: "component-specific",
  headingProp: "label",
  modeValues: [],
}

export function suggestionPropContractForFamily(
  family: string,
): SuggestionPropContract {
  return family === "value"
    ? VALUE_COMPONENT_SUGGESTION_PROP_CONTRACT
    : CHART_HOC_SUGGESTION_PROP_CONTRACT
}
