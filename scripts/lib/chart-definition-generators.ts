import type { ChartDefinition } from "../../src/components/charts/shared/chartDefinition"

const familySuffixes = {
  xy: "XY",
  ordinal: "Ordinal",
  network: "Network",
  physics: "Physics",
  realtime: "Realtime"
} as const

/** Generate static imports; rich definition metadata never enters a renderer bundle. */
export function generateFamilyRegistrations(
  family: keyof typeof familySuffixes,
  definitions: Readonly<Record<string, ChartDefinition>>,
  componentMetadata: string
): Record<string, string> {
  const suffix = familySuffixes[family]
  const prefix = family.toUpperCase()
  const banner = `/**
 * AUTO-GENERATED from chartDefinitions${suffix}.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run \`npm run docs:chart-specs:schema\`.
 */
`

  const names = Object.keys(definitions)
  const imports = new Map<string, string[]>()
  const componentImports = new Map<string, string[]>()
  const entries: string[] = []
  const componentEntries: string[] = []
  for (const [name, definition] of Object.entries(definitions)) {
    const server = definition.metadata.support.server
    if (
      definition.chartFamily !== family ||
      server.mode !== "render-chart" ||
      !server.implementation
    ) {
      throw new Error(
        `${prefix} registration requires an explicit static renderer: ${name}`
      )
    }
    const { module, exportName } = server.implementation
    const symbols = imports.get(module) ?? []
    if (!symbols.includes(exportName)) symbols.push(exportName)
    imports.set(module, symbols)
    entries.push(`  ${name}: ${exportName}`)
    const mcp = definition.metadata.support.mcp
    if (mcp?.mode === "unavailable") continue
    componentEntries.push(
      `  ${name}: { component: ${definition.runtime.implementation.exportName}, category: "${mcp?.category ?? family}" }`
    )
    // Atlas readers retain their dedicated public entry instead of being
    // assumed to exist on semiotic/ai. ChartSpec owns the override.
    const componentModule = definition.metadata.importPath ?? "semiotic/ai"
    const components = componentImports.get(componentModule) ?? []
    const componentExport = definition.runtime.implementation.exportName
    if (!components.includes(componentExport)) components.push(componentExport)
    componentImports.set(componentModule, components)
  }
  const start = `  // BEGIN GENERATED ${prefix} CHARTS`
  const end = `  // END GENERATED ${prefix} CHARTS`
  if (
    componentMetadata.split(start).length !== 2 ||
    componentMetadata.split(end).length !== 2
  ) {
    throw new Error(
      `componentMetadata.cjs must contain exactly one ${prefix} generation region`
    )
  }
  const regionStart = componentMetadata.indexOf(start)
  const regionEnd = componentMetadata.indexOf(end)
  if (regionEnd < regionStart)
    throw new Error(`Invalid ${prefix} generation region order`)
  const bucket = `${start}\n  ${family}: ${JSON.stringify(names, null, 2).replace(/\n/g, "\n  ")},\n${end}`
  return {
    [`ai/componentRegistry${suffix}.generated.ts`]:
      banner +
      [...componentImports]
        .map(
          ([module, symbols]) =>
            `import { ${symbols.join(", ")} } from ${JSON.stringify(module)}\n`
        )
        .join("") +
      `import type { RegistryEntry } from "./componentRegistry"\n\n` +
      `export const ${prefix}_COMPONENT_REGISTRY = {\n` +
      componentEntries.join(",\n") +
      `\n} satisfies Record<string, RegistryEntry>\n`,
    [`src/components/server/serverChartConfigs${suffix}.generated.ts`]:
      banner +
      `import type { ChartConfig } from "./serverChartConfigShared"\n` +
      [...imports]
        .map(
          ([module, symbols]) =>
            `import { ${symbols.join(", ")} } from ${JSON.stringify(module)}`
        )
        .join("\n") +
      `\n\nexport const ${prefix}_CHART_CONFIGS = {\n${entries.join(",\n")}\n} satisfies Record<string, ChartConfig>\n`,
    "ai/componentMetadata.cjs":
      componentMetadata.slice(0, regionStart) +
      bucket +
      componentMetadata.slice(regionEnd + end.length)
  }
}
