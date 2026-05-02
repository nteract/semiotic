/**
 * Unit test for `hasLeadingUseClientDirective` — the heuristic that
 * decides whether a source file's content qualifies as a client
 * module for the rollup `useClientPlugin` to chunk-tag.
 *
 * Imports the helper from `./lib/useClientDirective.mjs` (the same
 * module `build.mjs` consumes), so future changes to the detection
 * logic are exercised by this test automatically — no manual
 * lockstep maintenance.
 */
import { describe, it, expect } from "vitest"
import { hasLeadingUseClientDirective } from "./lib/useClientDirective.mjs"

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
