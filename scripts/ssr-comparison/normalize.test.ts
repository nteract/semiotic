import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeSvg } from "./normalize"
import { compareFixture } from "./compare"
import type { Fixture, SideResult } from "./types"

const svg = `<svg xmlns="http://www.w3.org/2000/svg" aria-labelledby="semiotic-ab-title">
<title id="semiotic-ab-title">Revenue 1.234567</title><defs><linearGradient id="semiotic-ab-paint.a"/></defs>
<style>#semiotic-ab-mark {fill:url("#semiotic-ab-paint\\.a")}</style>
<g id="semiotic-ab-data-area"><rect id="semiotic-ab-mark" x="1.234567" width="10" height="5" fill="url(#semiotic-ab-paint\\.a)"/><circle cx="4" cy="5" r="2"/><text class="annotation">Threshold</text></g></svg>`
const fixture: Fixture = {
  id: "test",
  component: "Chart",
  props: {},
  coveredProps: [],
  sha256: "input"
}
const evidence = {
  markCount: 2,
  xDomain: [0, 10],
  annotationCount: 1,
  sceneHash: "first"
}
const side = (
  markup = svg,
  facts: Record<string, unknown> | null = evidence
): SideResult => ({
  status: "rendered",
  renders: [
    { svg: markup, evidence: facts },
    { svg: markup, evidence: facts }
  ]
})

test("attribute order and coordinated generated scope renaming compare equal", () => {
  const renamed = svg
    .replaceAll("semiotic-ab-", "semiotic-xyz-")
    .replace('cx="4" cy="5" r="2"', 'r="2" cy="5" cx="4"')
  assert.equal(normalizeSvg(svg), normalizeSvg(renamed))
  assert.equal(
    compareFixture(
      fixture,
      side(),
      side(renamed, { ...evidence, sceneHash: "second", sceneHashVersion: 2 })
    ).status,
    "equal"
  )
  assert.match(normalizeSvg(svg), /aria-labelledby="ssr-scope-0-title"/)
  assert.match(
    normalizeSvg(svg),
    /url\(&quot;#ssr-scope-0-paint\\.a&quot;\)|url\("#ssr-scope-0-paint\\.a"\)/
  )
})

test("changed marks, geometry/domains, text, style, annotations and paint order remain differences", () => {
  const mutations = [
    svg.replace('<circle cx="4" cy="5" r="2"/>', ""),
    svg.replace('x="1.234567"', 'x="1.234568"'),
    svg.replace("Revenue 1.234567", "Revenue 1.234568"),
    svg.replace('width="10"', 'width="10" opacity="0.5"'),
    svg.replace('<text class="annotation">Threshold</text>', ""),
    svg.replace(
      '<circle cx="4" cy="5" r="2"/><text class="annotation">Threshold</text>',
      '<text class="annotation">Threshold</text><circle cx="4" cy="5" r="2"/>'
    )
  ]
  for (const changed of mutations)
    assert.equal(
      compareFixture(fixture, side(), side(changed)).status,
      "different"
    )
  const result = compareFixture(
    fixture,
    side(),
    side(svg, { ...evidence, xDomain: [0, 11] })
  )
  assert.equal(result.svgChanged, false)
  assert.equal(result.evidenceChanged, true)
})

test("authored IDs, text whitespace, a11y content and numeric strings survive", () => {
  const renamed = svg.replaceAll("semiotic-ab-", "semiotic-new-")
  assert.equal(
    compareFixture(
      { ...fixture, props: { chartId: "semiotic-ab" } },
      side(),
      side(renamed)
    ).status,
    "different"
  )
  const authoredPrefix =
    '<svg xmlns="http://www.w3.org/2000/svg"><text id="semiotic-authored-label">Label</text></svg>'
  assert.notEqual(
    normalizeSvg(authoredPrefix),
    normalizeSvg(
      authoredPrefix.replace("semiotic-authored", "semiotic-changed")
    )
  )
  const authored = svg.replaceAll("semiotic-ab-", "authored-")
  assert.notEqual(
    normalizeSvg(authored),
    normalizeSvg(authored.replaceAll("authored-title", "changed-title"))
  )
  assert.notEqual(
    normalizeSvg(svg),
    normalizeSvg(svg.replace("Threshold", " Threshold "))
  )
  assert.notEqual(
    normalizeSvg(svg),
    normalizeSvg(
      svg.replace('aria-labelledby="semiotic-ab-title"', 'aria-label="Changed"')
    )
  )
  const rounded = normalizeSvg(
    svg.replace('width="10"', 'width="10" opacity="0.1234567"'),
    3
  )
  assert.match(rounded, /x="1.235"/)
  assert.match(rounded, /Revenue 1.234567/)
  assert.match(rounded, /opacity="0.1234567"/)
})

test("broken refs, escaped CSS refs, duplicate IDs and malformed XML are errors", () => {
  const invalid = [
    svg.replace('id="semiotic-ab-paint.a"', 'id="missing"'),
    svg.replace('id="semiotic-ab-title"', 'id="missing"'),
    svg.replace('cx="4"', 'id="semiotic-ab-mark" cx="4"'),
    svg.replace("</svg>", "</g>"),
    svg.replace('width="10"', 'clip-path="url(#missing)" width="10"')
  ]
  for (const markup of invalid)
    assert.equal(compareFixture(fixture, side(), side(markup)).status, "error")
})

test("nondeterminism and execution failures cannot masquerade as equal output", () => {
  const changing = side()
  changing.renders![1].svg = svg.replace("Threshold", "Changed")
  assert.equal(compareFixture(fixture, side(), changing).status, "error")
  assert.equal(
    compareFixture(fixture, { status: "error", error: "failed" }, side())
      .status,
    "error"
  )
  assert.equal(
    compareFixture(
      fixture,
      { status: "unsupported", reasons: ["new prop"] },
      side()
    ).status,
    "unsupported"
  )
  assert.equal(
    compareFixture(fixture, side(), {
      status: "unsupported",
      reasons: ["broken current fixture"]
    }).status,
    "error"
  )
  const noEvidence = compareFixture(fixture, side(svg, null), side())
  assert.equal(noEvidence.status, "equal")
  assert.equal(noEvidence.evidenceComparison, "unavailable")
})
