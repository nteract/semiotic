import type { PreparedNetworkAtlas } from "./types"

export type AtlasPublicationStore = Map<string, PreparedNetworkAtlas>

/**
 * Revision-keyed publisher. An obsolete prepare result cannot overwrite a newer one.
 * This is the data-level contract a later worker must honor.
 */
export function publishPreparedAtlas(
  store: AtlasPublicationStore,
  atlas: PreparedNetworkAtlas
): { published: boolean; reason?: string } {
  const existing = store.get(atlas.sourceGraphRef)
  if (existing && existing.provenance.generation > atlas.provenance.generation) {
    return { published: false, reason: "obsolete-revision" }
  }
  store.set(atlas.sourceGraphRef, atlas)
  return { published: true }
}
