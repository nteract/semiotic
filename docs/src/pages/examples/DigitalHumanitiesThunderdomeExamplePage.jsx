import React from "react"
import {
  GroupedBarChart,
  LineChart,
  SankeyDiagram,
  ThemeProvider,
  TooltipRoot,
  markTooltipChrome,
} from "semiotic"
import { XYCustomChart } from "semiotic/xy"
import { unwrapDatum, useReducedMotion } from "semiotic/utils"
import ChartMethodDisclosure from "../../components/ChartMethodDisclosure"
import useReadingLineSections from "../../hooks/useReadingLineSections"
import useResponsiveWidth from "../../hooks/useResponsiveWidth"
import ExamplePageLayout from "./ExamplePageLayout"
import {
  COLLABORATION_TREND,
  CRITICAL_AI_ISSUE_PROFILE,
  CRITICAL_AI_ISSUE_SUMMARY,
  DH_HISTORY_TIMELINE,
  DHQ_DATA_NOTE,
  DHQ_DOSSIER,
  DHQ_PROVENANCE,
  EDITORIAL_STATISTICS,
  FIELD_RISERS,
  FIELD_RISERS_SUMMARY,
  MEDIA_FIELD_SUMMARY,
  MEDIA_STUDIES_CONNECTIONS,
  MEDIA_STUDIES_CONNECTIONS_SUMMARY,
  PUBLICATION_STRUCTURE,
  SOURCE_TAG_TRENDS,
  TOOLS_PRACTICE_SUMMARY,
  TOOLS_PRACTICE_TRENDS,
} from "./data/dhqThunderdome.generated"
import "./DigitalHumanitiesThunderdomeExamplePage.css"

const ORIGINAL_ARTICLE_URL =
  "https://journalofdigitalhumanities.org/1-1/digital-humanities-as-thunderdome-by-elijah-meeks/"
const ORBIS_URL =
  "https://journalofdigitalhumanities.org/1-3/modeling-networks-and-scholarship-with-orbis-by-elijah-meeks-and-karl-grossner/"
const LDA_ISSUE_URL =
  "https://journalofdigitalhumanities.org/2-1/dh-contribution-to-topic-modeling/"
