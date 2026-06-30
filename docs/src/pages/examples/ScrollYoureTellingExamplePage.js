import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { BarChart, RealtimeLineChart, RealtimeSwarmChart, ThemeProvider, useSyncedPushData } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import { useDocsTheme } from "../../hooks/useDocsTheme"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  BEAT_KINDS,
  CHAPTER_COLORS,
  READING_CHAPTERS,
  SEED_SESSION,
  chapterForScroll,
  dwellByChapter,
  formatClock,
  makeSample,
  rollingTimeExtent,
  summarizeReading,
} from "./data/scrollTelemetry"
import "./ScrollYoureTellingExamplePage.css"

const TICK_MS = 125 // 8 Hz — the same cadence the page samples your scroll
const WINDOW_MS = 42000 // rolling monitor window
const WINDOW_SAMPLES = 420
const CHART_BUFFER = 720
const MAX_BUFFER = 3600 // ~7.5 minutes of reading before the oldest beats drop
const REPLAY_TICK_MS = 70
const MIN_LIVE_FOR_REPLAY = 24

const beatColors = Object.fromEntries(
  Object.entries(BEAT_KINDS).map(([kind, meta]) => [kind, meta.fill])
)

const implementationCode = `// The reader is the stream. Sample scroll eight times a second.
const lineRef = useRef(null)
const swarmRef = useRef(null)

useReadingTelemetry((sample) => {
  setBeats(current => [...current, sample].slice(-3600))
}) // { t, scroll, velocity, pointer, chapter, kind }

// One library hook reconciles the rolling buffer into each chart.
useSyncedPushData(lineRef, windowedBeats, { id: "id" })
useSyncedPushData(swarmRef, windowedBeats, { id: "id" })

<RealtimeLineChart
  ref={lineRef}
  timeAccessor="t" valueAccessor="scroll"
  valueExtent={[0, 1]} timeExtent={rollingTimeExtent(windowedBeats)}
  windowSize={720} pointIdAccessor="id"
/>

<RealtimeSwarmChart
  ref={swarmRef}
  timeAccessor="t" valueAccessor="velocity" yScaleType="symlog"
  categoryAccessor="kind" colors={beatColors} pointIdAccessor="id"
  annotations={latestRereadCallout}   // the story never noticed. we did.
/>

// Attention pools where you dwell — an ordinal bar fed by replace().
barRef.current.replace(dwellByChapter(beats))`

