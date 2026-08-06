import React, { useMemo, useState } from "react"
import {
  ForceDirectedGraph,
  GroupedBarChart,
  LineChart,
  SankeyDiagram,
  SwarmPlot,
  ThemeProvider,
  TooltipRoot,
  markTooltipChrome,
} from "semiotic"
import { CollisionSwarmChart } from "semiotic/physics"
import { XYCustomChart } from "semiotic/xy"
import { unwrapDatum, useReducedMotion } from "semiotic/utils"
import ChartMethodDisclosure from "../../components/ChartMethodDisclosure"
import useReadingLineSections from "../../hooks/useReadingLineSections"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  COLLABORATION_TREND,
  DH_HISTORY_TIMELINE,
  DHQ_DATA_NOTE,
  DHQ_DOSSIER,
  DHQ_PROVENANCE,
  EDITORIAL_STATISTICS,
  METADATA_CLOCK_ITEMS,
  METADATA_CLOCK_SUMMARY,
  PUBLICATION_STRUCTURE,
  RECOMMENDATION_ARTICLE_INDEX,
  RECOMMENDATION_OVERLAPS,
  RECOMMENDATION_SUMMARY,
  RECOMMENDATION_WALKS,
  SOURCE_TAG_TRENDS,
  buildClassificationFlow,
} from "./data/dhqThunderdome.generated"
import "./DigitalHumanitiesThunderdomeExamplePage.css"

const ORIGINAL_ARTICLE_URL =
  "https://journalofdigitalhumanities.org/1-1/digital-humanities-as-thunderdome-by-elijah-meeks/"
const ORBIS_URL =
  "https://journalofdigitalhumanities.org/1-3/modeling-networks-and-scholarship-with-orbis-by-elijah-meeks-and-karl-grossner/"
const LDA_ISSUE_URL =
  "https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/"
const INDEX_THOMISTICUS_URL = "https://dhq.digitalhumanities.org/vol/12/2/000380/000380.html"
const DHQ_EXPLORE_URL = "https://dhq.digitalhumanities.org/dhq/explore/explore.html"
const DHQ_AI_POLICY_URL =
  "https://github.com/Digital-Humanities-Quarterly/dhq-journal/blob/main/submissions/ai_policies.html"
const LICENSE_URL = "https://creativecommons.org/licenses/by/3.0/"

const ACID = "#d8ff4f"
const CORAL = "#ff725d"
const CYAN = "#65dfd0"
const BLUE = "#7ca7ff"
const PINK = "#ed83d3"
const GOLD = "#efbd5b"
const CLOUD = "#c8ced8"

const HISTORY_COLORS = [CORAL, ACID, CYAN, BLUE, PINK, GOLD, CLOUD]
const TOOL_COLORS = [CLOUD, CYAN, BLUE, PINK, CORAL, ACID]
const PATH_COLORS = [CLOUD, CORAL, ACID, CYAN]
const NETWORK_COLORS = [ACID, CORAL, CYAN]
const DARK_FRAME = Object.freeze({ background: "transparent" })
const CHART_MOTION = Object.freeze({ duration: 460, easing: "ease-out", intro: true })

const COMPACT_CHART_TITLES = Object.freeze({
  "long-view": "From punch cards to agents",
  "editorial-shape": "Published placement",
  authorship: "Published co-authorship",
  subjects: "DHQ’s current vocabulary",
  "metadata-clock": "Metadata arrives late",
  classification: "What tidiness throws away",
  "recommendation-walk": "Authors along a reading route",
  overlap: "Shared “read next” picks",
})

const COMPACT_CLASSIFICATION_LABELS = Object.freeze({
  all: "All items",
  single: "Already one tag",
  multiple: "Many tags",
  absent: "No tag",
  "single-display": "Shown as one",
  "multiple-retained": "Still many",
  unclassified: "Unclassified",
})

const RECOMMENDATION_METHOD_LABELS = Object.freeze({
  keywords: "Editorial keywords",
  bm25: "Full-text search",
  specter: "Title/abstract embeddings",
})

const METADATA_CLOCK_CHART_DATA = METADATA_CLOCK_ITEMS.map((item) => ({
  ...item,
  articleId: item.id,
  yearsBeforePass: 2023 - item.publicationYear,
  period: publicationWindow(item.publicationYear),
}))

