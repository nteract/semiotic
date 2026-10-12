import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { decodeXmlText } from "../shared/svgRoot"

/** Read authored React text without putting HTML elements inside SVG text. */
export function staticTitleText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(staticTitleText).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    if (typeof node.type !== "string" && node.type !== React.Fragment) {
      const markup = renderToStaticMarkup(node)
      return decodeXmlText(
        markup.replace(/<!--[\s\S]*?-->|<(?:[^<>"']|"[^"]*"|'[^']*')*>/g, "")
      )
    }
    return staticTitleText(node.props.children)
  }
  return ""
}

/** Preserve inline SVG spans; HTML titles export their readable text. */
export function staticTitleContent(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string" || typeof node === "number") return node
  if (Array.isArray(node))
    return node.map((child, index) =>
      React.createElement(
        React.Fragment,
        { key: index },
        staticTitleContent(child)
      )
    )
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    if (node.type === "tspan" || node.type === React.Fragment) {
      return React.cloneElement(
        node,
        undefined,
        staticTitleContent(node.props.children)
      )
    }
  }
  return staticTitleText(node)
}
