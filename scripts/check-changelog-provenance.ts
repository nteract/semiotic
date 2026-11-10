import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

export const adoptionMarker =
  "<!-- added-provenance: v1; released-through: 3.13.3 -->"
type Entry = { release: string; category: string; line: number; text: string }

type ListItem = { contentIndent: number }
type Fence = { delimiter: string; containerIndent: number; line: number }

// This is a source-only parser for the changelog's Markdown block convention,
// not a Markdown renderer. List indentation is relative to the item's content
// column (including ordered markers). Unsupported prose fails closed in Added.
export function parseChangelog(source: string): Entry[] {
  const entries: Entry[] = []
  let release = "",
    category = "",
    entry: Entry | undefined
  let fence: Fence | undefined
  const items: ListItem[] = []
  let paragraph: "root" | "nested" | undefined
  let comment = false
  const fail = (line: number, reason: string) => {
    throw new Error(`CHANGELOG.md:${line}: ${reason}`)
  }
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    // Markdown tabs advance to the next four-column stop.
    let column = 0
    let line = raw.replace(/[^\t]|\t/g, (character) => {
      const width = character === "\t" ? 4 - (column % 4) : 1
      column += width
      return character === "\t" ? " ".repeat(width) : character
    })
    const indent = line.length - line.trimStart().length
    if (fence) {
      // A fence inside a list ends with its containing item on dedent, even
      // without a closing delimiter. It must not swallow the next root bullet.
      if (line.trim() && indent < fence.containerIndent) fence = undefined
      else {
        const close = line
          .slice(fence.containerIndent)
          .match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/)
        if (
          close &&
          close[1][0] === fence.delimiter[0] &&
          close[1].length >= fence.delimiter.length
        )
          fence = undefined
        continue
      }
    }
    // A block comment outside the list terminates its container, just like a
    // heading or fence. Do this before discarding its text.
    if (line.trim() && !comment)
      while (items.length && indent < items.at(-1)!.contentIndent) items.pop()
    // Comments are not attribution and cannot introduce headings or list items.
    line = line.replace(/<!--[\s\S]*?-->/g, "")
    if (comment) {
      const end = line.indexOf("-->")
      if (end < 0) continue
      line = line.slice(end + 3)
      comment = false
    }
    const start = line.indexOf("<!--")
    if (start >= 0) {
      line = line.slice(0, start)
      comment = true
    }
    if (!line.trim()) {
      paragraph = undefined
      continue
    }

    while (items.length && indent < items.at(-1)!.contentIndent) items.pop()
    const containerIndent = items.at(-1)?.contentIndent ?? 0
    const relative = line.slice(containerIndent)
    const opening = relative.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      fence = { delimiter: opening[1], containerIndent, line: index + 1 }
      paragraph = undefined
      continue
    }
    // Indented code cannot provide provenance, including code within a list.
    if (indent >= containerIndent + 4) {
      paragraph = undefined
      continue
    }
    const heading = relative.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*?)|$)$/)
    if (heading) {
      paragraph = undefined
      if (items.length) continue // A heading inside a list is only a detail.
      entry = undefined
      const title = (heading[2] ?? "").replace(/[ \t]+#+[ \t]*$/, "").trim()
      if (heading[1].length <= 2) {
        release = title.match(/^\[([^\]]+)\]/)?.[1] ?? ""
        category = ""
      } else if (heading[1].length === 3) category = title
      continue
    }
    // A thematic break terminates the list; it is not an empty Added bullet.
    if (/^ {0,3}(?:(?:\* *){3,}|(?:- *){3,}|(?:_ *){3,})$/.test(relative)) {
      if (!items.length) entry = undefined
      paragraph = undefined
      continue
    }
    const bullet = relative.match(/^( {0,3})([-+*]|\d{1,9}[.)])( +|$)(.*)$/)
    if (bullet) {
      const padding = bullet[3].length
      const contentIndent =
        containerIndent +
        bullet[1].length +
        bullet[2].length +
        (padding > 0 && padding <= 4 && bullet[4] ? padding : 1)
      if (!items.length) {
        entry = { release, category, line: index + 1, text: "" }
        entries.push(entry)
      }
      items.push({ contentIndent })
      const text = line.slice(contentIndent)
      const inlineFence = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
      if (
        inlineFence &&
        !(inlineFence[1][0] === "`" && inlineFence[2].includes("`"))
      ) {
        fence = {
          delimiter: inlineFence[1],
          containerIndent: contentIndent,
          line: index + 1
        }
        paragraph = undefined
      } else {
        if (
          category === "Added" &&
          eligible(release) &&
          /^(?:>|<|#{1,6}(?:\s|$)|(?:[-+*]|\d{1,9}[.)])(?:\s|$)|\[[^\]]+\]:)/.test(
            text
          )
        )
          fail(
            index + 1,
            "unsupported list-item block in Added; start with a plain-text description"
          )
        paragraph =
          padding <= 4 ? (items.length === 1 ? "root" : "nested") : undefined
        if (items.length === 1 && paragraph) entry!.text = text
      }
      continue
    }
    // Block quotes, HTML, and link definitions may contain example markers.
    // Require plain paragraph provenance instead of interpreting these blocks.
    if (/^ {0,3}(?:>|<|\[[^\]]+\]:)/.test(relative)) {
      if (category === "Added" && eligible(release))
        fail(
          index + 1,
          "unsupported block in Added; use a root bullet with plain-text provenance and fenced code for examples"
        )
      paragraph = undefined
      continue
    }
    if (paragraph === "nested") continue // Lazy nested continuation, even after dedent.
    if (entry && items.length === 1) {
      entry.text += ` ${relative.trim()}`
      paragraph = "root"
    } else if (entry && !items.length && paragraph) {
      // Lazy continuation of the root paragraph; a nested paragraph must never
      // supply its parent's source, so only resume when its container was root.
      entry.text += ` ${line.trim()}`
    } else if (
      !items.length &&
      eligible(release) &&
      (category === "Added" || line.trim() === "Added")
    ) {
      fail(
        index + 1,
        "unsupported content in Added; use root list items under ### Added"
      )
    }
  }
  if (fence) fail(fence.line, "unclosed code fence in changelog")
  if (comment)
    fail(source.split(/\r?\n/).length, "unclosed HTML comment in changelog")
  return entries
}

