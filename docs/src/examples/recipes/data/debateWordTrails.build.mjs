/* global URL, console */
// One-off data builder for the Word Trails example.
// Fetches 3 real presidential-debate transcripts, tokenizes, bins by position
// in the debate (0..19 segments), and writes per-(speaker, word, segment)
// counts. Run once; output is committed. Not part of the build.
import { execFileSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const SEGMENTS = 20
const N_WORDS = 22 // top words per speaker (by total count)
const MAX_SEG_PER_WORD = 6 // occurrences kept in "repeat" mode
const MIN_LEN = 3

const STOP = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves
   going know think want said say says saying tell told going gonna got get getting go goes went done thing things lot right well okay yeah look looking mean im ive dont thats theyre youre weve going really just like now going one two also new make made way back come came take took give given put said many much even still going able going per cent percent number us re ve ll don didn doesn isn wasn wouldn couldn shouldn won ain hasn haven hadn mustn shan needn weren aren`
    .split(/\s+/)
    .filter(Boolean),
)

function curl(url) {
  return execFileSync("curl", ["-sL", "--max-time", "40", url], { maxBuffer: 1 << 26 }).toString(
    "utf8",
  )
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z' ]+/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length >= MIN_LEN && !STOP.has(w) && !/^'|'$/.test(w))
}

// turns: [{ speakerRaw, text }] in document order → normalized speaker + segment counts
function processDebate({ id, label, turns, mapSpeaker, columnOrder, parties }) {
  // Assign a segment to each token by its cumulative position through the debate.
  const perSpeaker = new Map() // speaker -> { total: Map<word,n>, seg: Map<word, Map<seg,n>> }
  // First pass: total token count for segment scaling.
  const speakerTokens = turns.map((t) => ({ sp: mapSpeaker(t.speakerRaw), toks: tokenize(t.text) }))
  const grand = speakerTokens.reduce((s, t) => s + t.toks.length, 0)
  let cursor = 0
  for (const { sp, toks } of speakerTokens) {
    if (!sp) {
      cursor += toks.length
      continue
    }
    if (!perSpeaker.has(sp)) perSpeaker.set(sp, { total: new Map(), seg: new Map() })
    const rec = perSpeaker.get(sp)
    for (const w of toks) {
      const seg = Math.min(SEGMENTS - 1, Math.floor((cursor / Math.max(1, grand)) * SEGMENTS))
      cursor++
      rec.total.set(w, (rec.total.get(w) ?? 0) + 1)
      if (!rec.seg.has(w)) rec.seg.set(w, new Map())
      const sm = rec.seg.get(w)
      sm.set(seg, (sm.get(seg) ?? 0) + 1)
    }
  }

  const rows = []
  const profiles = []
  const keptWords = new Set()
  for (const sp of columnOrder) {
    const rec = perSpeaker.get(sp)
    if (!rec) continue
    const top = [...rec.total.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, N_WORDS)
    for (const [word, total] of top) {
      keptWords.add(word)
      const bins = Array.from(
        { length: SEGMENTS },
        (_, segment) => rec.seg.get(word).get(segment) ?? 0,
      )
      profiles.push({ word, speaker: sp, total, bins })
      const segCounts = [...rec.seg.get(word).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_SEG_PER_WORD)
      for (const [segment, count] of segCounts) {
        rows.push({ word, speaker: sp, segment, weight: count })
      }
    }
  }

  // Cross-speaker distribution per kept word, over the FULL debate (not just
  // the top rows) → [republican, democrat, host] totals. Drives distinctiveness
  // coloring: a word owned by one camp is pure-hued; a shared word is muddy.
  const wordParty = {}
  for (const word of keptWords) {
    const tally = { rep: 0, dem: 0, host: 0 }
    for (const [sp, rec] of perSpeaker) {
      const role = parties[sp]
      if (!role) continue
      tally[role] += rec.total.get(word) ?? 0
    }
    wordParty[word] = [tally.rep, tally.dem, tally.host]
  }

  return { id, label, columnOrder, parties, words: rows, profiles, wordParty }
}

// ── Source 1: 2020 (Trump / Biden / Wallace) — m-arg CSV ──────────────────
function parseCsv2020() {
  const raw = curl(
    "https://raw.githubusercontent.com/rafamestre/m-arg_multimodal-argumentation-dataset/main/data/original%20data/us_election_2020_1st_presidential_debate.csv",
  )
  // Simple CSV: speaker,minute,text  (text may be quoted with embedded commas)
  const lines = raw.split(/\r?\n/).slice(1)
  const turns = []
  const re = /^([^,]+),([^,]*),(?:"([\s\S]*)"|(.*))$/
  for (const line of lines) {
    if (!line.trim()) continue
    const m = line.match(re)
    if (!m) continue
    turns.push({ speakerRaw: m[1], text: (m[3] ?? m[4] ?? "").replace(/""/g, '"') })
  }
  return processDebate({
    id: "2020",
    label: "2020 · Biden – Trump (first debate)",
    turns,
    columnOrder: ["Biden", "Wallace", "Trump"],
    parties: { Trump: "rep", Biden: "dem", Wallace: "host" },
    mapSpeaker: (s) => {
      if (/trump/i.test(s)) return "Trump"
      if (/biden/i.test(s)) return "Biden"
      if (/wallace/i.test(s)) return "Wallace"
      return null
    },
  })
}

// ── debates.org HTML: "SPEAKER: text" blocks ──────────────────────────────
function parseDebatesOrg(url, speakerRe) {
  const html = curl(url)
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
  // Split on ALLCAPS speaker tags like "HOLT:" / "OBAMA:"
  const parts = text.split(/\b([A-Z]{3,})\s*:/)
  const turns = []
  for (let i = 1; i < parts.length; i += 2) {
    const sp = parts[i]
    const body = parts[i + 1] ?? ""
    if (speakerRe.test(sp)) turns.push({ speakerRaw: sp, text: body })
  }
  return turns
}

function parse2016() {
  const turns = parseDebatesOrg(
    "https://www.debates.org/voter-education/debate-transcripts/september-26-2016-debate-transcript/",
    /HOLT|CLINTON|TRUMP/,
  )
  return processDebate({
    id: "2016",
    label: "2016 · Clinton – Trump (first debate)",
    turns,
    columnOrder: ["Clinton", "Holt", "Trump"],
    parties: { Trump: "rep", Clinton: "dem", Holt: "host" },
    mapSpeaker: (s) =>
      s === "HOLT" ? "Holt" : s === "CLINTON" ? "Clinton" : s === "TRUMP" ? "Trump" : null,
  })
}

function parse2012() {
  const turns = parseDebatesOrg(
    "https://www.debates.org/voter-education/debate-transcripts/october-3-2012-debate-transcript/",
    /LEHRER|OBAMA|ROMNEY/,
  )
  return processDebate({
    id: "2012",
    label: "2012 · Obama – Romney (first debate)",
    turns,
    columnOrder: ["Obama", "Lehrer", "Romney"],
    parties: { Romney: "rep", Obama: "dem", Lehrer: "host" },
    mapSpeaker: (s) =>
      s === "LEHRER" ? "Lehrer" : s === "OBAMA" ? "Obama" : s === "ROMNEY" ? "Romney" : null,
  })
}

const debates = [parse2012(), parse2016(), parseCsv2020()]
for (const d of debates) {
  const counts = {}
  for (const r of d.words) counts[r.speaker] = (counts[r.speaker] ?? 0) + 1
  console.error(`${d.id}: ${d.words.length} rows`, counts)
}

const header = `// AUTO-GENERATED by debateWordTrails.build.mjs — do not edit by hand.
// Real presidential-debate transcripts, tokenized (stopwords removed) and binned
// into 20 time segments. Display rows retain each word's six peak segments;
// profiles retain all 20 exact segment counts. Sources: 2012 & 2016 via
// debates.org (Commission on Presidential Debates); 2020 via the m-arg dataset
// (rafamestre/m-arg_multimodal-argumentation-dataset).
// SEGMENTS = ${SEGMENTS} (0 = debate open, 19 = close).
`
const body = `export const DEBATE_WORD_TRAILS = ${JSON.stringify(debates, null, 0)}\n\nexport const SEGMENTS = ${SEGMENTS}\n`
writeFileSync(new URL("./debateWordTrails.js", import.meta.url), header + body)
console.error("wrote debateWordTrails.js")
