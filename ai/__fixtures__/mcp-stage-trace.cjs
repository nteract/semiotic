const { appendFileSync } = require("node:fs")

// Record execution stages so cancellation tests wait for real renderer work.
if (process.send) {
  const send = process.send
  process.send = function (message, ...args) {
    if (message?.type === "stage") {
      appendFileSync(
        process.env.SEMIOTIC_TEST_STAGE_TRACE,
        `${JSON.stringify({ pid: process.pid, label: message.label })}\n`
      )
    }
    return send.call(this, message, ...args)
  }
}
