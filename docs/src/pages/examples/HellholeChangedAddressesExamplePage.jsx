import React, { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { useReducedMotion } from "semiotic/utils"
import ChartMethodDisclosure from "../../components/ChartMethodDisclosure"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  DreadTransferChart,
  MetropolitanFlowComparison,
  MetricFractureChart,
  MotifTranslationChart,
  SameAgeDifferentAmericaChart,
  SurveyEpisodeCharts,
} from "./hellhole-changed-addresses/HellholeCharts"
import {
  AGE_WINDOWS,
  CONDITION_EPISODES,
  CULTURAL_WORKS,
  REPRESENTATION_POINTS,
  RESIDENT_EPISODES,
  SOURCE_REGISTRY,
  cohortEvidenceAtAge,
  summarizeAgeWindow,
} from "./hellhole-changed-addresses/hellholeData"
import "./HellholeChangedAddressesExamplePage.css"

const LENSES = Object.freeze([
  {
    id: "culture",
    label: "Culture",
    controlHint: "→ suburb",
    mapMeaning:
      "Culture moves the accusation from downtown to the cul-de-sac. The HELL stamp marks suburbia.",
    title: "The nightmare packed its bags and crossed the city line.",
    note: "First the street was lethal. Then the living room was.",
  },
  {
    id: "conditions",
    label: "Conditions",
    controlHint: "→ across both",
    mapMeaning:
      "Material harm crosses the municipal line. HELL sits in the middle because the damage belongs to the whole metropolis.",
    title: "The damage did not disappear. It metastasized across the metropolis.",
    note: "Counts, rates, poverty, and movement expose a system changing shape.",
  },
  {
    id: "residents",
    label: "Residents",
    controlHint: "→ no consensus",
    mapMeaning:
      "Residents refuse their designated hellhole. The faded question mark shows that neither side wins the accusation.",
    title: "America cursed the landscape and signed the mortgage anyway.",
    note: "People kept choosing city and suburb while culture demanded an escape story.",
  },
  {
    id: "all",
    label: "All three",
    controlHint: "→ fractured",
    mapMeaning:
      "Put every witness on the stand and the label fractures into crime, cost, commute, and preference.",
    title: "Three stories at war.",
    note: "Culture moves the accusation; conditions spread the damage; residents defy the script.",
  },
])

const COMPARISON_CUTS = Object.freeze([
  { id: "age", label: "Same age", held: "age 15" },
  { id: "period", label: "Same year", held: "calendar year" },
  { id: "cohort", label: "Follow cohort", held: "birth year" },
])

const METRICS = Object.freeze([
  { id: "poverty-rate", label: "Poverty rate" },
  { id: "poverty-count", label: "Poverty count" },
  { id: "resident-preference", label: "Resident preference" },
  { id: "representation", label: "Representation" },
])

const DEFAULTS = Object.freeze({
  lens: "culture",
  birthYear: 1970,
  compareBirthYear: 1988,
  cut: "age",
  ageWindow: "danger",
  metric: "poverty-rate",
})

