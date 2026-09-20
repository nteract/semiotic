import behaviorContracts from "../behaviorContracts.cjs"
import componentMetadata from "../componentMetadata.cjs"
import type { Diagnosis } from "../../src/components/charts/shared/diagnoseTypes"

export type UsageMode = "static" | "push"
export interface DiagnosisRequest {
  component: string
  props: Record<string, unknown>
  usageMode?: string
}
export interface DiagnosisSchema {
  tools: Array<{
    function: {
      name: string
      parameters?: {
        properties?: Record<
          string,
          {
            type?: string | string[]
            enum?: string[]
            "x-semiotic-runtime-types"?: string[]
          }
        >
        required?: string[]
      }
    }
  }>
}
export interface DiagnosisRuntime {
  diagnoseConfig?: (
    component: string,
    props: Record<string, unknown>
  ) => { diagnoses: Diagnosis[] }
  validateProps?: (
    component: string,
    props: Record<string, unknown>
  ) => { errors: string[] }
}
export type ChartDiagnosisResult = {
  component: string
  usageMode: UsageMode
  ok: boolean
} & (
  | { mode: "diagnose"; diagnoses: Diagnosis[] }
  | { mode: "validate" | "schema-only"; errors: string[] }
)

const { dataRequiredForUsageMode, normalizeUsageMode } = behaviorContracts as {
  dataRequiredForUsageMode: (component: string, usageMode: UsageMode) => boolean
  normalizeUsageMode: (usageMode?: string) => UsageMode
}
const { findComponent, schemaEntries, COMPONENTS_BY_CATEGORY } =
  componentMetadata as {
    COMPONENTS_BY_CATEGORY: Readonly<Record<string, readonly string[]>>
    findComponent: (
      schema: DiagnosisSchema,
      component: string
    ) => DiagnosisSchema["tools"][number]["function"] | undefined
    schemaEntries: (
      schema: DiagnosisSchema
    ) => DiagnosisSchema["tools"][number]["function"][]
  }

/**
 * Shared semantic operation for CLI doctor and MCP diagnosis. Transport adapters
 * own I/O and prose; this operation owns mode, filtering and disposition.
 * Schema-only reports retain their limited assessment mode even when ok=true.
 */
export function diagnoseChart(
  request: DiagnosisRequest,
  runtime: DiagnosisRuntime,
  loadSchema: () => DiagnosisSchema
): ChartDiagnosisResult {
  const { component, props } = request
  const usageMode = normalizeUsageMode(request.usageMode)
  // Realtime runtime validation permits omitted data for React ref startup.
  // The transport's explicit static mode still requires a bounded snapshot.
  const missingRealtimeData =
    COMPONENTS_BY_CATEGORY.realtime.includes(component) &&
    dataRequiredForUsageMode(component, usageMode) &&
    props.data == null
  const missingDataMessage = `"data" is required for ${component}.`
  if (runtime.diagnoseConfig) {
    const result = runtime.diagnoseConfig(component, props)
    const diagnoses = dataRequiredForUsageMode(component, usageMode)
      ? [...result.diagnoses]
      : result.diagnoses.filter(
          (diagnosis) =>
            diagnosis.code !== "VALIDATION" ||
            diagnosis.message !== `"data" is required for ${component}.`
        )
    if (
      missingRealtimeData &&
      !diagnoses.some(({ message }) => message === missingDataMessage)
    ) {
      diagnoses.push({
        code: "VALIDATION",
        severity: "error",
        message: missingDataMessage,
        fix: "Provide bounded data for a static snapshot, or select push usage for React ref startup."
      })
    }
    return {
      component,
      usageMode,
      mode: "diagnose",
      ok: diagnoses.every(({ severity }) => severity === "warning"),
      diagnoses
    }
  }
  const mode = runtime.validateProps ? "validate" : "schema-only"
  const errors = runtime.validateProps
    ? filterUsageModeErrors(
        component,
        [...runtime.validateProps(component, props).errors],
        usageMode
      )
    : validatePropsWithSchema(component, props, usageMode, loadSchema()).errors
  if (missingRealtimeData && !errors.includes(missingDataMessage)) {
    errors.push(missingDataMessage)
  }
  return { component, usageMode, mode, ok: errors.length === 0, errors }
}

