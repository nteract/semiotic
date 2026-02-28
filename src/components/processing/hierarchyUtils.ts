import { hierarchy } from "d3-hierarchy"

export function recursiveIDAccessor(idAccessor, node, accessorString) {
  if (node.parent) {
    accessorString = `${accessorString}-${recursiveIDAccessor(
      idAccessor,
      { ...node.parent, ...node.parent.data },
      accessorString
    )}`
  }
  return `${accessorString}-${idAccessor({ ...node, ...node.data })}`
}

export const defaultHierarchicalIDAccessor = (d) => d.id || d.descendantIndex

export const nodesEdgesFromHierarchy = (
  baseRootNode,
  idAccessor = defaultHierarchicalIDAccessor
) => {
  const edges = []
  const nodes = []

  const rootNode = baseRootNode.descendants
    ? baseRootNode
    : hierarchy(baseRootNode)

  const descendants = rootNode.descendants()

  let i = 0

  for (const node of descendants) {
    node.descendantIndex = i
    i++
  }

  for (const node of descendants) {
    const generatedID = `${
      idAccessor({
        ...node,
        ...node.data
      }) ?? defaultHierarchicalIDAccessor(node)
    }-${
      node.parent
        ? recursiveIDAccessor(
            idAccessor,
            { ...node.parent, ...node.parent.data },
            ""
          ) ?? node.parent.name
        : "root"
    }`

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
  }

  return { edges, nodes }
}

export function breadthFirstCompontents(baseNodes, hash) {
  const componentMap = {
    "0": { componentNodes: [], componentEdges: [] }
  }
  const components = [componentMap["0"]]

  let componentID = 0

  traverseNodesBF(baseNodes, true)

  function traverseNodesBF(nodes, top) {
    for (const node of nodes) {
      const hashNode = hash.get(node)
      if (!hashNode) {
        componentMap["0"].componentNodes.push(node)
      } else if (hashNode.component === -99) {
        if (top === true) {
          componentID++
          componentMap[componentID] = {
            componentNodes: [],
            componentEdges: []
          }
          components.push(componentMap[componentID])
        }

        hashNode.component = componentID
        componentMap[componentID].componentNodes.push(node)
        componentMap[componentID].componentEdges.push(...hashNode.edges)
        const traversibleNodes = [...hashNode.connectedNodes]
        traverseNodesBF(traversibleNodes, hash)
      }
    }
  }

  return components.sort(
    (a, b) => b.componentNodes.length - a.componentNodes.length
  )
}

export const matrixify = ({ edgeHash, nodes, edgeWidthAccessor, nodeIDAccessor }) => {
  const matrix = []
  for (const nodeSource of nodes) {
    const nodeSourceID = nodeIDAccessor(nodeSource)
    const sourceRow = []
    matrix.push(sourceRow)
    for (const nodeTarget of nodes) {
      const nodeTargetID = nodeIDAccessor(nodeTarget)
      const theEdge = edgeHash.get(`${nodeSourceID}|${nodeTargetID}`)
      if (theEdge) {
        sourceRow.push(edgeWidthAccessor(theEdge))
      } else {
        sourceRow.push(0)
      }
    }
  }
  return matrix
}
