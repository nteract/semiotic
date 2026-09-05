import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { JSDOM } from "jsdom"
import {
  createStaticRouteRenderer,
  generatePage,
  sanitizeRouteHtml
} from "./prerender.mjs"

const shell =
  '<html><head><title>Docs</title></head><body><noscript>Enable JavaScript</noscript><div id="root"></div></body></html>'

describe("readable story openings before enhancements", () => {
  it("sanitizes the opening and places it outside noscript and the React root", () => {
    const doc = sanitizeRouteHtml(
      '<main class="container"><header data-server-opening><h1>Reported flights</h1><p onclick="bad()">150 minutes late</p><script>bad()</script><button>Pin</button></header></main>',
      "examples/plane-day"
    )
    assert.ok(doc.openingHtml.includes("150 minutes late"))
    assert.doesNotMatch(
      doc.openingHtml,
      /onclick|script|button|data-server-opening/
    )
    const html = generatePage(shell, "examples/plane-day", null, doc)
    const page = new JSDOM(html).window.document
    const opening = page.querySelector("#docs-server-opening")
    assert.ok(opening)
    assert.equal(opening.closest("noscript, #root"), null)
    assert.equal(opening.nextElementSibling.id, "root")
    assert.match(
      page.querySelector("noscript").innerHTML,
      /#docs-server-opening\{display:none\}/
    )
  })

  it("keeps existing routes unchanged unless an opening is declared", () => {
    const doc = sanitizeRouteHtml(
      '<main class="container"><h1>Reference</h1></main>',
      "charts"
    )
    assert.equal(doc.openingHtml, undefined)
    assert.doesNotMatch(
      generatePage(shell, "charts", null, doc),
      /docs-server-opening/
    )
  })

  it("extracts factual openings from both implemented story routes", async () => {
    const renderRoute = await createStaticRouteRenderer()
    for (const [route, fact] of [
      ["examples/plane-day", "150"],
      ["examples/grocery-bill", "grocery"]
    ]) {
      const doc = sanitizeRouteHtml(await renderRoute(route), route)
      assert.ok(doc?.openingHtml, route)
      assert.match(doc.openingHtml, /<h1>/)
      assert.ok(doc.openingHtml.toLowerCase().includes(fact), route)
    }
  })
})
