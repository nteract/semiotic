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
              Cheap intelligence could give us more goods and more time. It would still leave us
              wanting things other people must choose to give: attention, trust, loyalty and
              love. This essay asks what happens to those wants when making and buying things
              becomes easier.
            </p>
            <div className="ls-hero__thesis">
              <span>AI multiplies means.</span>
              <strong>It does not choose the ends.</strong>
            </div>

            <p className="ls-hero__how-to-read">
              Use the charts to try different assumptions about work, leisure and social
              competition. Public data provides context; the adjustable scenarios let you explore
              the argument. Colored source marks open the references.
            </p>

            <p className="ls-philosopher-frame">
              Writers have long asked what a comfortable life is for. Three offer useful starting
              points here: how a community shapes desire, what people do beyond paid work, and
              what happens when intelligence serves cruelty.
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
              Reading measurements stay in this tab. You can turn them off at any time.
            </p>
          </header>

          <div id="last-scarcity-narrative" className="ls-narrative" tabIndex="-1">
            <div className="ls-chapters">
              <ChapterSection chapter={CHAPTERS[0]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    The optimistic case for AI is straightforward: smarter machines make us more
                    productive, reduce necessary work and improve living standards. With more
                    time and fewer material worries, people would have more freedom to pursue a
                    good life.
                  </p>
                  <p>
                    There is much to welcome in that prospect. Better access to food, medicine
                    and shelter would relieve real suffering. Less time spent on necessary work
                    could leave more for family, friends and interests.
                  </p>
                  <p>But having more choices leaves open the question of what we choose.</p>
                </div>
                <GoodFutureInstrument
                  allocation={allocation}
                  onAllocationChange={setAllocation}
                  onChoice={recordChoice}
                />
                <div className="ls-prose">
                  <p>
                    Care, friendship, art, study and rest are all possible uses of free time. So
                    are status competition, cruelty and efforts to control other people. More
                    time gives us room for both. The optimistic argument needs to explain what
                    would encourage the first set of choices.
                  </p>
                  <p>
                    Material security makes a good life easier to pursue. Deciding how to live
                    still takes habits, relationships and institutions that help us use that
                    freedom well.
                  </p>
                </div>
                <ClaimNote claimId="claim-necessary-city" onOpen={openEvidence} />
                <RecipeInspector chapterId="prologue" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[1]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    The capability charts below show why this question has become pressing.
                    Models improved quickly, organizations adopted them, and industry produced
                    most of the strongest systems. We can take those changes seriously while
                    examining the reliability gaps alongside them.
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
                    For the scenarios that follow, suppose machines become powerful enough to
                    reduce a substantial amount of work. We can then ask who gains time, who
                    controls the systems and what people do with the gains.
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
                    Remove some work hours and choose where the time goes. The outer rings show
                    published U.S. averages for comparison. Your choices describe a possible day.
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
                    A shorter workday creates an opening. What fills it will depend on the
                    demands of a household, the habits of its members and the opportunities
                    available to them. The same two free hours can mean very different things in
                    different lives.
                  </p>
                </div>
                <ClaimNote claimId="claim-time-input" onOpen={openEvidence} />
                <RecipeInspector chapterId="empty-office" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[3]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    An image or a piece of code can be copied for many people at once. A person’s
                    attention has to be divided. Prestige depends on standing relative to others.
                    Trust takes a relationship in which both sides have something at stake.
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
                    The chart illustrates a possible shift using a fixed total of one hundred
                    units of competition. Turn the dial to move some of that competition from
                    goods toward attention, status, exclusivity, relationships and power. These
                    widths are assumptions you can explore.
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
                    Under those assumptions, cheaper goods leave people competing over
                    recognition and influence. Abundance would change what people compete for as
                    well as what they can afford.
                  </p>
                </div>
                <ClaimNote claimId="claim-goods-differ" onOpen={openEvidence} />
                <RecipeInspector chapterId="last-scarcity" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[4]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    We learn what to want partly by watching other people. An ordinary object can
                    become desirable because someone admired owns it. A popular person’s
                    attention can become valuable precisely because so many others want it.
                  </p>
                  <p>
                    AI adds a supply of praise, rumor and advice that can be produced endlessly.
                    Step through the three scenes to see the essay’s proposed distinction between
                    plentiful flattering messages and the limited attention of other people.
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
                    In this scenario, a willing audience matters more because its attention is
                    freely given. The possibility of refusal is part of what makes recognition
                    valuable.
                  </p>
                </div>
                <ClaimNote claimId="claim-refusal-target" onOpen={openEvidence} />
                <RecipeInspector chapterId="court" />
              </ChapterSection>

              <ChapterSection chapter={CHAPTERS[5]} registerSection={registerSection}>
                <div className="ls-prose">
                  <p>
                    A companion system can remember a conversation, reply patiently and be
                    available at three in the morning. People may find that useful or comforting.
                    The harder question is what kind of relationship it offers, and how it fits
                    with relationships outside the app.
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
                    Human affection matters partly because another person chooses to give it. <strong className="ls-prose-emphasis">If that choice is what we seek, an unlimited supply of simulated affection cannot fully satisfy the desire.</strong> It may instead make freely given attention more valuable.
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
                    These sliders illustrate the distinction. Lower material scarcity and the
                    other pressures remain where you set them. Use the model to consider which
                    problems greater production might ease and which would require another
                    response.
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
                    Both matter. Fair access to technology cannot decide how people use their
                    freedom. Good intentions cannot by themselves overcome institutions that
                    concentrate ownership and control. The two axes below let you consider those
                    problems separately.
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
                    If you enabled the reading record, compare where you spent time with the
                    choices you made. A long pause may mean interest, confusion or distraction;
                    use it as a prompt to reflect on your reading.
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
                    AI could make advice, entertainment and convincing conversation abundant.
                    Another person’s consent, trust or affection would still be theirs to give.
                    The prospect of abundance therefore asks more of us than finding new uses for
                    free time. It asks how we learn to choose well and how we share the power to
                    make those choices.
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
            <h2>Sources and scenario assumptions</h2>
            <p>
              The public figures are fixed snapshots. The adjustable charts are scenarios built
              to explore the essay’s argument. Source notes below distinguish the measured values
              from the assumptions.
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