const SCENES = [
  {
    id: "long-view",
    number: "01",
    title: "The tools came long before this AI wave",
    chart: "XYCustomChart",
    chartTitle: "From punch cards to agents, 1949–2026",
    paragraphs: [
      <>
        Digital humanities did not wait for chatbots to invent mediation. In 1949, Roberto Busa’s
        Aquinas project already meant IBM, punch cards, operators, and years of checking.{" "}
        <a href={INDEX_THOMISTICUS_URL} target="_blank" rel="noopener noreferrer">
          DHQ’s reconstruction
        </a>{" "}
        makes the human work inside that automation hard to miss. Later, TEI put shared encoding
        under community rules. The web turned archives into interfaces people could click.
      </>,
      <>
        <a href={ORBIS_URL} target="_blank" rel="noopener noreferrer">
          ORBIS
        </a>{" "}
        turned an argument about Roman movement into a network model you could argue with. The{" "}
        <a href={LDA_ISSUE_URL} target="_blank" rel="noopener noreferrer">
          LDA special issue
        </a>{" "}
        was my attempt to make the old collaboration problem concrete: put an imported model beside
        its makers, users, critics, and tools. None of that reduced mediation. It moved the boundary
        between interpretation and implementation.
      </>,
      "AI-assisted coding moves that boundary again. A scholar can now ask for a transformation, an interface, and a chart while the research question is still half-formed. That is more than “another tool,” and less than magic. The tool did not disappear. The person with the question can generate more of the software.",
    ],
    shows: "Thirteen documented changes in how ideas become software",
    omits: "A story of smooth progress, or equal labor in every project",
    caption:
      "A chronological spiral from the Index Thomisticus to DHQ’s 2026 AI policy. Order is time, not importance.",
  },
  {
    id: "editorial-shape",
    number: "02",
    title: "Editors group the field before you read it",
    chart: "SankeyDiagram",
    chartTitle: "Named public clusters in the 806-item corpus",
    paragraphs: [
      `DHQ reports ${EDITORIAL_STATISTICS.peerReviewedPublished} peer-reviewed articles and case studies through 2025: ${EDITORIAL_STATISTICS.regularPublished} in the regular stream and ${EDITORIAL_STATISTICS.specialPublished} in special issues. Those routes have different histories, so they are not simply competing acceptance rates.`,
      `In this 806-item public corpus, ${PUBLICATION_STRUCTURE.placedInNamedClusters} items sit inside ${PUBLICATION_STRUCTURE.namedClusterCount} named clusters. A cluster gathers work under a shared question before a reader, or a recommendation system, ever arrives.`,
      "A spike in a subject can mean the field got busier there. It can also mean editors invited that conversation. Building a new app does not undo the earlier decision about what enters the reading room together.",
    ],
    shows: "Where published items sit in public named clusters",
    omits: "Why a paper was accepted, or comparable acceptance rates by route",
    caption:
      "All 806 corpus items flow through named-cluster placement and publication window. Separate journal totals use different inclusion rules.",
  },
  {
    id: "authorship",
    number: "03",
    title: "More names on the byline",
    chart: "LineChart",
    chartTitle: "One author vs. multi-author published items",
    paragraphs: [
      "The standard AI demo is solitary: one person, one prompt, one finished app. DHQ’s published record was already moving the other way before the present AI wave.",
      "Items with two or more listed authors rise from 32.1% in 2007–11 to 54.7% in 2022–25. The line jumps year to year because the journal published between 6 and 79 items annually. Small denominators make every year loud.",
      "A byline is a narrow record. It does not say who wrote code, cleaned data, designed an interface, found funding, or kept a server alive. It only says that named coauthorship became more common.",
    ],
    shows: "How often published items list one name or several",
    omits: "Who did what labor, or why teams formed",
    caption:
      "Annual share of published items with one listed author versus two or more. Each year keeps its own publication count.",
  },
  {
    id: "subjects",
    number: "04",
    title: "What DHQ calls its subjects now",
    chart: "GroupedBarChart",
    chartTitle: "Eight controlled tags across four publication windows",
    paragraphs: [
      "In the current XML, media studies sits on 36.7% of items published in 2007–11 and 3.4% in 2022–25. History rises from 15.6% to 21.2%. Race rises from 0.9% to 14.4%. Project report peaks at 26.7% in 2017–21.",
      "These are DHQ’s controlled tags, not topics guessed by a model. An item can carry several tags at once, so the bars are not a pie that must sum to 100. The vocabulary is inspectable, which is firmer ground than a free-form topic cloud.",
      "Read alone, the chart looks like a history of subjects. Before trusting that reading, we need another clock.",
    ],
    shows: "How often current controlled tags appear by publication window",
    omits:
      "Mutually exclusive topics, field-wide prevalence, or labels assigned at publication time",
    caption:
      "Eight DHQ-controlled tags in the pinned archive, by publication window. One item may feed several bars.",
  },
  {
    id: "metadata-clock",
    number: "05",
    title: "Publication is not the only clock",
    chart: "CollisionSwarmChart",
    chartTitle: "How far current metadata can lag publication",
    paragraphs: [
      `On July 11, 2023, one commit updated controlled keywords in 615 article XML files. Across keyword-named commits on July 11 and 12, ${METADATA_CLOCK_SUMMARY.repositoryFilesTouched} distinct article files in this corpus changed.`,
      "Each body sits on the number of years between publication and that repository pass. A tag you see on a 2008 article can arrive in Git fifteen years later.",
      "So the previous chart is still true, and its question changes. It shows how DHQ’s current vocabulary describes its published past. It does not tell us what every article was called in the year it came out.",
    ],
    shows: "Publication dates next to one observed keywording pass in the repository",
    omits: "When each tag was first assigned, or why a tag changed",
    caption:
      "One body per corpus article touched by keyword-named commits on July 11–12, 2023. Lanes are publication windows.",
  },
  {
    id: "classification",
    number: "06",
    title: "Most articles have more than one tag",
    chart: "SankeyDiagram",
    chartTitle: "What a tidy interface throws away",
    paragraphs: [
      "Of the 806 published items here, 791 carry more than one subject tag. Five have one. Ten have none. Multiplicity is normal in the archive and inconvenient in a UI.",
      "Interfaces love a single subject chip. Toggle the chart between a tidy single-tag view and a view that keeps the pile. Watch the fat middle band: when you force one tag, hundreds of multi-tag articles disappear. The archive is the same either way. The interface decides whether you get to see the mess.",
      "A chatbot can make that same cut for you without showing a control. Once you can generate the interface yourself, you also inherit the responsibility to notice when tidiness is doing interpretive work.",
    ],
    shows: "How a display rule can hide multi-tag articles",
    omits: "What DHQ’s public site currently shows readers",
    caption:
      "Toggle between one-tag display and keeping multiple tags. The thick band is the 791 multi-tag articles.",
  },
  {
    id: "recommendation-walk",
    number: "07",
    title: "Follow a recommendation to its authors",
    chart: "ForceDirectedGraph",
    chartTitle: "Two recommendation steps, printed author names",
    paragraphs: [
      <>
        DHQ’s{" "}
        <a href={DHQ_EXPLORE_URL} target="_blank" rel="noopener noreferrer">
          Explore page
        </a>{" "}
        offers three answers to “what should I read next?” Controlled keywords follow an editorial
        vocabulary. BM25 looks at words in the full text. SPECTER looks at embeddings of titles and
        abstracts.
      </>,
      `Start from one 2026 article, take each system’s top three suggestions, then take the top three again, and map those paths onto the author names printed in DHQ. Switch methods and the neighborhood changes. Across that article’s three top-ten “read next” lists, ${RECOMMENDATION_SUMMARY.seed.distinctTopTenTargets} different articles fill 30 slots. None appears on all three lists.`,
      "This is a map of where a recommendation system sends you, and whose names you meet along the way. It is not a map of influence.",
    ],
    shows: "Who you can reach in two hops of “read next”",
    omits: "Whether anyone actually followed these paths",
    caption:
      "Recommended articles projected onto printed author names. Switch the definition of “nearby” above.",
  },
  {
    id: "overlap",
    number: "08",
    title: "Three methods of nearby mostly disagree",
    chart: "SwarmPlot",
    chartTitle: "How many “read next” picks two systems share",
    paragraphs: [
      `Maybe that one article was unlucky. So check every public article with recommendations (${RECOMMENDATION_SUMMARY.indexedArticles} of them). For each article, each system offers ten “read this next” suggestions. Pick any two systems and count how many of those ten suggestions they share. Zero means totally different reading lists. Ten would mean identical lists.`,
      `On average, controlled keywords and full-text search share only about ${RECOMMENDATION_SUMMARY.pairSummary[0].mean} of ten. Full text and embeddings share about ${RECOMMENDATION_SUMMARY.pairSummary[1].mean}. Keywords and embeddings share about ${RECOMMENDATION_SUMMARY.pairSummary[2].mean}. Across the whole archive, only about ${RECOMMENDATION_SUMMARY.allThreeDirectedShare.toFixed(0)}% of “A recommends B” links show up in all three systems.`,
      `${RECOMMENDATION_SUMMARY.sourcesWithNoAllThreeTarget} of ${RECOMMENDATION_SUMMARY.indexedArticles} starting articles have no “read next” pick that all three systems agree on. These tools are not three views of the same neighborhood. They are three different neighborhoods with a polite shared label.`,
    ],
    shows: "How little the three recommenders agree, article by article",
    omits: "Which recommender is “best”",
    caption:
      "Each point is one article under one pair of recommenders. Position is how many of ten “read next” picks the pair share (0 = no overlap).",
  },
]
const SCENE_IDS = SCENES.map((scene) => `thunderdome-round-${scene.number}`)

