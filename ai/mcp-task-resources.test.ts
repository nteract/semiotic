// @vitest-environment node
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createTaskResourceReader } from "./mcp-task-resources"

const version = "3.9.2"
const taskId = "compare-category-totals"
const sourceRevision = `sha256:${"a".repeat(64)}`
const sourcePacket = {
  schemaVersion: 1,
  id: taskId,
  title: "Compare totals",
  identity: {
    packageName: "semiotic",
    packageVersion: version,
    sourceRevision,
    channel: "source",
    availability: "Source guidance only"
  },
  evidence: {
    status: "proposed",
    unassessed: ["Assistive technology reception"]
  },
  example: {
    source: "Use exact values without claiming source authentication."
  }
}

describe("installed MCP task resources", () => {
  let directory: string
  let index: {
    schemaVersion: number
    channel: string
    tasks: Array<{
      id: string
      title: string
      summary: string
      packageVersion: string
      sourceRevision: string
      json: string
    }>
  }
  const write = (name: string, value: unknown) =>
    writeFileSync(join(directory, name), `${JSON.stringify(value)}\n`)
  const reader = () =>
    createTaskResourceReader({ directory, packageVersion: version })

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "semiotic-mcp-task-"))
    index = {
      schemaVersion: 1,
      channel: "source",
      tasks: [
        {
          id: taskId,
          title: "Compare totals",
          summary: "Read exact totals and check the marks.",
          packageVersion: version,
          sourceRevision,
          // This descriptive URL must never be interpreted as a filesystem path.
          json: "/tasks/compare-category-totals.json"
        }
      ]
    }
    write("index.json", index)
    write(`${taskId}.json`, sourcePacket)
  })

  afterEach(() => rmSync(directory, { recursive: true, force: true }))

  it("discovers canonical resource URIs while distinguishing source and installed identity", () => {
    const result = reader().index()
    expect(result.tasks).toEqual([
      { ...index.tasks[0], resourceUri: `semiotic://tasks/${taskId}` }
    ])
    expect(result.channel).toBe("source")
    expect(result.delivery).toMatchObject({
      installedPackageVersion: version,
      versionCheck: "match",
      buildInfoResource: "semiotic://build-info"
    })
    expect(reader().complete("compare-")).toEqual([taskId])
    expect(reader().complete("absent-")).toEqual([])
  })

  it("preserves the packet's source identity, evidence status, and limits", () => {
    const result = reader().read(taskId)
    expect(result.identity).toEqual(sourcePacket.identity)
    expect(result.evidence).toEqual(sourcePacket.evidence)
    expect(result.example).toEqual(sourcePacket.example)
    expect(result.delivery.installedPackageVersion).toBe(version)
    expect(
      JSON.parse(readFileSync(join(directory, `${taskId}.json`), "utf8"))
    ).toEqual(sourcePacket)
  })

  it.each([
    "../package",
    "..",
    "%2e%2e",
    "compare%2ftotals",
    "compare/totals",
    "compare\\totals",
    "compare.json",
    "",
    "x".repeat(101)
  ])("refuses unsafe task identifier %s before reading an index", (id) => {
    rmSync(join(directory, "index.json"))
    expect(() => reader().read(id)).toThrow(/Invalid Semiotic task ID/)
  })

  it("refuses a valid-looking ID outside the generated allowlist even when a file exists", () => {
    write("unlisted-task.json", { secret: "Do not expose this file" })
    expect(() => reader().read("unlisted-task")).toThrow(
      /Unknown Semiotic task ID/
    )
    index.tasks[0].json = "../unlisted-task.json"
    write("index.json", index)
    expect(reader().read(taskId).identity).toEqual(sourcePacket.identity)
  })

  it("refuses traversal and duplicate entries in the installed allowlist", () => {
    index.tasks[0].id = "../package"
    write("index.json", index)
    expect(() => reader().index()).toThrow(/Invalid or duplicate task identity/)
    index.tasks[0].id = taskId
    index.tasks.push({ ...index.tasks[0] })
    write("index.json", index)
    expect(() => reader().index()).toThrow(/Invalid or duplicate task identity/)
  })

  it.each(["index.json", `${taskId}.json`])(
    "refuses %s symlinks that leave the installed packet directory",
    (fileName) => {
      const outside = mkdtempSync(join(tmpdir(), "semiotic-mcp-outside-"))
      try {
        const path = join(outside, fileName)
        writeFileSync(path, readFileSync(join(directory, fileName)))
        rmSync(join(directory, fileName))
        symlinkSync(path, join(directory, fileName))
        expect(() => reader().read(taskId)).toThrow(
          /outside the installed task-packets directory/
        )
      } finally {
        rmSync(outside, { recursive: true, force: true })
      }
    }
  )

  it("keeps construction lazy and reports missing or malformed installed packet files", () => {
    rmSync(join(directory, `${taskId}.json`))
    expect(() => reader()).not.toThrow()
    expect(() => reader().read(taskId)).toThrow(
      /unavailable in this installation/
    )
    writeFileSync(join(directory, `${taskId}.json`), "{invalid JSON")
    expect(() => reader().read(taskId)).toThrow(/Invalid JSON/)
    rmSync(join(directory, "index.json"))
    expect(() => reader().index()).toThrow(/index.json is unavailable/)
  })

  it("refuses both index and packet versions that differ from the installed package", () => {
    index.tasks[0].packageVersion = "0.0.0"
    write("index.json", index)
    expect(() => reader().index()).toThrow(
      /packet 0.0.0, installed package 3.9.2/
    )
    index.tasks[0].packageVersion = version
    write("index.json", index)
    write(`${taskId}.json`, {
      ...sourcePacket,
      identity: { ...sourcePacket.identity, packageVersion: "0.0.0" }
    })
    expect(() => reader().read(taskId)).toThrow(/version mismatch/)
  })

  it.each([
    { sourceRevision: `sha256:${"b".repeat(64)}` },
    { packageName: "another-package" },
    { channel: "stable" }
  ])(
    "refuses incompatible source identity %j without relabeling the packet",
    (patch) => {
      write(`${taskId}.json`, {
        ...sourcePacket,
        identity: { ...sourcePacket.identity, ...patch }
      })
      expect(() => reader().read(taskId)).toThrow(/identity mismatch/)
    }
  )

  it("loads every generated source packet through the installed-package path", () => {
    const packageVersion = JSON.parse(
      readFileSync(resolve(__dirname, "../package.json"), "utf8")
    ).version
    const installed = createTaskResourceReader({
      directory: resolve(__dirname, "task-packets"),
      packageVersion
    })
    const discovered = installed.index()
    expect(discovered.tasks.map((entry) => entry.id)).toEqual([
      "compare-category-totals",
      "update-live-chart",
      "correct-published-chart"
    ])
    for (const task of discovered.tasks) {
      const packet = installed.read(task.id)
      expect(packet.identity).toMatchObject({
        packageVersion,
        sourceRevision: task.sourceRevision
      })
      const { delivery, ...content } = packet
      expect(delivery.installedPackageVersion).toBe(packageVersion)
      expect(content).toEqual(
        JSON.parse(
          readFileSync(
            resolve(__dirname, "task-packets", `${task.id}.json`),
            "utf8"
          )
        )
      )
    }
  })
})
