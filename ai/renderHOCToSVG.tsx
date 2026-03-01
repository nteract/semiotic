/**
 * Render a Semiotic HOC chart component to static SVG markup.
 *
 * Uses ReactDOMServer.renderToStaticMarkup which supports hooks
 * (useMemo, custom hooks) used by the HOC components.
 */
import * as React from "react"
import * as ReactDOMServer from "react-dom/server"
import { COMPONENT_REGISTRY } from "./componentRegistry"
import { validateProps } from "../src/components/charts/shared/validateProps"

export interface RenderResult {
  svg: string | null
  error: string | null
}

export function renderHOCToSVG(
  componentName: string,
  props: Record<string, any>
): RenderResult {
  // Look up component
  const entry = COMPONENT_REGISTRY[componentName]
  if (!entry) {
    return {
      svg: null,
      error: `Unknown component "${componentName}". Available: ${Object.keys(COMPONENT_REGISTRY).join(", ")}`,
    }
  }

  // Validate props
  const validation = validateProps(componentName, props)
  if (!validation.valid) {
    return {
      svg: null,
      error: `Validation errors:\n${validation.errors.join("\n")}`,
    }
  }

  // Disable hover (not useful in static SVG)
  const renderProps = { ...props, enableHover: false }

  try {
    const element = React.createElement(entry.component, renderProps)
    const svg = ReactDOMServer.renderToStaticMarkup(element)
    return { svg, error: null }
  } catch (err: any) {
    return {
      svg: null,
      error: `Render error: ${err.message || String(err)}`,
    }
  }
}
