import React, { useCallback, useEffect, useState } from "react"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import useReadingLineSections from "../../hooks/useReadingLineSections"
import useExplainerMotion from "../../hooks/useExplainerMotion"
import ExamplePageLayout from "./ExamplePageLayout"
import AbundanceConstitution from "./last-scarcity/AbundanceConstitution"
import CapabilityFlood from "./last-scarcity/CapabilityFlood"
import {
  ClaimNote,
  EvidenceBadge,
  EvidenceDrawer,
  RecipeInspector,
} from "./last-scarcity/EvidenceLayer"
import FreedTimeWheel, { allocationFromShares } from "./last-scarcity/FreedTimeWheel"
import MimeticCourt from "./last-scarcity/MimeticCourt"
import {
  AgonInstrument,
  GoodFutureInstrument,
  ReaderAttentionMirror,
} from "./last-scarcity/NarrativeInstruments"
import PalaceMap from "./last-scarcity/PalaceMap"
import ReciprocityPath from "./last-scarcity/ReciprocityPath"
import ScarcityMigration from "./last-scarcity/ScarcityMigration"
import {
  CHAPTERS,
  DEFAULT_CONSTITUTION,
  DEFAULT_SCARCITY_PARAMETERS,
  INITIAL_FREED_HOURS,
} from "./last-scarcity/lastScarcityData"
import { useLocalReadingTelemetry } from "./last-scarcity/useLocalReadingTelemetry"
import "./TheLastScarcityExamplePage.css"

const CHAPTER_IDS = CHAPTERS.map((chapter) => chapter.id)
const CHAPTER_OBSERVER_THRESHOLDS = [0, 0.15, 0.4]

