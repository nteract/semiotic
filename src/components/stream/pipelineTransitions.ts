/**
 * Transition animation for XY pipeline scene nodes.
 *
 * Handles identity-based enter/update/exit transitions:
 *   - snapshotPositions: captures current scene state before rebuild
 *   - getNodeIdentity: stable key generation per node type
 *   - startTransition: sets up interpolation from old→new positions
 *   - advanceTransition: per-frame tick with easing
 *
 * Dependencies: pipelineTransitionUtils (lerp, easing, ActiveTransition)
 * Consumed by: PipelineStore.computeScene (after decay/pulse)
 */
import type {
  SceneNode,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  TransitionConfig
} from "./types"
import { computeEasing, computeRawProgress, lerp, now as getTimestamp } from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"

// ── Types ──────────────────────────────────────────────────────────────

export type PrevPosition = { x: number; y: number; w?: number; h?: number; r?: number; opacity?: number }
export type PrevPath = { topPath?: [number, number][]; bottomPath?: [number, number][]; path?: [number, number][]; opacity?: number }

/** Context needed from PipelineStore for identity resolution */
export interface TransitionContext {
  runtimeMode?: "streaming" | "bounded"
  getX: (d: any) => number
  getY: (d: any) => number
  getCategory?: (d: any) => string
}

// ── Identity ───────────────────────────────────────────────────────────

/**
 * Get a stable identity key for a scene node.
 */
export function getNodeIdentity(ctx: TransitionContext, node: SceneNode, index: number): string | null {
  switch (node.type) {
    case "point": {
      if (node.pointId) return `p:${node.pointId}`
      if (ctx.runtimeMode === "streaming" && node.datum) {
        if (ctx.getCategory) {
          const cat = ctx.getCategory(node.datum)
          const val = ctx.getY(node.datum)
          return `p:${cat}:${val}`
        }
        const xVal = ctx.getX(node.datum)
        const yVal = ctx.getY(node.datum)
        if (xVal != null && yVal != null) return `p:${xVal}:${yVal}`
      }
      return `p:${index}`
    }
    case "rect":
      return `r:${node.group || ""}:${node.datum?.binStart ?? node.datum?.category ?? index}`
    case "heatcell":
      return `h:${node.x}_${node.y}`
    case "candlestick":
      return node.datum == null ? `c:${index}` : `c:${ctx.getX(node.datum)}`
    case "line":
      return `l:${node.group || "_default"}`
    case "area":
      return `a:${node.group || "_default"}`
    default:
      return null
  }
}

// ── Snapshot ────────────────────────────────────────────────────────────

/**
 * Snapshot current scene node positions before rebuild.
 */
export function snapshotPositions(
  ctx: TransitionContext,
  scene: SceneNode[],
  prevPositionMap: Map<string, PrevPosition>,
  prevPathMap: Map<string, PrevPath>
): void {
  prevPositionMap.clear()
  prevPathMap.clear()
  for (let i = 0; i < scene.length; i++) {
    const node = scene[i]
    const key = getNodeIdentity(ctx, node, i)
    if (!key) continue
    if (node.type === "point") {
      prevPositionMap.set(key, { x: node.x, y: node.y, r: node.r, opacity: node.style.opacity })
    } else if (node.type === "rect") {
      prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h, opacity: node.style.opacity })
    } else if (node.type === "heatcell") {
      prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h, opacity: node.style?.opacity })
    } else if (node.type === "candlestick") {
      prevPositionMap.set(key, { x: node.x, y: node.openY })
    } else if (node.type === "line") {
      prevPathMap.set(key, { path: node.path.map(p => [p[0], p[1]] as [number, number]), opacity: node.style?.opacity })
    } else if (node.type === "area") {
      prevPathMap.set(key, {
        topPath: node.topPath.map(p => [p[0], p[1]] as [number, number]),
        bottomPath: node.bottomPath.map(p => [p[0], p[1]] as [number, number]),
        opacity: node.style?.opacity
      })
    }
  }
}

// ── Start Transition ───────────────────────────────────────────────────

export interface TransitionState {
  scene: SceneNode[]
  exitNodes: SceneNode[]
  activeTransition: ActiveTransition | null
}

/**
 * After scene rebuild, set up transition from old to new positions.
 * Detects entering nodes (new, no prev match) and exiting nodes (prev, no new match).
 * Mutates scene and exitNodes in place. Returns updated state.
 */
