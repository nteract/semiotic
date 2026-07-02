import { describe, expect, it } from "vitest"
import {
  READING_CHAPTERS,
  CHAPTER_COLORS,
  BEAT_KINDS,
  SEED_SESSION,
  classifyBeat,
  chapterForScroll,
  dwellByChapter,
  makeSample,
  rollingTimeExtent,
  summarizeReading,
  IDLE_VELOCITY,
} from "./scrollTelemetry"

describe("scroll telemetry example data", () => {
  it("pairs every chapter with a color and a stable index", () => {
    expect(CHAPTER_COLORS.length).toBeGreaterThanOrEqual(READING_CHAPTERS.length)
    READING_CHAPTERS.forEach((chapter, index) => {
      expect(chapter.index).toBe(index)
      expect(chapter.paragraphs.length).toBeGreaterThan(0)
    })
    expect(new Set(READING_CHAPTERS.map((c) => c.id)).size).toBe(READING_CHAPTERS.length)
  })

  it("classifies beats by signed velocity around the idle threshold", () => {
    expect(classifyBeat(0)).toBe("idle")
    expect(classifyBeat(IDLE_VELOCITY / 2)).toBe("idle")
    expect(classifyBeat(0.2)).toBe("forward")
    expect(classifyBeat(-0.2)).toBe("backward")
  })

  it("recolors a beat as highlight when a selection is active, overriding velocity", () => {
    expect(BEAT_KINDS.highlight).toBeTruthy()
    // A fast forward scroll would classify as "forward"...
    expect(classifyBeat(0.4)).toBe("forward")
    // ...but an active highlight takes precedence.
    const beat = makeSample({ id: "b", t: 0, scroll: 0.5, velocity: 0.4, pointer: 3, chapter: 1, highlighting: true })
    expect(beat.kind).toBe("highlight")
    expect(beat.highlighting).toBe(true)
    // Without a selection it falls back to velocity classification.
    const plain = makeSample({ id: "c", t: 0, scroll: 0.5, velocity: 0.4, pointer: 3, chapter: 1 })
    expect(plain.kind).toBe("forward")
    expect(plain.highlighting).toBe(false)
  })

  it("seeds a highlight passage into the sample session", () => {
    expect(SEED_SESSION.some((beat) => beat.kind === "highlight")).toBe(true)
  })

  it("maps scroll fraction into chapter bands without overflowing", () => {
    expect(chapterForScroll(0)).toBe(0)
    expect(chapterForScroll(1)).toBe(READING_CHAPTERS.length - 1)
    expect(chapterForScroll(1.5)).toBe(READING_CHAPTERS.length - 1)
    expect(chapterForScroll(-1)).toBe(0)
  })

  it("builds a monotonic-time seed session that reaches the end", () => {
    expect(SEED_SESSION.length).toBeGreaterThan(50)
    for (let i = 1; i < SEED_SESSION.length; i += 1) {
      expect(SEED_SESSION[i].t).toBeGreaterThan(SEED_SESSION[i - 1].t)
      expect(SEED_SESSION[i].scroll).toBeGreaterThanOrEqual(0)
      expect(SEED_SESSION[i].scroll).toBeLessThanOrEqual(1)
    }
    expect(SEED_SESSION[SEED_SESSION.length - 1].scroll).toBeCloseTo(1, 1)
  })

  it("detects the deliberate reread in the seed session", () => {
    const summary = summarizeReading(SEED_SESSION)
    expect(summary.percentRead).toBe(100)
    expect(summary.backtracks).toBeGreaterThanOrEqual(1)
    expect(summary.elapsedMs).toBeGreaterThan(40000)
    expect(summary.wpm).toBeGreaterThan(0)
    // A reader who backtracks visits at least one chapter more than once, so
    // total dwell exceeds the elapsed wall-clock only modestly — sanity bound.
    const dwell = dwellByChapter(SEED_SESSION)
    expect(dwell).toHaveLength(READING_CHAPTERS.length)
    const totalDwell = dwell.reduce((sum, d) => sum + d.seconds, 0)
    expect(totalDwell).toBeGreaterThan(40)
    dwell.forEach((entry) => expect(entry.seconds).toBeGreaterThanOrEqual(0))
  })

  it("returns a zeroed summary for an empty buffer", () => {
    const summary = summarizeReading([])
    expect(summary).toMatchObject({ percentRead: 0, backtracks: 0, beats: 0 })
  })

  it("keeps a rolling window anchored to the latest sample", () => {
    const [start, end] = rollingTimeExtent(SEED_SESSION, 10000)
    const last = SEED_SESSION[SEED_SESSION.length - 1].t
    expect(end).toBeGreaterThanOrEqual(last)
    expect(end - start).toBeGreaterThan(9000)
    expect(rollingTimeExtent([], 5000)).toEqual([0, 5000])
  })
})