export default function DigitalHumanitiesThunderdomeExamplePage() {
  const reducedMotion = useReducedMotion()
  const [classificationMode, setClassificationMode] = useState("default")
  const [recommendationMode, setRecommendationMode] = useState("keywords")
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const inlineLayout = reducedMotion || pageWidth < 860
  const { activeIndex, navigateTo, registerSection } = useReadingLineSections({
    ids: SCENE_IDS,
    enabled: !inlineLayout,
    readingLine: 0.43,
    rootMargin: "-42% 0px -57%",
    threshold: 0,
    reducedMotion,
    scrollBlock: "center",
  })
  const goToScene = (index) => navigateTo(index, { focus: false })

  const activeScene = SCENES[activeIndex] ?? SCENES[0]

  return (
    <ExamplePageLayout title="Thunderdome Has Rounded Corners">
      <div className="thunderdome" ref={pageRef}>
        <header className="thunderdome-hero">
          <div className="thunderdome-hero__main">
            <p className="thunderdome-kicker">Digital humanities · 1949 to 2026</p>
            <h2>The humanist can make the app now</h2>
            <p className="thunderdome-hero__lede">
              In 2011 a Stanford graduate student told me that collaboration with computer
              scientists could feel more like colonization. I thought that was true. I was one of
              the technical people scholars had to ask whether an idea was possible, and my answer
              was bounded by the software I knew and the code I could write.
            </p>
            <p className="thunderdome-hero__lede">
              That arrangement has changed. A scholar can ask a model to build the database,
              interface, and chart, then argue with the result until it runs. If the old problem was
              dependency on toolbuilders, why isn’t the ability to make our own weird code being
              treated as a real shift in power?
            </p>
            <div className="thunderdome-hero__actions">
              <a href="#thunderdome-arena">See the argument in charts</a>
              <a href={ORIGINAL_ARTICLE_URL} target="_blank" rel="noopener noreferrer">
                Read the 2011 essay <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <aside className="thunderdome-hero__docket" aria-label="The old and new questions">
            <p>Two questions</p>
            <div>
              <span>Then</span>
              <strong>Who gets to decide which humanistic questions software can represent?</strong>
            </div>
            <div>
              <span>Now</span>
              <strong>
                What changes when the person with the question can also generate the software?
              </strong>
            </div>
            <small>Elijah Meeks · tested with Digital Humanities Quarterly and Semiotic</small>
          </aside>
        </header>

        <section className="thunderdome-setup" aria-labelledby="thunderdome-setup-title">
          <div>
            <p className="thunderdome-kicker">Why this journal</p>
            <h2 id="thunderdome-setup-title">A public record you can argue with</h2>
          </div>
          <div className="thunderdome-setup__copy">
            <p>
              Something real did change. Being able to make and revise an application without
              waiting for a technical specialist matters. Implementation is still only one place
              where choices get made.
            </p>
            <p>
              Digital Humanities Quarterly is a useful case because I know it as a former editor and
              author, and because its public record is unusually inspectable. The XML corpus gives
              us {DHQ_DOSSIER.sourceItems} published items through 2025. The repository adds issue
              structure, later metadata edits, and three working recommendation systems. DHQ is the
              case, not a stand-in for the whole field.
            </p>
          </div>
        </section>

        <a className="thunderdome-skip" href="#thunderdome-after">
          Skip to the conclusion
        </a>

        <ThemeProvider theme="carbon-dark">
          <section
            id="thunderdome-arena"
            className={`thunderdome-arena ${inlineLayout ? "is-inline" : "is-sticky"}`}
            aria-label="Eight chart sections"
          >
            <div className="thunderdome-rounds">
              {SCENES.map((scene, index) => (
                <article
                  id={`thunderdome-round-${scene.number}`}
                  key={scene.id}
                  ref={(element) => registerSection(SCENE_IDS[index], element)}
                  data-scene-index={index}
                  className={`thunderdome-round ${activeIndex === index ? "is-active" : ""}`}
                  aria-current={!inlineLayout && activeIndex === index ? "step" : undefined}
                >
                  <div className="thunderdome-round__head">
                    <span>{scene.number}</span>
                  </div>
                  <h2>{scene.title}</h2>
                  {scene.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${scene.id}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                  <ChartMethodDisclosure
                    inline
                    className="thunderdome-round__limits"
                    shows={scene.shows}
                    doesNotShow={scene.omits}
                  />

                  {inlineLayout ? (
                    <ArenaStage
                      scene={scene}
                      index={index}
                      classificationMode={classificationMode}
                      onClassificationMode={setClassificationMode}
                      recommendationMode={recommendationMode}
                      onRecommendationMode={setRecommendationMode}
                      reducedMotion={reducedMotion}
                      inline
                    />
                  ) : null}
                </article>
              ))}
            </div>

            {!inlineLayout ? (
              <aside className="thunderdome-stage-column" aria-label="Active chart">
                <ArenaStage
                  scene={activeScene}
                  index={activeIndex}
                  classificationMode={classificationMode}
                  onClassificationMode={setClassificationMode}
                  recommendationMode={recommendationMode}
                  onRecommendationMode={setRecommendationMode}
                  reducedMotion={reducedMotion}
                  onSceneChange={goToScene}
                />
              </aside>
            ) : null}
          </section>
        </ThemeProvider>

        <section id="thunderdome-after" className="thunderdome-after">
          <p className="thunderdome-kicker">Where that leaves us</p>
          <h2>We may have ended one colonization and walked into another</h2>
          <div>
            <p>
              In 2011 the problem was blunt: humanists with questions often had to ask technical
              people whether the software could represent those questions at all. Collaboration
              could feel like colonization because the person who knew the tools also got to shape
              what counted as possible. That was the Thunderdome I was writing about: two
              abstractions enter, and the implementation usually wins.
            </p>
            <p>
              AI-assisted coding weakens that veto. A scholar can now generate a database, an
              interface, and a chart without first persuading a programmer. That is a real shift in
              power, and digital humanities should say so instead of treating it only as convenience
              or threat.
            </p>
            <p>
              So why does it still feel like colonization, only quieter? Because the gate moved. The
              old colonizer was a person with scarce skills. The new one is an agreeable stack:
              models trained on other people’s code, platforms that hide defaults, tag systems that
              tidy multi-subject work into one chip, recommendation engines that disagree while
              pretending to answer the same question, metadata rewritten years after publication.
              You can build the app yourself and still inherit someone else’s ontology, someone
              else’s “nearby,” and someone else’s idea of what a readable display looks like.
            </p>
            <p>
              DHQ is not simply anti-AI. Its{" "}
              <a href={DHQ_AI_POLICY_URL} target="_blank" rel="noopener noreferrer">
                2026 policy
              </a>{" "}
              allows supportive uses while keeping agency, disclosure, accuracy, and responsibility
              with the human author. That is the right standard for weird code too. If you can make
              the app, you can also leave the seams visible: which records were flattened, which
              recommender defined nearby, which past was rewritten by a later tag pass.
            </p>
          </div>
          <p className="thunderdome-after__closing">
            The humanist can make the app now. The insidious risk is building a friendlier cage and
            calling the freedom to assemble it decolonization.
          </p>
        </section>

        <footer className="thunderdome-source">
          <p>
            Drawn from Elijah Meeks,{" "}
            <a href={ORIGINAL_ARTICLE_URL} target="_blank" rel="noopener noreferrer">
              “Digital Humanities as Thunderdome”
            </a>
            , first published in 2011 and revised in 2012. The original is licensed{" "}
            <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
              CC BY 3.0
            </a>
            .
          </p>
          <p>
            {DHQ_DATA_NOTE} Core corpus: {DHQ_PROVENANCE.scope}. Repository evidence is pinned to{" "}
            <a
              href={`${DHQ_PROVENANCE.repositoryUrl}/tree/${DHQ_PROVENANCE.repositoryCommit}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DHQ_PROVENANCE.repositoryCommit.slice(0, 12)}
            </a>
            . Recommendation edges describe navigational similarity, not citation or influence.
            Printed bylines are not resolved person identities.
          </p>
          <p>
            This example used AI-assisted repository inspection, analysis, and coding. The thesis,
            source choices, interpretation, and responsibility remain human. Charts are rendered
            with Semiotic.
          </p>
        </footer>
      </div>
    </ExamplePageLayout>
  )
}

function ArenaStage({
  scene,
  index,
  classificationMode,
  onClassificationMode,
  recommendationMode,
  onRecommendationMode,
  reducedMotion,
  onSceneChange,
  inline = false,
}) {
  const [width, hostRef] = useResponsiveWidth(220, 680)
  const chartHeight = 430
  const classification = useMemo(
    () => buildClassificationFlow(classificationMode),
    [classificationMode],
  )
  const recommendationWalk = RECOMMENDATION_WALKS[recommendationMode]

  return (
    <figure className={`thunderdome-stage ${inline ? "is-inline" : ""}`}>
      <header className="thunderdome-stage__header">
        <div>
          <span>{scene.number}</span>
          <h3>{scene.chartTitle}</h3>
        </div>
      </header>

      {!inline && onSceneChange ? (
        <nav className="thunderdome-stage__nav" aria-label="Chart sections">
          {SCENES.map((round, roundIndex) => (
            <button
              type="button"
              key={round.id}
              onClick={() => onSceneChange(roundIndex)}
              aria-label={`Section ${round.number}: ${round.title}`}
              aria-current={roundIndex === index ? "step" : undefined}
            >
              {round.number}
            </button>
          ))}
        </nav>
      ) : null}

      {scene.id === "classification" ? (
        <div className="thunderdome-stage__controls">
          <span>Interface choice</span>
          <div role="group" aria-label="How multi-tag articles are displayed">
            <button
              type="button"
              className={classificationMode === "default" ? "is-active" : ""}
              aria-pressed={classificationMode === "default"}
              onClick={() => onClassificationMode("default")}
            >
              Tidy: one tag each
            </button>
            <button
              type="button"
              className={classificationMode === "preserve" ? "is-active" : ""}
              aria-pressed={classificationMode === "preserve"}
              onClick={() => onClassificationMode("preserve")}
            >
              Honest: keep the pile
            </button>
          </div>
          <p aria-live="polite">
            {classification.summary.mode === "preserve"
              ? `${classification.summary.multiple} multi-tag articles stay multi-tag on the right.`
              : `${classification.summary.multiple} multi-tag articles are forced into the single-tag bucket.`}
          </p>
        </div>
      ) : null}

      {scene.id === "recommendation-walk" ? (
        <div className="thunderdome-stage__controls">
          <span>Which “read next” engine</span>
          <div role="group" aria-label="Recommendation method">
            {Object.entries(RECOMMENDATION_METHOD_LABELS).map(([method, label]) => (
              <button
                type="button"
                key={method}
                className={recommendationMode === method ? "is-active" : ""}
                aria-pressed={recommendationMode === method}
                onClick={() => onRecommendationMode(method)}
              >
                {label}
              </button>
            ))}
          </div>
          <p aria-live="polite">
            {recommendationWalk.nodes.length} author names after two hops through{" "}
            {recommendationWalk.articleCount} articles.
          </p>
        </div>
      ) : null}

      <div className="thunderdome-stage__chart" ref={hostRef}>
        <SceneChart
          key={`${scene.id}-${
            scene.id === "classification"
              ? classificationMode
              : scene.id === "recommendation-walk"
                ? recommendationMode
                : "fixed"
          }`}
          scene={scene}
          width={width}
          height={chartHeight}
          classification={classification}
          recommendationWalk={recommendationWalk}
          reducedMotion={reducedMotion}
        />
      </div>

      <figcaption>
        <span>{scene.caption}</span>
        <small>Hover, focus, or open the chart’s data table for more detail.</small>
      </figcaption>
    </figure>
  )
}

function SceneChart({ scene, width, height, classification, recommendationWalk, reducedMotion }) {
  const animate = reducedMotion ? false : CHART_MOTION
  const compact = width < 500
  const chartTitle = compact ? COMPACT_CHART_TITLES[scene.id] : scene.chartTitle
  const common = {
    width,
    height,
    enableHover: true,
    accessibleTable: true,
    animate,
    frameProps: DARK_FRAME,
  }

  if (scene.id === "long-view") {
    return (
      <XYCustomChart
        {...common}
        chartId="thunderdome-long-view"
        data={DH_HISTORY_TIMELINE}
        layout={historySpiralLayout}
        colorBy="kind"
        colorScheme={HISTORY_COLORS}
        margin={{ top: 56, right: 28, bottom: 26, left: 28 }}
        title={chartTitle}
        description="A chronological spiral of thirteen documented digital-humanities tool and infrastructure moments, from the 1949 Index Thomisticus collaboration through DHQ’s 2026 AI policy."
        summary="The interface to implementation moves from punch cards and governed markup to graphical tools, code education, natural-language code generation, and repository agents. Authority moves but never vanishes."
        tooltip={timelineTooltip}
      />
    )
  }

  if (scene.id === "editorial-shape") {
    return (
      <SankeyDiagram
        {...common}
        chartId="thunderdome-editorial-shape"
        nodes={PUBLICATION_STRUCTURE.nodes}
        edges={PUBLICATION_STRUCTURE.edges}
        nodeIdAccessor="id"
        nodeLabel={compact ? compactPublicationLabel : "label"}
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor="value"
        colorBy="type"
        colorScheme={TOOL_COLORS}
        edgeColorBy="source"
        edgeOpacity={0.52}
        nodeWidth={13}
        nodePaddingRatio={0.12}
        showLabels
        showLegend={false}
        margin={
          compact
            ? { top: 56, right: 78, bottom: 28, left: 84 }
            : { top: 56, right: 104, bottom: 28, left: 150 }
        }
        title={chartTitle}
        description="A conserved Sankey routing all 806 validated 2007–2025 DHQ corpus items through public named-cluster placement and publication window."
        summary={`${PUBLICATION_STRUCTURE.placedInNamedClusters} items are placed in ${PUBLICATION_STRUCTURE.namedClusterCount} named public clusters. Placement records an editorial grouping, not a reason for acceptance or a special-issue submission flag.`}
        tooltip={flowTooltip}
      />
    )
  }

  if (scene.id === "authorship") {
    return (
      <LineChart
        {...common}
        chartId="thunderdome-authorship"
        data={COLLABORATION_TREND}
        xAccessor="year"
        yAccessor="share"
        lineBy="bylinePattern"
        colorBy="bylinePattern"
        colorScheme={[CORAL, ACID]}
        xExtent={[2007, 2025]}
        yExtent={[0, 100]}
        xLabel="Publication year"
        yLabel="Share of published items"
        xFormat={(value) => `${Math.round(value)}`}
        yFormat={(value) => `${Math.round(value)}%`}
        curve="monotoneX"
        lineWidth={3}
        showPoints
        pointRadius={5}
        showGrid
        showLegend
        legendPosition="bottom"
        margin={{
          top: 52,
          right: compact ? 24 : 38,
          bottom: compact ? 116 : 96,
          left: compact ? 54 : 58,
        }}
        title={chartTitle}
        description="A line chart of the annual share of published DHQ items with one listed author and two or more listed authors, 2007–2025."
        summary="The chart describes listed bylines only. It does not resolve people or infer roles, labor, or reasons for collaboration."
        tooltip={collaborationTooltip}
      />
    )
  }

  if (scene.id === "subjects") {
    return (
      <GroupedBarChart
        {...common}
        chartId="thunderdome-subjects"
        data={SOURCE_TAG_TRENDS}
        categoryAccessor="tag"
        groupBy="period"
        valueAccessor="share"
        colorBy="period"
        colorScheme={PATH_COLORS}
        valueExtent={[0, 40]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={3}
        margin={{
          top: 52,
          right: compact ? 14 : 22,
          bottom: compact ? 124 : 88,
          left: compact ? 108 : 130,
        }}
        title={chartTitle}
        description="A grouped horizontal bar chart of eight current DHQ-controlled tags, each expressed as the multi-label share of published items in four publication windows."
        summary="The bars describe the pinned archive with its current vocabulary. Retrospective keywording means they are not a contemporaneous topic series."
        valueFormat={(value) => `${Math.round(value)}%`}
        tooltip={sourceTagTooltip}
      />
    )
  }

  if (scene.id === "metadata-clock") {
    return (
      <CollisionSwarmChart
        chartId="thunderdome-metadata-clock"
        data={METADATA_CLOCK_CHART_DATA}
        xAccessor="yearsBeforePass"
        groupAccessor="period"
        colorBy="period"
        colorScheme={PATH_COLORS}
        xExtent={[0, 16]}
        collisionIterations={12}
        pointRadius={2.8}
        seed={23}
        settle
        showProjection
        paused={reducedMotion}
        size={[width, height]}
        enableHover
        accessibleTable
        title={chartTitle}
        description={`A collision-relaxed distribution of ${METADATA_CLOCK_SUMMARY.inScopeItems} DHQ articles touched by keyword-named repository commits in July 2023. Horizontal position is years between publication and the observed pass; lanes are publication windows.`}
        summary="The chart separates publication time from one observed metadata-change time. Git does not establish when every controlled term was first assigned."
        tooltip={metadataClockTooltip}
      />
    )
  }

  if (scene.id === "classification") {
    return (
      <SankeyDiagram
        {...common}
        chartId="thunderdome-classification"
        nodes={classification.nodes}
        edges={classification.edges}
        nodeIdAccessor="id"
        nodeLabel={compactClassificationLabel}
        sourceAccessor="source"
        targetAccessor="target"
        valueAccessor="value"
        colorBy="type"
        colorScheme={[CLOUD, BLUE, CORAL, GOLD, ACID]}
        edgeColorBy="source"
        edgeOpacity={0.54}
        nodeWidth={14}
        nodePaddingRatio={0.1}
        showLabels
        showLegend={false}
        margin={{ top: 52, right: 92, bottom: 32, left: 74 }}
        title={chartTitle}
        description={
          classification.summary.mode === "default"
            ? "Sankey of 806 DHQ articles: the thick multi-tag band is forced into a single displayed tag."
            : "Sankey of 806 DHQ articles: the thick multi-tag band stays multi-tag on the right."
        }
        summary={
          classification.summary.mode === "preserve"
            ? `${classification.summary.multiple} multi-tag articles keep their pile visible.`
            : `${classification.summary.multiple} multi-tag articles are collapsed into one displayed tag.`
        }
        tooltip={flowTooltip}
      />
    )
  }

  if (scene.id === "recommendation-walk") {
    return (
      <ForceDirectedGraph
        {...common}
        chartId={`thunderdome-recommendation-${recommendationWalk.method}`}
        nodes={recommendationWalk.nodes}
        edges={recommendationWalk.edges}
        nodeIdAccessor="id"
        nodeLabel="label"
        nodeSize="degree"
        nodeSizeRange={[8, 22]}
        edgeWidth="value"
        edgeOpacity={0.42}
        colorBy="type"
        colorScheme={NETWORK_COLORS}
        nodeStroke="#0d1014"
        nodeStrokeWidth={2}
        showLabels
        showLegend={false}
        iterations={460}
        forceStrength={compact ? 0.065 : 0.035}
        layoutExecution="sync"
        margin={{ top: 52, right: 40, bottom: 36, left: 40 }}
        title={chartTitle}
        description={`A force-directed author projection built from two top-three ${recommendationWalk.label} recommendation steps around DHQ article 000847. Edges retain the article-to-article reading routes and adjacent shared bylines.`}
        summary={`${recommendationWalk.nodes.length} exact printed author names are reached through ${recommendationWalk.articleCount} articles. This is a navigational projection, not person identity, citation, influence, or readership.`}
        tooltip={networkTooltip}
      />
    )
  }

  return (
    <SwarmPlot
      {...common}
      chartId="thunderdome-overlap"
      data={RECOMMENDATION_OVERLAPS}
      categoryAccessor="pairId"
      valueAccessor="overlap"
      colorBy="pairId"
      colorScheme={[CORAL, ACID, CYAN]}
      orientation="horizontal"
      valueExtent={[0, 10]}
      pointRadius={2.25}
      pointOpacity={0.34}
      categoryPadding={28}
      categoryFormat={compactPairLabel}
      valueLabel="Shared “read next” picks out of 10"
      valueFormat={(value) => `${Math.round(Number(value))} of 10`}
      showGrid
      showLegend={false}
      margin={{
        top: 54,
        right: compact ? 18 : 28,
        bottom: 58,
        left: compact ? 118 : 168,
      }}
      title={chartTitle}
      description={`For each of ${RECOMMENDATION_SUMMARY.indexedArticles} articles, each recommender offers ten “read next” picks. Each point compares two recommenders and counts how many of those ten picks they share.`}
      summary={`On average the pairs share only about ${RECOMMENDATION_SUMMARY.pairSummary[0].mean} to ${RECOMMENDATION_SUMMARY.pairSummary[1].mean} of ten suggestions. ${RECOMMENDATION_SUMMARY.sourcesWithNoAllThreeTarget} articles have no pick that all three systems agree on.`}
      tooltip={overlapTooltip}
    />
  )
}

function historySpiralLayout(context) {
  const { data, dimensions, resolveColor, theme } = context
  const { width, height } = dimensions.plot
  if (!data.length || width <= 0 || height <= 0) return { nodes: [] }

  const centerX = width / 2
  const centerY = height / 2
  const lastIndex = Math.max(1, data.length - 1)
  const positions = data.map((datum, index) => {
    const progress = index / lastIndex
    const angle = -Math.PI * 0.66 + progress * Math.PI * 4.55
    const radiusX = 25 + progress * Math.max(35, width * 0.43 - 25)
    const radiusY = 19 + progress * Math.max(28, height * 0.41 - 19)
    return {
      datum,
      angle,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    }
  })

  const nodes = positions.map(({ datum, x, y }) => ({
    type: "point",
    x,
    y,
    r: datum.kind === "ai" ? 8.5 : datum.id === "thunderdome" ? 8 : 6.5,
    style: {
      fill: resolveColor(datum.kind, datum),
      stroke: theme.semantic.background ?? "#0d1014",
      strokeWidth: 2,
    },
    datum,
    accessibleDatum: datum,
    accessibility: { label: `${datum.date}: ${datum.title}` },
    pointId: datum.id,
    _transitionKey: datum.id,
  }))

  const path = positions
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ")
  const showAllLabels = width >= 470
  const important = new Set([
    "index-thomisticus",
    "dhq-launch",
    "thunderdome",
    "orbis",
    "copilot",
    "coding-agents",
    "dhq-ai-policy",
  ])

  const overlays = (
    <g aria-hidden="true" pointerEvents="none">
      <path
        d={path}
        fill="none"
        stroke="var(--semiotic-text-secondary, #c8ced8)"
        strokeDasharray="3 5"
        strokeOpacity={0.55}
        strokeWidth={1.4}
      />
      {positions.map(({ datum, x, y, angle }) =>
        showAllLabels || important.has(datum.id) ? (
          <text
            key={datum.id}
            x={x + (Math.cos(angle) >= 0 ? 10 : -10)}
            y={y + (Math.sin(angle) >= 0 ? 12 : -7)}
            fill="var(--semiotic-text-secondary, #c8ced8)"
            fontSize={datum.id === "thunderdome" ? 10 : 8}
            fontWeight={datum.id === "thunderdome" ? 800 : 650}
            textAnchor={Math.cos(angle) >= 0 ? "start" : "end"}
          >
            {datum.date}
          </text>
        ) : null,
      )}
    </g>
  )

  return { nodes, overlays }
}

function compactClassificationLabel(value) {
  const datum = unwrapDatum(value) ?? {}
  return COMPACT_CLASSIFICATION_LABELS[datum.id] ?? datum.label ?? datum.id
}

function compactPublicationLabel(value) {
  const datum = unwrapDatum(value) ?? {}
  if (datum.id === "all") return "All 806"
  if (datum.id === "placement:named public cluster") return "Named cluster"
  if (datum.id === "placement:outside named cluster") return "Outside cluster"
  return datum.label ?? datum.id
}

function compactPairLabel(value) {
  const label = String(value)
  if (
    label === "K/B" ||
    label === "keywords-bm25" ||
    label.startsWith("Controlled keywords / BM25")
  ) {
    return "Keywords vs full text"
  }
  if (label === "B/S" || label === "bm25-specter" || label.startsWith("BM25 full text / SPECTER")) {
    return "Full text vs embeddings"
  }
  if (
    label === "K/S" ||
    label === "keywords-specter" ||
    label.startsWith("Controlled keywords / SPECTER")
  ) {
    return "Keywords vs embeddings"
  }
  return label
}

function endpointLabel(endpoint) {
  if (endpoint && typeof endpoint === "object") {
    return endpoint.label ?? endpoint.id ?? "item"
  }
  return endpoint
}

function TooltipShell({ title, children }) {
  return (
    <TooltipRoot chrome="css" className="thunderdome-tooltip">
      <strong>{title}</strong>
      {children}
    </TooltipRoot>
  )
}
markTooltipChrome(TooltipShell)

function TooltipSourceLink({ href }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      Open source ↗
    </a>
  )
}

function timelineTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={`${datum.date ?? ""} · ${datum.title ?? "Timeline event"}`}>
      <span>{datum.interface ?? datum.kind}</span>
      <small>Authority: {datum.authority}</small>
      <small>{datum.note}</small>
      <TooltipSourceLink href={datum.sourceUrl} />
    </TooltipShell>
  )
}

function flowTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  if (datum.source != null && datum.target != null) {
    return (
      <TooltipShell title={`${endpointLabel(datum.source)} → ${endpointLabel(datum.target)}`}>
        <span>{datum.kind ?? "routed"}</span>
        <small>{datum.value} published items</small>
      </TooltipShell>
    )
  }
  return (
    <TooltipShell title={datum.label ?? datum.id ?? "Flow stage"}>
      <span>{datum.type ?? "stage"}</span>
    </TooltipShell>
  )
}

function collaborationTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={datum.bylinePattern ?? "Byline pattern"}>
      <span>{datum.year}</span>
      <small>
        {datum.share}% of {datum.items} published items
      </small>
    </TooltipShell>
  )
}

function sourceTagTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={datum.tag ?? "DHQ source tag"}>
      <span>{datum.period}</span>
      <small>
        {datum.taggedItems}/{datum.items} published items · {datum.share}%
      </small>
    </TooltipShell>
  )
}

function metadataClockTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={datum.title ?? `DHQ ${datum.articleId}`}>
      <span>
        {datum.publicationYear} → {datum.observedChangeDate}
      </span>
      <small>{datum.yearsBeforePass} years between publication and observed pass</small>
      <small>DHQ article {datum.articleId}</small>
      <TooltipSourceLink href={datum.sourceUrl} />
    </TooltipShell>
  )
}

function networkTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  if (datum.source != null && datum.target != null) {
    const route = datum.routes?.[0]
    return (
      <TooltipShell title={`${endpointLabel(datum.source)} → ${endpointLabel(datum.target)}`}>
        <span>{datum.relation ?? "reading route"}</span>
        <small>
          {route
            ? `${route.sourceTitle} → ${route.targetTitle}${route.rank ? ` · rank ${route.rank}` : ""}`
            : datum.sourceIds?.join(", ")}
        </small>
        {datum.routes?.length > 1 ? <small>{datum.routes.length} retained routes</small> : null}
        <TooltipSourceLink href={datum.sourceUrl} />
      </TooltipShell>
    )
  }
  return (
    <TooltipShell title={datum.label ?? datum.id ?? "Printed author name"}>
      <span>{datum.type ?? "author projection"}</span>
      <small>{datum.sourceIds?.length ?? 0} source article occurrence(s)</small>
      <TooltipSourceLink href={datum.sourceUrl} />
    </TooltipShell>
  )
}

function overlapTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  const article = RECOMMENDATION_ARTICLE_INDEX[datum.articleId] ?? []
  const shared = Math.round(Number(datum.overlap) || 0)
  return (
    <TooltipShell title={article[0] ?? `DHQ ${datum.articleId}`}>
      <span>{compactPairLabel(datum.pairId)}</span>
      <small>
        {shared} of 10 “read next” picks in common
        {shared === 0 ? " (totally different lists)" : ""}
      </small>
      <small>Starting article {datum.articleId}</small>
      <TooltipSourceLink href={article[1]} />
    </TooltipShell>
  )
}

function publicationWindow(year) {
  if (year <= 2011) return "2007–11"
  if (year <= 2016) return "2012–16"
  if (year <= 2021) return "2017–21"
  return "2022–25"
}
