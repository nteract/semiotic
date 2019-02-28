import { hierarchy } from "d3-hierarchy"

function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = `${accessorString}-${recursiveIDAccessor(
      idAccessor,
      { ...node.parent, ...node.parent.data },
      accessorString
    )}`
  }
  return `${accessorString}-${idAccessor({ ...node, ...node.data })}`
}

export const nodesEdgesFromHierarchy = (
  baseRootNode,
  idAccessor = d => d.id || d.descendantIndex
) => {
  const edges = []
  const nodes = []

  const rootNode = baseRootNode.descendants
    ? baseRootNode
    : hierarchy(baseRootNode)

  const descendants = rootNode.descendants()

  descendants.forEach((d, i) => {
    d.descendantIndex = i
  })

  descendants.forEach((node, i) => {
    const generatedID = `${idAccessor(
      { ...node, ...node.data },
      i
    )}-${(node.parent &&
      recursiveIDAccessor(
        idAccessor,
        { ...node.parent, ...node.parent.data },
        ""
      )) ||
      "root"}`
    const dataD = Object.assign(node, node.data || {}, {
      hierarchicalID: generatedID
    })
    nodes.push(dataD)
    if (node.parent !== null) {
      const dataParent = Object.assign(node.parent, node.parent.data || {})
      edges.push({
        source: dataParent,
        target: dataD,
        depth: node.depth,
        weight: 1,
        value: 1,
        _NWFEdgeKey: generatedID
      })
    }
  })

  return { edges, nodes }
}
