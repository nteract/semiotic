/**
 * `"use client"` directive detection — one source of truth, shared by
 * the rollup `useClientPlugin` in build.mjs and its unit test in
 * scripts/build.directive-detection.test.mjs.
 *
 * Detects whether a source file's content qualifies as a client
 * module: opens with the `"use client"` (or `'use client'`) directive,
 * with any leading combination of whitespace + line comments + block
 * comments tolerated (matches how Next.js / React parsers interpret
 * the directive — has to be the first *statement* in the module, but
 * JSDoc and other leading comments are fine).
 *
 * The earlier `code.startsWith('"use client"')` check missed every
 * source file that opens with a JSDoc block (StreamOrdinalFrame.tsx,
 * useHydration.ts, useFrame.ts, etc.). Bundles still ended up
 * directive-tagged in practice because most chunks pulled in *some*
 * other module that opened with the bare directive — but a future
 * change isolating one of those JSDoc-headered files into its own
 * chunk would silently lose the directive on its bundle.
 */

/**
 * @param {string} code — module source text
 * @returns {boolean} true if the file opens with `"use client"` (or `'use client'`),
 *   tolerating leading whitespace, line comments, and block comments.
 */
export function hasLeadingUseClientDirective(code) {
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++
    } else if (ch === "/" && code[i + 1] === "/") {
      // Line comment — skip to end of line.
      while (i < code.length && code[i] !== "\n") i++
    } else if (ch === "/" && code[i + 1] === "*") {
      // Block comment — skip past the closing */.
      i += 2
      while (i < code.length - 1 && !(code[i] === "*" && code[i + 1] === "/")) i++
      i += 2
    } else {
      break
    }
  }
  return code.startsWith('"use client"', i) || code.startsWith("'use client'", i)
}
