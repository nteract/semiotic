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
    title: "The reader and the page hold still for each other",
    measure: "Scroll depth · the only thing a printed page could never know",
    paragraphs: [
      "Florence Nightingale's coxcomb of the Crimean dead was carved into a printing plate and pulled, identically, for every reader. It did not know who held it. It could not. The artifact was finished before you arrived, and your attention left no mark on it.",
      "That is the original contract of data journalism: the author measures the world, fixes a picture of it, and hands it over. The reading is private and unrecorded. Whatever you are doing right now — skimming, rereading this sentence, already gone — a printed page would have no way to tell.",
      "This page can tell. The trace on the right started the moment you arrived.",
    ],
  },
  {
    id: "interactive",
    index: 1,
    era: "1996",
    kicker: "The interactive",
    title: "The artifact answers, but only when poked",
    measure: "Pointer beats · the cursor becomes a reader",
    paragraphs: [
      "Then the picture learned to move. Flash, then JavaScript, then Gapminder's bubbles rolling across two decades of income and lifespan. The reader stopped being a viewer and became a cursor: click to filter, hover to reveal, drag the year and watch the world rearrange.",
      "But interactivity is call-and-response. The story waits, inert, until you poke it, and answers exactly the question your click encoded. Between clicks it knows nothing about you. The pointer pulse on the right is counting your movements — the raw material the interactive era learned to read, one event at a time.",
    ],
  },
  {
    id: "scroll",
    index: 2,
    era: "2012",
    kicker: "The scroll",
    title: "The scrollbar becomes a clock the author conducts",
    measure: "Velocity · the pace the author can feel but not yet see",
    paragraphs: [
      "In 2012 the New York Times published \"Snow Fall,\" and the scrollbar became a timeline. Scroll down and the avalanche advances; the story binds itself to your position on the page. This is the form you are reading inside of at this very moment — prose on one side, a graphic pinned on the other, advancing as you descend.",
      "Scrollytelling feels alive because the page reacts to you. But look closely at the contract: you are still triggering frames the author baked in advance. Scroll position is a clock, and the author has scored every measure ahead of time. The story reacts to your scroll. It does not yet know it is you scrolling.",
      "If you scroll back up to reread that sentence, the velocity trace on the right will dip below zero. The story would never notice. We did.",
    ],
  },
  {
    id: "stream",
    index: 3,
    era: "now",
    kicker: "The stream",
    title: "You are not triggering the story. You are its data.",
    measure: "The whole signal · windowed, signed, out of order, alive",
    paragraphs: [
      "A realtime system makes a different bargain. It stops pre-authoring frames and starts consuming a live signal — windowing it, because you can never hold the whole stream at once; keeping sign, because direction matters; tolerating events that arrive late and out of order.",
      "The most available live signal in any article is the one reading it. Every chart on the right is built from the same Semiotic machinery that watches Wikipedia's edit firehose or a market's order flow. Here it is pointed at the most intimate stream there is: your attention, sampled eight times a second.",
      "That is the point a final snapshot can never make. \"You read 80% of this\" is a number. The trace beside it shows the rereading, the stall, the skim — the shape of the reading, which only exists if you watch the stream unfold instead of summing it up at the end.",
    ],
  },
]

export const CHAPTER_COLORS = ["#e8b04b", "#5bd6c0", "#6aa9ff", "#c79bff"]

export const BEAT_KINDS = {
  forward: { label: "Reading on", fill: "#5bd6c0", stroke: "#0c4d44" },
  backward: { label: "Rereading", fill: "#ff5fb0", stroke: "#73144f" },
  idle: { label: "Dwelling", fill: "#7f8ba0", stroke: "#2c3442" },
}

// One telemetry sample. `t` is ms since the reading began; `scroll` is the
// fraction of the article read (0..1); `velocity` is signed fraction/second
// (positive = down/forward, negative = up/rereading); `pointer` is the count of
// pointer beats observed in the tick; `chapter` is the chapter index in view.
export function makeSample({ id, t, scroll, velocity, pointer, chapter }) {
  const kind = classifyBeat(velocity)
  return {
    id,
    t,
    scroll,
    scrollPercent: Math.round(clamp01(scroll) * 100),
    velocity,
    pace: Math.abs(velocity),
    pointer,
    chapter,
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
  const hz = 8
  const samples = []
  const totalSeconds = keyframes[keyframes.length - 1][0]
  let previousScroll = 0
  let id = 0

  for (let step = 0; step <= totalSeconds * hz; step += 1) {
    const seconds = step / hz
    const scroll = interpolateKeyframes(keyframes, seconds)
    const velocity = (scroll - previousScroll) * hz
    // A pointer flurry while moving, near silence while dwelling.
    const pointer = Math.abs(velocity) > IDLE_VELOCITY
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
