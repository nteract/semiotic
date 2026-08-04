import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ForceDirectedGraph,
  GroupedBarChart,
  LineChart,
  SankeyDiagram,
  SwarmPlot,
  ThemeProvider,
} from "semiotic"
import { CollisionSwarmChart } from "semiotic/physics"
import { XYCustomChart } from "semiotic/xy"
import { useReducedMotion } from "semiotic/utils"
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
const INDEX_THOMISTICUS_URL =
  "https://dhq.digitalhumanities.org/vol/12/2/000380/000380.html"
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
  classification: "One tag or several",
  "recommendation-walk": "Authors along a reading route",
  overlap: "Three definitions of nearby",
})

const COMPACT_CLASSIFICATION_LABELS = Object.freeze({
  all: "All items",
  single: "One tag",
  multiple: "Multiple",
  absent: "No tag",
  "single-display": "One shown",
  "multiple-retained": "Retain many",
  unclassified: "Unclassified",
})

const RECOMMENDATION_METHOD_LABELS = Object.freeze({
  keywords: "Controlled keywords",
  bm25: "BM25 full text",
  specter: "SPECTER embeddings",
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
    eyebrow: "The long view",
    title: "AI did not arrive in an empty tool shed.",
    chart: "XYCustomChart",
    chartTitle: "Interfaces to implementation, 1949–2026",
    paragraphs: [
      <>
        The canonical Aquinas project began in 1949 as Roberto Busa, IBM, punch cards,
        operators, and years of checking.{" "}
        <a href={INDEX_THOMISTICUS_URL} target="_blank" rel="noopener noreferrer">
          DHQ’s reconstruction
        </a>{" "}
        makes the human work inside that automation hard to miss. TEI later put shared
        encoding under community governance. The web made archives into interfaces.
      </>,
      <>
        <a href={ORBIS_URL} target="_blank" rel="noopener noreferrer">
          ORBIS
        </a>{" "}
        turned an argument about Roman movement into a contestable network model. The{" "}
        <a href={LDA_ISSUE_URL} target="_blank" rel="noopener noreferrer">
          LDA special issue
        </a>{" "}
        was my attempt to make the colonization-or-collaboration problem concrete: put an
        imported model beside its maker, practitioners, applications, criticism, and tools.
        These were not steps toward less mediation. They moved the boundary between
        interpretation and implementation.
      </>,
      "AI-assisted coding moves that boundary again. It can produce a transformation, an interface, and a visualization while the question is still being worked out. That is more consequential than calling AI another tool, and less magical than claiming the tool has disappeared.",
    ],
    keeps: "Thirteen documented changes in the interface to implementation",
    drops: "A story of smooth progress or comparable labor across the cases",
    caption:
      "A custom Semiotic spiral from the Index Thomisticus to DHQ’s 2026 AI policy. The spiral is chronology, not a scale of importance.",
  },
  {
    id: "editorial-shape",
    number: "02",
    eyebrow: "Editorial grouping",
    title: "A journal does not simply sample a field.",
    chart: "SankeyDiagram",
    chartTitle: "Named public clusters in the 806-item corpus",
    paragraphs: [
      `DHQ reports ${EDITORIAL_STATISTICS.peerReviewedPublished} peer-reviewed articles and case studies through 2025: ${EDITORIAL_STATISTICS.regularPublished} through the regular stream and ${EDITORIAL_STATISTICS.specialPublished} through special issues. The journal warns that those routes have different selection histories, so I am not turning them into competing acceptance rates.`,
      `The public table of contents gives us a second, narrower measure. In this 806-item corpus, ${PUBLICATION_STRUCTURE.placedInNamedClusters} items appear inside ${PUBLICATION_STRUCTURE.namedClusterCount} named clusters. Those clusters gather work under a question before a reader or recommendation system encounters it.`,
      "A subject concentration can record activity in digital humanities, an invitation made by editors, or both. The ability to build a new interface does not redistribute the earlier decision about what enters the interface together.",
    ],
    keeps: "Published placement and separately reported publication streams",
    drops: "Item-level acceptance routes, editorial motives, and comparable acceptance rates",
    caption:
      "All 806 corpus items flow through public named-cluster placement and publication window. The separate 386/324 journal totals have different inclusion rules.",
  },
  {
    id: "authorship",
    number: "03",
    eyebrow: "Published authorship",
    title: "More names appear on the work.",
    chart: "LineChart",
    chartTitle: "Annual share of one- and multi-byline published items",
    paragraphs: [
      "The standard AI demonstration is solitary: one scholar, one prompt, one finished application. DHQ’s published record was moving in another direction before the present AI wave.",
      "Items with two or more listed authors rise from 32.1% in 2007–11 to 54.7% in 2022–25. The annual line jumps because the journal published between 6 and 79 items per year, so every point keeps its denominator.",
      "A byline is still a narrow record. It cannot tell us who wrote code, cleaned data, designed an interface, found funding, or kept a server alive. It tells us that named coauthorship became more common.",
    ],
    keeps: "A bounded change in names listed on published items",
    drops: "Labor roles, contribution shares, and an explanation for why teams formed",
    caption:
      "Annual percentages of published items with one versus two-or-more listed authors. Each point reports its year’s publication count.",
  },
  {
    id: "subjects",
    number: "04",
    eyebrow: "Current tag shares",
    title: "This is what DHQ calls its subjects now.",
    chart: "GroupedBarChart",
    chartTitle: "Eight controlled tags across four publication windows",
    paragraphs: [
      "In the current XML, media studies appears on 36.7% of items published in 2007–11 and 3.4% in 2022–25. History rises from 15.6% to 21.2%; race rises from 0.9% to 14.4%. Project report reaches its highest share, 26.7%, in 2017–21.",
      "These are DHQ’s controlled tags, not topics inferred by a model. They are also multi-label: an item can contribute to several bars. The vocabulary and denominators remain inspectable, which gives us something firmer than a topic cloud.",
      "Read alone, the chart looks like a history of subjects. Before accepting that reading, we need another date.",
    ],
    keeps: "Current controlled-tag incidence and publication denominators",
    drops: "Mutually exclusive topics, field-wide prevalence, and publication-time labels",
    caption:
      "Eight DHQ-controlled tags in the pinned archive, grouped by publication window. An item may contribute to several bars.",
  },
  {
    id: "metadata-clock",
    number: "05",
    eyebrow: "Repository time",
    title: "Publication is only one clock.",
    chart: "CollisionSwarmChart",
    chartTitle: "How long current metadata can lag publication",
    paragraphs: [
      `On July 11, 2023, one commit updated controlled keywords in 615 article XML files. Across the keyword-named commits on July 11 and 12, ${METADATA_CLOCK_SUMMARY.repositoryFilesTouched} distinct article files in this corpus were changed.`,
      "Each body is tethered to the number of years between publication and that observed repository pass. A current tag attached to a 2008 article can arrive in the Git record fifteen years later.",
      "The previous chart remains true, but its question changes. It shows how DHQ’s current vocabulary describes its published past. It does not reconstruct what every article was called in its publication year.",
    ],
    keeps: "Publication dates and an observed repository keywording pass",
    drops: "First-assignment dates, pre-Git history, and reasons for changing a tag",
    caption:
      "One Semiotic physics body per corpus article touched by keyword-named commits on July 11–12, 2023. Bodies are grouped by publication window.",
  },
  {
    id: "classification",
    number: "06",
    eyebrow: "Display policy",
    title: "791 records have more than one tag.",
    chart: "SankeyDiagram",
    chartTitle: "What happens when multiple source tags become one display tag?",
    paragraphs: [
      "Of the 806 published items in this snapshot, 791 carry multiple controlled tags. Five carry one, and ten have none. Multiplicity is the ordinary condition of this archive.",
      "The first button sends every multi-tag record toward one displayed tag. The second keeps the multiplicity in view. The source records do not change; the first Sankey is cleaner because the interface discarded a relation.",
      "A natural-language interface can make the same decision without showing the button. AI-assisted coding gives more scholars the power to put that choice back in front of the reader, provided they know the choice exists.",
    ],
    keeps: "Source multiplicity, record conservation, and the exact display rule",
    drops: "A single true subject or a claim that DHQ used either display rule",
    caption:
      "The same 806 published records under two display policies. The control changes only how multi-tag records are routed.",
  },
  {
    id: "recommendation-walk",
    number: "07",
    eyebrow: "Recommended reading",
    title: "Follow the recommendation to its authors.",
    chart: "ForceDirectedGraph",
    chartTitle: "Two recommendation steps projected onto printed author names",
    paragraphs: [
      <>
        DHQ’s{" "}
        <a href={DHQ_EXPLORE_URL} target="_blank" rel="noopener noreferrer">
          Explore page
        </a>{" "}
        offers three answers to “what belongs nearby?” Controlled keywords follow an
        editorial vocabulary. BM25 follows terms in the full text. SPECTER follows
        embeddings made from titles and abstracts.
      </>,
      `This view starts with Anna Sollazzo’s 2026 article, takes the top three recommendations, takes the top three again, and projects those reading routes onto the exact author names printed in DHQ. Switch methods and the neighborhood changes. Across the focal article’s three top-ten lists, ${RECOMMENDATION_SUMMARY.seed.distinctTopTenTargets} distinct articles occupy 30 slots; none appears in all three.`,
      "This is an information route, not an issue roster. It shows which named authors a reader can reach after two algorithmic choices. It does not tell us who influenced whom, and it does not quietly merge matching strings into people.",
    ],
    keeps: "Two explicit recommendation steps and exact printed byline names",
    drops: "Person identity, influence, recommendation quality, and reader behavior",
    caption:
      "A multimodal projection from article-to-article recommendations onto author names. Shared-byline edges remain visible; recommendation edges are reading routes.",
  },
  {
    id: "overlap",
    number: "08",
    eyebrow: "All public source articles",
    title: "The three methods mostly disagree.",
    chart: "SwarmPlot",
    chartTitle: "Pairwise overlap among three top-ten recommendation lists",
    paragraphs: [
      `The author walk could be an unusual case, so this view uses all ${RECOMMENDATION_SUMMARY.indexedArticles} public articles present in the three recommendation files. Each point is one source article under one pair of methods, positioned by the number of shared targets in their top ten.`,
      `Controlled keywords and BM25 share ${RECOMMENDATION_SUMMARY.pairSummary[0].mean} recommendations on average. BM25 and SPECTER share ${RECOMMENDATION_SUMMARY.pairSummary[1].mean}; controlled keywords and SPECTER share ${RECOMMENDATION_SUMMARY.pairSummary[2].mean}. Only ${RECOMMENDATION_SUMMARY.allThreeDirectedEdges.toLocaleString()} of ${RECOMMENDATION_SUMMARY.unionDirectedEdges.toLocaleString()} distinct directed edges occur in all three systems—about ${RECOMMENDATION_SUMMARY.allThreeDirectedShare.toFixed(2)}%.`,
      `For ${RECOMMENDATION_SUMMARY.sourcesWithNoAllThreeTarget} source articles, not one target appears in all three top-ten lists. The tools do not merely accelerate the same reading practice. They formalize different ones.`,
    ],
    keeps: "Complete pairwise overlap distributions for 832 public articles",
    drops: "A judgment about relevance, a winning method, or evidence of readership",
    caption:
      "One point per source article and method pair. Overlap counts shared targets among two top-ten lists; zero means the pair returns twenty distinct articles.",
  },
]

