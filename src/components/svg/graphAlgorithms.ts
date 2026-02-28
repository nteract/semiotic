export function topologicalSort(nodesArray, edgesArray) {
  // adapted from https://simplapi.wordpress.com/2015/08/19/detect-graph-cycle-in-javascript/
  const nodes = []
  const nodeMap = new Map()
  for (const edge of edgesArray) {
    if (!edge.source.id || !edge.target.id) {
      return false
    }
    if (!nodeMap.has(edge.source.id)) {
      const newNode = { _id: edge.source.id, links: [] }
      nodeMap.set(edge.source.id, newNode)
      nodes.push(newNode)
    }
    if (!nodeMap.has(edge.target.id)) {
      const newNode = { _id: edge.target.id, links: [] }
      nodeMap.set(edge.target.id, newNode)
      nodes.push(newNode)
    }
    nodeMap.get(edge.source.id).links.push(edge.target.id)
  }

  // Test if a node got any icoming edge
  function hasIncomingEdge(list, node) {
    for (let i = 0, l = list.length; i < l; ++i) {
      if (list[i].links.indexOf(node._id) !== -1) {
        return true
      }
    }
    return false
  }

  // Kahn Algorithm
  const L = [],
    S = nodes.filter((node) => !hasIncomingEdge(nodes, node))

  let n = null

  while (S.length) {
    // Remove a node n from S
    n = S.pop()
    // Add n to tail of L
    L.push(n)

    let i = n.links.length
    while (i--) {
      // Getting the node associated to the current stored id in links
      const m = nodes[nodes.map((d) => d._id).indexOf(n.links[i])]

      // Remove edge e from the graph
      n.links.pop()

      if (!hasIncomingEdge(nodes, m)) {
        S.push(m)
      }
    }
  }

  // If any of them still got links, there is cycle somewhere
  const nodeWithEdge = nodes.find((node) => node.links.length !== 0)

  return nodeWithEdge ? null : L
}

const hierarchyDecorator = (hierarchy, hashEntries, nodeIDAccessor, nodes) => {
  if (hierarchy.children) {
    for (const child of hierarchy.children) {
      const theseEntries = hashEntries.filter((entry) => entry[1] === child.id)

      for (const entry of theseEntries) {
        const idNode =
          nodes.find((node) => nodeIDAccessor(node) === entry[0]) || {}

        const newNode = {
          id: entry[0],
          ...idNode,
          children: [],
          childMap: {}
        }

        child.childMap.set(entry[0], newNode)
        child.children.push(newNode)
      }
      if (child.children.length > 0) {
        hierarchyDecorator(child, hashEntries, nodeIDAccessor, nodes)
      }
    }
  }
}

export const softStack = (
  edges,
  nodes,
  sourceAccessor,
  targetAccessor,
  nodeIDAccessor
) => {
  let hierarchy = { id: "root-generated", children: [], childMap: new Map() }
  const discoveredHierarchyMap = new Map()
  const targetToSourceMap = new Map()
  let hasLogicalRoot = true
  let isHierarchical = true

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]

    const source = sourceAccessor(edge)
    const target = targetAccessor(edge)
    const sourceID =
      typeof source === "object" ? nodeIDAccessor(source) : source
    const targetID =
      typeof target === "object" ? nodeIDAccessor(target) : target

    targetToSourceMap.set(targetID, sourceID)

    if (!discoveredHierarchyMap.has(sourceID)) {
      discoveredHierarchyMap.set(sourceID, targetID)
    } else {
      isHierarchical = false
      break
    }
  }

  if (isHierarchical) {
    const hashEntries: Array<string[]> = []
    for (const entry of discoveredHierarchyMap) {
      hashEntries.push(entry)
      const target = entry[1]
      if (!discoveredHierarchyMap.has(target)) {
        discoveredHierarchyMap.set(target, "root-generated")
        const idNode =
          nodes.find((node) => nodeIDAccessor(node) === target) || {}

        const newNode = {
          id: target,
          ...idNode,
          children: [],
          childMap: new Map()
        }
        hierarchy.childMap.set(target, newNode)
        hierarchy.children.push(newNode)
      }
    }

    hierarchyDecorator(hierarchy, hashEntries, nodeIDAccessor, nodes)

    nodes.forEach((node) => {
      const nodeID = nodeIDAccessor(node)
      if (
        !discoveredHierarchyMap.has(nodeID) &&
        !targetToSourceMap.has(nodeID)
      ) {
        hierarchy.children.push({
          id: nodeID,
          ...node,
          children: [],
          childMap: new Map()
        })
      }
    })

    if (hierarchy.children.length === 1) {
      hierarchy = hierarchy.children[0]
      hasLogicalRoot = false
    }

    return { hierarchy, isHierarchical: true, hasLogicalRoot }
  }

  return { hierarchy: {}, isHierarchical: false, hasLogicalRoot: false }
}
