/**
 * Identity-keyed line/area path interpolation for XY transitions.
 *
 * Path vertices join by pointIdAccessor (or unique streaming x) so a sliding
 * window slides retained points instead of interpolating by array index.
 */
import type { AreaSceneNode, LineSceneNode, SceneNode } from "./types"
import { lerp } from "./pipelineTransitionUtils"
import type { PrevPath, TransitionContext } from "./pipelineTransitionTypes"

export function copyPathPoint(point: [number, number]): [number, number] {
  return [point[0], point[1]]
}

/**
 * Align previous path vertices to the next path by identity key.
 *
 * Retained keys keep their previous coordinates so a sliding window slides
 * instead of interpolating vertex i → vertex i. Newly entered keys grow from
 * the nearest already-matched neighbor (the window boundary).
 */
export function joinPathByIdentity(
  prevPath: [number, number][],
  prevIds: string[],
  nextPath: [number, number][],
  nextIds: string[]
): { prev: [number, number][]; target: [number, number][] } {
  const prevById = new Map<string, [number, number]>()
  for (let i = 0; i < prevIds.length; i++) {
    prevById.set(prevIds[i], prevPath[i])
  }

  let firstMatchedPrev: [number, number] | undefined
  for (const id of nextIds) {
    const matched = prevById.get(id)
    if (matched) {
      firstMatchedPrev = matched
      break
    }
  }

  const prev: [number, number][] = new Array(nextPath.length)
  const target: [number, number][] = new Array(nextPath.length)
  let lastMatchedPrev: [number, number] | undefined
  for (let i = 0; i < nextPath.length; i++) {
    target[i] = copyPathPoint(nextPath[i])
    const matched = prevById.get(nextIds[i])
    if (matched) {
      prev[i] = copyPathPoint(matched)
      lastMatchedPrev = matched
    } else {
      const from = lastMatchedPrev ?? firstMatchedPrev ?? nextPath[i]
      prev[i] = copyPathPoint(from)
    }
  }
  return { prev, target }
}

function derivePathIds(
  ctx: TransitionContext,
  datum: LineSceneNode["datum"] | AreaSceneNode["datum"],
  length: number
): string[] | undefined {
  if (!Array.isArray(datum) || datum.length !== length || length === 0) return undefined
  if (ctx.getPointId) {
    const ids = datum.map((row) => String(ctx.getPointId!(row)))
    if (ids.every((id) => id.length > 0)) return ids
  }
  if (ctx.runtimeMode === "streaming") {
    const ids = datum.map((row) => `x:${ctx.getX(row)}`)
    if (new Set(ids).size === ids.length) return ids
  }
  return undefined
}

export function resolvePathIds(
  ctx: TransitionContext,
  node: LineSceneNode | AreaSceneNode,
  pathLength: number
): string[] | undefined {
  if (node.pathIds && node.pathIds.length === pathLength) return node.pathIds
  return derivePathIds(ctx, node.datum, pathLength)
}

function pathMoved(
  prev: [number, number][],
  target: [number, number][]
): boolean {
  if (prev.length !== target.length) return true
  for (let i = 0; i < prev.length; i++) {
    if (prev[i][0] !== target[i][0] || prev[i][1] !== target[i][1]) return true
  }
  return false
}

export function snapshotPathNode(
  ctx: TransitionContext,
  node: LineSceneNode | AreaSceneNode,
  key: string,
  prevPathMap: Map<string, PrevPath>
): void {
  if (node.type === "line") {
    prevPathMap.set(key, {
      path: node.path.map(copyPathPoint),
      pathIds: resolvePathIds(ctx, node, node.path.length),
      opacity: node.style?.opacity
    })
    return
  }
  prevPathMap.set(key, {
    topPath: node.topPath.map(copyPathPoint),
    bottomPath: node.bottomPath.map(copyPathPoint),
    pathIds: resolvePathIds(ctx, node, node.topPath.length),
    opacity: node.style?.opacity
  })
}