export function startTransition(
  ctx: TransitionContext,
  transition: TransitionConfig,
  state: TransitionState,
  prevPositionMap: Map<string, PrevPosition>,
  prevPathMap: Map<string, PrevPath>
): TransitionState {
  if (prevPositionMap.size === 0 && prevPathMap.size === 0) return state
  const duration = transition.duration ?? 300

  // Clear any previously-appended exit nodes from the scene before processing
  if (state.exitNodes.length > 0) {
    const exitSet = new Set(state.exitNodes)
    state.scene = state.scene.filter(n => !exitSet.has(n))
    state.exitNodes = []
  }

  let hasChanges = false
  const matchedPrevKeys = new Set<string>()
  const matchedPrevPathKeys = new Set<string>()

  for (let i = 0; i < state.scene.length; i++) {
    const node = state.scene[i]
    const key = getNodeIdentity(ctx, node, i)
    if (!key) continue

    node._transitionKey = key

    // Handle line/area path interpolation setup
    if (node.type === "line" || node.type === "area") {
      const prevPath = prevPathMap.get(key)
      if (prevPath) {
        matchedPrevPathKeys.add(key)
        if (node.type === "line" && prevPath.path && prevPath.path.length === node.path.length) {
          node._targetPath = node.path.map(p => [p[0], p[1]] as [number, number])
          node._prevPath = prevPath.path
          for (let j = 0; j < node.path.length; j++) {
            node.path[j] = [prevPath.path[j][0], prevPath.path[j][1]]
          }
          hasChanges = true
        } else if (node.type === "area" && prevPath.topPath && prevPath.bottomPath
          && prevPath.topPath.length === node.topPath.length
          && prevPath.bottomPath.length === node.bottomPath.length) {
          node._targetTopPath = node.topPath.map(p => [p[0], p[1]] as [number, number])
          node._targetBottomPath = node.bottomPath.map(p => [p[0], p[1]] as [number, number])
          node._prevTopPath = prevPath.topPath
          node._prevBottomPath = prevPath.bottomPath
          for (let j = 0; j < node.topPath.length; j++) {
            node.topPath[j] = [prevPath.topPath[j][0], prevPath.topPath[j][1]]
          }
          for (let j = 0; j < node.bottomPath.length; j++) {
            node.bottomPath[j] = [prevPath.bottomPath[j][0], prevPath.bottomPath[j][1]]
          }
          hasChanges = true
        }
        node._targetOpacity = node.style.opacity ?? 1
      } else {
        // Entering line/area — fade in from 0
        node._targetOpacity = node.style.opacity ?? 1
        node.style = { ...node.style, opacity: 0 }
        hasChanges = true
      }
      continue
    }

    const prev = prevPositionMap.get(key)

    if (node.type === "point") {
      if (prev) {
        matchedPrevKeys.add(key)
        const target = { x: node.x, y: node.y, r: node.r }
        node._targetOpacity = node.style.opacity ?? 1
        if (prev.x !== target.x || prev.y !== target.y) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetR = target.r
          node.x = prev.x
          node.y = prev.y
          node.r = prev.r ?? node.r
          hasChanges = true
        }
      } else {
        node._targetOpacity = node.style.opacity ?? 1
        node.style = { ...node.style, opacity: 0 }
        hasChanges = true
      }
    } else if (node.type === "rect") {
      if (prev) {
        matchedPrevKeys.add(key)
        const target = { x: node.x, y: node.y, w: node.w, h: node.h }
        node._targetOpacity = node.style.opacity ?? 1
        if (prev.x !== target.x || prev.y !== target.y || prev.w !== target.w || prev.h !== target.h) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetW = target.w
          node._targetH = target.h
          node.x = prev.x
          node.y = prev.y
          node.w = prev.w ?? node.w
          node.h = prev.h ?? node.h
          hasChanges = true
        }
      } else {
        node._targetOpacity = node.style.opacity ?? 1
        node.style = { ...node.style, opacity: 0 }
        hasChanges = true
      }
    } else if (node.type === "heatcell") {
      if (prev) {
        matchedPrevKeys.add(key)
        const target = { x: node.x, y: node.y, w: node.w, h: node.h }
        node._targetOpacity = node.style?.opacity ?? 1
        if (prev.x !== target.x || prev.y !== target.y) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetW = target.w
          node._targetH = target.h
          node.x = prev.x
          node.y = prev.y
          node.w = prev.w ?? node.w
          node.h = prev.h ?? node.h
          hasChanges = true
        }
      } else {
        node._targetOpacity = node.style?.opacity ?? 1
        node.style = { ...(node.style || {}), opacity: 0 }
        hasChanges = true
      }
    }
  }

  // Detect exit line/area nodes: keys in prevPathMap not matched in new scene
  for (const [key, prevPath] of prevPathMap) {
    if (matchedPrevPathKeys.has(key)) continue
    if (key.startsWith("l:") && prevPath.path) {
      const exitNode: LineSceneNode = {
        type: "line", path: prevPath.path.map(p => [p[0], p[1]] as [number, number]),
        group: key.slice(2), style: { stroke: "#999", strokeWidth: 1, opacity: prevPath.opacity ?? 1 },
        _targetOpacity: 0, _transitionKey: key, datum: null
      }
      state.exitNodes.push(exitNode)
      hasChanges = true
    } else if (key.startsWith("a:") && prevPath.topPath && prevPath.bottomPath) {
      const exitNode: AreaSceneNode = {
        type: "area",
        topPath: prevPath.topPath.map(p => [p[0], p[1]] as [number, number]),
        bottomPath: prevPath.bottomPath.map(p => [p[0], p[1]] as [number, number]),
        group: key.slice(2), style: { fill: "#999", opacity: prevPath.opacity ?? 1 },
        _targetOpacity: 0, _transitionKey: key, datum: null
      }
      state.exitNodes.push(exitNode)
      hasChanges = true
    }
  }

  // Detect exit discrete nodes: keys in prevPositionMap not matched in new scene
  for (const [key, prev] of prevPositionMap) {
    if (matchedPrevKeys.has(key)) continue
    if (key.startsWith("p:")) {
      const exitNode = {
        type: "point", x: prev.x, y: prev.y, r: prev.r ?? 3,
        style: { opacity: prev.opacity ?? 1 }, datum: null,
        _targetOpacity: 0, _transitionKey: key
      } as unknown as PointSceneNode
      state.exitNodes.push(exitNode)
    } else if (key.startsWith("r:")) {
      const exitNode = {
        type: "rect", x: prev.x, y: prev.y, w: prev.w ?? 0, h: prev.h ?? 0,
        style: { opacity: prev.opacity ?? 1, fill: "#999" }, datum: null,
        _targetOpacity: 0, _transitionKey: key
      } as unknown as RectSceneNode
      state.exitNodes.push(exitNode)
    } else if (key.startsWith("h:")) {
      const exitNode = {
        type: "heatcell", x: prev.x, y: prev.y, w: prev.w ?? 0, h: prev.h ?? 0,
        fill: "#999", datum: null, style: { opacity: prev.opacity ?? 1 },
        _targetOpacity: 0, _transitionKey: key
      } as unknown as HeatcellSceneNode
      state.exitNodes.push(exitNode)
    }
    hasChanges = true
  }

  // Append exit nodes
  if (state.exitNodes.length > 0) {
    state.scene = [...state.scene, ...state.exitNodes]
  }

  if (hasChanges) {
    state.activeTransition = {
      startTime: getTimestamp(),
      duration
    }
  }

  return state
}