const SOURCE_LINKS = Object.freeze({
  R1: "https://americanarchive.org/primary_source_sets/urban-crisis",
  R2: "https://ideas.repec.org/a/fip/fedker/y2003iqiiip15-44nv.88no.3.html",
  R3: "https://www.pewresearch.org/short-reads/2024/04/24/what-the-data-says-about-crime-in-the-us/",
  R4: "https://www.brookings.edu/articles/city-and-suburban-crime-trends-in-metropolitan-america/",
  R6: "https://americanaejournal.hu/index.php/americanaejournal/article/view/45231/43882",
  R7: "https://davidbuckingham.net/growing-up-modern/reeling-in-the-years-retrospect-and-nostalgia-in-youth-movies/pleasantville/",
  R8: "https://www.pewresearch.org/social-trends/2009/02/26/suburbs-not-most-popular-but-suburbanites-most-content/",
  R9: "https://news.gallup.com/poll/328268/country-living-enjoys-renewed-appeal.aspx",
  R11: "https://www.pewresearch.org/short-reads/2026/03/19/majority-of-americans-prefer-spread-out-communities-with-big-houses/",
  R12: "https://www.brookings.edu/articles/the-suburbanization-of-poverty-trends-in-metropolitan-america-2000-to-2008/",
  R13: "https://www.brookings.edu/articles/post-pandemic-poverty-is-rising-in-americas-suburbs/",
  R14: "https://www.brookings.edu/articles/todays-suburbs-are-symbolic-of-americas-rising-diversity-a-2020-census-portrait/",
  R19: "https://www.pewresearch.org/short-reads/2023/05/22/how-pew-research-center-will-report-on-generations-moving-forward/",
  R20: "https://escholarship.org/content/qt24q688wg/qt24q688wg.pdf",
  R21: "https://www.jchs.harvard.edu/research-areas/journal-article/back-suburbs-millennial-residential-locations-great-recession",
  "census-county-flows-2006-2010":
    "https://www.census.gov/data/tables/2010/demo/geographic-mobility/county-to-county-migration-2006-2010.html",
  "census-county-flows-2016-2020":
    "https://www.census.gov/data/tables/2020/demo/geographic-mobility/county-to-county-migration-2016-2020.html",
})

function allowed(value, options, fallback) {
  return options.some((option) => option.id === value) ? value : fallback
}

function boundedYear(value, fallback) {
  if (value == null || value === "") return fallback
  const year = Number(value)
  return Number.isFinite(year) ? Math.max(1945, Math.min(2001, Math.round(year))) : fallback
}

function useExampleState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const lens = allowed(searchParams.get("lens"), LENSES, DEFAULTS.lens)
  const cut = allowed(searchParams.get("cut"), COMPARISON_CUTS, DEFAULTS.cut)
  const metric = allowed(searchParams.get("metric"), METRICS, DEFAULTS.metric)
  const ageWindow = AGE_WINDOWS.some(
    (window) =>
      window.id === searchParams.get("window") &&
      Number.isInteger(window.startAge) &&
      Number.isInteger(window.endAge),
  )
    ? searchParams.get("window")
    : DEFAULTS.ageWindow
  const birthYear = boundedYear(searchParams.get("born"), DEFAULTS.birthYear)
  const compareBirthYear = boundedYear(searchParams.get("compare"), DEFAULTS.compareBirthYear)

  const update = useCallback(
    (patch) => {
      // Read the live URL rather than a render-synchronized snapshot. Rapid
      // control updates can otherwise let an older effect overwrite a newer
      // query string between navigations and silently drop an earlier choice.
      const next = new URLSearchParams(window.location.search)
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null || value === "") next.delete(key)
        else next.set(key, String(value))
      })
      setSearchParams(next, { replace: true })
    },
    [setSearchParams],
  )

  return { lens, cut, metric, ageWindow, birthYear, compareBirthYear, update }
}