const INDEX_THOMISTICUS_URL = "https://dhq.digitalhumanities.org/vol/12/2/000380/000380.html"
const CRITICAL_AI_ISSUE_URL = "https://dhq.digitalhumanities.org/dhq/vol/17/2/index.html"
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
const EMPHASIS_WINDOW_COLORS = ["#365f74", "#5f8293", "#8ca6b2", "#c2cfd5"]
const DARK_FRAME = Object.freeze({ background: "transparent" })
const CHART_MOTION = Object.freeze({ duration: 460, easing: "ease-out", intro: true })

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
    chartTitle: "Change in emphasis over time",
    paragraphs: [
      "In the current XML, media studies sits on 36.7% of items published in 2007–11 and 3.4% in 2022–25. History rises from 15.6% to 21.2%. Race rises from 0.9% to 14.4%. Project report peaks at 26.7% in 2017–21.",
      "These are DHQ’s controlled tags, not topics guessed by a model. An item can carry several tags at once, so the bars are not a pie that must sum to 100. The vocabulary is inspectable, which is firmer ground than a free-form topic cloud.",
      "One bar is so extreme that it deserves its own question. Media Studies begins as DHQ’s most common controlled category. What does it mean for that category to nearly disappear?",
    ],
    shows: "How often current controlled tags appear by publication window",
    omits:
      "Mutually exclusive topics, field-wide prevalence, or labels assigned at publication time",
    caption:
      "Eight DHQ-controlled tags in the pinned archive, by publication window. One item may feed several bars.",
  },
  {
    id: "media-exit",
    number: "05",
    title: "DHQ stopped treating the digital as a medium",
    chart: "GroupedBarChart",
    chartTitle: "Media Studies falls out of DHQ’s connective tissue",
    paragraphs: [
      "Media Studies appears on 40 of 109 items from 2007–11 (36.7%), then on just 8 of 236 from 2022–25 (3.4%). A conservative family of narrower media tags briefly absorbs some of the difference, but the whole explicit media ecology still contracts from 45.0% to 13.1%.",
      `The deeper change is what Media Studies no longer connects. Early on, 6 of 14 tools articles and 11 of 27 articles tagged “DH” also carried Media Studies. In the latest window those overlaps are both zero. Its overlap with project reports falls from 6 of 19 to 1 of 40; with cultural criticism, from 7 of 17 to zero of 21.`,
      "Early DHQ used Media Studies as an umbrella for the field’s own technical condition: interfaces, electronic publishing, collaboration, tools, and the strangeness of digital form. Later DHQ still makes and studies digital systems, but files them as methods, disciplinary applications, projects, and politics. The journal did not stop being digital. The digital stopped being the shared object that needed explaining.",
    ],
    shows: "How Media Studies retreats overall and from four categories it once connected",
    omits: "Unlabeled media analysis, full-text topics, or the whole field of digital humanities",
    caption:
      "Within each controlled-tag context, the share also carrying Media Studies in the opening and latest windows. Contexts overlap; “All items” supplies the baseline.",
  },
  {
    id: "tools-practice",
    number: "06",
    title: "The tools tag is not where all the tools are",
    chart: "GroupedBarChart",
    chartTitle: "Tools, project reports, and either one",
    paragraphs: [
      "The explicit tools category does not trace a simple fall. It marks 12.8% of the opening window, rises to 24.0% in 2017–21, and returns to 13.6% in 2022–25. Project reports follow a similar arc. An item carrying either tag accounts for 27.5%, 27.2%, 44.1%, and 26.3% of the four windows.",
      "DHQ defines tools as work about platforms, apps, workflows, tool criticism, presentation, review, or adoption. That is a category of discourse, not an inventory of every article that computes. The taxonomy itself says tools is often linked to project reports, which is why the union is a better floor for visible making than tools alone.",
      `The elision becomes stark in 2024–25. ${TOOLS_PRACTICE_SUMMARY.audit2024To2025.methodItems} of ${TOOLS_PRACTICE_SUMMARY.audit2024To2025.items} items carry machine learning, NLP, data analytics, or data visualization; only ${TOOLS_PRACTICE_SUMMARY.audit2024To2025.methodAndTools} of those is tagged tools. All ${TOOLS_PRACTICE_SUMMARY.lateCaseStudies.items} recent formal case studies are practical work, and none is tagged tools. Practice became method, case, and situated intervention rather than “here is a tool.”`,
    ],
    shows: "How explicit tool discourse relates to DHQ’s own project-report category",
    omits: "Every computational method, software dependency, or kind of practical labor",
    caption:
      "Tools and project report are DHQ-controlled, multi-label tags. “Either” is their deduplicated union, not their sum.",
  },
  {
    id: "field-risers",
    number: "07",
    title: "The turn was toward consequence, not away from making",
    chart: "GroupedBarChart",
    chartTitle: "The topics gaining the most ground",
    paragraphs: [
      "Compare the opening and latest windows and the largest gains are not a roll call of traditional disciplines. Race rises from 0.9% to 14.4%. Ethics goes from zero to 11.9%. Minimal computing goes from zero to 7.6%. Social justice, global DH, archives, and gender all gain ground; history is the major conventional field among the eight.",
      "Meanwhile Literary Studies falls from 23.9% to 12.3%, and the old connective vocabulary also recedes: collaboration, infrastructure, publishing, and information retrieval. So “more humanities” is only half right. DHQ became less preoccupied with naming digital mediation and more preoccupied with whom digital work serves, where it happens, what it costs, and what it does to its subjects.",
      <>
        The journal’s founding question was how to shape digital humanities. Its current{" "}
        <a href={DHQ_PROVENANCE.aboutUrl} target="_blank" rel="noopener noreferrer">
          community statement
        </a>{" "}
        makes the desired shape explicit: inclusive, global, equitable, accessible, and attentive to
        the labor that sustains scholarly community. The tools remain. Their obligations moved to
        the foreground.
      </>,
    ],
    shows: "The eight largest percentage-point gains from the first to latest window",
    omits: "Why the changes occurred, editorial causation, or a field-wide topic model",
    caption:
      "Current controlled tags, sorted by the gain from 2007–11 to 2022–25. Bars are multi-label incidence, not shares of a single whole.",
  },
  {
    id: "critical-ai",
    number: "08",
    title: "AI fits the methods and collides with the mythology",
    chart: "GroupedBarChart",
    chartTitle: "How DHQ filed AI and code in volume 17.2",
    paragraphs: [
      <>
        DHQ already shows us how the present field meets AI. Its{" "}
        <a href={CRITICAL_AI_ISSUE_URL} target="_blank" rel="noopener noreferrer">
          2023 volume 17.2
        </a>{" "}
        includes a named “Code Legibility and Critical AI” section. Across the issue’s 26 items,
        tools and code studies appear nine times each, cultural criticism four times, machine
        learning three times, and Media Studies not once. AI is not rejected as computation. It is
        read as code, method, opacity, bias, gender, and politics.
      </>,
      "In the earlier shape of DH, AI-assisted coding would have looked like a long-awaited redistribution of implementation power. The humanist can make weird software without first submitting the question to a programmer’s veto. That is genuinely decolonizing along one axis. But the 2011 argument also objected to imported tools that shrink rich questions to fit conventional software. A model trained on conventional code can automate that contraction at extraordinary scale.",
      <>
        Current DH adds a harder test. DHQ’s{" "}
        <a href={DHQ_AI_POLICY_URL} target="_blank" rel="noopener noreferrer">
          AI policy
        </a>{" "}
        permits supportive use, but keeps direct agency, disclosure, accuracy, and responsibility
        with human authors. AI conflicts with today’s DH not because the field stopped computing,
        but because the product mythology of effortless substitution collides with a field now
        organized around situated labor and human scholarly relations.
      </>,
      "So yes: AI can be a decolonial tool. Cheap code is not decolonization by itself. The claim becomes true when access, language, ownership, governance, community, and consequences change with it.",
    ],
    shows: "How one issue containing an explicit Critical AI section was tagged",
    omits: "Each article’s stance, all DHQ writing about AI, or consensus across the field",
    caption:
      "Selected controlled-tag counts across all 26 items in DHQ volume 17.2. Items may carry several tags; Media Studies is included to make its zero visible.",
  },
]
const SCENE_IDS = SCENES.map((scene) => `thunderdome-round-${scene.number}`)

