import React, { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { LineChart } from "semiotic/xy"
import useExplainerMotion from "../../hooks/useExplainerMotion"
import useReadingLineSections from "../../hooks/useReadingLineSections"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import JourneyFingerprint from "./how-a-hit-travels/JourneyFingerprint"
import { SimilarityConstellation } from "./how-a-hit-travels/SimilarityConstellation"
import { HIT_TRAVELS_DATA } from "./how-a-hit-travels/hitTravelsData.generated"
import "./how-a-hit-travels/similarityConstellationRecipe"
import "./HowAHitTravelsExamplePage.css"

const HERO_TITLE_ID = "crash-course-romance"
const NARRATIVE_TITLE_IDS = [
  "tinder-swindler",
  HERO_TITLE_ID,
  "cafe-con-aroma",
  "wednesday-season-1",
]

const STORY_SCENES = [
  {
    id: "hat-first-week",
    act: "Act 0 · one title, one week",
    title: "Four national lists, then twenty-five.",
    copy: "Crash Course in Romance first appeared in four published national Top 10 lists in the week ending January 22, 2023. Step forward and the observed footprint changes.",
    stage: "constellation",
    patch: { titleId: HERO_TITLE_ID, layoutMode: "map", weightMode: "distinctive-rank", cursor: 0 },
  },
  {
    id: "hat-next-weeks",
    act: "Act 0 · the observable sequence",
    title: "A ranking footprint accumulates.",
    copy: "By its seventh observed week, the series was present in twenty-five country charts. A lit point records a first Top 10 appearance—not a release, a view, or a handoff from another country.",
    stage: "constellation",
    patch: { titleId: HERO_TITLE_ID, layoutMode: "map", weightMode: "distinctive-rank", cursor: 6 },
  },
  {
    id: "hat-denominator",
    act: "Act 1 · what popular means here",
    title: "Rank is ordinal. Audience size is missing.",
    copy: "Netflix reports global engagement for global leaders. Its country files report rank only. No. 1 in India cannot be compared with No. 1 in Denmark as a count of viewers.",
    stage: "measures",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "map",
      weightMode: "distinctive-rank",
      cursor: 12,
    },
  },
  {
    id: "hat-neighborhoods",
    act: "Act 2 · the map stops being enough",
    title: "Keep the countries. Change the question.",
    copy: "Countries now sit near one another when they repeatedly ranked many of the same titles in the same weeks. Ubiquitous title-weeks count less. The lines describe similarity, never influence.",
    stage: "constellation",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 12,
    },
  },
  {
    id: "hat-fingerprints",
    act: "Act 3 · four observed shapes",
    title: "Hits do not share one itinerary.",
    copy: "The diagnostic strips align five measures: weekly reach, first arrivals, regional reach, local persistence, and separate active runs. Their differences are visible without hovering.",
    stage: "fingerprints",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 12,
    },
  },
  {
    id: "hat-bridge-start",
    act: "Act 4 · a bridge is observed",
    title: "Begin with sequence, not a cause.",
    copy: "At elapsed week one, the four observed country appearances form a small starting footprint. The fixed constellation lets us describe what appeared next without pretending to know what made it happen.",
    stage: "constellation",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 0,
    },
  },
  {
    id: "hat-bridge-end",
    act: "Act 4 · the accumulated footprint",
    title: "Thirty-four countries eventually ranked it.",
    copy: "The later footprint crosses several parts of the similarity field. That is a descriptive sequence. Catalog availability, promotion, language, and distribution are all plausible context and unmeasured here.",
    stage: "constellation",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 12,
    },
  },
  {
    id: "hat-global-boundary",
    act: "Act 5 · one global list",
    title: "Country charts contain stories the global list does not.",
    copy: "The Rookie season one accumulated 303 country-weeks across 80 countries without a matching global Top 10 row in this snapshot. Adjust the threshold: the boundary remains selective.",
    stage: "omissions",
    patch: {
      titleId: "rookie-season-1",
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 52,
    },
  },
  {
    id: "hat-specification",
    act: "Act 6 · are the neighborhoods real?",
    title: "The answer depends on what counts as similar.",
    copy: "Equal presence rewards any shared Top 10 appearance. Distinctive rank weighting rewards stronger ranks and discounts observations found almost everywhere. We publish both fixed specifications.",
    stage: "stability",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "presence",
      cursor: 12,
    },
  },
  {
    id: "hat-release",
    act: "Act 7 · your turn",
    title: "Release the reader into the evidence.",
    copy: "Search for a title. See where it appeared, how quickly it reached those country charts, and which country relationships are strongest under either definition.",
    stage: "release",
    patch: {
      titleId: HERO_TITLE_ID,
      layoutMode: "constellation",
      weightMode: "distinctive-rank",
      cursor: 12,
    },
  },
]

const STORY_IDS = STORY_SCENES.map((scene) => scene.id)
const TOUCH_INTERACTION = Object.freeze({
  tapToSelect: true,
  tapToLockTooltip: true,
  clearSelection: "backgroundTap",
  targetSize: 44,
  snap: "nearestDatum",
})
const TRANSPARENT_FRAME_PROPS = Object.freeze({ background: "transparent" })
const TITLE_BY_ID = new Map(HIT_TRAVELS_DATA.titles.map((title) => [title.id, title]))
const COUNTRY_BY_ID = new Map(HIT_TRAVELS_DATA.countries.map((country) => [country.id, country]))
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

export default function HowAHitTravelsExamplePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasSerializedState = searchParams.has("title")
  const { reducedMotion, systemReducedMotion, toggleReaderReducedMotion } = useExplainerMotion()
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120, { bucket: 20 })
  const [chartWidth, chartRef] = useResponsiveWidth(300, 760, { bucket: 20 })
  const initialTitleId = TITLE_BY_ID.has(searchParams.get("title"))
    ? searchParams.get("title")
    : HERO_TITLE_ID
  const initialTitle = TITLE_BY_ID.get(initialTitleId)
  const initialCursor = Math.max(
    0,
    Math.min(Number(searchParams.get("week")) || 0, initialTitle.spanWeeks - 1),
  )
  const [titleId, setTitleId] = useState(initialTitleId)
  const [layoutMode, setLayoutMode] = useState(
    hasSerializedState
      ? searchParams.get("view") === "map"
        ? "map"
        : "constellation"
      : STORY_SCENES[0].patch.layoutMode,
  )
  const [weightMode, setWeightMode] = useState(
    searchParams.get("weight") === "presence" ? "presence" : "distinctive-rank",
  )
  const [cursor, setCursor] = useState(initialCursor)
  const [selectedCountryId, setSelectedCountryId] = useState(
    COUNTRY_BY_ID.has(searchParams.get("country")) ? searchParams.get("country") : null,
  )
  const [detour, setDetour] = useState(hasSerializedState)
  const [playing, setPlaying] = useState(false)
  const [storyVisible, setStoryVisible] = useState(false)
  const [query, setQuery] = useState("")
  const [familyFilter, setFamilyFilter] = useState("all")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [firstObservedAfter, setFirstObservedAfter] = useState("all")
  const [compareIds, setCompareIds] = useState(() =>
    [...new Set((searchParams.get("compare") ?? "").split(","))]
      .filter((id) => TITLE_BY_ID.has(id))
      .slice(0, 3),
  )
  const [compareMessage, setCompareMessage] = useState("")
  const [omissionThreshold, setOmissionThreshold] = useState(100)
  const [evidenceId, setEvidenceId] = useState(null)
  const [shareMessage, setShareMessage] = useState("")
  const stageRef = useRef(null)
  const closeEvidenceRef = useRef(null)
  const evidenceReturnFocusRef = useRef(null)
  const autoPlayedRef = useRef(false)
  const compactStory = pageWidth < 840 || reducedMotion
  const { activeIndex, navigateTo, registerSection } = useReadingLineSections({
    ids: STORY_IDS,
    enabled: !compactStory,
    readingLine: 0.43,
    rootMargin: "-42% 0px -56%",
    threshold: 0,
    reducedMotion,
    scrollBlock: "center",
  })
  const selectedTitle = TITLE_BY_ID.get(titleId) ?? TITLE_BY_ID.get(HERO_TITLE_ID)
  const activeScene = STORY_SCENES[activeIndex] ?? STORY_SCENES[0]
  const activeLayout = HIT_TRAVELS_DATA.similarityLayouts[weightMode]
  const maxCursor = Math.max(0, selectedTitle.spanWeeks - 1)
  const currentWeek = selectedTitle.weeklyReach[Math.min(cursor, maxCursor)]
  const reachXExtent = useMemo(() => [0, maxCursor], [maxCursor])
  const reachYExtent = useMemo(
    () => [0, Math.max(1, selectedTitle.peakWeeklyReach)],
    [selectedTitle.peakWeeklyReach],
  )

  useEffect(() => {
    if (detour) return
    const patch = activeScene.patch
    const nextTitle = TITLE_BY_ID.get(patch.titleId) ?? selectedTitle
    setTitleId(patch.titleId)
    setLayoutMode(patch.layoutMode)
    setWeightMode(patch.weightMode)
    setCursor(Math.min(patch.cursor, nextTitle.spanWeeks - 1))
    setSelectedCountryId(null)
    setPlaying(false)
  }, [activeScene, detour]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!detour) return
    const next = new URLSearchParams()
    next.set("title", titleId)
    next.set("view", layoutMode)
    next.set("weight", weightMode)
    next.set("week", String(cursor))
    if (selectedCountryId) next.set("country", selectedCountryId)
    if (compareIds.length) next.set("compare", compareIds.join(","))
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [
    compareIds,
    cursor,
    detour,
    layoutMode,
    searchParams,
    selectedCountryId,
    setSearchParams,
    titleId,
    weightMode,
  ])

  useEffect(() => {
    setCursor((current) => Math.min(current, maxCursor))
  }, [maxCursor])

  useEffect(() => {
    if (reducedMotion) setPlaying(false)
  }, [reducedMotion])

  useEffect(() => {
    if (!playing) return undefined
    const timer = window.setInterval(() => {
      if (document.hidden) return
      setCursor((current) => {
        if (current >= maxCursor) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 820)
    return () => window.clearInterval(timer)
  }, [maxCursor, playing])

  useEffect(() => {
    const element = stageRef.current
    if (!element || typeof IntersectionObserver === "undefined") return undefined
    const observer = new IntersectionObserver(([entry]) => setStoryVisible(entry.isIntersecting), {
      threshold: 0.28,
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [compactStory])

  useEffect(() => {
    if (autoPlayedRef.current || !storyVisible || reducedMotion || detour || activeIndex !== 0)
      return
    autoPlayedRef.current = true
    setCursor(0)
    setPlaying(true)
  }, [activeIndex, detour, reducedMotion, storyVisible])

  useEffect(() => {
    if (!evidenceId) return undefined
    evidenceReturnFocusRef.current = document.activeElement
    closeEvidenceRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === "Escape") setEvidenceId(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      evidenceReturnFocusRef.current?.focus?.()
    }
  }, [evidenceId])

  const beginDetour = (patch = {}) => {
    setDetour(true)
    setPlaying(false)
    if (patch.titleId) {
      setTitleId(patch.titleId)
      const nextTitle = TITLE_BY_ID.get(patch.titleId)
      setCursor(Math.min(patch.cursor ?? 0, nextTitle.spanWeeks - 1))
    }
    if (patch.layoutMode) setLayoutMode(patch.layoutMode)
    if (patch.weightMode) setWeightMode(patch.weightMode)
    if ("selectedCountryId" in patch) setSelectedCountryId(patch.selectedCountryId)
    if (Number.isFinite(patch.cursor) && !patch.titleId)
      setCursor(Math.min(patch.cursor, maxCursor))
  }

  const returnToStory = () => {
    setDetour(false)
    setCompareIds([])
    setCompareMessage("")
    setSearchParams({}, { replace: true })
  }

  const filteredTitles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return HIT_TRAVELS_DATA.titles.filter((title) => {
      if (familyFilter !== "all" && title.family !== familyFilter) return false
      if (languageFilter !== "all" && title.languageGroup !== languageFilter) return false
      if (firstObservedAfter !== "all" && title.firstWeek.slice(0, 4) < firstObservedAfter)
        return false
      return !normalizedQuery || title.label.toLocaleLowerCase().includes(normalizedQuery)
    })
  }, [familyFilter, firstObservedAfter, languageFilter, query])

  const compareTitles = compareIds.map((id) => TITLE_BY_ID.get(id)).filter(Boolean)
  const comparedReachExtent = Math.max(1, ...compareTitles.map((title) => title.peakWeeklyReach))
  const comparedSpanExtent = Math.max(1, ...compareTitles.map((title) => title.spanWeeks))
  const selectedRelationships = useMemo(() => {
    if (!selectedCountryId) return []
    return activeLayout.edges
      .filter((edge) => edge.source === selectedCountryId || edge.target === selectedCountryId)
      .sort((left, right) => right.similarity - left.similarity)
  }, [activeLayout, selectedCountryId])
  const selectedCountryHistory = selectedTitle.countryHistory.find(
    (country) => country.countryId === selectedCountryId,
  )
  const visibleOmissions = HIT_TRAVELS_DATA.omittedTitles.filter(
    (title) => title.countryWeeks >= omissionThreshold,
  )
  const evidence = HIT_TRAVELS_DATA.claimEvidence.find((claim) => claim.id === evidenceId)

  const toggleCompare = (nextTitleId) => {
    setDetour(true)
    setCompareMessage("")
    setCompareIds((current) => {
      if (current.includes(nextTitleId)) return current.filter((id) => id !== nextTitleId)
      if (current.length >= 3) {
        setCompareMessage(
          "Comparison is capped at three titles so the aligned strips remain readable.",
        )
        return current
      }
      return [...current, nextTitleId]
    })
  }

  const copyState = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareMessage("Explorer link copied.")
    } catch {
      setShareMessage("Copy was unavailable. The address bar contains the current state.")
    }
  }

  return (
    <ExamplePageLayout title="How a Hit Travels">
      <div ref={pageRef} className={`hit-travels ${reducedMotion ? "is-reduced-motion" : ""}`}>
        <a className="hat-skip-link" href="#hat-explorer">
          Skip to the explorer
        </a>

        <header className="hat-hero">
          <div className="hat-hero__copy">
            <p className="hat-kicker">
              Netflix weekly Top 10 · {HIT_TRAVELS_DATA.manifest.weekCount} weeks
            </p>
            <h2>One global audience—or overlapping ones?</h2>
            <p className="hat-hero__lede">
              LCD Soundsystem put the demand plainly: <cite>“You Wanted a Hit.”</cite> Netflix’s
              weekly lists are full of them. The harder question is what a hit looks like as it
              appears—and reappears—across national rankings.
            </p>
            <p>
              We followed {HIT_TRAVELS_DATA.manifest.titleCount.toLocaleString()} title and season
              identities across {HIT_TRAVELS_DATA.manifest.countryCount} countries and territories,
              from {formatDate(HIT_TRAVELS_DATA.manifest.firstWeek)} through{" "}
              {formatDate(HIT_TRAVELS_DATA.manifest.lastWeek)}. The result is an atlas of published
              rankings, not a census of viewing.
            </p>
            <div className="hat-hero__actions">
              <a href="#hat-story">Follow one title</a>
              <a href="#hat-explorer">Explore the evidence</a>
            </div>
          </div>
          <aside className="hat-hero__folio" aria-label="Dataset snapshot">
            <span>TOP 10 / FIELD NOTES</span>
            <strong>13,319</strong>
            <p>title or season identities observed in the country files</p>
            <dl>
              <div>
                <dt>Places</dt>
                <dd>{HIT_TRAVELS_DATA.manifest.countryCount}</dd>
              </div>
              <div>
                <dt>Weeks</dt>
                <dd>{HIT_TRAVELS_DATA.manifest.weekCount}</dd>
              </div>
              <div>
                <dt>Rows</dt>
                <dd>{compactNumber(HIT_TRAVELS_DATA.manifest.countryRowCount)}</dd>
              </div>
            </dl>
            <small>
              Snapshot {HIT_TRAVELS_DATA.manifest.lastWeek} · retrieved{" "}
              {HIT_TRAVELS_DATA.manifest.retrievedAt}
            </small>
          </aside>
        </header>

        <section className="hat-source-note" aria-label="What this data can show">
          <strong>The reporting unit is an appearance in a published weekly Top 10.</strong>
          <p>
            Rank can show order inside a country list. It cannot reveal country-level audience size,
            catalog availability, exposure in the interface, or why a title succeeded.
          </p>
          <a href="#hat-method">Read the measurement notes</a>
        </section>

        <section
          id="hat-story"
          className={`hat-story ${compactStory ? "is-inline" : "is-sticky"}`}
          aria-label="How one title appears across country charts"
        >
          <nav className="hat-story__rail" aria-label="Story acts">
            {STORY_SCENES.map((scene, index) => (
              <button
                key={scene.id}
                type="button"
                className={activeIndex === index ? "is-active" : ""}
                aria-current={activeIndex === index ? "step" : undefined}
                onClick={() => navigateTo(index, { focus: false })}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <b>{scene.act.split(" · ")[0]}</b>
              </button>
            ))}
          </nav>

          <div className="hat-story__steps">
            {STORY_SCENES.map((scene, index) => (
              <article
                id={scene.id}
                key={scene.id}
                ref={(element) => registerSection(scene.id, element)}
                tabIndex="-1"
                className={`hat-story-step ${activeIndex === index ? "is-active" : ""}`}
              >
                <p>{scene.act}</p>
                <h2>{scene.title}</h2>
                <p>{scene.copy}</p>
                {scene.id === "hat-first-week" ? (
                  <button
                    type="button"
                    className="hat-evidence-link"
                    onClick={(event) => {
                      evidenceReturnFocusRef.current = event.currentTarget
                      setEvidenceId("claim-crash-course-arrival")
                    }}
                  >
                    Inspect the 4 / 93 evidence record
                  </button>
                ) : null}
                {compactStory ? (
                  <MobileStorySnapshot scene={scene} title={TITLE_BY_ID.get(scene.patch.titleId)} />
                ) : null}
              </article>
            ))}
          </div>

          {!compactStory ? (
            <aside ref={stageRef} className="hat-story__stage" aria-label="Active story visual">
              <StoryStage
                scene={activeScene}
                selectedTitle={selectedTitle}
                layout={activeLayout}
                layoutMode={layoutMode}
                cursor={cursor}
                selectedCountryId={selectedCountryId}
                onCountrySelect={(countryId) => beginDetour({ selectedCountryId: countryId })}
                reducedMotion={reducedMotion}
                width={Math.min(700, Math.max(360, pageWidth - 430))}
                omissionThreshold={omissionThreshold}
                onOmissionThresholdChange={setOmissionThreshold}
                onWeightModeChange={(mode) => beginDetour({ weightMode: mode })}
              />
              <PlaybackControls
                cursor={cursor}
                maxCursor={maxCursor}
                playing={playing}
                reducedMotion={reducedMotion}
                onCursorChange={(nextCursor) => beginDetour({ cursor: nextCursor })}
                onPlayingChange={(nextPlaying) => {
                  setDetour(true)
                  setPlaying(nextPlaying)
                }}
              />
              <button
                type="button"
                className="hat-motion-toggle"
                onClick={toggleReaderReducedMotion}
                aria-pressed={reducedMotion}
              >
                {reducedMotion ? "Motion stopped" : "Stop motion"}
                {systemReducedMotion ? " · system preference" : ""}
              </button>
              {detour ? (
                <div className="hat-detour" role="status">
                  <span>Exploring: {selectedTitle.label}</span>
                  <button type="button" onClick={returnToStory}>
                    Return to story
                  </button>
                </div>
              ) : null}
            </aside>
          ) : null}
        </section>

        <section className="hat-fingerprint-section" aria-labelledby="hat-fingerprint-title">
          <div className="hat-section-heading">
            <p className="hat-kicker">Four evidence-selected contrasts</p>
            <h2 id="hat-fingerprint-title">A hit leaves more than one kind of trace</h2>
            <p>
              These labels summarize measured shapes. They are not genres, predictions, or claims
              about the mechanism behind a title’s success.
            </p>
          </div>
          <div className="hat-fingerprint-grid">
            {NARRATIVE_TITLE_IDS.map((id) => (
              <JourneyFingerprint
                key={id}
                title={TITLE_BY_ID.get(id)}
                selected={titleId === id}
                onSelect={(nextId) => beginDetour({ titleId: nextId, cursor: 0 })}
              />
            ))}
          </div>
        </section>

        <section id="hat-explorer" className="hat-explorer" aria-labelledby="hat-explorer-title">
          <header className="hat-explorer__header">
            <div>
              <p className="hat-kicker">Open-ended explorer · ten illustrative profiles</p>
              <h2 id="hat-explorer-title">Find a title. Test the shape.</h2>
              <p>
                The published article ships ten complete journeys selected after profiling the full
                snapshot. Every control below updates the same title, country, and week identities.
              </p>
            </div>
            <div className="hat-explorer__utility">
              <button type="button" onClick={returnToStory}>
                Reset to article
              </button>
              <button type="button" onClick={copyState}>
                Copy shareable state
              </button>
              <button
                type="button"
                onClick={() => downloadTitleData(selectedTitle, activeLayout, weightMode)}
              >
                Download selected data
              </button>
              <a href="#hat-method">Methodology</a>
              <span role="status" aria-live="polite">
                {shareMessage}
              </span>
            </div>
          </header>

          <div className="hat-explorer__controls" aria-label="Explorer controls">
            <label className="hat-search">
              <span>Title search</span>
              <input
                type="search"
                value={query}
                placeholder="Try Wednesday or Oppenheimer"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span>Format</span>
              <select
                value={familyFilter}
                onChange={(event) => setFamilyFilter(event.target.value)}
              >
                <option value="all">Film + television</option>
                <option value="film">Film</option>
                <option value="tv">Television</option>
              </select>
            </label>
            <label>
              <span>Primary language</span>
              <select
                value={languageFilter}
                onChange={(event) => setLanguageFilter(event.target.value)}
              >
                <option value="all">English + non-English</option>
                <option value="english">English</option>
                <option value="non-english">Non-English</option>
              </select>
            </label>
            <label>
              <span>First observed</span>
              <select
                value={firstObservedAfter}
                onChange={(event) => setFirstObservedAfter(event.target.value)}
              >
                <option value="all">Any date in snapshot</option>
                <option value="2022">2022 or later</option>
                <option value="2023">2023 or later</option>
                <option value="2024">2024 or later</option>
              </select>
            </label>
          </div>

          <div
            className="hat-title-results"
            aria-label={`${filteredTitles.length} matching titles`}
          >
            {filteredTitles.map((title) => (
              <button
                key={title.id}
                type="button"
                className={title.id === titleId ? "is-selected" : ""}
                aria-pressed={title.id === titleId}
                onClick={() =>
                  beginDetour({ titleId: title.id, cursor: 0, selectedCountryId: null })
                }
              >
                <strong>{title.label}</strong>
                <span>
                  {title.family === "film" ? "Film" : "TV"} · {title.primaryLanguage} · first
                  observed {formatDate(title.firstWeek)}
                </span>
              </button>
            ))}
            {!filteredTitles.length ? <p>No bundled profiles match those filters.</p> : null}
          </div>

          <div className="hat-explorer__modebar">
            <SegmentedControl
              label="Position mode"
              options={[
                ["map", "Map"],
                ["constellation", "Viewing neighborhoods"],
              ]}
              value={layoutMode}
              onChange={(value) => beginDetour({ layoutMode: value })}
            />
            <SegmentedControl
              label="Similarity weighting"
              options={[
                ["presence", "Equal presence"],
                ["distinctive-rank", "Distinctive rank"],
              ]}
              value={weightMode}
              onChange={(value) => beginDetour({ weightMode: value })}
            />
          </div>

          <div className="hat-explorer__workspace">
            <div className="hat-explorer__chart" ref={chartRef}>
              <header>
                <div>
                  <span>{selectedTitle.archetype}</span>
                  <h3>{selectedTitle.label}</h3>
                </div>
                <strong>
                  Week {cursor + 1} / {selectedTitle.spanWeeks}
                </strong>
              </header>
              <SimilarityConstellation
                chartId="how-a-hit-travels-explorer"
                countries={HIT_TRAVELS_DATA.countries}
                layout={activeLayout}
                layoutMode={layoutMode}
                selectedTitle={selectedTitle}
                cursor={cursor}
                selectedCountryId={selectedCountryId}
                onCountrySelect={(countryId) => beginDetour({ selectedCountryId: countryId })}
                reducedMotion={reducedMotion}
                width={chartWidth}
              />
              <PlaybackControls
                cursor={cursor}
                maxCursor={maxCursor}
                playing={playing}
                reducedMotion={reducedMotion}
                onCursorChange={(nextCursor) => beginDetour({ cursor: nextCursor })}
                onPlayingChange={(nextPlaying) => {
                  setDetour(true)
                  setPlaying(nextPlaying)
                }}
              />
            </div>

            <aside className="hat-inspector" aria-label="Selected title and country details">
              <TitleFacts title={selectedTitle} currentWeek={currentWeek} />
              <CountryInspector
                countryId={selectedCountryId}
                history={selectedCountryHistory}
                relationships={selectedRelationships}
                onClear={() => beginDetour({ selectedCountryId: null })}
              />
            </aside>
          </div>

          <div className="hat-reach-panel">
            <div>
              <p className="hat-kicker">Ordinary encoding · exact complement</p>
              <h3>Weekly observed country reach</h3>
              <p>
                Numerator: country charts containing the title. Denominator: country charts
                published for the category in that week. Rank is never converted to viewers.
              </p>
            </div>
            <LineChart
              chartId="how-a-hit-travels-weekly-reach"
              data={selectedTitle.weeklyReach}
              xAccessor="elapsedWeek"
              yAccessor="countryCount"
              width={Math.max(300, Math.min(780, pageWidth - 60))}
              height={280}
              xExtent={reachXExtent}
              yExtent={reachYExtent}
              xLabel="Elapsed week"
              yLabel="Country Top 10s"
              xFormat={formatElapsedWeek}
              yFormat={formatWholeNumber}
              curve="monotoneX"
              color="#ee9b68"
              lineWidth={3}
              showPoints={selectedTitle.activeWeeks < 26}
              pointRadius={4}
              showGrid
              enableHover
              mode={pageWidth < 560 ? "mobile" : "primary"}
              mobileInteraction={TOUCH_INTERACTION}
              accessibleTable
              description={`Weekly number of published country Top 10 lists containing ${selectedTitle.label}.`}
              summary={`${selectedTitle.label} peaked at ${selectedTitle.peakWeeklyReach} country charts in one week and appeared in ${selectedTitle.observedCountryCount} countries across the snapshot.`}
              frameProps={TRANSPARENT_FRAME_PROPS}
            />
          </div>

          <section className="hat-compare" aria-labelledby="hat-compare-title">
            <header>
              <div>
                <p className="hat-kicker">Aligned comparison · maximum three</p>
                <h3 id="hat-compare-title">Compare journey fingerprints</h3>
              </div>
              <button type="button" onClick={() => toggleCompare(titleId)}>
                {compareIds.includes(titleId) ? "Remove current title" : "Add current title"}
              </button>
            </header>
            <div className="hat-compare__chips" aria-label="Comparison titles">
              {HIT_TRAVELS_DATA.titles.map((title) => (
                <button
                  key={title.id}
                  type="button"
                  className={compareIds.includes(title.id) ? "is-selected" : ""}
                  aria-pressed={compareIds.includes(title.id)}
                  onClick={() => toggleCompare(title.id)}
                >
                  {title.label}
                </button>
              ))}
            </div>
            <p className="hat-compare__message" role="status">
              {compareMessage}
            </p>
            <div className="hat-compare__grid">
              {compareTitles.map((title) => (
                <JourneyFingerprint
                  key={title.id}
                  title={title}
                  reachExtent={comparedReachExtent}
                  spanExtent={comparedSpanExtent}
                />
              ))}
              {!compareTitles.length ? <p>Add up to three titles to align their scales.</p> : null}
            </div>
          </section>
        </section>

        <GlobalBoundary
          threshold={omissionThreshold}
          titles={visibleOmissions}
          onThresholdChange={setOmissionThreshold}
          onEvidenceOpen={(event) => {
            evidenceReturnFocusRef.current = event.currentTarget
            setEvidenceId("claim-global-list-selection")
          }}
        />

        <section className="hat-sensitivity" aria-labelledby="hat-sensitivity-title">
          <div className="hat-section-heading">
            <p className="hat-kicker">Specification check</p>
            <h2 id="hat-sensitivity-title">The constellation is an argument with settings</h2>
            <p>
              {layoutOverlapSummary(HIT_TRAVELS_DATA.similarityLayouts)} The full set of coordinates
              is frozen in the snapshot so toggling the definition produces a reproducible
              comparison.
            </p>
          </div>
          <div className="hat-sensitivity__grid">
            {Object.entries(HIT_TRAVELS_DATA.similarityLayouts).map(([mode, layout]) => (
              <article key={mode}>
                <span>{mode === "presence" ? "SPEC A" : "SPEC B"}</span>
                <h3>{mode === "presence" ? "Equal presence" : "Distinctive rank"}</h3>
                <p>{layout.note}</p>
                <strong>{layout.edges.length} mutual-neighbor relationships</strong>
                <button
                  type="button"
                  onClick={() => beginDetour({ layoutMode: "constellation", weightMode: mode })}
                >
                  Open this specification
                </button>
              </article>
            ))}
          </div>
        </section>

        <section id="hat-method" className="hat-method" aria-labelledby="hat-method-title">
          <div className="hat-section-heading">
            <p className="hat-kicker">Method · evidence · limits</p>
            <h2 id="hat-method-title">How the atlas was built</h2>
            <p>
              Static derived data makes every narrative claim inspectable and every chart
              replayable. The builder is included with the example; the source downloads are
              identified by hash.
            </p>
          </div>
          <div className="hat-method__grid">
            <details open>
              <summary>Observed reach and persistence</summary>
              <p>
                Weekly reach is the number of countries ranking a title divided by the number of
                countries publishing that category’s list that week. Persistence is ranked weeks per
                reached country. Simultaneity is eventual country reach first observed in weeks one
                or two.
              </p>
            </details>
            <details>
              <summary>Country similarity</summary>
              <p>
                Each country is a vector of title-week observations. Equal presence assigns one to
                every appearance. Distinctive rank assigns (11 − rank) × log((available countries +
                1) / (countries ranking the title + 1)). Pair scores are cosine similarity. Only
                mutual four-nearest relationships scoring at least 0.10 are drawn.
              </p>
            </details>
            <details>
              <summary>Identity and missingness</summary>
              <p>
                Television is kept at season or limited-series level; films remain individual
                titles. Missing rank is censored: a title may have been unavailable, promoted
                differently, watched below the cutoff, or absent for another unmeasured reason.
              </p>
            </details>
            <details>
              <summary>What this cannot establish</summary>
              <p>
                The rankings do not establish country audience size, exposure, subscriber share,
                sentiment, language availability, or causal transmission. The 24-country visual
                reference set is a legible projection of metrics computed from the full public file.
              </p>
            </details>
          </div>

          <div className="hat-source-ledger">
            {HIT_TRAVELS_DATA.manifest.sourceFiles.map((source) => (
              <article key={source.file}>
                <div>
                  <span>Official Netflix download</span>
                  <h3>{source.file}</h3>
                </div>
                <a href={source.url}>Download source ↗</a>
                <dl>
                  <div>
                    <dt>Retrieved</dt>
                    <dd>{HIT_TRAVELS_DATA.manifest.retrievedAt}</dd>
                  </div>
                  <div>
                    <dt>Bytes</dt>
                    <dd>{source.bytes.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt>SHA-256</dt>
                    <dd>
                      <code>{source.sha256}</code>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>

          <div className="hat-claim-ledger">
            <h3>Published claim ledger</h3>
            {HIT_TRAVELS_DATA.claimEvidence.map((claim) => (
              <button
                key={claim.id}
                type="button"
                onClick={(event) => {
                  evidenceReturnFocusRef.current = event.currentTarget
                  setEvidenceId(claim.id)
                }}
              >
                <span>{claim.status}</span>
                <strong>{claim.statement}</strong>
                <small>Inspect numerator, denominator, derivation, and caveat</small>
              </button>
            ))}
          </div>
        </section>

        <footer className="hat-footer">
          <strong>Search a title. Check the denominator. Keep the caveat attached.</strong>
          <a href="#hat-explorer">Return to the explorer</a>
        </footer>

        {evidence ? (
          <EvidenceDrawer
            evidence={evidence}
            closeRef={closeEvidenceRef}
            onClose={() => setEvidenceId(null)}
          />
        ) : null}
      </div>
    </ExamplePageLayout>
  )
}

function StoryStage({
  scene,
  selectedTitle,
  layout,
  layoutMode,
  cursor,
  selectedCountryId,
  onCountrySelect,
  reducedMotion,
  width,
  omissionThreshold,
  onOmissionThresholdChange,
  onWeightModeChange,
}) {
  if (scene.stage === "fingerprints") {
    return (
      <div className="hat-stage-panel hat-stage-panel--fingerprints">
        {NARRATIVE_TITLE_IDS.map((id) => (
          <JourneyFingerprint key={id} title={TITLE_BY_ID.get(id)} />
        ))}
      </div>
    )
  }
  if (scene.stage === "measures") return <MeasuresStage title={selectedTitle} />
  if (scene.stage === "omissions") {
    return (
      <OmissionShelf
        compact
        threshold={omissionThreshold}
        titles={HIT_TRAVELS_DATA.omittedTitles.filter(
          (title) => title.countryWeeks >= omissionThreshold,
        )}
        onThresholdChange={onOmissionThresholdChange}
      />
    )
  }
  if (scene.stage === "stability") {
    return (
      <div className="hat-stage-panel hat-stage-panel--stability">
        <h3>Two definitions, two fixed fields</h3>
        <p>{layoutOverlapSummary(HIT_TRAVELS_DATA.similarityLayouts)}</p>
        {Object.entries(HIT_TRAVELS_DATA.similarityLayouts).map(([mode, candidate]) => (
          <button key={mode} type="button" onClick={() => onWeightModeChange(mode)}>
            <span>{mode === "presence" ? "Equal presence" : "Distinctive rank"}</span>
            <strong>{candidate.edges.length} relationships</strong>
            <small>{candidate.note}</small>
          </button>
        ))}
      </div>
    )
  }
  if (scene.stage === "release") {
    return (
      <div className="hat-stage-panel hat-stage-panel--release">
        <span>THE FIELD IS OPEN</span>
        <strong>{HIT_TRAVELS_DATA.titles.length}</strong>
        <p>complete title journeys bundled for direct comparison</p>
        <a href="#hat-explorer">Open the explorer ↓</a>
      </div>
    )
  }
  return (
    <SimilarityConstellation
      chartId="how-a-hit-travels-story"
      countries={HIT_TRAVELS_DATA.countries}
      layout={layout}
      layoutMode={layoutMode}
      selectedTitle={selectedTitle}
      cursor={cursor}
      selectedCountryId={selectedCountryId}
      onCountrySelect={onCountrySelect}
      reducedMotion={reducedMotion}
      width={width}
    />
  )
}

function MeasuresStage({ title }) {
  const bestGlobalRank = title.globalHistory.length
    ? Math.min(...title.globalHistory.map((week) => week.rank))
    : null
  const reportedGlobalViews = title.globalHistory.map((week) => week.views).filter(Number.isFinite)
  const peakGlobalViews = reportedGlobalViews.length ? Math.max(...reportedGlobalViews) : null
  return (
    <div className="hat-stage-panel hat-stage-panel--measures">
      <h3>{title.label}</h3>
      <div>
        <article>
          <span>COUNTRY RANK</span>
          <strong>1–10</strong>
          <p>Ordinal position; no audience total</p>
        </article>
        <article>
          <span>COUNTRIES OBSERVED</span>
          <strong>{title.observedCountryCount}</strong>
          <p>of {HIT_TRAVELS_DATA.manifest.countryCount} in the full file</p>
        </article>
        <article>
          <span>ACTIVE WEEKS</span>
          <strong>{title.activeWeeks}</strong>
          <p>weeks with at least one country appearance</p>
        </article>
        <article>
          <span>GLOBAL LIST</span>
          <strong>{bestGlobalRank ? `No. ${bestGlobalRank}` : "Absent"}</strong>
          <p>
            {peakGlobalViews != null
              ? `${compactNumber(peakGlobalViews)} peak weekly views`
              : "views not reported for these weeks"}
          </p>
        </article>
      </div>
      <p className="hat-stage-warning">
        Missing country audience size is a property of the source, not zero.
      </p>
    </div>
  )
}

function MobileStorySnapshot({ scene, title }) {
  if (scene.stage === "fingerprints")
    return <JourneyFingerprint title={TITLE_BY_ID.get(HERO_TITLE_ID)} />
  if (scene.stage === "omissions") {
    return (
      <p className="hat-mobile-snapshot">
        <strong>303 country-weeks</strong>
        <span>The Rookie — Season 1; no matching global-list row</span>
      </p>
    )
  }
  if (scene.stage === "stability") {
    return (
      <p className="hat-mobile-snapshot">
        <strong>
          {HIT_TRAVELS_DATA.similarityLayouts.presence.edges.length} /{" "}
          {HIT_TRAVELS_DATA.similarityLayouts["distinctive-rank"].edges.length} edges
        </strong>
        <span>equal-presence / distinctive-rank specifications</span>
      </p>
    )
  }
  if (scene.stage === "release")
    return (
      <a className="hat-mobile-explorer-link" href="#hat-explorer">
        Open the title explorer
      </a>
    )
  const week = title.weeklyReach[Math.min(scene.patch.cursor, title.spanWeeks - 1)]
  return (
    <div className="hat-mobile-snapshot">
      <strong>
        {week.countryCount} country chart{week.countryCount === 1 ? "" : "s"}
      </strong>
      <span>
        {title.label} · elapsed week {week.elapsedWeek + 1} · {formatDate(week.week)}
      </span>
      <small>
        {scene.patch.layoutMode === "map" ? "Geographic view" : "Similarity view"}; full interactive
        view follows below.
      </small>
    </div>
  )
}

function PlaybackControls({
  cursor,
  maxCursor,
  playing,
  reducedMotion,
  onCursorChange,
  onPlayingChange,
}) {
  return (
    <div className="hat-playback" aria-label="Title timeline controls">
      <button
        type="button"
        onClick={() => onCursorChange(Math.max(0, cursor - 1))}
        disabled={cursor <= 0}
        aria-label="Previous week"
      >
        ←
      </button>
      <button
        type="button"
        onClick={() => onPlayingChange(!playing)}
        disabled={reducedMotion || cursor >= maxCursor}
      >
        {playing ? "Pause" : reducedMotion ? "Step mode" : "Play"}
      </button>
      <button
        type="button"
        onClick={() => onCursorChange(Math.min(maxCursor, cursor + 1))}
        disabled={cursor >= maxCursor}
        aria-label="Next week"
      >
        →
      </button>
      <label>
        <span className="sr-only">Elapsed week</span>
        <input
          type="range"
          min="0"
          max={maxCursor}
          value={cursor}
          onChange={(event) => onCursorChange(Number(event.target.value))}
        />
      </label>
      <output>
        week {cursor + 1} / {maxCursor + 1}
      </output>
    </div>
  )
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <fieldset className="hat-segmented">
      <legend>{label}</legend>
      <div>
        {options.map(([id, optionLabel]) => (
          <button
            key={id}
            type="button"
            className={value === id ? "is-selected" : ""}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function TitleFacts({ title, currentWeek }) {
  return (
    <section className="hat-title-facts" aria-labelledby="hat-title-facts-heading">
      <header>
        <span>Selected journey</span>
        <h3 id="hat-title-facts-heading">What the source says</h3>
      </header>
      <dl>
        <div>
          <dt>First observed</dt>
          <dd>{formatDate(title.firstWeek)}</dd>
        </div>
        <div>
          <dt>Last observed</dt>
          <dd>{formatDate(title.lastWeek)}</dd>
        </div>
        <div>
          <dt>Countries</dt>
          <dd>
            {title.observedCountryCount} / {HIT_TRAVELS_DATA.manifest.countryCount}
          </dd>
        </div>
        <div>
          <dt>Week {currentWeek.elapsedWeek + 1} reach</dt>
          <dd>
            {currentWeek.countryCount} / {currentWeek.coverage}
          </dd>
        </div>
        <div>
          <dt>Two-week simultaneity</dt>
          <dd>{Math.round(title.simultaneity * 100)}%</dd>
        </div>
        <div>
          <dt>Median persistence</dt>
          <dd>{title.medianPersistence} weeks</dd>
        </div>
        <div>
          <dt>Active runs</dt>
          <dd>{title.activeRuns.length}</dd>
        </div>
        <div>
          <dt>Global Top 10 row</dt>
          <dd>{title.globalListAppeared ? "Observed" : "No match"}</dd>
        </div>
      </dl>
      <p>{title.note}</p>
    </section>
  )
}

function CountryInspector({ countryId, history, relationships, onClear }) {
  if (!countryId) {
    return (
      <section className="hat-country-inspector">
        <header>
          <span>Country evidence</span>
          <h3>Select a country</h3>
        </header>
        <p>
          Click, tap, or keyboard-navigate to a country to inspect exact rank history and its
          strongest mutual-neighbor relationships.
        </p>
      </section>
    )
  }
  const country = COUNTRY_BY_ID.get(countryId)
  return (
    <section className="hat-country-inspector" aria-labelledby="hat-country-heading">
      <header>
        <div>
          <span>{country?.region}</span>
          <h3 id="hat-country-heading">{country?.name ?? countryId}</h3>
        </div>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </header>
      {history ? (
        <>
          <p>
            First observed {formatDate(history.firstWeek)} · best rank {history.bestRank} ·{" "}
            {history.activeWeeks} ranked weeks.
          </p>
          <RankTrail history={history} />
        </>
      ) : (
        <p>The selected title did not appear in this country’s published Top 10 in the snapshot.</p>
      )}
      <details open>
        <summary>Why are these connected?</summary>
        <p>Scores are relative to the selected full-history corpus and weighting definition.</p>
        <ol>
          {relationships.map((edge) => {
            const neighborId = edge.source === countryId ? edge.target : edge.source
            return (
              <li key={edge.id}>
                <strong>
                  {COUNTRY_BY_ID.get(neighborId)?.name ?? neighborId} · {edge.similarity.toFixed(3)}
                </strong>
                <span>
                  {edge.sharedObservations.toLocaleString()} shared title-week observations
                </span>
                <small>{edge.contributors.map((item) => item.title).join(" · ")}</small>
              </li>
            )
          })}
          {!relationships.length ? <li>No mutual-nearest edge under this specification.</li> : null}
        </ol>
      </details>
    </section>
  )
}

function RankTrail({ history }) {
  if (!history.ranks.length) return null
  const maxWeek = Math.max(1, ...history.ranks.map(([week]) => week))
  const path = history.ranks
    .map(
      ([week, rank], index) =>
        `${index ? "L" : "M"}${12 + (week / maxWeek) * 236},${8 + ((rank - 1) / 9) * 64}`,
    )
    .join(" ")
  return (
    <figure className="hat-rank-trail">
      <figcaption>Local rank trail · No. 1 at top</figcaption>
      <svg
        viewBox="0 0 260 84"
        role="img"
        aria-label={`${history.country} rank trail with ${history.ranks.length} observations`}
      >
        <line x1="12" x2="248" y1="8" y2="8" />
        <line x1="12" x2="248" y1="72" y2="72" />
        <path d={path} />
        {history.ranks.map(([week, rank]) => (
          <circle
            key={`${week}-${rank}`}
            cx={12 + (week / maxWeek) * 236}
            cy={8 + ((rank - 1) / 9) * 64}
            r="3"
          />
        ))}
      </svg>
    </figure>
  )
}

function GlobalBoundary({ threshold, titles, onThresholdChange, onEvidenceOpen }) {
  return (
    <section className="hat-global-boundary" aria-labelledby="hat-global-title">
      <div className="hat-section-heading">
        <p className="hat-kicker">The titles the global list leaves out</p>
        <h2 id="hat-global-title">Substantial locally does not guarantee visible globally</h2>
        <p>
          These title identities have no matching global Top 10 row in the snapshot. Change the
          country-week floor to test whether the pattern survives.
        </p>
      </div>
      <OmissionShelf threshold={threshold} titles={titles} onThresholdChange={onThresholdChange} />
      <button type="button" className="hat-evidence-link" onClick={onEvidenceOpen}>
        Inspect the leading claim’s evidence
      </button>
    </section>
  )
}

function OmissionShelf({ threshold, titles, onThresholdChange, compact = false }) {
  const shownTitles = compact ? titles.slice(0, 6) : titles
  return (
    <div className={`hat-omission-shelf ${compact ? "is-compact" : ""}`}>
      <label>
        <span>
          Minimum country-weeks: <strong>{threshold}</strong>
        </span>
        <input
          type="range"
          min="40"
          max="300"
          step="10"
          value={threshold}
          onChange={(event) => onThresholdChange(Number(event.target.value))}
        />
      </label>
      <p role="status">
        {titles.length} title identities meet this floor and lack a matching global row.
      </p>
      <div>
        {shownTitles.map((title) => (
          <article key={title.titleKey}>
            <span>{title.family === "film" ? "FILM" : "TV"}</span>
            <h3>{title.label}</h3>
            <dl>
              <div>
                <dt>Countries</dt>
                <dd>{title.observedCountryCount}</dd>
              </div>
              <div>
                <dt>Country-weeks</dt>
                <dd>{title.countryWeeks}</dd>
              </div>
              <div>
                <dt>Active weeks</dt>
                <dd>{title.activeWeeks}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  )
}

function EvidenceDrawer({ evidence, closeRef, onClose }) {
  return (
    <div
      className="hat-evidence-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        className="hat-evidence-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hat-evidence-title"
      >
        <header>
          <div>
            <span>
              {evidence.status} · {evidence.snapshotId}
            </span>
            <h2 id="hat-evidence-title">Evidence record</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close evidence record">
            ×
          </button>
        </header>
        <blockquote>{evidence.statement}</blockquote>
        <dl>
          <div>
            <dt>Numerator</dt>
            <dd>{evidence.numerator.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Denominator</dt>
            <dd>{evidence.denominator.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Metric</dt>
            <dd>{evidence.metric}</dd>
          </div>
          <div>
            <dt>Method</dt>
            <dd>{evidence.methodVersion}</dd>
          </div>
          <div>
            <dt>Caveat</dt>
            <dd>{evidence.caveat}</dd>
          </div>
        </dl>
        <a href="#hat-method" onClick={onClose}>
          Read the full methodology
        </a>
      </aside>
    </div>
  )
}

function layoutOverlapSummary(layouts) {
  const presenceIds = new Set(layouts.presence.edges.map((edge) => edge.id))
  const overlap = layouts["distinctive-rank"].edges.filter((edge) =>
    presenceIds.has(edge.id),
  ).length
  return `${overlap} relationships remain in both the equal-presence and distinctive-rank four-nearest graphs.`
}

function formatDate(value) {
  return DATE_FORMAT.format(new Date(`${value}T00:00:00Z`))
}

function compactNumber(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  )
}

function formatElapsedWeek(value) {
  return `Week ${Math.round(value) + 1}`
}

function formatWholeNumber(value) {
  return `${Math.round(value)}`
}

function downloadTitleData(title, layout, weightMode) {
  const payload = {
    snapshot: HIT_TRAVELS_DATA.manifest,
    title,
    similarityDefinition: weightMode,
    selectedLayout: layout,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${title.id}-${HIT_TRAVELS_DATA.manifest.snapshotId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