export default function HellholeChangedAddressesExamplePage() {
  const reducedMotion = useReducedMotion()
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120, { bucket: 20 })
  const state = useExampleState()
  const activeLens = LENSES.find((lens) => lens.id === state.lens) ?? LENSES[0]
  const activeWindow = AGE_WINDOWS.find((window) => window.id === state.ageWindow) ?? AGE_WINDOWS[0]
  const activeMetric = METRICS.find((metric) => metric.id === state.metric) ?? METRICS[0]
  const compact = pageWidth < 720
  const chartWidth = Math.max(300, pageWidth - (compact ? 16 : 48))
  const firstObserver = cohortEvidenceAtAge(state.birthYear, 15)
  const secondObserver = cohortEvidenceAtAge(state.compareBirthYear, 15)
  const firstWindow = summarizeAgeWindow(state.birthYear, activeWindow)
  const secondWindow = summarizeAgeWindow(state.compareBirthYear, activeWindow)

  const interpretationAnnouncement = useMemo(
    () =>
      `${activeLens.title} Observer comparison: birth ${state.birthYear} and birth ${state.compareBirthYear}, ${state.cut} view, ages ${activeWindow.startAge} to ${activeWindow.endAge}.`,
    [activeLens.title, activeWindow, state.birthYear, state.compareBirthYear, state.cut],
  )

  return (
    <ExamplePageLayout title="The Hellhole Changed Addresses">
      <div className={`hellhole-example ${reducedMotion ? "is-reduced-motion" : ""}`} ref={pageRef}>
        <a className="hellhole-skip-link" href="#hellhole-evidence-spine">
          Skip to the evidence controls
        </a>

        <header className="hellhole-hero">
          <div className="hellhole-hero__copy">
            <p className="hellhole-kicker">
              How America pictured city and suburban life · 1945–2026
            </p>
            <h2>
              The place we wanted to <span>escape.</span>
            </h2>
            <p className="hellhole-hero__lede">
              In one familiar American story, the city is dangerous and the suburbs offer a way
              out. In another, suburban life is stifling and the city promises freedom. The films
              and books we grow up with help make one of those stories feel more convincing.
            </p>
            <p className="hellhole-hero__thesis">
              This essay follows that change in setting, then compares it with where people lived
              and what they said they wanted.
            </p>
            <a className="hellhole-hero__action" href="#hellhole-evidence-spine">
              Move the label <span aria-hidden="true">↓</span>
            </a>
          </div>

          <PrologueStage reducedMotion={reducedMotion} />
        </header>

        <section className="hellhole-correction" aria-labelledby="hellhole-correction-title">
          <div>
            <p className="hellhole-kicker">Two versions of escape</p>
            <h2 id="hellhole-correction-title">The threat moves from downtown to the cul-de-sac.</h2>
          </div>
          <div>
            <p>
              Stories of urban crime, abandonment and fiscal collapse gave the city a powerful
              image of danger. By the late 1990s, familiar suburban settings supplied another
              kind of menace: troubled families, conformity and violence behind well-kept doors.
              The examples below trace that shift.
            </p>
            <button type="button" onClick={() => state.update({ lens: "all" })}>
              Show me the whole indictment
            </button>
          </div>
        </section>

        <section id="hellhole-evidence-spine" className="hellhole-reading-field">
          <aside className="hellhole-controller" aria-labelledby="hellhole-controller-title">
            <header className="hellhole-controller__heading">
              <p className="hellhole-kicker">Follow the comparison</p>
              <div>
                <h2 id="hellhole-controller-title">What the moving “HELL” means</h2>
                <span>{activeLens.mapMeaning}</span>
              </div>
            </header>

            <MetropolitanLine lens={state.lens} meaning={activeLens.mapMeaning} />

            <details className="hellhole-controller__drawer" open>
              <summary>
                <span>Controls for the charts below</span>
                <small>Lens → chapter 03 · cohort → chapter 04 · metric → chapter 07</small>
              </summary>
              <div className="hellhole-controls" aria-label="Evidence and observer controls">
                <ControlGroup label="Who is naming “hell”?">
                  {LENSES.map((lens) => (
                    <ControlButton
                      key={lens.id}
                      active={state.lens === lens.id}
                      onClick={() => state.update({ lens: lens.id })}
                    >
                      <span>{lens.label}</span>
                      <small>{lens.controlHint}</small>
                    </ControlButton>
                  ))}
                </ControlGroup>

                <label className="hellhole-range-control" htmlFor="hellhole-born">
                  <span>
                    Cohort A <output htmlFor="hellhole-born">{state.birthYear}</output>
                  </span>
                  <input
                    id="hellhole-born"
                    type="range"
                    min="1945"
                    max="2001"
                    step="1"
                    value={state.birthYear}
                    onChange={(event) => state.update({ born: event.target.value })}
                  />
                </label>

                <label className="hellhole-range-control" htmlFor="hellhole-compare">
                  <span>
                    Cohort B <output htmlFor="hellhole-compare">{state.compareBirthYear}</output>
                  </span>
                  <input
                    id="hellhole-compare"
                    type="range"
                    min="1945"
                    max="2001"
                    step="1"
                    value={state.compareBirthYear}
                    onChange={(event) => state.update({ compare: event.target.value })}
                  />
                </label>

                <ControlGroup label="Compare cohorts by" compact>
                  {COMPARISON_CUTS.map((cut) => (
                    <ControlButton
                      key={cut.id}
                      active={state.cut === cut.id}
                      onClick={() => state.update({ cut: cut.id })}
                    >
                      {cut.label}
                    </ControlButton>
                  ))}
                </ControlGroup>

                <label className="hellhole-select-control" htmlFor="hellhole-window">
                  <span>Age window</span>
                  <select
                    id="hellhole-window"
                    value={state.ageWindow}
                    onChange={(event) => state.update({ window: event.target.value })}
                  >
                    {AGE_WINDOWS.filter(
                      (window) =>
                        Number.isInteger(window.startAge) && Number.isInteger(window.endAge),
                    ).map((window) => (
                      <option key={window.id} value={window.id}>
                        {window.label} · {window.startAge}–{window.endAge}
                      </option>
                    ))}
                  </select>
                </label>

                <ControlGroup label="Final verdict metric" compact>
                  {METRICS.map((metric) => (
                    <ControlButton
                      key={metric.id}
                      active={state.metric === metric.id}
                      onClick={() => state.update({ metric: metric.id })}
                    >
                      {metric.label}
                    </ControlButton>
                  ))}
                </ControlGroup>
              </div>
            </details>

            <p className="hellhole-live" aria-live="polite">
              {interpretationAnnouncement} Final metric: {activeMetric.label}.
            </p>
          </aside>

          <div className="hellhole-spine">
            <article className="hellhole-chapter hellhole-chapter--bargain">
              <ChapterHeading
                number="01"
                era="1948–1964"
                eyebrow="The metropolitan bargain"
                title="The American Dream as Janus."
              />
              <div className="hellhole-prose-grid">
                <div>
                  <p>
                    The postwar suburban promise depended on the city. People could seek work and
                    opportunity downtown, then return to a home, yard and family life outside it.
                  </p>
                  <p>
                    Access to that promise was unequal. Redlining, discriminatory lending,
                    restrictive covenants and public subsidies shaped who could buy a suburban
                    home. Those policies also shaped investment in the cities people left behind.
                  </p>
                </div>
                <BargainDiagram />
              </div>
              <ChartMethodDisclosure
                inline
                shows="An influential white middle-class cultural settlement and the policy boundary running through it."
                doesNotShow="A universal golden age, equitable access, or independent city and suburb economies."
              />
            </article>

            <article className="hellhole-chapter hellhole-chapter--crisis">
              <ChapterHeading
                number="02"
                era="1965–1993"
                eyebrow="America appoints its monster"
                title="The city was the hellhole. Everyone knew it. Everyone sold it."
              />
              <div className="hellhole-crisis-ledger">
                <EvidenceFact number="01" sourceId="R1">
                  Crime rose, politics found its favorite footage, and the late-1970s and
                  early-1980s city became national shorthand for danger with the efficiency of a
                  logo.
                </EvidenceFact>
                <EvidenceFact number="02" sourceId="R2">
                  Several large cities lost more than 10 percent of their population. People
                  vanished, tax bases buckled, and abandonment became scenery—though plenty of
                  metros refused to fit the script.
                </EvidenceFact>
                <EvidenceFact number="03" sourceId="R3">
                  National violent and property crime rose into the early 1990s. Then both declined
                  sharply for decades while the reputation stalked the streets like it had missed
                  the memo.
                </EvidenceFact>
              </div>
              <blockquote>
                Urban hardship was real. Repeated images of crime and ruin made it stand for the
                whole city, giving audiences a much narrower picture than residents’ lives could
                support.
              </blockquote>
            </article>

            <article className="hellhole-chapter hellhole-chapter--transfer">
              <ChapterHeading
                number="03"
                era="1945–2026"
                eyebrow="The dread transfer"
                title={activeLens.title}
                subtitle={activeLens.note}
              />
              <figure className="hellhole-chart-shell hellhole-chart-shell--hero">
                <div className="hellhole-chart-shell__meta">
                  <span>{activeLens.label} lens</span>
                  <strong>Watch the accusation move.</strong>
                </div>
                <div className="hellhole-chart-scroll">
                  <DreadTransferChart
                    width={Math.max(720, chartWidth)}
                    height={520}
                    lens={state.lens}
                    reducedMotion={reducedMotion}
                    representationPoints={REPRESENTATION_POINTS}
                    conditionEpisodes={CONDITION_EPISODES}
                    residentEpisodes={RESIDENT_EPISODES}
                  />
                </div>
                <figcaption>
                  Compare the cultural examples with local conditions and residents’ responses.
                  Sharing a timeline makes it easier to see where those accounts agree and where
                  they diverge.
                </figcaption>
              </figure>
              <ChartMethodDisclosure
                inline
                shows="Where illustrative cultural stations occur, and why material and survey episodes do not produce the same story."
                doesNotShow="A representative measure of American belief."
              />
            </article>

            <article className="hellhole-chapter hellhole-chapter--parallax">
              <ChapterHeading
                number="04"
                era="Observer layer"
                eyebrow="Your birth year assigns the monster"
                title="Same age. Different hell."
                subtitle="One cohort was handed a city of predators. Another was handed a suburb of smiling captivity."
              />
              <div className="hellhole-parallax-layout">
                <figure className="hellhole-chart-shell hellhole-chart-shell--lexis">
                  <div className="hellhole-chart-shell__meta">
                    <span>{COMPARISON_CUTS.find((cut) => cut.id === state.cut)?.label}</span>
                    <strong>
                      Birth {state.birthYear} ↔ birth {state.compareBirthYear}
                    </strong>
                  </div>
                  <div className="hellhole-chart-scroll">
                    <SameAgeDifferentAmericaChart
                      width={Math.max(680, chartWidth * 0.68)}
                      height={520}
                      birthYear={state.birthYear}
                      compareBirthYear={state.compareBirthYear}
                      comparisonCut={state.cut}
                      ageWindow={activeWindow}
                      reducedMotion={reducedMotion}
                    />
                  </div>
                  <figcaption>
                    Change the birth year to see which stories appeared at different ages in an
                    observer’s life.
                  </figcaption>
                </figure>

                <div className="hellhole-observer-cards">
                  <ObserverCard
                    evidence={firstObserver}
                    windowSummary={firstWindow}
                    birthYear={state.birthYear}
                  />
                  <ObserverCard
                    evidence={secondObserver}
                    windowSummary={secondWindow}
                    birthYear={state.compareBirthYear}
                  />
                  <aside className="hellhole-method-card">
                    <span>The generational sentence</span>
                    <strong>
                      A generation inherits the order in which America taught it to be afraid.
                    </strong>
                    <p>
                      Move the birth year while holding age fixed, then try holding the calendar
                      year fixed. The comparison shows how different generations could encounter
                      different versions of the same place.
                    </p>
                    <SourcePill sourceId="R19" label="Pew cohort method" />
                  </aside>
                </div>
              </div>
              <ChartMethodDisclosure
                inline
                shows={`Exact-year coverage in the illustrative evidence spine during ages ${activeWindow.startAge}–${activeWindow.endAge}, under a user-selected observer clock.`}
                doesNotShow="Attention, interpretation, durable attitudes, unconstrained residential choice, or a causal generation effect."
              />
            </article>

            <article className="hellhole-chapter hellhole-chapter--secret">
              <ChapterHeading
                number="05"
                era="1995–2008"
                eyebrow="Hell gets a mortgage"
                title="The monster came home, mowed the lawn, and locked the door."
                subtitle="The city’s public menace was reborn as private rot: domestic collapse, surveillance, conformity, emptiness, and exclusion."
              />
              <figure className="hellhole-chart-shell hellhole-chart-shell--motifs">
                <div className="hellhole-chart-shell__meta">
                  <span>Temporal ProcessSankey</span>
                  <strong>The same poison in a new bottle</strong>
                </div>
                <div className="hellhole-chart-scroll">
                  <MotifTranslationChart
                    width={Math.max(760, chartWidth)}
                    height={560}
                    reducedMotion={reducedMotion}
                  />
                </div>
                <figcaption>
                  The links pair urban fears with suburban versions of them. Equal widths mark
                  four comparisons; they do not measure how popular each theme was.
                </figcaption>
              </figure>
              <WindowArchive works={CULTURAL_WORKS} />
              <ChartMethodDisclosure
                inline
                shows="How negative place motifs persist and mutate across selected works and release years."
                doesNotShow="Causal influence, every American film or television program, or the private life of every suburban household."
              />
            </article>

            <article className="hellhole-chapter hellhole-chapter--residents">
              <ChapterHeading
                number="06"
                era="2001–2026"
                eyebrow="America buys the nightmare anyway"
                title="They hated the story. They loved the mortgage."
                subtitle="People fled, returned, stayed, complained, and signed thirty-year notes while culture screamed that somebody must escape."
              />
              <SurveyEpisodeCharts width={chartWidth} height={300} />
              <div className="hellhole-resident-reading">
                <p>
                  Residents often preferred the places where they lived. In Gallup’s 2001 survey,
                  53 percent of city residents preferred city life and 67 percent of suburban
                  residents preferred suburbia. In January 2026, Pew found 55 percent preferred
                  larger, farther-apart homes, while 44 percent preferred smaller homes near
                  services. Both kinds of place continued to appeal.
                </p>
                <p>
                  A California study found a small current preference for urban living among
                  Millennials compared with Gen X, but older Millennials resembled Gen X on its
                  longer-term measure. Census-based research also found Millennials moving toward
                  suburban neighborhoods from 2011 to 2021. A cultural preference and a housing
                  decision can point in different directions.
                </p>
                <div className="hellhole-source-row">
                  <SourcePill sourceId="R9" label="Gallup 2001 / 2020" />
                  <SourcePill sourceId="R11" label="Pew January 2026" />
                  <SourcePill sourceId="R20" label="California attitude study" />
                  <SourcePill sourceId="R21" label="Millennial residence" />
                </div>
              </div>
              <MetropolitanFlowComparison width={chartWidth} reducedMotion={reducedMotion} />
              <div className="hellhole-source-row hellhole-flow-source-row">
                <SourcePill
                  sourceId="census-county-flows-2006-2010"
                  label="Census ACS county flows · 2006–2010"
                />
                <SourcePill
                  sourceId="census-county-flows-2016-2020"
                  label="Census ACS county flows · 2016–2020"
                />
              </div>
              <ChartMethodDisclosure
                inline
                shows="Observed residence-change estimates in both directions between a fixed five-county New York City core and a fixed suburban ring."
                doesNotShow="Why a household moved, cultural exposure, affection for either place, or a migration reversal."
              />
            </article>

            <article className="hellhole-chapter hellhole-chapter--fracture">
              <ChapterHeading
                number="07"
                era="The metric fractures"
                eyebrow="Pick your poison"
                title="The hellhole is whatever the microphone says it is."
                subtitle="Count poverty, measure rates, ask preference, screen a movie: every metric crowns a different loser."
              />
              <div className="hellhole-metric-layout">
                <div className="hellhole-metric-controls">
                  <span>Selected at the sticky argument desk</span>
                  <strong>{activeMetric.label}</strong>
                  <p>
                    Change the measure above to compare another aspect of the same metropolis.
                    Migration, local conditions and stated preferences answer different questions
                    about why people stay or leave.
                  </p>
                </div>
                <figure className="hellhole-chart-shell hellhole-chart-shell--metric">
                  <MetricFractureChart
                    width={Math.max(300, Math.min(chartWidth, 720))}
                    height={340}
                    metric={state.metric}
                  />
                </figure>
              </div>

              <div className="hellhole-count-rate-reach">
                <EvidenceFact number="COUNT" sourceId="R12">
                  By 2008, the poor population in the largest-metro suburbs exceeded primary cities
                  by 1.5 million after growing 25 percent from 2000. Welcome to suburban poverty:
                  enormous, dispersed, and lousy at getting camera time.
                </EvidenceFact>
                <EvidenceFact number="RATE" sourceId="R13">
                  In 2022, the suburban poverty rate was 9.6 percent; the primary-city rate was 16.2
                  percent. Change the denominator and downtown is back in the devil suit before the
                  commercial break.
                </EvidenceFact>
                <EvidenceFact number="WHO" sourceId="R14">
                  By 2020, people of color were about 45 percent of the large-metro suburban
                  population, up from roughly 20 percent in 1990. The lily-white suburb survived
                  mainly as a television set and a political fundraising letter.
                </EvidenceFact>
              </div>

              <p className="hellhole-final-line">
                The setting of the escape story changed more neatly than people’s lives did.
                Cities and suburbs both offered opportunity, imposed costs and inspired
                attachment. The stories people encountered while growing up help explain their
                expectations; the resident and migration records show how much those stories
                leave out.
              </p>
            </article>
          </div>
        </section>

        <EvidenceLedger sources={SOURCE_REGISTRY} />

        <footer className="hellhole-footer">
          <span>THE HELLHOLE CHANGED ADDRESSES / SEMIOTIC</span>
          <strong>
            First the city was hell. Then hell got a lawn. Your birth year chose the monster.
          </strong>
          <p>
            The cultural examples were selected to illustrate the argument. They do not measure
            public opinion or the popularity of a theme. Survey results and local measures retain
            their own sources and definitions in the notes below.
          </p>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}

