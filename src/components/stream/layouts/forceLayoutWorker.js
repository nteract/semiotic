import { forceLayout } from "../../recipes/forceLayout"
import { forceLayoutPlugin } from "./forceLayoutPlugin"

/**
 * Long-lived force-layout worker. Clients send `{ requestId, ...request }`
 * and receive `{ requestId, positions }` so a single Worker instance can
 * serve concurrent layouts without spawn/terminate thrash.
 */
self.onmessage = (event) => {
  const message = event.data
  const requestId = message?.requestId
  const request = message?.request ?? message

  try {
    if (request.kind === "normalized") {
      const nodeRadii = request.nodeRadii
      const options = nodeRadii
        ? {
            ...request.options,
            nodeRadius: (node) => nodeRadii[node.id] ?? 12,
          }
        : request.options
      self.postMessage({
        requestId,
        positions: forceLayout(request.nodes, request.edges, options),
      })
      return
    }

    const nodes = request.nodes
    const edges = request.edges
    forceLayoutPlugin.computeLayout(nodes, edges, request.config, request.size)
    self.postMessage({
      requestId,
      positions: Object.fromEntries(
        nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
      ),
    })
  } catch (error) {
    self.postMessage({
      requestId,
      error: {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    })
  }
}
