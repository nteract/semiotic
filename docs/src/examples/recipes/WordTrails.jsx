import React, { useMemo, useState } from "react"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { wordTrailsLayout } from "semiotic/recipes"
import { DEBATE_WORD_TRAILS, SEGMENTS } from "./data/debateWordTrails"

// ── Distinctiveness coloring ──────────────────────────────────────────────
// Each word carries [republican, democrat, host] usage counts across the whole
// debate. We mix three hue-normalized primaries by those proportions (RYB-style
// so red+blue = purple, red+yellow = orange, all three = muddy brown). A word
// owned by one camp is pure-hued; a word everyone uses goes grey-brown.
const REP = [214, 40, 57] // red
const DEM = [33, 102, 214] // blue
const HOST = [230, 184, 24] // yellow

function mixColor([rep, dem, host]) {
  const total = rep + dem + host
  if (total <= 0) return "rgb(150,150,150)"
  const fr = rep / total
  const fd = dem / total
  const fh = host / total
  const r = Math.round(REP[0] * fr + DEM[0] * fd + HOST[0] * fh)
  const g = Math.round(REP[1] * fr + DEM[1] * fd + HOST[1] * fh)
  const b = Math.round(REP[2] * fr + DEM[2] * fd + HOST[2] * fh)
  return `rgb(${r},${g},${b})`
}

const ROLE_COLOR = { rep: `rgb(${REP})`, dem: `rgb(${DEM})`, host: `rgb(${HOST})` }
const segmentTickFormat = (v) => `${Math.round((v / (SEGMENTS - 1)) * 100)}%`

// Rank each speaker's words by total usage, keep the top `k`.
function selectTopWords(words, k) {
  const totals = new Map()
  for (const r of words) {
    const key = `${r.speaker}|${r.word}`
    totals.set(key, (totals.get(key) ?? 0) + r.weight)
  }
  const bySpeaker = new Map()
  for (const [key, total] of totals) {
    const [speaker, word] = key.split("|")
    if (!bySpeaker.has(speaker)) bySpeaker.set(speaker, [])
    bySpeaker.get(speaker).push({ word, total })
  }
  const keep = new Set()
  for (const [speaker, list] of bySpeaker) {
    list.sort((a, b) => b.total - a.total)
    for (const { word } of list.slice(0, k)) keep.add(`${speaker}|${word}`)
  }
  return words.filter((r) => keep.has(`${r.speaker}|${r.word}`))
}

function Swatch({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  )
}

export default function WordTrails() {
  const [debateId, setDebateId] = useState("2016")
  const [wordsPerSpeaker, setWordsPerSpeaker] = useState(14)
  const [repeatWords, setRepeatWords] = useState(false)
  const [padding, setPadding] = useState(2)
  const [colorMode, setColorMode] = useState("distinct") // "distinct" | "speaker"

  const debate = useMemo(
    () => DEBATE_WORD_TRAILS.find((d) => d.id === debateId) ?? DEBATE_WORD_TRAILS[0],
    [debateId]
  )
  const data = useMemo(() => selectTopWords(debate.words, wordsPerSpeaker), [debate, wordsPerSpeaker])

  // word → distinctiveness color, column → pure party hue.
  const colorMap = useMemo(() => {
    const m = new Map()
    for (const [word, counts] of Object.entries(debate.wordParty)) m.set(word, mixColor(counts))
    return m
  }, [debate])

  const layoutConfig = useMemo(
    () => ({
      textAccessor: "word",
      weightAccessor: "weight",
      columnAccessor: "speaker",
      segmentAccessor: "segment",
      segmentDomain: [0, SEGMENTS - 1],
      columnOrder: debate.columnOrder,
      minFontSize: 11,
      maxFontSize: 46,
      repeatWords,
      scaleToFit: true,
      collisionPadding: padding,
      segmentAxisLabel: "Debate timeline →",
      segmentTickFormat,
      ...(colorMode === "distinct" && {
        wordColor: (d) => colorMap.get(d.word),
        columnColor: (col) => ROLE_COLOR[debate.parties[col]],
      }),
    }),
    [debate, repeatWords, padding, colorMode, colorMap]
  )

  const controlStyle = { display: "flex", alignItems: "center", gap: "8px" }
  const selectStyle = {
    background: "var(--surface-2, #1a1a24)",
    color: "var(--text-primary, #e8e8f0)",
    border: "1px solid var(--surface-3, #303040)",
    borderRadius: "6px",
    padding: "4px 8px",
    fontSize: "13px",
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "18px",
          alignItems: "center",
          marginBottom: "14px",
          fontSize: "13px",
          color: "var(--text-secondary, #8888a0)",
        }}
      >
        <label style={controlStyle}>
          Debate
          <select value={debateId} onChange={(e) => setDebateId(e.target.value)} style={selectStyle}>
            {DEBATE_WORD_TRAILS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label style={controlStyle}>
          Words / speaker
          <input type="range" min={5} max={22} value={wordsPerSpeaker} onChange={(e) => setWordsPerSpeaker(Number(e.target.value))} />
          <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 20 }}>{wordsPerSpeaker}</span>
        </label>

        <label style={controlStyle}>
          Padding
          <input type="range" min={0} max={12} value={padding} onChange={(e) => setPadding(Number(e.target.value))} />
          <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 14 }}>{padding}</span>
        </label>

        <label style={controlStyle}>
          Color
          <select value={colorMode} onChange={(e) => setColorMode(e.target.value)} style={selectStyle}>
            <option value="distinct">Distinctiveness</option>
            <option value="speaker">By speaker</option>
          </select>
        </label>

        <label style={{ ...controlStyle, cursor: "pointer" }}>
          <input type="checkbox" checked={repeatWords} onChange={(e) => setRepeatWords(e.target.checked)} />
          Repeat words
        </label>
      </div>

      {colorMode === "distinct" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px", fontSize: "12px", color: "var(--text-secondary, #8888a0)" }}>
          <Swatch color={ROLE_COLOR.dem} label="Democrat" />
          <Swatch color={ROLE_COLOR.rep} label="Republican" />
          <Swatch color={ROLE_COLOR.host} label="Moderator" />
          <span style={{ opacity: 0.8 }}>
            mixed hues = shared language (purple = both candidates, brown-grey = everyone)
          </span>
        </div>
      )}

      <OrdinalCustomChart
        key={debateId}
        data={data}
        layout={wordTrailsLayout}
        layoutConfig={layoutConfig}
        categoryAccessor="speaker"
        valueAccessor="weight"
        width={880}
        height={580}
        responsiveWidth
        margin={{ top: 12, right: 16, bottom: 12, left: 16 }}
        title={`What each voice emphasized, and when — ${debate.label}`}
        description="A word cloud with honest axes: columns are speakers, vertical position is when in the debate the word peaked, size is frequency, and color shows how distinctive the word is to one camp."
        tooltip
      />

      <p style={{ fontSize: "12px", color: "var(--text-secondary, #8888a0)", marginTop: "10px" }}>
        Drop <strong>Padding</strong> toward 0 for a crowded cloud, or push <strong>Words / speaker</strong> to the max —
        it stays overlap-free, shrinking uniformly so relative sizes never change. Real transcripts: 2012 &amp; 2016 via
        debates.org (Commission on Presidential Debates), 2020 via the m-arg dataset.
      </p>
    </div>
  )
}