function PrologueStage({ reducedMotion }) {
  return (
    <figure
      className="hellhole-prologue-stage"
      aria-label="The cultural HELL label moves from a distressed 1981 downtown to an immaculate 1999 suburban street."
    >
      <div className="hellhole-prologue-panel hellhole-prologue-panel--city">
        <span className="hellhole-prologue-year">1981</span>
        <div className="hellhole-city-skyline" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <strong>DOWNTOWN</strong>
        <small>visible danger · fiscal crisis · abandonment</small>
      </div>
      <div className="hellhole-prologue-panel hellhole-prologue-panel--suburb">
        <span className="hellhole-prologue-year">1999</span>
        <div className="hellhole-house-row" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <strong>CUL-DE-SAC</strong>
        <small>hidden violence · conformity · empty perfection</small>
      </div>
      <div className={`hellhole-stamp ${reducedMotion ? "is-static" : ""}`} aria-hidden="true">
        HELL
      </div>
      <figcaption>Preview: representation only</figcaption>
    </figure>
  )
}

function MetropolitanLine({ lens, meaning }) {
  const fractured = lens === "all"
  return (
    <section
      className={`hellhole-metropolitan-line ${fractured ? "is-fractured" : ""}`}
      aria-label={`Metropolitan cross-section. ${meaning}`}
    >
      <div className="hellhole-metropolitan-line__rail" aria-hidden="true" />
      {[
        ["Downtown", "▥"],
        ["Streetcar suburb", "▤"],
        ["Inner ring", "⌂"],
        ["Cul-de-sac", "⌾"],
        ["Exurb", "△"],
      ].map(([label, glyph]) => (
        <div key={label}>
          <span aria-hidden="true">{glyph}</span>
          <strong>{label}</strong>
        </div>
      ))}
      {fractured ? (
        <div className="hellhole-metropolitan-line__fragments" aria-hidden="true">
          <i>crime</i>
          <i>cost</i>
          <i>commute</i>
          <i>preference</i>
        </div>
      ) : (
        <span className={`hellhole-metropolitan-line__hell is-${lens}`} aria-hidden="true">
          {lens === "residents" ? "HELL?" : "HELL"}
        </span>
      )}
    </section>
  )
}