export default function DigitalHumanitiesThunderdomeExamplePage() {
  const reducedMotion = useReducedMotion()
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
              <span>The field</span>
              <strong>Did DH become less about tools—and if so, more about what?</strong>
            </div>
            <div>
              <span>The tool</span>
              <strong>
                If technical dependence was colonial, when is AI-assisted making decolonial?
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
              structure, taxonomy definitions, community commitments, and an AI policy. DHQ is the
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
                    <ArenaStage scene={scene} index={index} reducedMotion={reducedMotion} inline />
                  ) : null}
                </article>
              ))}
            </div>

            {!inlineLayout ? (
              <aside className="thunderdome-stage-column" aria-label="Active chart">
                <ArenaStage
                  scene={activeScene}
                  index={activeIndex}
                  reducedMotion={reducedMotion}
                  onSceneChange={goToScene}
                />
              </aside>
            ) : null}
          </section>
        </ThemeProvider>

        <section id="thunderdome-after" className="thunderdome-after">
          <p className="thunderdome-kicker">Where that leaves us</p>
          <h2>AI is decolonial at one layer and colonial at another</h2>
          <div>
            <p>
              DHQ did become less about something, but it was not tools. It left behind Media
              Studies as the umbrella under which the field explained its own digital condition.
              Explicit tool and project practice remains near its opening share. What changed is the
              position of the tool: less often the protagonist, more often a method inside work
              about history, race, ethics, access, community, and consequence.
            </p>
            <p>
              AI-assisted coding really does weaken the old technical veto. A scholar can generate a
              database, interface, and chart without first persuading a programmer that the question
              deserves to exist. Earlier DH would have recognized that as an extraordinary expansion
              of experimental practice. We should call that redistribution of authority what it is
              instead of treating AI only as convenience or threat.
            </p>
            <p>
              But the original problem was never only the programmer. It was software’s power to
              contract a rich question until it fit the available system. Generative models can
              remove the scarce expert while reproducing the most conventional code, ontology, and
              interface at industrial scale. Authority moves away from the local toolbuilder and
              toward training data, model providers, platforms, and defaults that are harder to
              inspect or contest.
            </p>
            <p>
              That is why AI meets more friction in the present shape of DH. The field now asks who
              controls the data and infrastructure, whose language survives, whose labor is hidden,
              who can access the result, and who bears its errors. DHQ’s{" "}
              <a href={DHQ_AI_POLICY_URL} target="_blank" rel="noopener noreferrer">
                AI policy
              </a>{" "}
              is not anti-computation: it allows supportive uses while keeping agency, disclosure,
              accuracy, and responsibility with the human author. AI belongs when it supports human
              scholarly relations. It conflicts when substitution is sold as the relation itself.
            </p>
          </div>
          <p className="thunderdome-after__closing">
            The humanist can make the app now. That becomes decolonization when we can also change
            the terms on which it is made, governed, read, and sustained.
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
            . Controlled tags describe the current archive and include retrospective keywording;
            cohort comparisons do not recover the vocabulary visible at original publication.
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

