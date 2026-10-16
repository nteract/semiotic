import { spawn } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function doctor(input: unknown, json: boolean) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>(
    (resolveResult, reject) => {
      const child = spawn(
        process.execPath,
        [resolve("ai/cli.js"), "--doctor", ...(json ? ["--json"] : [])],
        {
          env: { ...process.env, SEMIOTIC_AI_SCHEMA_ONLY: "1" },
          stdio: ["pipe", "pipe", "pipe"]
        }
      )
      const stdout: Buffer[] = []
      const stderr: Buffer[] = []
      child.stdout.on("data", (chunk) => stdout.push(chunk))
      child.stderr.on("data", (chunk) => stderr.push(chunk))
      // A pipe consumer need not drain output immediately (e.g. jq starting up).
      child.stdout.pause()
      const resume = setTimeout(() => child.stdout.resume(), 50)
      child.on("error", reject)
      child.on("close", (code) => {
        clearTimeout(resume)
        resolveResult({
          code,
          stdout: Buffer.concat(stdout).toString(),
          stderr: Buffer.concat(stderr).toString()
        })
      })
      child.stdin.end(JSON.stringify(input))
    }
  )
}

describe("CLI piped output", () => {
  it("returns a single complete success report and exit status zero", async () => {
    const result = await doctor({ component: "LineChart", props: { data: [{ x: 1, y: 2 }] } }, true)
    expect(result.code).toBe(0)
    expect(result.stderr).toBe("")
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: true, mode: "schema-only", errors: [] })
  })

  it("writes the complete large JSON report before a nonzero exit", async () => {
    const fields = Array.from(
      { length: 3000 },
      (_, index) => `unknownField${index}`
    )
    const props = Object.fromEntries(fields.map((field) => [field, true]))
    const result = await doctor(
      { component: "LineChart", props: { data: [{ x: 1, y: 2 }], ...props } },
      true
    )
    expect(result.code).toBe(1)
    expect(result.stderr).toBe("")
    expect(result.stdout.length).toBeGreaterThan(64 * 1024)
    const report = JSON.parse(result.stdout)
    expect(report).toMatchObject({ ok: false, mode: "schema-only" })
    expect(report.errors).toHaveLength(fields.length)
    expect(report.errors[fields.length - 1]).toContain(
      fields[fields.length - 1]
    )
  })

  it("writes the final human-readable error under pipe backpressure", async () => {
    const fields = Array.from(
      { length: 3000 },
      (_, index) => `unknownField${index}`
    )
    const props = Object.fromEntries(fields.map((field) => [field, true]))
    const result = await doctor(
      { component: "LineChart", props: { data: [{ x: 1, y: 2 }], ...props } },
      false
    )
    expect(result.code).toBe(1)
    expect(result.stdout.length).toBeGreaterThan(64 * 1024)
    expect(result.stdout).toContain(fields[fields.length - 1])
  })
})