function ChapterHeading({ number, era, eyebrow, title, subtitle }) {
  return (
    <header className="hellhole-chapter-heading">
      <div>
        <span>{number}</span>
        <small>{era}</small>
      </div>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {subtitle ? <p className="hellhole-chapter-heading__subtitle">{subtitle}</p> : null}
      </div>
    </header>
  )
}

function BargainDiagram() {
  return (
    <figure className="hellhole-bargain-diagram">
      <div>
        <span>HOME</span>
        <strong>ownership · privacy · children</strong>
      </div>
      <i aria-hidden="true">MORTGAGE → COMMUTE → WAGES</i>
      <div>
        <span>CITY</span>
        <strong>work · retail · culture · adulthood</strong>
      </div>
      <b aria-hidden="true">EXCLUSION / REDLINING / SUBSIDY</b>
      <figcaption>A schematic division of labor, not a population-flow estimate.</figcaption>
    </figure>
  )
}

function ControlGroup({ label, compact = false, children }) {
  return (
    <fieldset className={`hellhole-control-group ${compact ? "is-compact" : ""}`}>
      <legend>{label}</legend>
      <div>{children}</div>
    </fieldset>
  )
}

function ControlButton({ active, onClick, children }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}

function EvidenceFact({ number, sourceId, children }) {
  return (
    <article className="hellhole-evidence-fact">
      <span>{number}</span>
      <p>{children}</p>
      <SourcePill sourceId={sourceId} label={sourceId} />
    </article>
  )
}