function startLinePath(
  ctx: TransitionContext,
  node: LineSceneNode,
  prevPath: PrevPath
): boolean {
  if (!prevPath.path) return false
  const nextIds = resolvePathIds(ctx, node, node.path.length)
  const prevIds = prevPath.pathIds
  if (
    prevIds &&
    nextIds &&
    prevIds.length === prevPath.path.length &&
    nextIds.length === node.path.length
  ) {
    const joined = joinPathByIdentity(
      prevPath.path,
      prevIds,
      node.path,
      nextIds
    )
    if (
      pathMoved(joined.prev, joined.target) ||
      node._introClipFraction !== undefined
    ) {
      node._targetPath = joined.target
      node._prevPath = joined.prev
      node.path = joined.prev.map(copyPathPoint)
      return true
    }
    return false
  }
  if (prevPath.path.length === node.path.length) {
    node._targetPath = node.path.map(copyPathPoint)
    node._prevPath = prevPath.path
    for (let j = 0; j < node.path.length; j++) {
      node.path[j] = copyPathPoint(prevPath.path[j])
    }
    return true
  }
  return false
}

function startAreaPath(
  ctx: TransitionContext,
  node: AreaSceneNode,
  prevPath: PrevPath
): boolean {
  if (!prevPath.topPath || !prevPath.bottomPath) return false
  const nextIds = resolvePathIds(ctx, node, node.topPath.length)
  const prevIds = prevPath.pathIds
  if (
    prevIds &&
    nextIds &&
    prevIds.length === prevPath.topPath.length &&
    nextIds.length === node.topPath.length &&
    prevPath.bottomPath.length === prevPath.topPath.length &&
    node.bottomPath.length === node.topPath.length
  ) {
    const joinedTop = joinPathByIdentity(
      prevPath.topPath,
      prevIds,
      node.topPath,
      nextIds
    )
    const joinedBottom = joinPathByIdentity(
      prevPath.bottomPath,
      prevIds,
      node.bottomPath,
      nextIds
    )
    if (
      pathMoved(joinedTop.prev, joinedTop.target) ||
      pathMoved(joinedBottom.prev, joinedBottom.target) ||
      node._introClipFraction !== undefined
    ) {
      node._targetTopPath = joinedTop.target
      node._targetBottomPath = joinedBottom.target
      node._prevTopPath = joinedTop.prev
      node._prevBottomPath = joinedBottom.prev
      node.topPath = joinedTop.prev.map(copyPathPoint)
      node.bottomPath = joinedBottom.prev.map(copyPathPoint)
      return true
    }
    return false
  }
  if (
    prevPath.topPath.length === node.topPath.length &&
    prevPath.bottomPath.length === node.bottomPath.length
  ) {
    node._targetTopPath = node.topPath.map(copyPathPoint)
    node._targetBottomPath = node.bottomPath.map(copyPathPoint)
    node._prevTopPath = prevPath.topPath
    node._prevBottomPath = prevPath.bottomPath
    for (let j = 0; j < node.topPath.length; j++) {
      node.topPath[j] = copyPathPoint(prevPath.topPath[j])
    }
    for (let j = 0; j < node.bottomPath.length; j++) {
      node.bottomPath[j] = copyPathPoint(prevPath.bottomPath[j])
    }
    return true
  }
  return false
}

/** Set up line/area path interpolation. Returns whether the path changed. */
export function startPathTransition(
  ctx: TransitionContext,
  node: LineSceneNode | AreaSceneNode,
  prevPath: PrevPath | undefined,
  matchedPrevPathKeys: Set<string>,
  key: string
): boolean {
  if (!prevPath) {
    node._targetOpacity = node.style.opacity ?? 1
    node._startOpacity = 0
    node.style = { ...node.style, opacity: 0 }
    return true
  }
  matchedPrevPathKeys.add(key)
  const moved =
    node.type === "line"
      ? startLinePath(ctx, node, prevPath)
      : startAreaPath(ctx, node, prevPath)
  node._targetOpacity = node.style.opacity ?? 1
  node._startOpacity = prevPath.opacity ?? node.style.opacity ?? 1
  return moved
}

