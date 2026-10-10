import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactNode
} from "react"
import { rewriteSvgIdReference } from "./svgIdReference"

/** Keep recipe defs local to each mounted overlay, including shared layout configs. */
export function SvgIdentifierScope({ children }: { children: ReactNode }) {
  const prefix = useId().replace(/[^a-zA-Z0-9_-]/g, "_")
  const ids = new Map<string, string>()
  const scopeProps = (
    props: Record<string, unknown>,
    style = false
  ): Record<string, unknown> =>
    Object.fromEntries(
      Object.entries(props).map(([name, value]) => [
        name,
        name === "children" && !style
          ? scope(value as ReactNode)
          : name === "style" && !style && value && typeof value === "object"
            ? scopeProps(value as Record<string, unknown>, true)
            : typeof value === "string"
              ? rewriteSvgIdReference(style ? "style" : name, value, ids)
              : value
      ])
    )
  const scope = (nodes: ReactNode, collect = false): ReactNode => {
    if (typeof nodes !== "object") return nodes
    return Children.map(nodes, (node) => {
      if (!isValidElement<Record<string, unknown>>(node)) return node
      if (collect) {
        if (typeof node.props.id === "string")
          ids.set(node.props.id, `${prefix}-${node.props.id}`)
        scope(node.props.children as ReactNode, true)
        return node
      }
      return cloneElement(node, scopeProps(node.props))
    })
  }
  scope(children, true)
  return scope(children)
}
