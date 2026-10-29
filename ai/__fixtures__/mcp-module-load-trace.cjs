const Module = require("node:module")
const { appendFileSync } = require("node:fs")

// NODE_OPTIONS carries this observer into the real operation children too.
const jsdomPath = require.resolve("jsdom")
const load = Module._load
const delay = (milliseconds) => {
  if (milliseconds > 0)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}
Module._load = function (name, ...args) {
  if (name === "jsdom" || name === jsdomPath) {
    appendFileSync(process.env.SEMIOTIC_TEST_MODULE_TRACE, `${process.pid}\n`)
    delay(Number(process.env.SEMIOTIC_TEST_DOM_LOAD_DELAY_MS ?? 0))
    const runtime = load.call(this, name, ...args)
    const parseDelay = Number(process.env.SEMIOTIC_TEST_DOM_PARSE_DELAY_MS ?? 0)
    if (parseDelay > 0) {
      runtime.JSDOM = class extends runtime.JSDOM {
        constructor(...arguments_) {
          delay(parseDelay)
          super(...arguments_)
        }
      }
    }
    return runtime
  }
  return load.call(this, name, ...args)
}