export default function ScrollYoureTellingExamplePage() {
  const chapterRefs = useRef([])
  const [mode, setMode] = useState("live")
  const [replayIndex, setReplayIndex] = useState(0)
  const replaySourceRef = useRef([])

  const liveBeats = useReadingTelemetry(chapterRefs, mode === "live")

  const [docsTheme] = useDocsTheme()
  const carbonTheme = docsTheme === "dark" ? "carbon-dark" : "carbon"
  const [panelWidth, panelHostRef] = useResponsiveWidth(300, 560)

  const lineRef = useRef(null)
  const swarmRef = useRef(null)

  const displayed = useMemo(() => {
    if (mode === "replay") return replaySourceRef.current.slice(0, replayIndex)
    return liveBeats
  }, [mode, replayIndex, liveBeats])

  const windowed = useMemo(() => displayed.slice(-WINDOW_SAMPLES), [displayed])
  const timeExtent = useMemo(() => rollingTimeExtent(windowed, WINDOW_MS), [windowed])
  const velocityExtent = useMemo(() => {
    const maxAbs = windowed.reduce((max, beat) => Math.max(max, Math.abs(beat.velocity)), 0)
    const bound = Math.max(0.12, maxAbs * 1.1)
    return [-bound, bound]
  }, [windowed])

  const summary = useMemo(() => summarizeReading(displayed), [displayed])
  const dwellRows = useMemo(() => dwellByChapter(displayed), [displayed])
  // Round to whole seconds so the live bars step ~1 Hz instead of flickering.
  const dwellSignature = dwellRows.map((row) => Math.round(row.seconds)).join("|")
  const dwellDisplay = useMemo(
    () => dwellRows.map((row) => ({ ...row, seconds: Math.round(row.seconds) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dwellSignature]
  )

  const latestBeat = displayed[displayed.length - 1] || null
  const currentChapterIndex = latestBeat?.chapter ?? 0
  const rereadCallout = useMemo(() => buildRereadCallout(windowed), [windowed])

  const canReplaySelf = liveBeats.length >= MIN_LIVE_FOR_REPLAY
  const replayingSeed = mode === "replay" && replaySourceRef.current === SEED_SESSION

  // Keep the latest live buffer reachable from the replay handler without
  // rebinding the callback every render.
  const liveRef = useRef(liveBeats)
  liveRef.current = liveBeats

  const pushResetKey = `${carbonTheme}:${mode}`
  useSyncedPushData(lineRef, windowed, { id: "id", resetKey: pushResetKey })
  useSyncedPushData(swarmRef, windowed, { id: "id", resetKey: pushResetKey })

  // Drive the replay cursor.
  useEffect(() => {
    if (mode !== "replay") return undefined
    const source = replaySourceRef.current
    const timer = window.setInterval(() => {
      setReplayIndex((current) => {
        if (current >= source.length) {
          window.clearInterval(timer)
          return source.length
        }
        return current + 1
      })
    }, REPLAY_TICK_MS)
    return () => window.clearInterval(timer)
  }, [mode])

  const startReplay = useCallback(() => {
    const live = liveRef.current
    replaySourceRef.current = live.length >= MIN_LIVE_FOR_REPLAY ? live : SEED_SESSION
    setReplayIndex(0)
    setMode("replay")
  }, [])

  const backToLive = useCallback(() => {
    setMode("live")
    setReplayIndex(0)
  }, [])

  const replayComplete =
    mode === "replay" && replayIndex >= replaySourceRef.current.length

  return (
    <ExamplePageLayout
      title="The Scroll You're Telling"
      prevPage={{
        title: "Where the Boxes Wait",
        path: "/examples/port-congestion-replay",
      }}
      nextPage={{
        title: "What the Machine Sees",
        path: "/examples/what-the-machine-sees",
      }}
    >
      <p className="scroll-tell-lede">
        Every chart below is built from one stream: <em>you</em>, reading this.
        The page samples your scroll position eight times a second and plots it
        live — the same realtime machinery Semiotic points at a Wikipedia edit
        firehose or a market’s order flow, turned around to watch the most
        intimate stream there is. Scroll, and tell it something.
      </p>

      <ThemeProvider theme={carbonTheme}>
        <div className="scroll-tell-scrolly">
          <div className="scroll-tell-steps">
            {READING_CHAPTERS.map((chapter, index) => (
              <section
                key={chapter.id}
                ref={(element) => {
                  chapterRefs.current[index] = element
                }}
                className={`scroll-tell-step ${
                  index === currentChapterIndex ? "is-current" : ""
                }`}
                style={{ "--chapter-color": CHAPTER_COLORS[index] }}
                aria-current={index === currentChapterIndex ? "true" : undefined}
              >
                <div className="scroll-tell-step-rule">
                  <span className="scroll-tell-step-era">{chapter.era}</span>
                  <span className="scroll-tell-step-kicker">{chapter.kicker}</span>
                </div>
                <h2>{chapter.title}</h2>
                {chapter.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{paragraph}</p>
                ))}
                <p className="scroll-tell-step-measure">{chapter.measure}</p>
              </section>
            ))}
          </div>

          <div className="scroll-tell-panel-column">
            <div className="scroll-tell-panel">
              <div className="scroll-tell-panel-body" ref={panelHostRef}>
              <div className="scroll-tell-panel-head">
                <div>
                  <span className="scroll-tell-kicker">
                    {mode === "replay"
                      ? replayingSeed
                        ? "Replaying · a sample reading"
                        : "Replaying · your reading"
                      : "Recording · live"}
                  </span>
                  <h3>{mode === "replay" ? "The scroll you told" : "Your reading, as it happens"}</h3>
                </div>
                <LiveDot mode={mode} replayComplete={replayComplete} />
              </div>

              <div className="scroll-tell-readouts">
                <Readout label="Time on page" value={formatClock(summary.elapsedMs)} />
                <Readout label="Read" value={`${summary.percentRead}%`} />
                <Readout label="Backtracks" value={String(summary.backtracks)} />
                <Readout label="≈ Pace" value={summary.wpm ? `${summary.wpm} wpm` : "—"} />
              </div>

              <figure className="scroll-tell-chart">
                <figcaption>
                  <span>Reading position</span>
                  <small>scroll depth over the last {Math.round(WINDOW_MS / 1000)}s</small>
                </figcaption>
                <RealtimeLineChart
                  key={`line-${carbonTheme}-${mode}`}
                  ref={lineRef}
                  size={[panelWidth, 196]}
                  margin={{ top: 14, right: 16, bottom: 26, left: 44 }}
                  timeAccessor="t"
                  valueAccessor="scroll"
                  windowSize={CHART_BUFFER}
                  timeExtent={timeExtent}
                  valueExtent={[0, 1]}
                  pointIdAccessor="id"
                  stroke={CHAPTER_COLORS[currentChapterIndex]}
                  strokeWidth={2.4}
                  enableHover
                  tickFormatTime={formatTickTime}
                  tickFormatValue={(value) => `${Math.round(value * 100)}%`}
                  tooltipContent={renderBeatTooltip}
                  emptyContent={false}
                  background="transparent"
                />
              </figure>

              <figure className="scroll-tell-chart">
                <figcaption>
                  <span>Reading pulse</span>
                  <small>signed scroll velocity · each dot is one beat</small>
                </figcaption>
                <RealtimeSwarmChart
                  key={`swarm-${carbonTheme}-${mode}`}
                  ref={swarmRef}
                  size={[panelWidth, 188]}
                  margin={{ top: 14, right: 16, bottom: 26, left: 44 }}
                  timeAccessor="t"
                  valueAccessor="velocity"
                  windowSize={CHART_BUFFER}
                  timeExtent={timeExtent}
                  valueExtent={velocityExtent}
                  yScaleType="symlog"
                  categoryAccessor="kind"
                  colors={beatColors}
                  pointStyle={beatPointStyle}
                  pointIdAccessor="id"
                  annotations={rereadCallout}
                  enableHover
                  tickFormatTime={formatTickTime}
                  tickFormatValue={formatVelocity}
                  tooltipContent={renderBeatTooltip}
                  emptyContent={false}
                  background="transparent"
                />
                <BeatLegend />
              </figure>

              <figure className="scroll-tell-chart">
                <figcaption>
                  <span>Where your attention pooled</span>
                  <small>seconds spent in each chapter · live</small>
                </figcaption>
                <BarChart
                  data={dwellDisplay}
                  width={panelWidth}
                  height={176}
                  margin={{ top: 8, right: 18, bottom: 26, left: 104 }}
                  categoryAccessor="label"
                  valueAccessor="seconds"
                  orientation="horizontal"
                  colorBy="id"
                  colorScheme={CHAPTER_COLORS}
                  sort={false}
                  barPadding={14}
                  roundedTop={3}
                  showLegend={false}
                  enableHover
                  animate={{ duration: 220 }}
                  valueFormat={(value) => `${value}s`}
                  frameProps={{ background: "transparent" }}
                />
              </figure>

              <div className="scroll-tell-panel-actions">
                {mode === "live" ? (
                  <button type="button" onClick={startReplay} className="scroll-tell-primary-button">
                    Replay {canReplaySelf ? "your scroll" : "a sample scroll"}
                    <span aria-hidden="true">↻</span>
                  </button>
                ) : (
                  <button type="button" onClick={backToLive} className="scroll-tell-primary-button">
                    Back to live recording
                  </button>
                )}
                <p className="scroll-tell-action-note">
                  {mode === "replay"
                    ? replayComplete
                      ? "That was the whole stream — windowed, signed, replayed."
                      : "Re-streaming the recorded beats at speed."
                    : canReplaySelf
                      ? "Watch your own reading play back as a data story."
                      : "Read a little more, then replay your own session."}
                </p>
              </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>

      <section className="scroll-tell-thesis">
        <div className="scroll-tell-thesis-block">
          <span className="scroll-tell-kicker">Why this is the realtime case</span>
          <h2>A snapshot can’t hold the shape of a stream</h2>
          <p>
            “You read {summary.percentRead || 80}% of this” is a number. It hides
            the reread, the stall, the skim — the part that only exists if you
            watch the signal unfold. Realtime visualization is not a chart that
            redraws quickly. It is a commitment to windows, signs, and order:
            keeping only what fits in view, distinguishing forward from backward,
            and tolerating beats that arrive late.
          </p>
        </div>
        <div className="scroll-tell-thesis-block">
          <span className="scroll-tell-kicker">Reader as data source</span>
          <h2>Scrollytelling reacts to you. This reads you.</h2>
          <p>
            “Snow Fall” bound the story to your scrollbar, but the frames were
            authored in advance — you were a trigger, not a subject. Point the
            same streaming primitives at the reader and the relationship
            inverts. There is nothing pre-baked here; the only content of these
            charts is your behavior. The medium, finally, is the message.
          </p>
        </div>
      </section>

      <section className="scroll-tell-code">
        <div className="scroll-tell-section-heading">
          <span className="scroll-tell-kicker">Core implementation</span>
          <h2>One reader, three coordinated views</h2>
          <p>
            A single rolling buffer of telemetry feeds a realtime line (position),
            a realtime swarm (signed velocity), and an ordinal bar fed through{" "}
            <code>replace()</code> (dwell per chapter). Semiotic owns the time
            windows, canvas rendering, axes, hit-testing, and per-beat styling.
          </p>
        </div>
        <CodeBlock code={implementationCode} language="jsx" />
      </section>

      <p className="scroll-tell-source-note">
        No data leaves your browser. The “stream” is your own scroll, pointer,
        and dwell, sampled locally and discarded when you go. The seeded sample
        reading exists only so the replay has something to show before you’ve
        scrolled.
      </p>
    </ExamplePageLayout>
  )
}

