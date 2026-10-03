// "The Scroll You're Telling" — the data here is *you*. The page records your
// own reading as a realtime stream (scroll position, velocity, dwell, pointer
// activity) and plots it live. This module holds the editorial chapters, the
// pure derivations the charts and readouts run on each telemetry sample, and a
// deterministic seed session so the page is never empty on first paint and the
// replay always has a story to tell.

// A believable article length, used only to turn "fraction of the page read"
// into an approximate words-per-minute readout. Clearly an estimate.
export const ARTICLE_WORDS = 1850

// Below this absolute scroll speed (fraction of the article per second) a beat
// counts as dwelling rather than moving. ~0.4% of the page per tick.
export const IDLE_VELOCITY = 0.0025

export const READING_CHAPTERS = [
  {
    id: "engraving",
    index: 0,
    era: "1858",
    kicker: "The engraving",
    title: "A printed chart stays the same for every reader",
    measure: "Scroll depth · where you are on the page",
    paragraphs: [
      "Florence Nightingale’s diagram of deaths in the Crimean War gave readers the same printed view of the evidence. They could study it, skip it or return to it, but those choices left the chart unchanged.",
      "Print keeps the author’s arrangement fixed while readers choose their own pace. This page adds a record of that pace: the line beside the article shows your position as you move through it.",
      "Pause, scroll down or return to an earlier sentence to see the line respond.",
    ],
  },
  {
    id: "interactive",
    index: 1,
    era: "1996",
    kicker: "The interactive",
    title: "Interactive charts let readers ask for another view",
    measure: "Pointer activity · moving through the interface",
    paragraphs: [
      "Interactive graphics gave readers ways to change a chart: filter a category, reveal a value or drag through time. Gapminder’s moving bubbles made it possible to follow changes in income and lifespan while choosing where to look.",
      "Each action asks the chart for a different view of its data. The pointer measurements here record movement through the interface. They show activity, while your reason for moving remains yours.",
    ],
  },
  {
    id: "scroll",
    index: 2,
    era: "2012",
    kicker: "The scroll",
    title: "Scrolling sets the pace of the story",
    measure: "Velocity · direction and speed of scrolling",
    paragraphs: [
      "The New York Times’s 2012 “Snow Fall” helped popularize stories that combine scrolling text with changing graphics. Authors prepare the sequence, and the reader’s position determines when each part appears.",
      "This article uses a similar arrangement, with text beside a graphic that stays in view. But its charts also record your movement through that arrangement. The velocity plot distinguishes a quick pass from a pause or a return upward.",
      "Scroll back to the previous paragraph. The velocity trace will dip below zero.",
    ],
  },
  {
    id: "stream",
    index: 3,
    era: "now",
    kicker: "The stream",
    title: "Your movements become a live record",
    measure: "The stream · position, direction and time",
    paragraphs: [
      "A realtime chart receives observations as they arrive and keeps a recent window in view. Here, the observations are your scroll position and movement, sampled eight times a second.",
      "The three charts read that stream differently. The line shows position, the dots show speed and direction, and the bars total the time each chapter spent in view.",
      "Compare them before replaying your session. A return to an earlier section looks different from a long pause, even if both sessions finish at the same point on the page. The record preserves that difference; it cannot tell us what you understood or why you stopped.",
    ],
  },
]

export const CHAPTER_COLORS = ["#e8b04b", "#5bd6c0", "#6aa9ff", "#c79bff"]

export const BEAT_KINDS = {
  forward: { label: "Reading on", fill: "#5bd6c0", stroke: "#0c4d44" },
  backward: { label: "Rereading", fill: "#ff5fb0", stroke: "#73144f" },
  highlight: { label: "Highlighting", fill: "#ffd54a", stroke: "#6b5210" },
  idle: { label: "Dwelling", fill: "#7f8ba0", stroke: "#2c3442" },
}

// One telemetry sample. `t` is ms since the reading began; `scroll` is the
// fraction of the article read (0..1); `velocity` is signed fraction/second
// (positive = down/forward, negative = up/rereading); `pointer` is the count of
// pointer beats observed in the tick; `chapter` is the chapter index in view;
// `highlighting` is true when a text selection was active during the tick, which
// takes precedence over velocity so the dot reads as a highlight beat.
export function makeSample({ id, t, scroll, velocity, pointer, chapter, highlighting = false }) {
  const kind = highlighting ? "highlight" : classifyBeat(velocity)
  return {
    id,
    t,
    scroll,
    scrollPercent: Math.round(clamp01(scroll) * 100),
    velocity,
    pace: Math.abs(velocity),
    pointer,
    chapter,
    highlighting: Boolean(highlighting),
    kind,
  }
}

export function classifyBeat(velocity) {
  if (Math.abs(velocity) < IDLE_VELOCITY) return "idle"
  return velocity > 0 ? "forward" : "backward"
}

// Seconds of attention spent in each chapter, in chapter order, ready to hand
// straight to an ordinal BarChart via its replace() ingest.
export function dwellByChapter(samples) {
  const seconds = new Array(READING_CHAPTERS.length).fill(0)
  for (let i = 1; i < samples.length; i += 1) {
    const dt = (samples[i].t - samples[i - 1].t) / 1000
    if (dt <= 0 || dt > 2) continue // ignore gaps from blurred tabs
    const chapter = samples[i].chapter ?? 0
    seconds[chapter] += dt
  }
  return READING_CHAPTERS.map((chapter, index) => ({
    id: chapter.id,
    chapter: index,
    label: chapter.kicker,
    era: chapter.era,
    seconds: Math.round(seconds[index] * 10) / 10,
    color: CHAPTER_COLORS[index],
  }))
}