// ── Advance Transition ─────────────────────────────────────────────────

/**
 * Advance the transition animation. Returns true if still animating.
 * Mutates scene nodes in place.
 */
export function advanceTransition(
  now: number,
  transition: TransitionConfig,
  state: TransitionState,
  prevPositionMap: Map<string, PrevPosition>,
  prevPathMap: Map<string, PrevPath>
): boolean {
  if (!state.activeTransition) return false

  const rawT = computeRawProgress(now, state.activeTransition)
  const easing = transition.easing === "linear" ? "linear" : "ease-out-cubic"
  const t = computeEasing(rawT, easing)

  for (const node of state.scene) {
    const key = node._transitionKey
    if (node.type === "point") {
      if (node._targetOpacity !== undefined) {
        const prev = key ? prevPositionMap.get(key) : undefined
        const startOpacity = prev ? (prev.opacity ?? 1) : 0
        node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
      }
      if (node._targetX === undefined) continue
      if (!key) continue
      const prev = prevPositionMap.get(key)
      if (!prev) continue
      node.x = lerp(prev.x, node._targetX, t)
      node.y = lerp(prev.y, node._targetY!, t)
      if (node._targetR !== undefined && prev.r !== undefined) {
        node.r = lerp(prev.r, node._targetR, t)
      }
    } else if (node.type === "rect") {
      if (node._targetOpacity !== undefined) {
        const prev = key ? prevPositionMap.get(key) : undefined
        const startOpacity = prev ? (prev.opacity ?? 1) : 0
        node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
      }
      if (node._targetX === undefined) continue
      if (!key) continue
      const prev = prevPositionMap.get(key)
      if (!prev) continue
      node.x = lerp(prev.x, node._targetX, t)
      node.y = lerp(prev.y, node._targetY!, t)
      if (prev.w !== undefined) node.w = lerp(prev.w, node._targetW!, t)
      if (prev.h !== undefined) node.h = lerp(prev.h, node._targetH!, t)
    } else if (node.type === "heatcell") {
      if (node._targetOpacity !== undefined) {
        const prev = key ? prevPositionMap.get(key) : undefined
        const startOpacity = prev ? (prev.opacity ?? 1) : 0
        node.style = { ...(node.style || {}), opacity: lerp(startOpacity, node._targetOpacity, t) }
      }
      if (node._targetX === undefined) continue
      if (!key) continue
      const prev = prevPositionMap.get(key)
      if (!prev) continue
      node.x = lerp(prev.x, node._targetX, t)
      node.y = lerp(prev.y, node._targetY!, t)
      if (prev.w !== undefined) node.w = lerp(prev.w, node._targetW!, t)
      if (prev.h !== undefined) node.h = lerp(prev.h, node._targetH!, t)
    } else if (node.type === "line") {
      if (node._targetOpacity !== undefined) {
        const isEntering = node._prevPath === undefined && node._targetOpacity > 0
        const startOpacity = isEntering ? 0 : (node.style.opacity ?? 1)
        node.style = { ...node.style, opacity: lerp(startOpacity, node._targetOpacity, t) }
      }
      const prevPath = node._prevPath
      const targetPath = node._targetPath
      if (prevPath && targetPath && prevPath.length === node.path.length) {
        for (let j = 0; j < node.path.length; j++) {
          node.path[j][0] = lerp(prevPath[j][0], targetPath[j][0], t)
          node.path[j][1] = lerp(prevPath[j][1], targetPath[j][1], t)
        }
      }
    } else if (node.type === "area") {
      if (node._targetOpacity !== undefined) {
        const isEntering = node._prevTopPath === undefined && node._targetOpacity > 0
        const startOpacity = isEntering ? 0 : (node.style.opacity ?? 1)
        node.style = { ...node.style, opacity: lerp(startOpacity, node._targetOpacity, t) }
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
  }

  if (rawT >= 1) {
    // Snap to targets and clear transition fields
    for (const node of state.scene) {
      if (node._targetOpacity !== undefined) {
        const finalOpacity = node._targetOpacity
        if (node.type === "line" || node.type === "area") {
          node.style = { ...node.style, opacity: finalOpacity === 0 ? 0 : finalOpacity }
        } else {
          node.style = { ...(node.style || {}), opacity: finalOpacity === 0 ? 0 : finalOpacity }
        }
        node._targetOpacity = undefined
      }
      if (node.type === "point") {
        if (node._targetX === undefined) continue
        node.x = node._targetX
        node.y = node._targetY!
        if (node._targetR !== undefined) node.r = node._targetR
        node._targetX = undefined
        node._targetY = undefined
        node._targetR = undefined
      } else if (node.type === "rect") {
        if (node._targetX === undefined) continue
        node.x = node._targetX
        node.y = node._targetY!
        node.w = node._targetW!
        node.h = node._targetH!
        node._targetX = undefined
        node._targetY = undefined
        node._targetW = undefined
        node._targetH = undefined
      } else if (node.type === "heatcell") {
        if (node._targetX === undefined) continue
        node.x = node._targetX
        node.y = node._targetY!
        node.w = node._targetW!
        node.h = node._targetH!
        node._targetX = undefined
        node._targetY = undefined
        node._targetW = undefined
        node._targetH = undefined
      } else if (node.type === "line") {
        const targetPath = node._targetPath
        if (targetPath) {
          for (let j = 0; j < node.path.length; j++) {
            node.path[j] = targetPath[j]
          }
        }
        node._prevPath = undefined
        node._targetPath = undefined
      } else if (node.type === "area") {
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
      }
    }

    // Remove exit nodes from scene
    if (state.exitNodes.length > 0) {
      const exitSet = new Set(state.exitNodes)
      state.scene = state.scene.filter(n => !exitSet.has(n))
      state.exitNodes = []
    }
    state.activeTransition = null
    return false
  }

  return true
}