function ArenaStage({ scene, index, reducedMotion, onSceneChange, inline = false }) {
  const [width, hostRef] = useResponsiveWidth(220, 680)
  const chartHeight = 430

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

      <div className="thunderdome-stage__chart" ref={hostRef}>
        <SceneChart
          key={scene.id}
          scene={scene}
          width={width}
          height={chartHeight}
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

function SceneChart({ scene, width, height, reducedMotion }) {
  const animate = reducedMotion ? false : CHART_MOTION
  const compact = width < 500
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
        margin={{ top: 24, right: 28, bottom: 26, left: 28 }}
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
            ? { top: 24, right: 78, bottom: 28, left: 84 }
            : { top: 24, right: 104, bottom: 28, left: 150 }
        }
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
          top: 24,
          right: compact ? 24 : 38,
          bottom: compact ? 116 : 96,
          left: compact ? 54 : 58,
        }}
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
        colorScheme={EMPHASIS_WINDOW_COLORS}
        valueExtent={[0, 40]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={3}
        margin={{
          top: 24,
          right: compact ? 14 : 22,
          bottom: compact ? 124 : 88,
          left: compact ? 108 : 130,
        }}
        description="A grouped horizontal bar chart of eight current DHQ-controlled tags, each expressed as the multi-label share of published items in four publication windows."
        summary="The bars describe the pinned archive with its current vocabulary. Retrospective keywording means they are not a contemporaneous topic series."
        valueFormat={(value) => `${Math.round(value)}%`}
        tooltip={sourceTagTooltip}
      />
    )
  }

  if (scene.id === "media-exit") {
    return (
      <GroupedBarChart
        {...common}
        chartId="thunderdome-media-exit"
        data={MEDIA_STUDIES_CONNECTIONS}
        categoryAccessor="context"
        groupBy="period"
        valueAccessor="share"
        colorBy="period"
        colorScheme={PATH_COLORS}
        valueExtent={[0, 50]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={3}
        margin={{
          top: 24,
          right: compact ? 14 : 22,
          bottom: compact ? 124 : 88,
          left: compact ? 126 : 154,
        }}
        description="A grouped horizontal bar chart comparing how often Media Studies appears overall and within Tools, Project Report, Digital Humanities, and Cultural Criticism in the opening and latest DHQ publication windows."
        summary={`${MEDIA_FIELD_SUMMARY.explicit.earlyItems} opening-window items carry Media Studies, compared with ${MEDIA_FIELD_SUMMARY.explicit.lateItems} in the latest. Within Tools the overlap falls from ${MEDIA_STUDIES_CONNECTIONS_SUMMARY.contexts.tools.earlyShare}% to zero, and within Digital Humanities from ${MEDIA_STUDIES_CONNECTIONS_SUMMARY.contexts.digitalHumanities.earlyShare}% to zero.`}
        valueFormat={(value) => `${Number(value).toFixed(1)}%`}
        tooltip={trendTooltip}
      />
    )
  }

  if (scene.id === "tools-practice") {
    return (
      <GroupedBarChart
        {...common}
        chartId="thunderdome-tools-practice"
        data={TOOLS_PRACTICE_TRENDS}
        categoryAccessor="measure"
        groupBy="period"
        valueAccessor="share"
        colorBy="period"
        colorScheme={PATH_COLORS}
        valueExtent={[0, 50]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={3}
        margin={{
          top: 24,
          right: compact ? 14 : 22,
          bottom: compact ? 124 : 88,
          left: compact ? 106 : 126,
        }}
        description="A grouped horizontal bar chart comparing DHQ’s Tools tag, Project Report tag, and the deduplicated union of either tag across four publication windows."
        summary="Explicit tools peaks in 2017–21 rather than declining steadily. The tools-or-project union covers 27.5% of the opening window and 26.3% of the latest."
        valueFormat={(value) => `${Number(value).toFixed(1)}%`}
        tooltip={trendTooltip}
      />
    )
  }

  if (scene.id === "field-risers") {
    return (
      <GroupedBarChart
        {...common}
        chartId="thunderdome-field-risers"
        data={FIELD_RISERS}
        categoryAccessor="tag"
        groupBy="period"
        valueAccessor="share"
        colorBy="period"
        colorScheme={[CORAL, ACID]}
        valueExtent={[0, 25]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend
        legendPosition="bottom"
        roundedTop={3}
        margin={{
          top: 24,
          right: compact ? 14 : 22,
          bottom: compact ? 104 : 82,
          left: compact ? 112 : 136,
        }}
        description="A grouped horizontal bar chart comparing the 2007–11 and 2022–25 incidence of the eight DHQ-controlled tags with the largest positive percentage-point changes."
        summary={`${FIELD_RISERS_SUMMARY.leaders[0].tag} gains ${FIELD_RISERS_SUMMARY.leaders[0].delta} percentage points and ${FIELD_RISERS_SUMMARY.leaders[1].tag} gains ${FIELD_RISERS_SUMMARY.leaders[1].delta}. The leaders emphasize power, responsibility, limits, and situated practice.`}
        valueFormat={(value) => `${Number(value).toFixed(1)}%`}
        tooltip={trendTooltip}
      />
    )
  }

  if (scene.id === "critical-ai") {
    return (
      <GroupedBarChart
        {...common}
        chartId="thunderdome-critical-ai"
        data={CRITICAL_AI_ISSUE_PROFILE}
        categoryAccessor="tag"
        groupBy={() => "Volume 17.2"}
        valueAccessor="count"
        colorBy="tag"
        colorScheme={HISTORY_COLORS}
        valueExtent={[0, 10]}
        orientation="horizontal"
        sort={false}
        showGrid
        showLegend={false}
        roundedTop={3}
        margin={{ top: 24, right: compact ? 14 : 22, bottom: 58, left: compact ? 118 : 144 }}
        description="A horizontal bar chart of eight selected DHQ controlled-tag counts across the 26 items published in volume 17.2, which contains a named Code Legibility and Critical AI section."
        summary={`${CRITICAL_AI_ISSUE_SUMMARY.tools} items are tagged Tools and the same number Code Studies; ${CRITICAL_AI_ISSUE_SUMMARY.machineLearning} are tagged Machine Learning and ${CRITICAL_AI_ISSUE_SUMMARY.mediaStudies} Media Studies.`}
        valueFormat={(value) => `${Math.round(Number(value))} items`}
        tooltip={issueTagTooltip}
      />
    )
  }

  return null
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

function compactPublicationLabel(value) {
  const datum = unwrapDatum(value) ?? {}
  if (datum.id === "all") return "All 806"
  if (datum.id === "placement:named public cluster") return "Named cluster"
  if (datum.id === "placement:outside named cluster") return "Outside cluster"
  return datum.label ?? datum.id
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

function trendTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={datum.tag ?? datum.measure ?? datum.context ?? "DHQ trend"}>
      <span>{datum.period}</span>
      <small>
        {datum.taggedItems}/{datum.items} published items · {datum.share}%
      </small>
      {datum.delta != null ? <small>{datum.delta} percentage-point gain</small> : null}
    </TooltipShell>
  )
}

function issueTagTooltip(value) {
  const datum = unwrapDatum(value) ?? {}
  return (
    <TooltipShell title={datum.tag ?? "DHQ controlled tag"}>
      <span>
        Volume {CRITICAL_AI_ISSUE_SUMMARY.volume}.{CRITICAL_AI_ISSUE_SUMMARY.issue}
      </span>
      <small>
        {datum.count}/{datum.items} items · {datum.share}%
      </small>
    </TooltipShell>
  )
}