export default function DigitalHumanitiesThunderdomeExamplePage() {
  const reducedMotion = useReducedMotion()
  const [classificationMode, setClassificationMode] = useState("default")
  const [recommendationMode, setRecommendationMode] = useState("keywords")
  const [activeIndex, setActiveIndex] = useState(0)
  const [pageWidth, pageRef] = useResponsiveWidth(320, 1120)
  const sceneRefs = useRef([])
  const activeIndexRef = useRef(0)
  const requestedSceneRef = useRef(null)
  const inlineLayout = reducedMotion || pageWidth < 860

  const commitSceneIndex = useCallback((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= SCENES.length) return
    if (activeIndexRef.current === index) return
    activeIndexRef.current = index
    setActiveIndex(index)
  }, [])

  useEffect(() => {
    if (inlineLayout || typeof IntersectionObserver === "undefined") return undefined
    const elements = sceneRefs.current.filter(Boolean)
    if (!elements.length) return undefined

    const sceneAtReadingLine = () => {
      const readingLine = window.innerHeight * 0.43
      let lastPassedIndex = null

      for (const element of elements) {
        const index = Number(element.dataset.sceneIndex)
        if (!Number.isInteger(index)) continue
        const bounds = element.getBoundingClientRect()
        if (bounds.top <= readingLine && bounds.bottom > readingLine) return index
        if (bounds.top <= readingLine) lastPassedIndex = index
      }

      return lastPassedIndex
    }

    const observer = new IntersectionObserver(
      () => {
        const index = sceneAtReadingLine()
        if (!Number.isInteger(index)) return

        // Stage navigation commits immediately. Ignore observer callbacks from
        // the chapter being left until the requested chapter reaches the
        // reading line, so a stale callback cannot restore the previous view.
        if (requestedSceneRef.current != null && requestedSceneRef.current !== index) return
        requestedSceneRef.current = null
        commitSceneIndex(index)
      },
      { rootMargin: "-42% 0px -57%", threshold: 0 },
    )

    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [commitSceneIndex, inlineLayout])

  const goToScene = useCallback(
    (index) => {
      requestedSceneRef.current = index
      commitSceneIndex(index)
      sceneRefs.current[index]?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      })
    },
    [commitSceneIndex, reducedMotion],
  )

  const activeScene = SCENES[activeIndex] ?? SCENES[0]

  return (
    <ExamplePageLayout title="Thunderdome Has Rounded Corners">
      <div className="thunderdome" ref={pageRef}>
        <header className="thunderdome-hero">
          <div className="thunderdome-hero__main">
            <p className="thunderdome-kicker">Digital humanities · 1949 → 2026</p>
            <h2>The humanist can make the app now.</h2>
            <p className="thunderdome-hero__lede">
              In 2011 a Stanford graduate student told me that collaboration with computer
              scientists could feel more like colonization. I thought that was true. I was one
              of the technical people scholars had to ask whether an idea was possible, and my
              answer was bounded by the software I knew and the code I could write.
            </p>
            <p className="thunderdome-hero__lede">
              That arrangement has changed. A scholar can ask a model to build the database,
              interface, and visualization, then argue with the result until it runs. If
              colonization by toolbuilders was the problem, why isn’t the ability to make our
              own weird code being hailed as decolonization?
            </p>
            <div className="thunderdome-hero__actions">
              <a href="#thunderdome-arena">Test the claim</a>
              <a href={ORIGINAL_ARTICLE_URL} target="_blank" rel="noopener noreferrer">
                Read the 2011 essay <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <aside className="thunderdome-hero__docket" aria-label="The old and new questions">
            <p>Argument docket · revision 03</p>
            <div>
              <span>The old question</span>
              <strong>Who gets to say which humanistic questions software can represent?</strong>
            </div>
            <div>
              <span>The new question</span>
              <strong>
                What changes when the person with the question can also generate the
                implementation?
              </strong>
            </div>
            <small>Filed by Elijah Meeks · tested with DHQ and Semiotic</small>
          </aside>
        </header>

        <section className="thunderdome-setup" aria-labelledby="thunderdome-setup-title">
          <div>
            <p className="thunderdome-kicker">The case</p>
            <h2 id="thunderdome-setup-title">Use a journal to test the claim.</h2>
          </div>
          <div className="thunderdome-setup__copy">
            <p>
              I do not think the answer is that nothing changed. The ability to make and revise
              an application without waiting for a technical specialist matters.
              Implementation, however, is only one place where choices get made.
            </p>
            <p>
              DHQ is a useful case because I know it as a former editor and author, and because
              its public record is unusually inspectable. The XML corpus gives us{" "}
              {DHQ_DOSSIER.sourceItems} published items through 2025. The repository adds issue
              structure, retrospective metadata, and three working recommendation systems. DHQ
              is the case, not a substitute for the whole field.
            </p>
          </div>
        </section>

        <a className="thunderdome-skip" href="#thunderdome-after">
          Skip the eight-round arena
        </a>

        <ThemeProvider theme="carbon-dark">
          <section
            id="thunderdome-arena"
            className={`thunderdome-arena ${inlineLayout ? "is-inline" : "is-sticky"}`}
            aria-label="Eight-round scrollytelling argument"
          >
            <div className="thunderdome-rounds">
              {SCENES.map((scene, index) => (
                <article
                  id={`thunderdome-round-${scene.number}`}
                  key={scene.id}
                  ref={(element) => {
                    sceneRefs.current[index] = element
                  }}
                  data-scene-index={index}
                  className={`thunderdome-round ${activeIndex === index ? "is-active" : ""}`}
                  aria-current={!inlineLayout && activeIndex === index ? "step" : undefined}
                >
                  <div className="thunderdome-round__head">
                    <span>{scene.number}</span>
                    <p>{scene.eyebrow}</p>
                  </div>
                  <h2>{scene.title}</h2>
                  {scene.paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${scene.id}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                  <dl className="thunderdome-round__ledger">
                    <div>
                      <dt>This view carries</dt>
                      <dd>{scene.keeps}</dd>
                    </div>
                    <div>
                      <dt>This view drops</dt>
                      <dd>{scene.drops}</dd>
                    </div>
                  </dl>

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
              <aside className="thunderdome-stage-column" aria-label="Active Semiotic view">
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
          <p className="thunderdome-kicker">The answer</p>
          <h2>Implementation power moved. The rest of the argument is still here.</h2>
          <div>
            <p>
              If we keep the 2011 metaphor narrow, AI-assisted coding is decolonizing one part
              of the old arrangement: it weakens the technical veto. Humanists can make much
              more weird code, much faster, without first persuading a programmer that the idea
              is possible. Digital humanities should admit that this is a redistribution of
              power, not treat it only as convenience or threat.
            </p>
            <p>
              Decolonization is not a synonym for easier access. Models and platforms compress
              inherited code, conventions, blind spots, and labor into a very agreeable tool.
              DHQ shows the choices that remain before and after generation: selection,
              grouping, authorship, taxonomy, retrospective description, display, retrieval,
              testing, and maintenance.
            </p>
            <p>
              DHQ is not simply anti-AI. Its{" "}
              <a href={DHQ_AI_POLICY_URL} target="_blank" rel="noopener noreferrer">
                2026 policy
              </a>{" "}
              permits supportive uses while keeping agency, disclosure, accuracy, and
              responsibility with the human author. That is the useful standard for weird code
              too: expose enough of the transformation for somebody else to argue with it.
            </p>
          </div>
          <strong className="thunderdome-after__closing">
            The humanist can make the app now. What does the app let everyone else argue with?
          </strong>
        </section>

        <footer className="thunderdome-source">
          <p>
            Reframed from Elijah Meeks,{" "}
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
            {DHQ_DATA_NOTE} Core-corpus scope: {DHQ_PROVENANCE.scope}. Repository evidence is
            pinned to{" "}
            <a
              href={`${DHQ_PROVENANCE.repositoryUrl}/tree/${DHQ_PROVENANCE.repositoryCommit}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DHQ_PROVENANCE.repositoryCommit.slice(0, 12)}
            </a>
            . Recommendation edges describe navigational similarity, not citation or
            influence; byline strings are not resolved person identities.
          </p>
          <p>
            This example was developed with AI-assisted repository inspection, analysis, and
            coding. The thesis, source choices, interpretation, and responsibility remain human.
            Every data visualization on the page is rendered with Semiotic.
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
          <span>Fig. {scene.number} · Semiotic</span>
          <h3>{scene.chart}</h3>
        </div>
        <span className="thunderdome-stage__status">source-backed</span>
      </header>

      {!inline && onSceneChange ? (
        <nav className="thunderdome-stage__nav" aria-label="Arena rounds">
          {SCENES.map((round, roundIndex) => (
            <button
              type="button"
              key={round.id}
              onClick={() => onSceneChange(roundIndex)}
              aria-label={`Round ${round.number}: ${round.title}`}
              aria-current={roundIndex === index ? "step" : undefined}
            >
              {round.number}
            </button>
          ))}
        </nav>
      ) : null}

      {scene.id === "classification" ? (
        <div className="thunderdome-stage__controls">
          <span>Classification policy</span>
          <div role="group" aria-label="Classification policy">
            <button
              type="button"
              className={classificationMode === "default" ? "is-active" : ""}
              aria-pressed={classificationMode === "default"}
              onClick={() => onClassificationMode("default")}
            >
              Display one tag
            </button>
            <button
              type="button"
              className={classificationMode === "preserve" ? "is-active" : ""}
              aria-pressed={classificationMode === "preserve"}
              onClick={() => onClassificationMode("preserve")}
            >
              Retain multiple tags
            </button>
          </div>
          <p aria-live="polite">{classification.summary.finding}</p>
        </div>
      ) : null}

      {scene.id === "recommendation-walk" ? (
        <div className="thunderdome-stage__controls">
          <span>Definition of nearby</span>
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
            {recommendationWalk.nodes.length} printed author names reached through{" "}
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

function SceneChart({
  scene,
  width,
  height,
  classification,
  recommendationWalk,
  reducedMotion,
}) {
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
            ? "A Sankey diagram in which every multi-tag DHQ record is reduced to one displayed tag, while records without tags stay unclassified."
            : "A Sankey diagram in which multi-tag DHQ records retain their source multiplicity, while records without tags stay unclassified."
        }
        summary={classification.summary.finding}
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
      valueLabel="Shared targets in two top-ten lists"
      valueFormat={(value) => `${Math.round(Number(value))}`}
      showGrid
      showLegend={false}
      margin={{
        top: 54,
        right: compact ? 18 : 28,
        bottom: 58,
        left: compact ? 102 : 172,
      }}
      title={chartTitle}
      description={`A horizontal swarm plot of ${RECOMMENDATION_OVERLAPS.length.toLocaleString()} pairwise method comparisons across ${RECOMMENDATION_SUMMARY.indexedArticles} public DHQ source articles. Horizontal position is the number of shared targets between two top-ten lists.`}
      summary={`Pairwise mean overlap ranges from ${RECOMMENDATION_SUMMARY.pairSummary[0].mean} to ${RECOMMENDATION_SUMMARY.pairSummary[1].mean} of ten. Similarity depends strongly on the retrieval method.`}
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

function datumOf(value) {
  return value?.data ?? value?.datum ?? value ?? {}
}

function compactClassificationLabel(value) {
  const datum = datumOf(value)
  return COMPACT_CLASSIFICATION_LABELS[datum.id] ?? datum.label ?? datum.id
}

function compactPublicationLabel(value) {
  const datum = datumOf(value)
  if (datum.id === "all") return "All 806"
  if (datum.id === "placement:named public cluster") return "Named cluster"
  if (datum.id === "placement:outside named cluster") return "Outside cluster"
  return datum.label ?? datum.id
}

function compactPairLabel(value) {
  const label = String(value)
  if (label === "K/B") return "Keywords / BM25"
  if (label === "B/S") return "BM25 / SPECTER"
  if (label === "K/S") return "Keywords / SPECTER"
  if (label === "keywords-bm25") return "Keywords / BM25"
  if (label === "bm25-specter") return "BM25 / SPECTER"
  if (label === "keywords-specter") return "Keywords / SPECTER"
  if (label.startsWith("Controlled keywords / BM25")) return "Keywords / BM25"
  if (label.startsWith("BM25 full text / SPECTER")) return "BM25 / SPECTER"
  if (label.startsWith("Controlled keywords / SPECTER")) return "Keywords / SPECTER"
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
    <div className="thunderdome-tooltip">
      <strong>{title}</strong>
      {children}
    </div>
  )
}

function TooltipSourceLink({ href }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      Open source ↗
    </a>
  )
}

function timelineTooltip(value) {
  const datum = datumOf(value)
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
  const datum = datumOf(value)
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
  const datum = datumOf(value)
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
  const datum = datumOf(value)
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
  const datum = datumOf(value)
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
  const datum = datumOf(value)
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
  const datum = datumOf(value)
  const article = RECOMMENDATION_ARTICLE_INDEX[datum.articleId] ?? []
  return (
    <TooltipShell title={article[0] ?? `DHQ ${datum.articleId}`}>
      <span>{compactPairLabel(datum.pairId)}</span>
      <small>{datum.overlap} shared targets in two top-ten lists</small>
      <small>DHQ article {datum.articleId}</small>
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
