import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const adoptionMarker =
  "<!-- added-provenance: v1; released-through: 3.13.3 -->"
type Entry = { release: string; category: string; line: number; text: string }

// Parse headings and root list items, retaining continuation lines but keeping
// nested details from supplying provenance for their parent. Ignore fenced code.
export function parseChangelog(source: string): Entry[] {
  const entries: Entry[] = []
  let release = "",
    category = "",
    entry: Entry | undefined
  let fence: string | undefined
  let nested = false
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const delimiter = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (delimiter) {
      if (!fence) fence = delimiter[1][0]
      else if (delimiter[1][0] === fence) fence = undefined
      continue
    }
    if (fence) continue
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/)
    if (heading) {
      entry = undefined
      if (heading[1].length <= 2) {
        release = heading[2].match(/^\[([^\]]+)\]/)?.[1] ?? ""
        category = ""
      } else if (heading[1].length === 3) category = heading[2]
      continue
    }
    if (/^(?:[-+*]|\d+[.)])\s+/.test(line)) {
      nested = false
      entry = {
        release,
        category,
        line: index + 1,
        text: line.replace(/^(?:[-+*]|\d+[.)])\s+/, "")
      }
      entries.push(entry)
    } else if (/^\s+(?:[-+*]|\d+[.)])\s/.test(line)) {
      nested = true
    } else if (entry && /^ {2}\S/.test(line)) {
      nested = false
      entry.text += ` ${line.trim()}`
    } else if (entry && !nested && /^ {2,}\S/.test(line)) {
      entry.text += ` ${line.trim()}`
    }
  }
  return entries
}

function identity(entry: Entry) {
  return entry.text.replace(/\s+/g, " ").trim()
}
function eligible(release: string) {
  if (release === "Unreleased") return true
  const version = release.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/)
  if (!version) return false
  const baseline = [3, 13, 3]
  for (let i = 0; i < 3; i++) {
    const difference = Number(version[i + 1]) - baseline[i]
    if (difference) return difference > 0
  }
  return false
}

export function checkProvenance(source: string, base?: string): string[] {
  const errors: string[] = []
  if (!source.split(/\r?\n/).includes(adoptionMarker))
    return ["CHANGELOG.md:1: missing or malformed provenance adoption marker"]
  const previous = new Map<string, number>()
  // Only a base which already adopted the convention may exempt unchanged items.
  // This prevents a PR targeting pre-adoption source from bypassing the new rule.
  if (base?.includes(adoptionMarker))
    for (const entry of parseChangelog(base)) {
      if (entry.category === "Added" && eligible(entry.release))
        previous.set(identity(entry), (previous.get(identity(entry)) ?? 0) + 1)
    }
  for (const entry of parseChangelog(source)) {
    if (entry.category !== "Added" || !eligible(entry.release)) continue
    const key = identity(entry),
      count = previous.get(key) ?? 0
    if (count) {
      previous.set(key, count - 1)
      continue
    }
    const markers = [...entry.text.matchAll(/\[source:\s*([^\]]*)\]/g)]
    const value = markers[0]?.[1].trim() ?? ""
    const valid =
      /^(?:#[1-9]\d*|https:\/\/\S+|rfcs\/[\w/-]+\.md|maintainer)$/.test(
        value
      ) || /^consumer:\s*\S.{11,}$/.test(value)
    if (
      markers.length !== 1 ||
      (entry.text.match(/\[source\b/gi)?.length ?? 0) !== 1 ||
      !valid
    )
      errors.push(
        `CHANGELOG.md:${entry.line}: [${entry.release}] Added: supply one [source: #123], [source: https://…], [source: rfcs/proposal.md], [source: consumer: meaningful use context], or honest [source: maintainer]`
      )
  }
  return errors
}

export function run(args = process.argv.slice(2), root = process.cwd()) {
  try {
    let base: string | undefined
    if (args.length) {
      if (
        args.length !== 2 ||
        args[0] !== "--base-ref" ||
        !args[1] ||
        args[1].startsWith("-")
      )
        throw new Error(
          "Usage: check-changelog-provenance.ts [--base-ref <explicit git ref>]"
        )
      base = execFileSync("git", ["show", `${args[1]}:CHANGELOG.md`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      })
    }
    const errors = checkProvenance(
      readFileSync(resolve(root, "CHANGELOG.md"), "utf8"),
      base
    )
    if (errors.length) throw new Error(errors.join("\n"))
    console.log(
      `Changelog provenance passed (${base === undefined ? "release/adoption boundary" : `base ${args[1]}`}).`
    )
    return 0
  } catch (error) {
    console.error(`Changelog provenance failed: ${(error as Error).message}`)
    return 1
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = run()
