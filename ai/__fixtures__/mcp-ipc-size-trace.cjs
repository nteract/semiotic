const { appendFileSync } = require("node:fs")

// Observe the real worker boundary, without recording tool content or input.
if (process.send) {
  const send = process.send
  process.send = function (message, ...args) {
    if (message?.type === "result") {
      appendFileSync(
        process.env.SEMIOTIC_TEST_IPC_TRACE,
        `${JSON.stringify({
          pid: process.pid,
          bytes: Buffer.byteLength(JSON.stringify(message.result))
        })}\n`
      )
    }
    return send.call(this, message, ...args)
  }
}