// The cumulative reading summary — the "final snapshot" the editorial argues is
// never the whole story. Computed purely from the sample buffer.
export function summarizeReading(samples) {
  if (!samples.length) {
    return {
      elapsedMs: 0,
      percentRead: 0,
      maxDepth: 0,
      backtracks: 0,
      idleSeconds: 0,
      wordsRead: 0,
      wpm: 0,
      beats: 0,
    }
  }

  const first = samples[0]
  const last = samples[samples.length - 1]
  const elapsedMs = Math.max(0, last.t - first.t)

  let maxDepth = 0
  let backtracks = 0
  let idleSeconds = 0
  let descending = true

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i]
    maxDepth = Math.max(maxDepth, sample.scroll)
    if (i > 0) {
      const dt = (sample.t - samples[i - 1].t) / 1000
      if (sample.kind === "idle" && dt > 0 && dt < 2) idleSeconds += dt
      // A backtrack is a reversal from moving-forward into a sustained
      // rereading beat — count the transition, not every backward tick.
      if (sample.kind === "backward" && descending) {
        backtracks += 1
        descending = false
      } else if (sample.kind === "forward") {
        descending = true
      }
    }
  }

  const minutes = elapsedMs / 60000
  const wordsRead = Math.round(maxDepth * ARTICLE_WORDS)
  // Words-per-minute is only meaningful after a little reading; clamp to a
  // believable ceiling so a fast scroll (or a scripted one) can't print an
  // absurd rate. Below the warmup it reads as "—".
  const rawWpm = minutes > 0.1 && maxDepth > 0.06 ? wordsRead / minutes : 0
  const wpm = rawWpm > 0 ? Math.min(1200, Math.round(rawWpm)) : 0

  return {
    elapsedMs,
    percentRead: Math.round(maxDepth * 100),
    maxDepth,
    backtracks,
    idleSeconds: Math.round(idleSeconds),
    wordsRead,
    wpm,
    beats: samples.length,
  }
}

// A signed time-window for the realtime axes: a rolling slice that keeps the
// trace scrolling like a live monitor rather than compressing the whole session.
export function rollingTimeExtent(samples, windowMs) {
  if (!samples.length) return [0, windowMs]
  const last = samples[samples.length - 1].t
  const first = samples[0].t
  const start = Math.max(first, last - windowMs)
  if (start >= last) return [last - windowMs, last + 250]
  return [start, last + 250]
}

export function formatClock(ms) {
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function clamp01(value) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

// A deterministic, believable reading session. Used for the empty state (so the
// page paints a ghost trace before you've scrolled) and as the default subject
// of the replay. Someone who reads on, stalls at the scrollytelling chapter,
// scrolls back to reread, then skims to the end. Pure and seed-stable.
export const SEED_SESSION = buildSeedSession()

function buildSeedSession() {
  // Keyframes: [seconds, scrollFraction]. The dip near 22s is a deliberate
  // reread; the flat stretch near 30s is a dwell.
  const keyframes = [
    [0, 0.0],
    [4, 0.08],
    [9, 0.19],
    [14, 0.31],
    [19, 0.46],
    [22, 0.4], // scrolls back up to reread the scroll chapter
    [26, 0.52],
    [30, 0.55], // dwells
    [34, 0.55],
    [40, 0.74],
    [46, 0.9],
    [52, 1.0],
  ]
  // While dwelling near 30s the reader highlights a passage — the beats in
  // this window read as highlight rather than idle.
  const highlightWindow = [30, 33.5]
  const hz = 8
  const samples = []
  const totalSeconds = keyframes[keyframes.length - 1][0]
  let previousScroll = 0
  let id = 0

  for (let step = 0; step <= totalSeconds * hz; step += 1) {
    const seconds = step / hz
    const scroll = interpolateKeyframes(keyframes, seconds)
    const velocity = (scroll - previousScroll) * hz
    const highlighting = seconds >= highlightWindow[0] && seconds <= highlightWindow[1]
    // A pointer flurry while moving or dragging a selection, near silence while
    // dwelling.
    const pointer = Math.abs(velocity) > IDLE_VELOCITY || highlighting
      ? 2 + Math.round(pseudoRandom(step) * 4)
      : Math.round(pseudoRandom(step) * 1)
    samples.push(
      makeSample({
        id: `seed-${id}`,
        t: Math.round(seconds * 1000),
        scroll,
        velocity,
        pointer,
        chapter: chapterForScroll(scroll),
        highlighting,
      })
    )
    previousScroll = scroll
    id += 1
  }
  return samples
}

function interpolateKeyframes(keyframes, seconds) {
  for (let i = 1; i < keyframes.length; i += 1) {
    const [t0, v0] = keyframes[i - 1]
    const [t1, v1] = keyframes[i]
    if (seconds <= t1) {
      const span = t1 - t0 || 1
      const ratio = (seconds - t0) / span
      return clamp01(v0 + (v1 - v0) * ratio)
    }
  }
  return keyframes[keyframes.length - 1][1]
}

// Map a scroll fraction to a chapter index, splitting the article into equal
// bands. The live page measures this from real chapter geometry; the seed uses
// the simple banding so it stays self-contained.
export function chapterForScroll(scroll) {
  const band = Math.floor(clamp01(scroll) * READING_CHAPTERS.length)
  return Math.min(READING_CHAPTERS.length - 1, band)
}

function pseudoRandom(step) {
  const value = Math.sin(step * 12.9898) * 43758.5453
  return value - Math.floor(value)
}
