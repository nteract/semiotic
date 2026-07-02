import { forceLayout } from "../../recipes/forceLayout"
import { forceLayoutPlugin } from "./forceLayoutPlugin"

self.onmessage = (event) => {
  const request = event.data

  if (request.kind === "normalized") {
    const nodeRadii = request.nodeRadii
    const options = nodeRadii
      ? {
          ...request.options,
          nodeRadius: (node) => nodeRadii[node.id] ?? 12,
        }
      : request.options
    self.postMessage({
      positions: forceLayout(request.nodes, request.edges, options),
    })
    return
  }

  const nodes = request.nodes
  const edges = request.edges
  forceLayoutPlugin.computeLayout(nodes, edges, request.config, request.size)
  self.postMessage({
    positions: Object.fromEntries(
      nodes.map((node) => [node.id, { x: node.x, y: node.y }]),
    ),
  })
}

