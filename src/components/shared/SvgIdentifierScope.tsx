import * as React from "react"
import { rewriteSvgIdReference } from "./svgIdentifiers"

/** Keep recipe defs local to each mounted overlay, including shared layout configs. */
export function SvgIdentifierScope({
  children
}: {
  children: React.ReactNode
}) {
  const prefix = `recipe-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "_")}`
  const ids = new Map<string, string>()
  const collect = (nodes: React.ReactNode): void => {
    React.Children.forEach(nodes, (node) => {
      if (!React.isValidElement<Record<string, unknown>>(node)) return
      if (typeof node.props.id === "string")
        ids.set(node.props.id, `${prefix}-${node.props.id}`)
      collect(node.props.children as React.ReactNode)
    })
  }
  collect(children)
  const scope = (nodes: React.ReactNode): React.ReactNode => {
    if (nodes == null || typeof nodes !== "object") return nodes
    return React.Children.map(nodes, (node) => {
      if (!React.isValidElement<Record<string, unknown>>(node)) return node
      const props: Record<string, unknown> = {}
      for (const [name, value] of Object.entries(node.props)) {
        if (typeof value === "string")
          props[name] = rewriteSvgIdReference(name, value, ids)
        else if (name === "style" && value && typeof value === "object") {
          props.style = Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
              key,
              typeof entry === "string"
                ? rewriteSvgIdReference(key, entry, ids)
                : entry
            ])
          )
        }
      }
      if (Object.prototype.hasOwnProperty.call(node.props, "children")) {
        props.children = scope(node.props.children as React.ReactNode)
      }
      return React.cloneElement(node, props)
    })
  }
  return <>{scope(children)}</>
}