// ---------------------------------------------------------------------------
// Reading telemetry — the page measures itself being read.
// ---------------------------------------------------------------------------

function useReadingTelemetry(chapterRefs, running) {
  const [beats, setBeats] = useState([])
  const pointerCountRef = useRef(0)
  const startRef = useRef(null)
  const lastScrollRef = useRef(0)
  const idRef = useRef(0)

  useEffect(() => {
    if (typeof window === "undefined") return undefined
    const bump = () => {
      pointerCountRef.current += 1
    }
    window.addEventListener("pointermove", bump, { passive: true })
    window.addEventListener("touchmove", bump, { passive: true })
    window.addEventListener("wheel", bump, { passive: true })
    return () => {
      window.removeEventListener("pointermove", bump)
      window.removeEventListener("touchmove", bump)
      window.removeEventListener("wheel", bump)
    }
  }, [])

  useEffect(() => {
    if (!running || typeof window === "undefined") return undefined
    if (startRef.current == null) startRef.current = performance.now()

    const tick = () => {
      if (document.hidden) {
        pointerCountRef.current = 0
        return
      }
      const docEl = document.documentElement
      const max = docEl.scrollHeight - window.innerHeight
      const scroll = max > 0 ? clamp01(window.scrollY / max) : 0
      const t = Math.round(performance.now() - startRef.current)
      const previous = lastScrollRef.current
      const velocity = ((scroll - previous) * 1000) / TICK_MS
      const pointer = pointerCountRef.current
      pointerCountRef.current = 0
      lastScrollRef.current = scroll

      const chapter = chapterInView(chapterRefs.current, scroll)
      const sample = makeSample({
        id: `beat-${idRef.current}`,
        t,
        scroll,
        velocity,
        pointer,
        chapter,
      })
      idRef.current += 1
      setBeats((current) => {
        const next = current.length >= MAX_BUFFER ? current.slice(1) : current.slice()
        next.push(sample)
        return next
      })
    }

    const timer = window.setInterval(tick, TICK_MS)
    return () => window.clearInterval(timer)
  }, [running, chapterRefs])

  return beats
}

