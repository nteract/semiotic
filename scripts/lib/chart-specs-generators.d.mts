export interface ChartSpecLike {
  name: string
  description: string
  required: string[]
  dataShape?: unknown
  dataAccessors: string[]
  category: string
}

export interface PropSpecLike {
  type: string | string[]
  enum?: readonly unknown[]
  description?: string
  default?: unknown
  omitFromSchema?: boolean
}

export interface GeneratedSchemaToolEntry {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

export interface GeneratedValidationMapEntry {
  required: string[]
  dataShape: unknown
  dataAccessors: string[]
  props: Record<string, { type: string | string[]; enum?: readonly unknown[] }>
}

export interface ChartClinicChartSpecLike extends ChartSpecLike {
  capabilities: { supportsSSR: boolean }
}

export interface ChartDefinitionPilotLike {
  chartFamily: string
  runtime: { implementation: { module: string } }
  metadata: {
    support: { server: { mode: string } }
    propDocs: { route: string }
  }
}

export interface GeneratedChartClinicMetadataEntry {
  category: string
  recommendedImport: string
  serverImport?: "semiotic/server"
  docsRoute?: string
  pilot?: true
}

export function generateSchemaToolEntry(
  spec: ChartSpecLike,
  composedProps: Record<string, PropSpecLike>
): GeneratedSchemaToolEntry

export function generateValidationMapEntry(
  spec: ChartSpecLike,
  composedProps: Record<string, PropSpecLike>
): GeneratedValidationMapEntry

export function generateValidationMap<TSpec extends ChartSpecLike>(
  chartSpecs: Record<string, TSpec>,
  composeProps: (spec: TSpec) => Record<string, PropSpecLike>
): Record<string, GeneratedValidationMapEntry>

export function generateValidationMapModule(
  validationMap: Record<string, GeneratedValidationMapEntry>
): string

export function generateKnownChartComponentsModule(
  chartSpecs: Record<string, unknown>
): string

export function generateChartClinicMetadata<TSpec extends ChartClinicChartSpecLike>(
  chartSpecs: Record<string, TSpec>,
  chartDefinitionPilot: Readonly<Record<string, ChartDefinitionPilotLike>>
): Record<string, GeneratedChartClinicMetadataEntry>

export function generateChartClinicMetadataModule(
  metadata: Record<string, GeneratedChartClinicMetadataEntry>
): string

export function generateMetadataEntry(spec: ChartSpecLike): {
  name: string
  category: string
}
