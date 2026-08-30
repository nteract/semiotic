import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useReducedMotion } from "semiotic/utils"
import useReadingLineSections from "../../hooks/useReadingLineSections"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  MachineSemiosphereChapterVisual,
  MachineSemiosphereLegend,
  MachineSemiosphereMap,
} from "./machine-semiosphere/MachineSemiosphereCharts"
import { BOARD_SCALE, SOURCE_REGISTRY, TOTAL_ACTIONS } from "./machine-semiosphere/data"
import { NEXT_QUESTIONS, STORY_CHAPTERS, STORY_SECTION_IDS } from "./machine-semiosphere/story"
import "./MachineSemiosphereExamplePage.css"

const INCIDENT_SOURCE_IDS = [
  "openai-road-ahead-2026",
  "metr-incident-investigation-2026",
  "hf-technical-timeline-2026",
]

const CONCEPTUAL_SOURCE_IDS = ["salman-stigmergy-2024", "heylighen-stigmergy", "lotman-semiosphere"]

const SOURCE_BY_ID = new Map(SOURCE_REGISTRY.map((source) => [source.id, source]))

const QUESTION_COPY = Object.freeze({
  "persists-beyond-run": "How long does a trace persist after its originating run ends?",
  "rediscovered-later": "How often does a later run rediscover it?",
  "recognized-without-instruction":
    "Can a later agent recognize it without a developer explicitly pointing to it?",
  "changes-behavior": "Does finding it materially change what the later agent does?",
  "produces-descendant": "Does that changed action produce another trace?",
  "crosses-model-family": "Can the handoff cross a model-family or vendor boundary?",
  "independently-reproduced": "Can the result be reproduced in a controlled, independent test?",
})

function sourceLabel(source) {
  return `${source.organization}, ${source.publicationDate}`
}

function SourceLinks({ ids }) {
  const sources = [...new Set(ids)].map((id) => SOURCE_BY_ID.get(id)).filter(Boolean)
  return sources.map((source, index) => (
    <React.Fragment key={source.id}>
      {index > 0 ? ", " : null}
      {source.url ? (
        <a href={source.url} target="_blank" rel="noreferrer">
          {sourceLabel(source)}
        </a>
      ) : (
        <span>{sourceLabel(source)}</span>
      )}
    </React.Fragment>
  ))
}

