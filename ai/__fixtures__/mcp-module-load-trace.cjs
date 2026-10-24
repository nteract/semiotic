const Module = require("node:module")
const { appendFileSync } = require("node:fs")

// NODE_OPTIONS carries this observer into the real operation children too.
const jsdomPath = require.resolve("jsdom")
const load = Module._load
Module._load = function (name, ...args) {
  if (name === "jsdom" || name === jsdomPath) {
    appendFileSync(process.env.SEMIOTIC_TEST_MODULE_TRACE, `${process.pid}\n`)
  }
  return load.call(this, name, ...args)
}
