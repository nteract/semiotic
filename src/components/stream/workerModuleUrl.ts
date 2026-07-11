/**
 * Resolve a packaged module-worker asset from either published module format.
 *
 * tsup's CommonJS transform replaces `import.meta` with an object whose `url`
 * field is absent. The fallback deliberately uses the real CommonJS module
 * filename so `new Worker()` still points at the sibling asset shipped in the
 * tarball. ESM callers retain their literal `new URL(..., import.meta.url)`
 * expression so browser bundlers can discover and emit the worker asset.
 */
export function commonJsWorkerModuleUrl(assetName: string): URL {
  if (typeof __filename !== "undefined") {
    // URL's file parser expects forward slashes, including for a Windows
    // drive path. This branch only exists in CommonJS output.
    const filename = __filename.replace(/\\/g, "/")
    const absoluteFilename = filename.startsWith("/") ? filename : `/${filename}`
    return new URL(`./${assetName}`, `file:${absoluteFilename}`)
  }

  throw new Error(`Cannot resolve module worker asset: ${assetName}`)
}
