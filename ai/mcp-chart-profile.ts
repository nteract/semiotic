export function chartProfileInput(args: {
  data?: unknown[]
  props?: Record<string, unknown>
}): {
  data: Record<string, unknown>[]
  rawInput?: unknown
} {
  const props = args.props ?? {}
  if (Array.isArray(args.data)) {
    return { data: args.data as Record<string, unknown>[] }
  }
  if (Array.isArray(props.data)) {
    return { data: props.data as Record<string, unknown>[] }
  }
  if (
    Array.isArray(props.nodes) &&
    (Array.isArray(props.edges) || Array.isArray(props.links))
  ) {
    return {
      data: [],
      rawInput: {
        nodes: props.nodes,
        edges: props.edges ?? props.links
      }
    }
  }
  if (
    props.data &&
    typeof props.data === "object" &&
    !Array.isArray(props.data)
  ) {
    return { data: [], rawInput: props.data }
  }
  return { data: [] }
}
