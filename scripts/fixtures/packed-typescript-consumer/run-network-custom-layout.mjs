import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
for (const [condition, load] of [
  ["import", (entry) => import(entry)],
  ["require", require]
]) {
  for (const entry of ["semiotic/recipes", "semiotic/recipes/core"]) {
    const { createLineageDagFit } = await load(entry)
    const fit = createLineageDagFit(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 }
      ],
      { x: 0, y: 0, width: 600, height: 400 }
    )
    assert.deepEqual(fit.project(0, 0), { x: 86, y: 200 })
    assert.deepEqual(fit.invert(514, 200), { layer: 1, row: 0 })
    assert.equal(fit.nodeBounds({ x: 1, y: 0 }).width, 172)
  }
  for (const entry of ["semiotic/network", "semiotic/recipes"]) {
    const { networkEdgeHitTarget } = await load(entry)
    const props = { pathD: "M0,0 Q20,40 40,0", datum: { id: "link" } }
    assert.equal(networkEdgeHitTarget(props).style.fill, "none")
    assert.notEqual(
      networkEdgeHitTarget({ ...props, type: "ribbon" }).style.fill,
      "none"
    )
  }
  for (const entry of ["semiotic/server", "semiotic/server/node", "semiotic/server/edge"]) {
    const { exportNetworkViewSVG } = await load(entry)
    const svg = exportNetworkViewSVG({
      sceneNodes: [{ type: "rect", x: 0, y: 0, w: 3000, h: 600, style: { fill: "#123456" }, datum: {} }]
    }, { width: 1200, height: 400, view: "fit", padding: 0 })
    assert.ok(svg.includes('translate(0,80) scale(0.4)'), `${entry} ${condition}: fitted camera`)
    assert.ok(svg.includes('fill="#123456"'), `${entry} ${condition}: retained scene`)
  }
  console.log(
    `Network custom layouts ${condition}: fit projection, edge targets and static exports passed`
  )
}
