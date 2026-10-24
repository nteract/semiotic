const { createMcpOperationRunner } = require(process.argv[2])
const runner = createMcpOperationRunner(process.argv[3], {
  maxOperationMs: 2000,
  maxConcurrentOperations: 1,
  maxHeapMb: 64
})
process.on("disconnect", () => {
  runner.close()
  process.exit(0)
})
;(async () => {
  await runner.run({
    name: "renderChart",
    profile: "developer",
    arguments: { action: "success" }
  })
  while (runner.active()) await new Promise((resolve) => setTimeout(resolve, 5))
  process.send({ idle: true })
})().catch(() => process.exit(1))
