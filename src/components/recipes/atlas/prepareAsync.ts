import type { MotifBraidProjection } from "./braid"
import type {
  NetworkAtlasSource,
  NetworkAtlasSpec,
  PreparedNetworkAtlas
} from "./types"
import type { PrepareOptions, PrepareResult } from "./prepare"

/** Load the atlas analysis kernel on demand before projecting a Motif Braid. */
export async function prepareNetworkAtlasAsync(
  spec: NetworkAtlasSpec,
  source: NetworkAtlasSource,
  options: PrepareOptions = {}
): Promise<PrepareResult> {
  const { prepareNetworkAtlas } = await import("./prepare")
  return prepareNetworkAtlas(spec, source, options)
}

/** Load braid analysis on demand; the resulting projection feeds the synchronous layout. */
export async function prepareMotifBraid(
  atlas: PreparedNetworkAtlas
): Promise<MotifBraidProjection> {
  const { prepareMotifBraid: project } = await import("./braid")
  return project(atlas)
}