export default function TheLastScarcityExamplePage() {
  const { reducedMotion, systemReducedMotion, toggleReaderReducedMotion } = useExplainerMotion()
  const [telemetryEnabled, setTelemetryEnabled] = useState(false)
  const [allocation, setAllocation] = useState(INITIAL_FREED_HOURS)
  const [freedHours, setFreedHours] = useState(4)
  const [dayAllocation, setDayAllocation] = useState(() =>
    allocationFromShares(INITIAL_FREED_HOURS, 4),
  )
  const [scarcityParameters, setScarcityParameters] = useState(DEFAULT_SCARCITY_PARAMETERS)
  const [constitutionValues, setConstitutionValues] = useState(DEFAULT_CONSTITUTION)
  const [choices, setChoices] = useState({})
  const [evidence, setEvidence] = useState({ open: false, selection: null })
  const [palaceWidth, palaceHostRef] = useResponsiveWidth(300, 470, { bucket: 20 })
  const { activeIndex, navigateTo, registerSection } = useReadingLineSections({
    ids: CHAPTER_IDS,
    readingLine: 0.38,
    rootMargin: "-36% 0px -55% 0px",
    threshold: CHAPTER_OBSERVER_THRESHOLDS,
    reducedMotion,
    scrollBlock: "start",
    syncHash: true,
  })
  const activeChapter = CHAPTERS[activeIndex]
  const { trace, reset: resetTrace } = useLocalReadingTelemetry({
    enabled: telemetryEnabled,
    activeChapter: activeChapter.id,
  })

  const recordChoice = useCallback((key, value) => {
    setChoices((current) => ({ ...current, [key]: value }))
  }, [])

  const openEvidence = useCallback((selection = null) => {
    setEvidence({ open: true, selection })
  }, [])

  useEffect(() => {
    setDayAllocation(allocationFromShares(allocation, freedHours))
  }, [allocation, freedHours])

  const setReleasedHours = (hours) => {
    setFreedHours(hours)
    setDayAllocation(allocationFromShares(allocation, hours))
    recordChoice("released-hours", hours)
  }

  return (
    <ExamplePageLayout title="The Last Scarcity">
      <div className={`last-scarcity ${reducedMotion ? "is-reduced-motion" : ""}`}>
          <a className="ls-skip-link" href="#last-scarcity-narrative">
            Skip to the argument
          </a>

          <header className="ls-hero">
            <ArtNouveauCrown />
            <div className="ls-hero__kicker">AN INTERACTIVE ESSAY</div>
            <h2>
              What still runs out
              <br />
              when intelligence is cheap
            </h2>
            <p className="ls-hero__lede">
              When answers, images, plans, and simulations get cheap, scarcity does not disappear.
              It moves into what you cannot copy: time, attention, status, consent, loyalty,
              legitimacy, showing up in person, and another person’s freedom.
            </p>
            <div className="ls-hero__thesis">
              <span>AI multiplies means.</span>
              <strong>It does not choose the ends.</strong>
            </div>

            <p className="ls-hero__how-to-read">
              This page mixes a few public numbers, some charts you can push around, and an argument
              about what abundance does not settle. Small colored marks open sources if you want
              them.
            </p>

            <p className="ls-philosopher-frame">
              The tension is not new. Artists, authors and philosophers have always asked what
              material comfort is for, what free time is for, and what happens when cleverness
              serves appetite better than wisdom. They never agree on anything except that “more” is
              not necessarily “better.”
            </p>
            <div className="ls-philosopher-spine">
              <article>
                <span>HAVING ENOUGH</span>
                <h3>Al-Farabi</h3>
                <p>
                  A city that feeds people well has met a necessary condition for a good life. It
                  has not finished the job. The same institutions that distribute goods also train
                  what people learn to want.
                </p>
              </article>
              <article>
                <span>FREE TIME</span>
                <h3>Hannah Arendt</h3>
                <p>
                  Getting free of labor is a real gain. It is not yet building things that last,
                  acting with others in public, or keeping promises that make a shared world
                  possible.
                </p>
              </article>
              <article>
                <span>DARK CASE</span>
                <h3>Marquis de Sade</h3>
                <p>
                  Intelligence can become a better servant of whatever you already want. That can
                  make desire more effective without making it kinder, wiser, or freer.
                </p>
              </article>
            </div>
            <p className="ls-supporting-lenses">
              Later sections also borrow from people who wrote about imitation and status, who owns
              infrastructure, and how shared resources need rules.
            </p>

            <div className="ls-experience-controls">
              <div className="ls-telemetry-consent">
                <span className="ls-telemetry-consent__icon" aria-hidden="true">
                  ◉
                </span>
                <div>
                  <strong>Local reading mirror</strong>
                  <p>
                    {telemetryEnabled
                      ? "On: chapter time and backtracks stay in this tab only."
                      : "Off by default. No reading behavior is being collected."}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={telemetryEnabled}
                  onClick={() => setTelemetryEnabled((current) => !current)}
                >
                  {telemetryEnabled ? "Disable & delete" : "Enable locally"}
                </button>
              </div>
              <button
                type="button"
                className="ls-utility-button"
                aria-pressed={reducedMotion}
                disabled={systemReducedMotion}
                onClick={toggleReaderReducedMotion}
              >
                {reducedMotion ? "Reduced motion on" : "Reduce motion"}
              </button>
              <button type="button" className="ls-utility-button" onClick={() => openEvidence()}>
                Sources and claims
              </button>
            </div>
            <p className="ls-privacy-line">
              The reading mirror never phones home. No accounts, no moral scores, no stored beliefs.
            </p>
          </header>

          <div id="last-scarcity-narrative" className="ls-narrative" tabIndex="-1">
            <div className="ls-chapters">
              <ChapterSection chapter={CHAPTERS[0]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Technological optimists will tell you the story is basically solved: smarter
                    machines, less toil, better lives. It&apos;s a pretty good argument as far as logic
                    goes. If intelligence is cheap then it makes us more productive and gives us
                    more time and material comfort. People flourish.
                  </p>
                  <p>
                    That story is not stupid. Much of human misery really is about not having
                    enough: not enough food, medicine, shelter, or hours left after work. If
                    machines ease those pressures, something genuine was won.
                  </p>
                  <p>The trouble is that last step.</p>
                </div>
                <GoodFutureInstrument
                  allocation={allocation}
                  onAllocationChange={setAllocation}
                  onChoice={recordChoice}
                />
                <div className="ls-prose">
                  <p>
                    Care, friendship, art, study, rest: these are attractive uses of time. They are
                    also incomplete. Status races, humiliation, erotic rivalry, and domination do
                    not appear as options. The argument only works by pretending that humans just
                    don&apos;t have enough time to do good and meaningful things. But throughout history,
                    humans have had the time... and what they&apos;ve done with it is not always good.
                  </p>
                  <p>
                    History and fiction are both full of people who do not. Material relief is real.
                    It is not the same thing as knowing what a life is for.
                  </p>
                </div>
                <ClaimNote claimId="claim-necessary-city" onOpen={openEvidence} />
                <RecipeInspector chapterId="prologue" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[1]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Before we get weird, let&apos;s get real. Over the past few years, frontier models
                    got better fast, organizations started using them, and most of the strongest
                    models came from industry rather than from public labs. None of that means
                    “general intelligence” is solved. It does mean these things are no longer a
                    curiosity or a &quot;stochastic parrot&quot;.
                  </p>
                </div>
                <div className="ls-stat-terrace">
                  <Fact
                    value=">90%"
                    label="notable frontier models from industry"
                    claimId="claim-capability-accelerates"
                    sourceId="stanford-ai-index-2026"
                    onOpen={openEvidence}
                  />
                  <Fact
                    value="88%"
                    label="organizational AI adoption"
                    claimId="claim-capability-accelerates"
                    sourceId="stanford-ai-index-2026"
                    onOpen={openEvidence}
                  />
                  <Fact
                    value="362"
                    label="documented AI incidents in 2025"
                    claimId="claim-capability-accelerates"
                    sourceId="stanford-ai-index-2026"
                    onOpen={openEvidence}
                  />
                </div>
                <CapabilityFlood active={activeIndex === 1} reducedMotion={reducedMotion} />
                <div className="ls-prose">
                  <p>
                    The next chapters assume the machines are powerful enough to matter. They do not
                    assume the machines are neutral, evenly held, or done failing in ordinary ways.
                  </p>
                </div>
                <ClaimNote claimId="claim-ownership-question" onOpen={openEvidence} />
                <RecipeInspector chapterId="flood" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[2]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Suppose paid work shrank. Two hours less. Four. Eight. A block of the day would
                    open. The question is not only whether that can happen. It is what fills the
                    hole, and who decides.
                  </p>
                  <p>
                    Use the controls below to remove work hours and redistribute the rest of a
                    schematic day. The faint outer rings are published U.S. averages for comparison.
                    They are not a prediction of your future, and they are not a ranking of better
                    and worse lives.
                  </p>
                </div>
                <div className="ls-hours-control" role="group" aria-label="Paid work hours removed">
                  <span>Hours of paid work removed</span>
                  {[2, 4, 8].map((hours) => (
                    <button
                      key={hours}
                      type="button"
                      aria-pressed={freedHours === hours}
                      onClick={() => setReleasedHours(hours)}
                    >
                      {hours} hours
                    </button>
                  ))}
                </div>
                <FreedTimeWheel
                  freedHours={freedHours}
                  allocation={dayAllocation}
                  onAllocationChange={(next) => {
                    setDayAllocation(next)
                    recordChoice("counterfactual-day", next)
                  }}
                />
                <div className="ls-atus-strip">
                  <div>
                    <strong>5.16h</strong>
                    <span>leisure & sports · all people 15+</span>
                  </div>
                  <div>
                    <strong>1.99h</strong>
                    <span>household activity · all people 15+</span>
                  </div>
                  <div>
                    <strong>5.02h</strong>
                    <span>work · employed people across all days</span>
                  </div>
                  <div>
                    <strong>7.66h</strong>
                    <span>work · employed people on days worked</span>
                  </div>
                </div>
                <div className="ls-prose">
                  <p>
                    Real days already mix care, media, household work, social life, and paid labor
                    in uneven ways. Freeing time does not install a single better pattern. It hands
                    the pattern problem back to habits, apps, families, and institutions.
                  </p>
                </div>
                <ClaimNote claimId="claim-time-input" onOpen={openEvidence} />
                <RecipeInspector chapterId="empty-office" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[3]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Not every good behaves like a file. An explanation, an image, or a piece of code
                    can be copied until the marginal cost approaches zero. Prestige cannot. Trust
                    cannot. A legal right that only works because other people recognize it cannot.
                  </p>
                  <p>
                    That difference matters once machine intelligence makes the copyable things
                    cheap. Social competition does not evaporate. It often moves toward the goods
                    that still require scarcity, position, or another free person.
                  </p>
                </div>
                <GoodsTaxonomy />
                <div className="ls-prose">
                  <p>
                    The chart below is a transparent toy model, not a forecast. It keeps a fixed pot
                    of one hundred units of social competition and shows how that pot can shift when
                    copies get cheap. Turn the main dial and watch the ribbons leave printable goods
                    for attention, status, exclusivity, relationships, and power.
                  </p>
                </div>
                <ScarcityMigration
                  parameters={scarcityParameters}
                  onParametersChange={(next) => {
                    setScarcityParameters(next)
                    recordChoice("scarcity-model", next)
                  }}
                />
                <div className="ls-prose">
                  <p>
                    If that migration is even roughly right, abundance does not end the human
                    contest. It changes the prizes. When goods become cheap, people can become
                    expensive.
                  </p>
                </div>
                <ClaimNote claimId="claim-goods-differ" onOpen={openEvidence} />
                <RecipeInspector chapterId="last-scarcity" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[4]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    A private shopping list of needs cannot explain fashion, envy, or why a dull
                    object suddenly becomes urgent once the right people want it. Desire watches
                    desire. Visibility changes value. Association changes rank.
                  </p>
                  <p>
                    Now add systems that can generate praise, rumor, and strategy without fatigue.
                    Flattery gets cheap. Recognition does not. Step through three states of the same
                    social scene.
                  </p>
                </div>
                <div className="ls-theory-lenses">
                  <span>
                    <strong>IMITATION</strong> we want things because others want them
                  </span>
                  <span>
                    <strong>DISPLAY</strong> possession can signal rank
                  </span>
                  <span>
                    <strong>TOOLING</strong> better tools can serve the same hungers
                  </span>
                </div>
                <MimeticCourt
                  reducedMotion={reducedMotion}
                  onChoice={recordChoice}
                  onInspectClaim={openEvidence}
                />
                <div className="ls-prose">
                  <p>
                    When compliance is free, the scarce prize can become a free person’s ability to
                    refuse. That is not a law of nature. It is a pressure the earlier chapters make
                    easier to see.
                  </p>
                </div>
                <ClaimNote claimId="claim-refusal-target" onOpen={openEvidence} />
                <RecipeInspector chapterId="court" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[5]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Companion systems can produce the surface of care: warmth, memory, patience,
                    availability at three in the morning. That surface can be useful. It can also
                    blur a distinction that matters for human life.
                  </p>
                  <p>
                    One survey of Character.AI users already complicates the pure success story.
                    People who used the systems mainly for companionship reported lower well-being,
                    with stronger associations under heavier and more disclosive use. That does not
                    prove the apps caused the harm. It does puncture the idea that more intimacy
                    with a machine is automatically more support.
                  </p>
                </div>
                <ReciprocityPath onChoice={recordChoice} />
                <div className="ls-prose">
                  <p>
                    Under the statistics sits a simpler question. A performance of care can be
                    copied. Care that could have been withheld cannot.{" "}
                    <strong className="ls-prose-emphasis">
                      If freely given affection requires someone who might say no, then abundance of
                      simulated affection does not abolish the last scarcity.
                    </strong>{" "}
                    It makes that scarcity easier to see.
                  </p>
                </div>
                <ClaimNote claimId="claim-free-affection" onOpen={openEvidence} />
                <RecipeInspector chapterId="companion" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[6]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    Even when food is not the issue, people still organize around rank, insult,
                    memory, and control. Hunger is one reason for conflict. It is not the only one.
                    Fear, humiliation, sovereignty, revenge, and the pleasure of making someone
                    yield can all keep working after material shortages ease.
                  </p>
                  <p>
                    The sliders below are a blunt instrument, not a theory of war. Set material
                    scarcity to zero and notice which other dials stay put. The point is only that
                    “produce more” does not operate every lever.
                  </p>
                </div>
                <AgonInstrument onChoice={recordChoice} />
                <ClaimNote claimId="claim-conflict-multiple-levers" onOpen={openEvidence} />
                <RecipeInspector chapterId="agon" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[7]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    If the earlier chapters are right, abundance leaves two jobs on the table. One
                    is about character: how people learn what is worth wanting. The other is about
                    power: who owns the systems, data, and infrastructure that make the abundance
                    usable.
                  </p>
                  <p>
                    Those jobs are linked, but they are not the same. Fair pipes without any
                    formation of desire can still produce a glittering mess. Beautiful private
                    virtue under predatory institutions can still lose. The field below keeps the
                    axes separate so the tradeoffs stay visible.
                  </p>
                </div>
                <AbundanceConstitution
                  values={constitutionValues}
                  onChange={setConstitutionValues}
                  reducedMotion={reducedMotion}
                  onChoice={recordChoice}
                />
                <ClaimNote claimId="claim-formation-constitution" onOpen={openEvidence} />
                <RecipeInspector chapterId="commons" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[8]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    You have already made some choices on this page: how free hours might be used,
                    which argument made sense, which institutional levers you pushed. If you turned
                    on the local reading mirror, there is also a record of where you lingered.
                  </p>
                  <p>
                    Look at the gap between what you declared and where attention went. Treat it as
                    a mirror, not a grade. Curiosity is not endorsement, and no session on a webpage
                    is a character assessment.
                  </p>
                </div>
                <ReaderAttentionMirror
                  allocation={allocation}
                  trace={trace}
                  telemetryEnabled={telemetryEnabled}
                  choices={choices}
                  constitutionValues={constitutionValues}
                  onResetTrace={resetTrace}
                />
                <div className="ls-prose">
                  <p>
                    AI may make intelligence, fluent expression, fantasy, advice, praise,
                    entertainment, and the appearance of companionship abundant. It will not make
                    another person’s consent, loyalty, admiration, forgiveness, or love
                    interchangeable. That is where politics after abundance actually begins: not
                    only what humans are still good for, but what kind of choosers we become when
                    necessity no longer decides for us.
                  </p>
                </div>
                <RecipeInspector chapterId="observatory" />
              </ChapterSection>
            </div>

            <aside
              className="ls-palace-column"
              ref={palaceHostRef}
              aria-label="Chapter navigation map"
            >
              <div className="ls-palace-sticky">
                <nav className="ls-chapter-rail" aria-label="Chapters">
                  {CHAPTERS.map((chapter, index) => (
                    <button
                      type="button"
                      key={chapter.id}
                      aria-current={index === activeIndex ? "step" : undefined}
                      onClick={() => navigateTo(chapter.id)}
                      title={`${chapter.numeral}: ${chapter.title}`}
                    >
                      <span>{index + 1}</span>
                      <i>{chapter.room}</i>
                    </button>
                  ))}
                </nav>
                <PalaceMap
                  stage={activeIndex}
                  width={palaceWidth}
                  reducedMotion={reducedMotion}
                  onNavigate={navigateTo}
                  onInspectEdge={(edge) =>
                    openEvidence({ claimId: edge.claimId, claimClass: edge.claimClass })
                  }
                />
                <div className="ls-palace-thesis" aria-live="polite">
                  <span>{activeChapter.numeral}</span>
                  <p>{activeChapter.thesis}</p>
                </div>
              </div>
            </aside>
          </div>

          <footer className="ls-method-footer">
            <ArtNouveauCrown inverted />
            <span>SOURCES AND LIMITS</span>
            <h2>Where the numbers come from, and what they do not prove</h2>
            <p>
              This page uses fixed snapshots and editable scenarios, not live external requests. It
              does not claim that AI ends labor, that leisure causes decadence, that attention
              equals belief, or that any political arrangement guarantees virtue.
            </p>
            <button type="button" onClick={() => openEvidence()}>
              Open sources and claims
            </button>
          </footer>
          <EvidenceDrawer
            open={evidence.open}
            selection={evidence.selection}
            onClose={() => setEvidence({ open: false, selection: null })}
          />
      </div>
    </ExamplePageLayout>
  )
}

function ChapterSection({ chapter, registerSection, children }) {
  return (
    <section
      id={chapter.id}
      data-chapter={chapter.id}
      ref={(element) => registerSection(chapter.id, element)}
      className={`ls-chapter ls-chapter--${chapter.id}`}
      tabIndex="-1"
      aria-labelledby={`${chapter.id}-title`}
    >
      <div className="ls-chapter__header">
        <div className="ls-chapter__numeral">
          <span>{chapter.numeral}</span>
          <i />
        </div>
        <h2 id={`${chapter.id}-title`}>{chapter.title}</h2>
      </div>
      <div className="ls-chapter__body">{children}</div>
    </section>
  )
}

function Fact({ value, label, claimId, sourceId, onOpen }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
      <EvidenceBadge
        claimClass="measurement"
        claimId={claimId}
        sourceId={sourceId}
        onOpen={onOpen}
      />
    </div>
  )
}

