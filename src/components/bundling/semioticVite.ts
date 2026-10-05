type Output =
  | { type: "chunk"; fileName: string; code: string }
  | { type: "asset"; fileName: string; source: string | Uint8Array }

// These are the three filenames emitted by Semiotic's worker build. Vite may
// append a content hash or preserve the filename, depending on output options.
const WORKER_ASSET =
  /(?:^|\/)(?:forceLayoutWorker|processSankeyLayoutWorker|physicsWorker)(?:-[\w-]+)?\.js$/

/**
 * Remove unreferenced Semiotic worker assets emitted before Vite/Rollup tree
 * shaking. Referenced workers keep their external URLs and CSP behavior.
 * Add `semioticVite()` to `plugins` in vite.config.ts (especially on Vite 7).
 */
export function semioticVite() {
  return {
    name: "semiotic-unused-worker-assets",
    apply: "build" as const,
    enforce: "post" as const,
    generateBundle: {
      order: "post" as const,
      handler(_options: unknown, bundle: Record<string, Output>) {
        const candidates = new Map(
          Object.entries(bundle).filter(
            ([, output]) =>
              output.type === "asset" && WORKER_ASSET.test(output.fileName)
          )
        )
        if (!candidates.size) return
        const sources = Object.entries(bundle)
          .filter(
            ([key, output]) =>
              !candidates.has(key) && !output.fileName.endsWith(".map")
          )
          .map(([, output]) =>
            output.type === "chunk"
              ? output.code
              : typeof output.source === "string"
                ? output.source
                : new TextDecoder().decode(output.source)
          )
        const referenced = new Set<string>()
        // A referenced worker may itself reference another worker asset.
        for (let i = 0; i < sources.length; i++) {
          for (const [key, output] of candidates) {
            if (referenced.has(key)) continue
            const filename = output.fileName.slice(
              output.fileName.lastIndexOf("/") + 1
            )
            if (
              !sources[i].includes(filename) &&
              !sources[i].includes(encodeURIComponent(filename))
            )
              continue
            referenced.add(key)
            if (output.type === "asset")
              sources.push(
                typeof output.source === "string"
                  ? output.source
                  : new TextDecoder().decode(output.source)
              )
          }
        }
        for (const [key, output] of candidates) {
          if (referenced.has(key)) continue
          delete bundle[key]
          // Only remove the matching map when its owning worker was removed.
          for (const [mapKey, map] of Object.entries(bundle)) {
            if (
              map.type === "asset" &&
              map.fileName === `${output.fileName}.map`
            )
              delete bundle[mapKey]
          }
        }
      }
    }
  }
}
