function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = `${accessorString}-${recursiveIDAccessor(
      idAccessor,
      node.parent,
      accessorString
    )}`
  }
  return `${accessorString}-${idAccessor(node.data)}`
}

export const nodesEdgesFromHierarchy = (
  rootNode,
  idAccessor = () => "no-id-accessor-passed"
) => {
  const edges = []
  const nodes = []

  const descendants = rootNode.descendants()

  descendants.forEach((node, i) => {
    const dataD = Object.assign(node, node.data || {})
    nodes.push(dataD)
    if (node.parent !== null) {
      const dataParent = Object.assign(node.parent, node.parent.data || {})
      edges.push({
        source: dataParent,
        target: dataD,
        depth: node.depth,
        weight: 1,
        value: 1,
        _NWFEdgeKey: `${idAccessor(node.data, i)}-${recursiveIDAccessor(
          idAccessor,
          node.parent,
          ""
        )}`
      })
    }
  })

  return { edges, nodes }
}