// Both helpers are only called from `validatePropsWithSchema` below, which
// filters `undefined` / `null` out of `value` before reaching them — so
// neither guards null here. CodeQL flags the dead branches if they return.

function schemaTypeMatches(value: unknown, expectedType: string | string[]) {
  const expectedTypes = Array.isArray(expectedType)
    ? expectedType
    : [expectedType]
  return expectedTypes.some((type) => {
    if (type === "array") return Array.isArray(value)
    if (type === "object")
      return typeof value === "object" && !Array.isArray(value)
    return typeof value === type
  })
}

function describeActualType(value: unknown) {
  if (Array.isArray(value)) return "array"
  return typeof value
}

function shouldSkipMissingRequiredProp(
  componentName: string,
  propName: string,
  usageMode: UsageMode
) {
  return (
    propName === "data" && !dataRequiredForUsageMode(componentName, usageMode)
  )
}

function filterUsageModeErrors(
  componentName: string,
  errors: string[],
  usageMode: UsageMode
) {
  if (dataRequiredForUsageMode(componentName, usageMode)) return errors
  return errors.filter(
    (err) => err !== `"data" is required for ${componentName}.`
  )
}

function validatePropsWithSchema(
  componentName: string,
  props: Record<string, unknown>,
  usageMode: UsageMode,
  schema: DiagnosisSchema
) {
  const component = findComponent(schema, componentName)
  if (!component) {
    const available = schemaEntries(schema)
      .map((entry) => entry.name)
      .sort()
      .join(", ")
    return {
      valid: false,
      errors: [
        `Unknown component "${componentName}". Available components: ${available}`
      ]
    }
  }

  const parameters = component.parameters || {}
  const properties = parameters.properties || {}
  const required = parameters.required || []
  const errors = []

  for (const propName of required) {
    if (shouldSkipMissingRequiredProp(component.name, propName, usageMode))
      continue
    if (props[propName] === undefined || props[propName] === null) {
      errors.push(`"${propName}" is required for ${component.name}.`)
    }
  }

  // Array-shape charts that declare a `data` schema prop need it in static
  // usage even when "data" isn't in `required` (those lists hold semantic
  // accessors). Without this, --doctor passed dataless static CandlestickChart /
  // MultiAxisLineChart / QuadrantChart / DifferenceChart / SwimlaneChart /
  // LikertChart configs that render blank. dataRequiredForUsageMode is true for
  // them in static and false in push, mirroring the MCP diagnoseConfig path.
  if (
    "data" in properties &&
    !required.includes("data") &&
    dataRequiredForUsageMode(component.name, usageMode) &&
    (props.data === undefined || props.data === null)
  ) {
    errors.push(`"data" is required for ${component.name}.`)
  }

  for (const [propName, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const propSchema = properties[propName]
    if (!propSchema) {
      errors.push(`Unknown prop "${propName}" for ${component.name}.`)
      continue
    }

    // Prefer the full runtime type surface (`x-semiotic-runtime-types`, e.g.
    // ["string","function"]) over the wire-only `type` ("string"), so a valid
    // function value for a prop like `colorBy`/`onBrush` is still accepted. The
    // wire `type` keyword is standards-valid JSON Schema and never lists
    // "function"; the runtime extension carries it. Falls back to `type` for
    // props with no runtime-only alternatives.
    const effectiveType =
      propSchema["x-semiotic-runtime-types"] || propSchema.type
    if (effectiveType && !schemaTypeMatches(value, effectiveType)) {
      const expected = Array.isArray(effectiveType)
        ? effectiveType.join(" | ")
        : effectiveType
      errors.push(
        `"${propName}" should be ${expected}, got ${describeActualType(value)}.`
      )
    }

    if (
      propSchema.enum &&
      typeof value === "string" &&
      !propSchema.enum.includes(value)
    ) {
      errors.push(
        `"${propName}" value "${value}" is not valid. Expected one of: ${propSchema.enum.join(", ")}.`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
