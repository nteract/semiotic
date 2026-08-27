/**
 * Build compact suggestion prop contracts from canonical schema/category data.
 * The category is authoritative: no component-name allow/deny list is used.
 */
export function buildSuggestionPropContracts(schema, componentIndex) {
  const categoryByName = new Map(
    componentIndex.components.map((component) => [
      component.name,
      component.category,
    ]),
  )

  return Object.fromEntries(
    schema.tools
      .map((tool) => tool.function)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => {
        const category = categoryByName.get(entry.name)
        if (!category) {
          throw new Error(
            `Schema component ${entry.name} has no canonical category metadata`,
          )
        }
        const properties = entry.parameters?.properties ?? {}
        const valueComponent = category === "value"
        const recipeComponent = category === "recipe"
        const preferredHeading = valueComponent ? "label" : "title"
        const fallbackHeading = valueComponent ? "title" : "label"
        const headingProp = properties[preferredHeading]
          ? preferredHeading
          : properties[fallbackHeading]
            ? fallbackHeading
            : preferredHeading
        const modeValues = Array.isArray(properties.mode?.enum)
          ? properties.mode.enum.filter((value) => typeof value === "string")
          : []

        return [
          entry.name,
          {
            componentKind: valueComponent
              ? "value-component"
              : recipeComponent
                ? "chart-recipe"
                : "chart-hoc",
            commonChartProps: valueComponent
              ? "component-specific"
              : "supported",
            headingProp,
            modeValues,
          },
        ]
      }),
  )
}
