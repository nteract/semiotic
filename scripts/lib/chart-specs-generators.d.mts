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

export function generateSchemaToolEntry(
  spec: ChartSpecLike,
  composedProps: Record<string, PropSpecLike>
): GeneratedSchemaToolEntry

export function generateValidationMapEntry(
  spec: ChartSpecLike,
  composedProps: Record<string, PropSpecLike>
): GeneratedValidationMapEntry

export function generateMetadataEntry(spec: ChartSpecLike): {
  name: string
  category: string
}
