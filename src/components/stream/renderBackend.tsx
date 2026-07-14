import * as React from "react"
import type {
  SceneRenderBackend,
  SceneRenderMode,
  Style
} from "./types"
import type { SceneRenderDatum } from "./sceneRenderBackendTypes"

type SceneLike = {
  type?: string
  datum?: unknown
  style?: Style
}

const warnedFallbacks = new Set<string>()

function isBackend<Node>(value: unknown): value is SceneRenderBackend<Node> {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<SceneRenderBackend<Node>>
  return typeof candidate.id === "string" &&
    typeof candidate.cacheKey === "function" &&
    typeof candidate.drawCanvas === "function" &&
    typeof candidate.renderStaticSVG === "function"
}

/** Resolve a whole-scene or per-datum renderer. The legacy `sketchy` token
 * stays on the existing built-in rendering path. */
export function resolveSceneRenderBackend<Node extends SceneLike>(
  renderMode: SceneRenderMode<Node> | undefined,
  node: Node
): SceneRenderBackend<Node> | undefined {
  const candidate = typeof renderMode === "function"
    ? renderMode((node.datum ?? null) as SceneRenderDatum<Node>, node)
    : renderMode
  return isBackend<Node>(candidate) ? candidate : undefined
}

function warnFallback(backendId: string, nodeType: string): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return
  const warningKey = `${backendId}:${nodeType}`
  if (warnedFallbacks.has(warningKey)) return
  warnedFallbacks.add(warningKey)
  console.warn(
    `[Semiotic] Render backend "${backendId}" does not support scene node ` +
    `"${nodeType}"; using the built-in renderer.`
  )
}

/** Paint nodes in scene order, delegating unsupported runs to the built-in renderer. */
export function paintSceneWithBackend<Node extends SceneLike>(args: {
  context: CanvasRenderingContext2D
  nodes: Node[]
  renderMode: SceneRenderMode<Node> | undefined
  pixelRatio: number
  paintBuiltIn: (nodes: Node[]) => void
}): void {
  const { context, nodes, renderMode, pixelRatio, paintBuiltIn } = args
  if (!renderMode || renderMode === "sketchy") {
    paintBuiltIn(nodes)
    return
  }

  let fallback: Node[] = []
  const flushFallback = () => {
    if (!fallback.length) return
    paintBuiltIn(fallback)
    fallback = []
  }
  for (const node of nodes) {
    const backend = resolveSceneRenderBackend(renderMode, node)
    if (!backend) {
      fallback.push(node)
      continue
    }

    // A backend mark must not leapfrog an earlier built-in mark. Flush each
    // contiguous fallback run before painting the next backend-supported node.
    flushFallback()
    context.save()
    let handled: boolean
    try {
      handled = backend.drawCanvas({
        context,
        node,
        style: node.style ?? {},
        pixelRatio
      })
    } finally {
      context.restore()
    }
    if (!handled) {
      warnFallback(backend.id, node.type ?? "unknown")
      paintBuiltIn([node])
    }
  }
  flushFallback()
}

/** Try a backend for SSR/static SVG, then invoke the existing converter. */
export function renderSceneWithBackend<Node extends SceneLike>(args: {
  node: Node
  index: number
  renderMode: SceneRenderMode<Node> | undefined
  fallback: () => React.ReactNode
}): React.ReactNode {
  const { node, index, renderMode, fallback } = args
  const backend = resolveSceneRenderBackend(renderMode, node)
  if (!backend) return fallback()

  const rendered = backend.renderStaticSVG({
    node,
    style: node.style ?? {},
    key: `${backend.id}-${index}`
  })
  if (rendered != null) return rendered

  warnFallback(backend.id, node.type ?? "unknown")
  return fallback()
}

export function resetRenderBackendWarningsForTests(): void {
  warnedFallbacks.clear()
}
