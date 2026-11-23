import Ajv2020, { type AnySchemaObject } from "ajv/dist/2020"
import type { VegaLiteSpec } from "semiotic/ai"
import type { UnstablePortabilityDiagnostic as PortabilityDiagnostic } from "semiotic/experimental"

const describeDiagnostic = ({ path, message }: PortabilityDiagnostic) =>
  path ? `${path}: ${message}` : message

function refusal(diagnostics: readonly PortabilityDiagnostic[]) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: diagnostics.map(describeDiagnostic).join("\n")
      }
    ],
    structuredContent: { diagnostics }
  }
}

export async function convertVegaLite(
  { spec, mode }: { spec: Record<string, unknown>; mode?: "strict" | "lossy" },
  schemas: Record<string, { parameters: AnySchemaObject }>
) {
  const { unstable_fromVegaLiteResult: fromVegaLiteResult } = await import("semiotic/experimental")
  // The importer checks the wire shape before accessing the typed fields.
  const result = fromVegaLiteResult(spec as unknown as VegaLiteSpec, { mode })
  if (!result.config) return refusal(result.diagnostics)
  const config = result.config
  const definition = schemas[config.component]
  const ajv = new Ajv2020({ strict: false, ownProperties: true })
  if (
    !definition ||
    !ajv.validate(
      { ...definition.parameters, additionalProperties: false },
      config.props
    )
  ) {
    return refusal([
      ...result.diagnostics,
      {
        code: "INVALID_CHART_CONFIG",
        severity: "error",
        path: "/props",
        message: definition
          ? ajv.errorsText()
          : `Missing Semiotic schema for ${config.component}.`
      }
    ])
  }
  const warnings = [...new Set(result.diagnostics.map(describeDiagnostic))]
  const output = { ...config, ...(warnings.length > 0 ? { warnings } : {}) }
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output) }],
    structuredContent: output
  }
}
