export interface NetworkHitBranch {
  x0: number
  y0: number
  x1: number
  y1: number
  radius: number
  order: number
  children?: NetworkHitBranch[]
}

/** Shared bounds hierarchy for committed network nodes and edges. */
export function buildNetworkHitTree(
  items: NetworkHitBranch[]
): NetworkHitBranch {
  if (items.length === 1) return items[0]
  const node: NetworkHitBranch = {
    x0: Infinity,
    y0: Infinity,
    x1: -Infinity,
    y1: -Infinity,
    radius: 0,
    order: -1
  }
  for (const item of items) {
    node.x0 = Math.min(node.x0, item.x0)
    node.y0 = Math.min(node.y0, item.y0)
    node.x1 = Math.max(node.x1, item.x1)
    node.y1 = Math.max(node.y1, item.y1)
    node.radius = Math.max(node.radius, item.radius)
    node.order = Math.max(node.order, item.order)
  }
  if (items.length <= 8) node.children = items.sort((a, b) => b.order - a.order)
  else {
    const horizontal = node.x1 - node.x0 >= node.y1 - node.y0
    items.sort((a, b) =>
      horizontal ? a.x0 + a.x1 - (b.x0 + b.x1) : a.y0 + a.y1 - (b.y0 + b.y1)
    )
    const middle = items.length >> 1
    node.children = [
      buildNetworkHitTree(items.slice(0, middle)),
      buildNetworkHitTree(items.slice(middle))
    ].sort((a, b) => b.order - a.order)
  }
  return node
}

/** Bounds only reject candidates; callers retain exact hit semantics. */
export function queryNetworkHitTree<T>(
  root: NetworkHitBranch,
  x: number,
  y: number,
  tolerance: number,
  hit: (order: number) => T | null
): T | null {
  let result: T | null = null,
    order = -1
  const visit = (node: NetworkHitBranch) => {
    if (node.order <= order) return
    const padding = Math.max(tolerance, node.radius) * 10 + 1e-7
    if (
      x < node.x0 - padding ||
      x > node.x1 + padding ||
      y < node.y0 - padding ||
      y > node.y1 + padding
    )
      return
    if (node.children) node.children.forEach(visit)
    else {
      const candidate = hit(node.order)
      if (candidate) {
        result = candidate
        order = node.order
      }
    }
  }
  visit(root)
  return result
}