function SourcePill({ sourceId, label }) {
  const href = SOURCE_LINKS[sourceId]
  if (!href) return <span className="hellhole-source-pill">{label}</span>
  return (
    <a className="hellhole-source-pill" href={href} target="_blank" rel="noopener noreferrer">
      {label} <span aria-hidden="true">↗</span>
    </a>
  )
}

function ObserverCard({ evidence, windowSummary, birthYear }) {
  const year = birthYear + 15
  const stationCount = evidence?.stations?.length ?? 0
  const coreStations = windowSummary.stations.filter((station) => station.place === "core").length
  const suburbStations = windowSummary.stations.filter(
    (station) => station.place === "suburb",
  ).length
  const direction = stationCount
    ? `${stationCount} illustrative cultural station${stationCount === 1 ? "" : "s"} in this exact year`
    : "No cultural station in this exact year"
  return (
    <article className="hellhole-observer-card">
      <span>Age 15 in {year}</span>
      <strong>Born {birthYear}</strong>
      <p>{direction}. Compare this pattern with the other evidence on the timeline.</p>
      <dl>
        <div>
          <dt>Window</dt>
          <dd>
            {windowSummary.stationCount} stations · {coreStations} core / {suburbStations} suburb
          </dd>
        </div>
        <div>
          <dt>Inheritance</dt>
          <dd>Titles released into the air</dd>
        </div>
        <div>
          <dt>Monster</dt>
          <dd>
            {coreStations > suburbStations
              ? "City"
              : suburbStations > coreStations
                ? "Suburb"
                : "Split"}
          </dd>
        </div>
      </dl>
    </article>
  )
}

