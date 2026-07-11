/**
 * Make a temporary runtime checkout execute the caller's benchmark manifest.
 *
 * The benchmark files import their runtime with relative paths, so after this
 * copy they still exercise the target checkout's `src/` while declaring the
 * exact same benchmark names and fixtures as the caller.
 */
import { cpSync, existsSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"

export function overlayBenchmarkManifest(sourceRoot, targetRoot) {
  const source = join(resolve(sourceRoot), "benchmarks")
  const target = join(resolve(targetRoot), "benchmarks")

  if (source === target) {
    throw new Error("Cannot overlay a benchmark manifest onto itself")
  }
  if (!existsSync(source)) {
    throw new Error(`Benchmark manifest does not exist: ${source}`)
  }

  // Remove first so deleted/renamed benchmark files from the target branch
  // cannot leak into the current branch's manifest.
  rmSync(target, { recursive: true, force: true })
  cpSync(source, target, { recursive: true })
}
