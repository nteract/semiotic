import { readFileSync, realpathSync } from "node:fs"
import { dirname, join } from "node:path"

type TaskEntry = {
  id: string
  title: string
  summary: string
  packageVersion: string
  sourceRevision: string
  [key: string]: unknown
}

type TaskIndex = {
  schemaVersion: 1
  channel: string
  tasks: TaskEntry[]
  [key: string]: unknown
}

type TaskResourceOptions = {
  directory: string
  packageVersion: string
}

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const revisionPattern = /^sha256:[a-f0-9]{64}$/
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

function validId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= 100 && idPattern.test(value)
  )
}

/**
 * Read generated task packets from this installation. Only IDs admitted by the
 * installed index can become filenames; URL, markdown, and source-reference
 * fields in that index are descriptive and are never used for filesystem reads.
 * Loading stays lazy so a missing optional packet does not prevent MCP startup.
 */
export function createTaskResourceReader(options: TaskResourceOptions) {
  function unavailable(fileName: string, cause: unknown) {
    return new Error(
      `Semiotic task resource ${fileName} is unavailable in this installation. ` +
        "Use a package containing ai/task-packets or regenerate task packets in the source checkout.",
      { cause }
    )
  }

  function readJSON(fileName: string): unknown {
    let directory: string
    let filePath: string
    try {
      directory = realpathSync(options.directory)
      filePath = realpathSync(join(directory, fileName))
    } catch (error) {
      throw unavailable(fileName, error)
    }
    if (dirname(filePath) !== directory) {
      throw new Error(
        `Refusing Semiotic task resource ${fileName} outside the installed task-packets directory`
      )
    }
    let text: string
    try {
      text = readFileSync(filePath, "utf8")
    } catch (error) {
      throw unavailable(fileName, error)
    }
    try {
      return JSON.parse(text)
    } catch (error) {
      throw new Error(
        `Invalid JSON in installed Semiotic task resource ${fileName}`,
        {
          cause: error
        }
      )
    }
  }

  function requireVersion(version: unknown, label: string) {
    if (version !== options.packageVersion) {
      throw new Error(
        `Semiotic task resource version mismatch for ${label}: packet ${String(version)}, ` +
          `installed package ${options.packageVersion}. Regenerate or reinstall matching task packets.`
      )
    }
  }

  function loadIndex(): TaskIndex {
    const value = readJSON("index.json")
    if (
      !isRecord(value) ||
      value.schemaVersion !== 1 ||
      !isText(value.channel) ||
      !Array.isArray(value.tasks) ||
      value.tasks.length === 0 ||
      value.tasks.length > 100
    ) {
      throw new Error("Invalid installed Semiotic task index")
    }
    const ids = new Set<string>()
    for (const entry of value.tasks) {
      if (
        !isRecord(entry) ||
        !validId(entry.id) ||
        ids.has(entry.id) ||
        !isText(entry.title) ||
        !isText(entry.summary) ||
        typeof entry.sourceRevision !== "string" ||
        !revisionPattern.test(entry.sourceRevision)
      ) {
        throw new Error(
          "Invalid or duplicate task identity in installed Semiotic task index"
        )
      }
      ids.add(entry.id)
      requireVersion(entry.packageVersion, entry.id)
    }
    return value as TaskIndex
  }

  function delivery() {
    return {
      installedPackageVersion: options.packageVersion,
      versionCheck: "match",
      buildInfoResource: "semiotic://build-info",
      scope:
        "These source-identified packets are read from this installation. Matching the package version does not establish hosted-site parity, source authenticity, or unrecorded task evidence."
    }
  }

  return {
    index() {
      const index = loadIndex()
      return {
        ...index,
        delivery: delivery(),
        tasks: index.tasks.map((entry) => ({
          ...entry,
          resourceUri: `semiotic://tasks/${entry.id}`
        }))
      }
    },

    complete(value: string) {
      return loadIndex()
        .tasks.map((entry) => entry.id)
        .filter((id) => id.startsWith(value))
    },

    read(
      taskId: string
    ): Record<string, unknown> & { delivery: ReturnType<typeof delivery> } {
      // Check syntax before opening any file, including the index.
      if (!validId(taskId))
        throw new Error(`Invalid Semiotic task ID: ${taskId}`)
      const index = loadIndex()
      const entry = index.tasks.find((task) => task.id === taskId)
      if (!entry)
        throw new Error(
          `Unknown Semiotic task ID: ${taskId}. Read semiotic://tasks for available tasks.`
        )
      const packet = readJSON(`${entry.id}.json`)
      if (
        !isRecord(packet) ||
        packet.schemaVersion !== 1 ||
        packet.id !== entry.id ||
        !isRecord(packet.identity)
      ) {
        throw new Error(`Invalid installed Semiotic task packet: ${taskId}`)
      }
      requireVersion(packet.identity.packageVersion, taskId)
      if (
        packet.identity.packageName !== "semiotic" ||
        packet.identity.sourceRevision !== entry.sourceRevision ||
        packet.identity.channel !== index.channel
      ) {
        throw new Error(
          `Semiotic task identity mismatch for ${taskId}: index and packet must identify the same source revision and channel.`
        )
      }
      return { ...packet, delivery: delivery() }
    }
  }
}