// Code spans are examples, even when they contain a syntactically valid marker.
// Delimiters must have equal lengths; shorter runs are literal span content.
function prose(text: string) {
  return text.replace(/(?<!`)(`+)([\s\S]*?)(?<!`)\1(?!`)/g, "")
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
  let entries: Entry[], previousEntries: Entry[]
  try {
    entries = parseChangelog(source)
    previousEntries = base?.split(/\r?\n/).includes(adoptionMarker)
      ? parseChangelog(base)
      : []
  } catch (error) {
    return [(error as Error).message]
  }
  const previous = new Map<string, number>()
  // Only a base which already adopted the convention may exempt unchanged items.
  // This prevents a PR targeting pre-adoption source from bypassing the new rule.
  for (const entry of previousEntries) {
    if (entry.category === "Added" && eligible(entry.release))
      previous.set(identity(entry), (previous.get(identity(entry)) ?? 0) + 1)
  }
  for (const entry of entries) {
    if (entry.category !== "Added" || !eligible(entry.release)) continue
    const key = identity(entry),
      count = previous.get(key) ?? 0
    if (count) {
      previous.set(key, count - 1)
      continue
    }
    const attribution = prose(entry.text)
    const markers = [...attribution.matchAll(/\[source:\s*([^\]]*)\]/g)]
    const value = markers[0]?.[1].trim() ?? ""
    const valid =
      /^(?:#[1-9]\d*|https:\/\/\S+|rfcs\/[\w/-]+\.md|maintainer)$/.test(
        value
      ) || /^consumer:\s*\S.{11,}$/.test(value)
    if (
      markers.length !== 1 ||
      (attribution.match(/\[source\b/gi)?.length ?? 0) !== 1 ||
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
