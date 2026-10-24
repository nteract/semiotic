const { writeFileSync } = require("node:fs")
const send = (message) => process.send(message)
process.once("message", async (job) => {
  const { action, startedFile } = job.arguments
  if (action === "crash") process.exit(1)
  if (action === "block") {
    send({ type: "stage", label: "render work", limitMs: 100 })
    if (startedFile) writeFileSync(startedFile, "started")
    const end = performance.now() + 5000
    while (performance.now() < end) { /* Bounded synchronous work; parent must stop it. */ }
  }
  if (action === "stages" || action === "repeat") {
    for (let index = 0; index < 4; index++) {
      send({ type: "stage", label: action === "repeat" ? "render" : `stage-${index}`, limitMs: action === "repeat" ? 160 : 500 })
      await new Promise((resolve) => setTimeout(resolve, 100))
      send({ type: "stage-end" })
    }
  }
  send({ type: "result", result: { ok: true, execArgv: process.execArgv } })
})