// Which chapter straddles the vertical center of the viewport right now.
function chapterInView(elements, scroll) {
  if (!elements || elements.length === 0) return chapterForScroll(scroll)
  if (typeof window === "undefined") return chapterForScroll(scroll)
  const center = window.innerHeight / 2
  let best = 0
  let bestDistance = Infinity
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index]
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (rect.top <= center && rect.bottom >= center) return index
    const midpoint = (rect.top + rect.bottom) / 2
    const distance = Math.abs(midpoint - center)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  }
  return best
}

function buildRereadCallout(windowed) {
  for (let index = windowed.length - 1; index >= 0; index -= 1) {
    const beat = windowed[index]
    if (beat.kind === "backward") {
      // Only surface a recent reread (within the freshest tail of the window).
      if (index < windowed.length - 40) return []
      return [
        {
          type: "callout",
          pointId: beat.id,
          label: "↩ you scrolled back",
          radius: 11,
          dx: 40,
          dy: -30,
          color: BEAT_KINDS.backward.fill,
          connector: { end: "arrow" },
        },
      ]
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

function beatPointStyle(beat) {
  const meta = BEAT_KINDS[beat.kind] || BEAT_KINDS.idle
  const radius = beat.kind === "idle" ? 2.6 : 3.2 + Math.min(2.4, beat.pointer * 0.35)
  return {
    fill: meta.fill,
    stroke: meta.stroke,
    strokeWidth: beat.kind === "backward" ? 2 : 1.1,
    opacity: beat.kind === "idle" ? 0.5 : 0.9,
    r: radius,
  }
}

function renderBeatTooltip(hover) {
  const beat = hover?.data || hover
  if (!beat || beat.scroll == null) return null
  const meta = BEAT_KINDS[beat.kind] || BEAT_KINDS.idle
  const chapter = READING_CHAPTERS[beat.chapter] || READING_CHAPTERS[0]
  return (
    <div className="scroll-tell-tooltip" data-semiotic-tooltip-chrome>
      <div>
        <span style={{ background: meta.fill, borderColor: meta.stroke }} />
        {meta.label}
      </div>
      <strong>{beat.scrollPercent}% read</strong>
      <small>
        {chapter.kicker} · {formatClock(beat.t)} · {beat.pointer} pointer beats
      </small>
    </div>
  )
}

function Readout({ label, value }) {
  return (
    <div className="scroll-tell-readout">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function LiveDot({ mode, replayComplete }) {
  const state = mode === "replay" ? (replayComplete ? "done" : "replay") : "live"
  const label = state === "live" ? "Live" : state === "replay" ? "Replay" : "Replay · done"
  return (
    <span className={`scroll-tell-live-dot is-${state}`}>
      <i aria-hidden="true" />
      {label}
    </span>
  )
}

function BeatLegend() {
  return (
    <div className="scroll-tell-beat-legend" aria-label="Beat legend">
      {Object.entries(BEAT_KINDS).map(([kind, meta]) => (
        <span key={kind}>
          <i style={{ background: meta.fill, borderColor: meta.stroke }} />
          {meta.label}
        </span>
      ))}
    </div>
  )
}

function formatTickTime(value) {
  return formatClock(value)
}

function formatVelocity(value) {
  const percentPerSecond = Math.round(value * 100)
  if (percentPerSecond === 0) return "0"
  return `${percentPerSecond > 0 ? "+" : ""}${percentPerSecond}%/s`
}

function clamp01(value) {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}