export function collectExitPathNodes(
  prevPathMap: Map<string, PrevPath>,
  matchedPrevPathKeys: Set<string>
): SceneNode[] {
  const exits: SceneNode[] = []
  for (const [key, prevPath] of prevPathMap) {
    if (matchedPrevPathKeys.has(key)) continue
    if (key.startsWith("l:") && prevPath.path) {
      const exitNode: LineSceneNode = {
        type: "line",
        path: prevPath.path.map(copyPathPoint),
        group: key.slice(2),
        style: { stroke: "#999", strokeWidth: 1, opacity: prevPath.opacity ?? 1 },
        _targetOpacity: 0,
        _transitionKey: key,
        datum: null
      }
      exits.push(exitNode)
    } else if (key.startsWith("a:") && prevPath.topPath && prevPath.bottomPath) {
      const exitNode: AreaSceneNode = {
        type: "area",
        topPath: prevPath.topPath.map(copyPathPoint),
        bottomPath: prevPath.bottomPath.map(copyPathPoint),
        group: key.slice(2),
        style: { fill: "#999", opacity: prevPath.opacity ?? 1 },
        _targetOpacity: 0,
        _transitionKey: key,
        datum: null
      }
      exits.push(exitNode)
    }
  }
  return exits
}

export function advancePathNode(
  node: LineSceneNode | AreaSceneNode,
  t: number
): void {
  if (node._targetOpacity !== undefined) {
    const startOpacity = node._startOpacity ?? 0
    node.style = { ...node.style, opacity: lerp(startOpacity, node._targetOpacity, t) }
  }
  if (node._introClipFraction !== undefined) {
    node._introClipFraction = t
  }
  if (node.type === "line") {
    const prevPath = node._prevPath
    const targetPath = node._targetPath
    if (prevPath && targetPath && prevPath.length === node.path.length) {
      for (let j = 0; j < node.path.length; j++) {
        node.path[j][0] = lerp(prevPath[j][0], targetPath[j][0], t)
        node.path[j][1] = lerp(prevPath[j][1], targetPath[j][1], t)
      }
    }
    return
  }
  const prevTop = node._prevTopPath
  const prevBottom = node._prevBottomPath
  const targetTop = node._targetTopPath
  const targetBottom = node._targetBottomPath
  if (prevTop && targetTop && prevTop.length === node.topPath.length) {
    for (let j = 0; j < node.topPath.length; j++) {
      node.topPath[j][0] = lerp(prevTop[j][0], targetTop[j][0], t)
      node.topPath[j][1] = lerp(prevTop[j][1], targetTop[j][1], t)
    }
  }
  if (prevBottom && targetBottom && prevBottom.length === node.bottomPath.length) {
    for (let j = 0; j < node.bottomPath.length; j++) {
      node.bottomPath[j][0] = lerp(prevBottom[j][0], targetBottom[j][0], t)
      node.bottomPath[j][1] = lerp(prevBottom[j][1], targetBottom[j][1], t)
    }
  }
}

export function snapPathNode(node: LineSceneNode | AreaSceneNode): void {
  if (node.type === "line") {
    const targetPath = node._targetPath
    if (targetPath) {
      for (let j = 0; j < node.path.length; j++) {
        node.path[j] = targetPath[j]
      }
    }
    node._prevPath = undefined
    node._targetPath = undefined
    node._introClipFraction = undefined
    return
  }
  const targetTop = node._targetTopPath
  const targetBottom = node._targetBottomPath
  if (targetTop) {
    for (let j = 0; j < node.topPath.length; j++) {
      node.topPath[j] = targetTop[j]
    }
  }
  if (targetBottom) {
    for (let j = 0; j < node.bottomPath.length; j++) {
      node.bottomPath[j] = targetBottom[j]
    }
  }
  node._prevTopPath = undefined
  node._prevBottomPath = undefined
  node._targetTopPath = undefined
  node._targetBottomPath = undefined
  node._introClipFraction = undefined
}