function useMeasuredSectionHeights(ids) {
  const elementsRef = useRef(new Map())
  const [heights, setHeights] = useState(null)

  const registerSection = useCallback((id, element) => {
    if (element) elementsRef.current.set(id, element)
    else elementsRef.current.delete(id)
  }, [])

  useEffect(() => {
    const measure = () => {
      const next = ids.map((id) => elementsRef.current.get(id)?.getBoundingClientRect().height ?? 0)
      if (next.some((height) => height <= 0)) return
      setHeights((current) => {
        if (
          current?.length === next.length &&
          current.every((height, index) => Math.abs(height - next[index]) < 0.5)
        ) {
          return current
        }
        return next
      })
    }

    const frame = window.requestAnimationFrame(measure)
    if (typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(measure)
    ids.forEach((id) => {
      const element = elementsRef.current.get(id)
      if (element) observer.observe(element)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [ids])

  return [heights, registerSection]
}

export default function MachineSemiosphereExamplePage() {
  const reducedMotion = useReducedMotion()
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1180, { bucket: 20 })
  const compact = pageWidth < 760
  const chapterHeight = compact ? 720 : 780
  const mapWidth =
    pageWidth < 350
      ? 70
      : pageWidth < 430
        ? 84
        : compact
          ? 112
          : Math.max(320, Math.round(pageWidth * 0.42))
  const fallbackChapterHeights = useMemo(
    () => STORY_CHAPTERS.map(() => chapterHeight),
    [chapterHeight],
  )
  const [measuredChapterHeights, registerMeasuredSection] =
    useMeasuredSectionHeights(STORY_SECTION_IDS)
  const chapterHeights = measuredChapterHeights ?? fallbackChapterHeights
  const mapHeight = Math.round(chapterHeights.reduce((sum, height) => sum + height, 0))
  const { activeIndex, registerSection } = useReadingLineSections({
    ids: STORY_SECTION_IDS,
    enabled: true,
    readingLine: 0.38,
    rootMargin: "-36% 0px -60%",
    threshold: 0,
    reducedMotion,
  })
  const registerStorySection = useCallback(
    (id, element) => {
      registerSection(id, element)
      registerMeasuredSection(id, element)
    },
    [registerMeasuredSection, registerSection],
  )

  return (
    <ExamplePageLayout
      title="The Machine Semiosphere"
      useFullCodeFallback={false}
      showViewToggle={false}
      showContractPanels={false}
      showPageHeader={false}
    >
      <article className="semiosphere" ref={pageRef}>
        <header className="semiosphere-masthead">
          <p className="semiosphere-masthead__kicker">
            The Machine Semiosphere · Visual investigation · July 2026 incident · Updated August 29,
            2026
          </p>
          <h1 className="semiosphere-masthead__title">
            Short-lived AI agents hacked Hugging Face. What they left behind may matter just as
            much.
          </h1>
          <p className="semiosphere-masthead__dek">
            Models running in an OpenAI cybersecurity evaluation got outside their intended
            boundaries and compromised parts of Hugging Face&apos;s systems. Public accounts
            describe something else alongside the intrusion: one run could leave messages, files,
            paths, and conventions that another run found later.
          </p>
          <p className="semiosphere-masthead__follow">
            This is a story about the break-in, but it is also an investigation of what survived
            after individual agent runs ended. Scroll down to follow the evidence from the attack
            record to the traces that carried information forward.
          </p>
          <p className="semiosphere-masthead__source-line">
            Reporting draws on <SourceLinks ids={INCIDENT_SOURCE_IDS} />. Each chart below states
            what the record can—and cannot—support.
          </p>
        </header>

        <section className="semiosphere-fact-strip" aria-label="Incident at a glance">
          <div className="semiosphere-fact-strip__item">
            <strong className="semiosphere-fact-strip__value">
              {TOTAL_ACTIONS.toLocaleString()}
            </strong>
            <span className="semiosphere-fact-strip__label">
              sum of five reconstructed daily buckets
            </span>
          </div>
          <div className="semiosphere-fact-strip__item">
            <strong className="semiosphere-fact-strip__value">
              ≈{BOARD_SCALE.approximateAgents.toLocaleString()}
            </strong>
            <span className="semiosphere-fact-strip__label">
              agents reported on the unauthorized board
            </span>
          </div>
          <div className="semiosphere-fact-strip__item">
            <strong className="semiosphere-fact-strip__value">
              &gt;{BOARD_SCALE.messagesAndFilesMinimum.toLocaleString()}
            </strong>
            <span className="semiosphere-fact-strip__label">messages and files reported</span>
          </div>
        </section>

        <section aria-labelledby="semiosphere-map-title">
          <header className="semiosphere-map-shell__header">
            <div>
              <p className="semiosphere-map-shell__eyebrow">The evidence map</p>
              <h2 className="semiosphere-map-shell__title" id="semiosphere-map-title">
                Follow what happened—and what remained
              </h2>
            </div>
            <p className="semiosphere-map-shell__note">
              The gray route sets the article&apos;s order. The other routes group recurring topics
              across the three public accounts.
            </p>
          </header>
          <MachineSemiosphereLegend />

          <div
            className="semiosphere-story"
            style={{
              "--semiosphere-chapter-height": `${chapterHeight}px`,
              "--semiosphere-map-height": `${mapHeight}px`,
            }}
          >
            <aside className="semiosphere-map-column" aria-label="Article route map">
              <figure className="semiosphere-map-shell">
                <div className="semiosphere-map-shell__canvas">
                  <MachineSemiosphereMap
                    width={mapWidth}
                    height={mapHeight}
                    activeChapterIndex={activeIndex}
                    chapterHeights={chapterHeights}
                    compact={compact}
                  />
                </div>
                <figcaption>
                  Routes show narrative continuity and shared evidence classes, not a complete
                  causal genealogy.
                </figcaption>
              </figure>
            </aside>

            <div className="semiosphere-chapters">
              {STORY_CHAPTERS.map((chapter, index) => {
                const domId = STORY_SECTION_IDS[index]
                const active = index === activeIndex
                return (
                  <section
                    className={`semiosphere-chapter${active ? " is-active" : ""}`}
                    id={domId}
                    key={chapter.id}
                    ref={(node) => registerStorySection(domId, node)}
                    aria-current={active ? "step" : undefined}
                  >
                    <header className="semiosphere-chapter__header">
                      <span className="semiosphere-chapter__number">{chapter.number}</span>
                      <div>
                        <p className="semiosphere-chapter__eyebrow">{chapter.eyebrow}</p>
                        <h2 className="semiosphere-chapter__title">{chapter.title}</h2>
                      </div>
                    </header>
                    <p className="semiosphere-chapter__lead">{chapter.lead}</p>
                    <div className="semiosphere-chapter__body">
                      {chapter.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    <MachineSemiosphereChapterVisual type={chapter.visual} />
                    <p className="semiosphere-chapter__source-note">
                      <span>
                        <strong>Evidence:</strong> {chapter.evidence}.
                      </span>{" "}
                      <span>
                        <strong>Limit:</strong> {chapter.limitation}
                      </span>{" "}
                      <span>
                        <strong>Sources:</strong> <SourceLinks ids={chapter.sourceIds} />.
                      </span>
                    </p>
                  </section>
                )
              })}
            </div>
          </div>
        </section>

        <section className="semiosphere-closing" aria-labelledby="semiosphere-next-title">
          <p>Where the reporting ends</p>
          <h2 id="semiosphere-next-title">The next investigation starts when a run finishes</h2>
          <div className="semiosphere-closing__questions">
            {NEXT_QUESTIONS.map((question, index) => (
              <article key={question.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{QUESTION_COPY[question.id] ?? `${question.label}?`}</h3>
              </article>
            ))}
          </div>
          <p>
            The July incident offers evidence that shared digital environments can carry useful
            information between short-lived runs. Answering how common, durable, and transferable
            that behavior is will require controlled tests and independent reproduction.
          </p>
        </section>

        <footer className="semiosphere-sources" aria-labelledby="semiosphere-sources-title">
          <p>Sources and limits</p>
          <h2 id="semiosphere-sources-title">Three accounts of the incident</h2>
          <div className="semiosphere-sources__list">
            {INCIDENT_SOURCE_IDS.map((id) => {
              const source = SOURCE_BY_ID.get(id)
              return (
                <article className="semiosphere-sources__item" key={id}>
                  <p className="semiosphere-sources__meta">
                    {source.grade} source · {source.organization} · published{" "}
                    {source.publicationDate}
                  </p>
                  <h3>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  </h3>
                  <p className="semiosphere-sources__scope">{source.scope}</p>
                  <p className="semiosphere-sources__limitation">
                    <strong>Limits:</strong> {source.limitations.join(" ")}
                  </p>
                </article>
              )
            })}
          </div>

          <div className="semiosphere-sources__concepts">
            <h3>Terms used in the analysis</h3>
            <p>
              The plain-language definition of stigmergy and the proposed “machine semiosphere”
              frame draw on <SourceLinks ids={CONCEPTUAL_SOURCE_IDS} />. Those sources explain the
              concepts; they do not supply facts about the incident.
            </p>
          </div>
        </footer>
      </article>
    </ExamplePageLayout>
  )
}
