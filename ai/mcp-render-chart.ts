import { validateProps } from "semiotic/ai"
import { renderChartWithEvidence, type RenderEvidence } from "semiotic/server"
import { renderHOCToSVG } from "./renderHOCToSVG"

/** Select one rendering path; evidence and SVG come from the same scene. */
export function renderMcpChartOnce(
  component: string,
  props: Record<string, unknown>,
  contract?: Record<string, unknown>
): { svg: string | null; error: string | null; evidence?: RenderEvidence } {
  const validation = validateProps(component, props)
  const errors = validation.errors ?? []
  const unknownOnly =
    errors.length === 1 && errors[0].startsWith("Unknown component")
  if (!validation.valid && !unknownOnly) {
    return { svg: null, error: `Validation errors:\n${errors.join("\n")}` }
  }
  try {
    // The renderer's contract serializer reports malformed/unknown contract
    // versions as evidence. Preserve that runtime boundary for MCP JSON input.
    const renderUntrustedContract = renderChartWithEvidence as (
      name: string,
      input: Record<string, unknown>,
      options?: { artifactContract: Record<string, unknown> }
    ) => ReturnType<typeof renderChartWithEvidence>
    const result = renderUntrustedContract(
      component,
      props,
      contract ? { artifactContract: contract } : undefined
    )
    return { ...result, error: null }
  } catch (error) {
    // A missing server configuration is the only reason to use React SSR.
    // Real layout failures must not trigger another expensive render attempt.
    if (
      error instanceof Error &&
      error.message.startsWith(`Unknown chart component: "${component}".`)
    ) {
      return renderHOCToSVG(component, props)
    }
    return {
      svg: null,
      error: `Render error: ${error instanceof Error ? error.message : "Unknown render failure"}`
    }
  }
}