function WindowArchive({ works }) {
  const windowWorks = works.filter((work) => work.year >= 1995 && work.year <= 2008)
  const positiveCounterexamples = works.filter((work) => work.role === "positive-or-ordinary")
  return (
    <details className="hellhole-window-archive">
      <summary>Open the windows in the suburban crime scene</summary>
      <div>
        {windowWorks.map((work) => (
          <article key={work.id}>
            <span>{work.year}</span>
            <strong>{work.title}</strong>
            <small>{work.role.replaceAll("-", " ")} · illustrative grouping</small>
          </article>
        ))}
      </div>
      <p>
        The selection also includes {positiveCounterexamples.length} examples of positive or ordinary life. Read them alongside the escape stories to see other ways these places were portrayed.
      </p>
    </details>
  )
}

function EvidenceLedger({ sources }) {
  const entries = Array.isArray(sources) ? sources : Object.values(sources ?? {})
  return (
    <section className="hellhole-evidence-ledger" aria-labelledby="hellhole-ledger-title">
      <div>
        <p className="hellhole-kicker">Sources and reading notes</p>
        <h2 id="hellhole-ledger-title">Compare the stories with the records.</h2>
        <p>
          Films and books show ways of imagining a place. Surveys record stated preferences, and
          local measures describe conditions under particular definitions. The sources below let
          you follow each part of the comparison.
        </p>
      </div>
      <div className="hellhole-evidence-ledger__sources">
        {entries.map((source) => {
          const sourceCode = source.citationId ?? source.id
          return (
            <a
              key={source.id}
              href={source.href ?? source.url ?? SOURCE_LINKS[sourceCode]}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>
                {sourceCode} · {source.grade ?? source.sourceType ?? "Source"}
              </span>
              <strong>{source.title}</strong>
              <small>{source.limitation ?? source.limitations?.[0] ?? source.note}</small>
            </a>
          )
        })}
      </div>
    </section>
  )
}
