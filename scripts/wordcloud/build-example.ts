/** Rebuild the example's aggregated counts from the checked-in public-domain source. */
import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
const sourcePath = fileURLToPath(
  new URL("./fixtures/alice.txt", import.meta.url)
)
const source = readFileSync(sourcePath, "utf8")
const normalizedSource = source.replace(/\r\n/g, "\n")
const start = normalizedSource.indexOf("CHAPTER I.\n")
const end = normalizedSource.indexOf("*** END OF THE PROJECT GUTENBERG")
if (start < 0 || end < start)
  throw new Error("Source chapter boundaries changed")
const text = normalizedSource.slice(start, end).replaceAll("’", "'")
const stopWords = new Set(
  `a an the and or but if then than to of in on at by for from with without into out up down over under off about as is was were are be been being am it its i me my myself we us our ours you your yourself he him his himself she her hers herself they them their themselves this that these those there here who whom whose which what when where why how all any some no nor not so too very just only even ever never once twice one two three first second last each every few more most much many such same other another own again also still now well will would shall should can could may might must have has had having do does did done said say says saying thought think know little like went came go come get got let make made don't didn't doesn't can't couldn't wouldn't shouldn't isn't wasn't weren't aren't i'll i'm i've i'd you'll you're you've he'd she'd they'll they're there's that's what's it's alice's chapter`.split(
    /\s+/
  )
)
const characters = new Set(
  "alice rabbit queen king hatter dormouse gryphon turtle duchess caterpillar mouse cat dinah dodo lory eaglet duck bill sister pig puppy footman knave jurors jury cook march hare mock white cheshire".split(
    " "
  )
)
const objects = new Set(
  "garden door doors key table tea mushroom bottle court croquet head heads hand hands foot feet eye eyes ear ears neck house room pocket watch book books cards cake cakes flowers trees tree pool tears gloves fan ground sea soup bread butter tarts window hearth water hat cup cups trial evidence trial".split(
    " "
  )
)
const counts = new Map<
  string,
  { text: string; value: number; category: string; excerpt: string }
>()
let tokens = 0
for (const match of text.matchAll(/[a-z]+(?:'[a-z]+)?/gi)) {
  tokens++
  const term = match[0].toLowerCase().replace(/'s$/, "")
  if (term.length < 3 || stopWords.has(term)) continue
  const existing = counts.get(term)
  if (existing) {
    existing.value++
    continue
  }
  const at = match.index!
  counts.set(term, {
    text: term,
    value: 1,
    category: characters.has(term)
      ? "Characters"
      : objects.has(term)
        ? "Places & objects"
        : "Story language",
    excerpt: `…${text
      .slice(
        Math.max(0, at - 85),
        Math.min(text.length, at + match[0].length + 100)
      )
      .replace(/\s+/g, " ")
      .replaceAll("_", "")
      .trim()}…`
  })
}
const data = [...counts.values()]
  .sort((a, b) => b.value - a.value || (a.text < b.text ? -1 : 1))
  .slice(0, 300)
const fixture = {
  title: "Alice's Adventures in Wonderland",
  author: "Lewis Carroll",
  year: 1865,
  source: "https://www.gutenberg.org/ebooks/11",
  sourceText: "https://www.gutenberg.org/cache/epub/11/pg11.txt",
  retrieved: "2026-10-31",
  sourceSha256: createHash("sha256").update(source).digest("hex"),
  license:
    "Public domain in the USA; Project Gutenberg source license retained in scripts/wordcloud/fixtures/alice.txt.",
  method:
    "Chapters I–XII, excluding the table of contents and license. Case-insensitive English tokens; possessive 's removed; explicit stop list; no stemming. Character/object groups are editorial labels, not automated entity recognition.",
  tokens,
  stopWords: [...stopWords].sort(),
  data
}
writeFileSync(
  new URL(
    "../../docs/src/pages/examples/word-cloud/alice.json",
    import.meta.url
  ),
  JSON.stringify(fixture, null, 2) + "\n"
)
console.log(
  `Aggregated ${tokens} tokens into ${data.length} example terms; ${data[0].text} occurs ${data[0].value} times.`
)
