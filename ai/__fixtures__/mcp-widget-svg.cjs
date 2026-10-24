const Module = require("node:module")
const { readFileSync } = require("node:fs")

// Substitute renderer output only in the disposable operation child. This
// exercises the shipped sanitizer, response envelope and widget without adding
// a production test hook or depending on an unrelated renderer injection bug.
if (process.send && process.env.SEMIOTIC_TEST_WIDGET_SVG) {
  const load = Module._load
  Module._load = function (id, ...args) {
    const exports = load.call(this, id, ...args)
    if (id !== "semiotic/server") return exports
    return new Proxy(exports, {
      get(target, key) {
        if (key !== "renderChartWithEvidence") return target[key]
        return (...renderArgs) => ({
          ...target.renderChartWithEvidence(...renderArgs),
          svg: readFileSync(process.env.SEMIOTIC_TEST_WIDGET_SVG, "utf8")
        })
      }
    })
  }
}
