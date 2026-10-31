/** Keep TypeDoc 0.28's directory walker on minimatch 11's supported API. */
import { createRequire, registerHooks } from "node:module"
import { pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)
const utilitiesUrl = new URL(
  "./node-utils.js",
  pathToFileURL(require.resolve("typedoc"))
).href
const legacyRecursion =
  /return mini\.set\.some\(\(row\) => mini\.matchOne\(\s*childPath,\s*row,\s*\/\* partial \*\/\s*true\s*\)\);/

// TypeDoc's CLI forks a worker; --import is inherited by that worker. Rewrite
// only this call in memory. Installed packages and minimatch's patched engine
// stay intact, and a future native TypeDoc fix needs no transformation.
registerHooks({
  load(url, context, nextLoad) {
    const loaded = nextLoad(url, context)
    if (url !== utilitiesUrl) return loaded
    const source =
      typeof loaded.source === "string"
        ? loaded.source
        : Buffer.from(loaded.source).toString("utf8")
    if (!source.includes(".matchOne(")) return loaded
    const updated = source.replace(
      legacyRecursion,
      'return mini.match(childPath.join("/"), true);'
    )
    if (updated === source || updated.includes(".matchOne(")) {
      throw new Error(
        "TypeDoc's minimatch integration changed; review scripts/typedoc-compat.mjs"
      )
    }
    return { ...loaded, source: updated }
  }
})
