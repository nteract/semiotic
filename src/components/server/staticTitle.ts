import type * as React from "react"
import { isValidElement, Fragment, createElement, cloneElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { decodeXmlText } from "../shared/svgRoot"

/** Read authored React text without putting HTML elements inside SVG text. */
export function staticTitleText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(staticTitleText).join("")
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    if (typeof node.type !== "string" && node.type !== Fragment) {
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
      createElement(
        Fragment,
        { key: index },
        staticTitleContent(child)
      )
    )
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    if (node.type === "tspan" || node.type === Fragment) {
      return cloneElement(
        node,
        undefined,
        staticTitleContent(node.props.children)
      )
    }
  }
  return staticTitleText(node)
}
