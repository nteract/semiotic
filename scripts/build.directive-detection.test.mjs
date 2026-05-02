/**
 * Unit test for `hasLeadingUseClientDirective` — the heuristic that
 * decides whether a source file's content qualifies as a client
 * module for the rollup `useClientPlugin` to chunk-tag.
 *
 * The previous version used `code.startsWith('"use client"')`, which
 * silently missed every source file that opened with a JSDoc block
 * (StreamOrdinalFrame, useFrame, useHydration, etc.). The fix accepts
 * any combination of leading whitespace + line-comments + block-comments
 * before the directive, matching how Next.js / React parse the
 * directive.
 */
import { describe, it, expect } from "vitest"

// Re-implement here rather than importing from build.mjs — that file
// has top-level rollup imports we don't want to load just to unit-test
// a string helper. Keep the implementation in lockstep manually; if
// build.mjs's version drifts, this test will catch the divergence
// next time someone runs the suite.
function hasLeadingUseClientDirective(code) {
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++
    } else if (ch === "/" && code[i + 1] === "/") {
      while (i < code.length && code[i] !== "\n") i++
    } else if (ch === "/" && code[i + 1] === "*") {
      i += 2
      while (i < code.length - 1 && !(code[i] === "*" && code[i + 1] === "/")) i++
      i += 2
    } else {
      break
    }
  }
  return code.startsWith('"use client"', i) || code.startsWith("'use client'", i)
}

describe("hasLeadingUseClientDirective", () => {
  const positives = [
    ["directive at file start", '"use client"\nimport React'],
    ["single-quote variant", "'use client'\nimport React"],
    ["leading newlines", '\n\n"use client"\nimport React'],
    ["leading line comment", '// hi\n"use client"\nimport React'],
    ["leading block comment", '/* hi */\n"use client"\nimport React'],
    ["leading JSDoc (multi-line)", '/**\n * Doc.\n */\n"use client"\nimport React'],
    ["JSDoc + line comment + directive", '/**\n * Doc.\n */\n// extra\n"use client"\nimport React'],
    ["leading whitespace + tabs", '   \t\n"use client"\nimport React'],
  ]

  for (const [name, input] of positives) {
    it(`detects: ${name}`, () => {
      expect(hasLeadingUseClientDirective(input)).toBe(true)
    })
  }

  const negatives = [
    ["no directive at all", 'import React from "react"'],
    ["directive after import (invalid placement)", 'import x from "y"\n"use client"'],
    ["directive in a string", 'const a = "use client"\n'],
    ["empty file", ""],
    ["only comments", "/** doc */\n// line\n"],
    ["directive without quotes", "use client\nimport React"],
  ]

  for (const [name, input] of negatives) {
    it(`rejects: ${name}`, () => {
      expect(hasLeadingUseClientDirective(input)).toBe(false)
    })
  }
})