function GoodsTaxonomy() {
  const goods = [
    [
      "Copyable",
      "can get nearly free to reproduce",
      "explanations · images · code · synthetic performances",
    ],
    ["Rival", "one use constrains another", "land · energy · embodied time"],
    [
      "Positional",
      "valuable partly because others lack them",
      "prestige · rank · first place · visibility",
    ],
    ["Relational", "need another free person", "trust · consent · loyalty · love · forgiveness"],
    [
      "Institutional",
      "survive only by collective recognition",
      "authority · citizenship · legitimacy · ownership",
    ],
  ]
  return (
    <div className="ls-goods-taxonomy">
      {goods.map(([kind, behavior, examples], index) => (
        <article key={kind}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{kind}</h3>
          <strong>{behavior}</strong>
          <p>{examples}</p>
        </article>
      ))}
    </div>
  )
}

function ArtNouveauCrown({ inverted = false }) {
  return (
    <svg
      className={`ls-crown ${inverted ? "is-inverted" : ""}`}
      viewBox="0 0 720 86"
      aria-hidden="true"
    >
      <path d="M18 72C94 73 98 19 160 22c47 2 51 47 105 47 43 0 55-52 95-52s52 52 95 52c54 0 58-45 105-47 62-3 66 51 142 50" />
      <path d="M100 58c-24-8-31-24-18-39 20 5 31 19 18 39Zm520 0c24-8 31-24 18-39-20 5-31 19-18 39Z" />
      <path d="M174 35c-18-14-20-29-3-39 17 11 21 25 3 39Zm372 0c18-14 20-29 3-39-17 11-21 25-3 39Z" />
      <path d="M360 17c-17 12-21 29 0 45 21-16 17-33 0-45Z" />
      <circle cx="360" cy="68" r="4" />
    </svg>
  )
}
