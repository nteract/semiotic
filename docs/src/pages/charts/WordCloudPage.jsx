import React from "react"
import { Link } from "react-router-dom"
import { WordCloud } from "semiotic/wordcloud"
import PageLayout from "../../components/PageLayout"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import ChartGrounding from "../../components/ChartGrounding"

const data = [
  { text: "care", value: 34 },
  { text: "trust", value: 25 },
  { text: "clarity", value: 21 },
  { text: "wonder", value: 18 },
  { text: "patience", value: 12 },
  { text: "craft", value: 9 },
]
const props = [
  {
    name: "data",
    type: "array",
    required: true,
    description: "Already aggregated terms. The chart does not tokenize text or remove stop words.",
  },
  {
    name: "layout",
    type: "object",
    description:
      "Portable prepareWordCloudLayout result. Optional in React; required for server/MCP rendering. Data and all arrangement options must match.",
  },
  {
    name: "textAccessor",
    type: "string | function",
    default: '"text"',
    description: "Term label.",
  },
  {
    name: "valueAccessor",
    type: "string | function",
    default: '"value"',
    description: "Positive finite term weight.",
  },
  {
    name: "idAccessor",
    type: "string | function",
    description:
      "Stable identity, defaulting to term text. First valid duplicate wins; remaining rows are reported as omissions.",
  },
  {
    name: "width",
    type: "number",
    default: "640",
    description: "Outer width. Layout dimensions are the inner rectangle after explicit margin.",
  },
  {
    name: "height",
    type: "number",
    default: "400",
    description: "Outer height. Inner dimensions must be integer pixels from 1 through 2040.",
  },
  {
    name: "fontFamily",
    type: "string",
    default: '"sans-serif"',
    description:
      "Font to load before preparation. Use the same font file and raster environment for reproducible placement.",
  },
  {
    name: "fontSizeRange",
    type: "array",
    default: "[12, 64]",
    description: "Minimum and maximum font sizes; words too large to fit remain in omitted.",
  },
  {
    name: "fontSizeScale",
    type: "string",
    default: '"sqrt"',
    description: "sqrt, linear or log mapping of weight relative to the largest term.",
  },
  {
    name: "rotate",
    type: "string | array",
    default: '"horizontal"',
    description: "horizontal, orthogonal, or explicit angles in degrees.",
  },
  {
    name: "seed",
    type: "number",
    default: "42",
    description:
      "Controls rotations and candidate positions. Equal fonts, dimensions and options are also needed for determinism.",
  },
  {
    name: "padding",
    type: "number",
    default: "1",
    description: "Collision padding around each word in pixels.",
  },
  {
    name: "maxWords",
    type: "number",
    default: "250",
    description:
      "Highest-weight terms admitted to placement. Others are reported with reason max-words.",
  },
  {
    name: "mask",
    type: "object",
    description:
      "{type:'svgPath', path, viewBox, fillRule?, mode?} or {type:'image', src, mode?}. Inside mode permits the shape; outside mode occupies it as an obstacle.",
  },
  {
    name: "maskFit",
    type: "string",
    default: '"contain"',
    description: "Centered contain or cover fit; SVG holes respect fillRule.",
  },
  {
    name: "maskThreshold",
    type: "number",
    default: "128",
    description: "Alpha threshold from 1 to 255. Image URLs require same origin or CORS.",
  },
  {
    name: "margin",
    type: "number | object",
    default: "0",
    description: "Explicit outer padding. No axis margins are reserved.",
  },
  {
    name: "renderAs",
    type: "string",
    default: '"canvas"',
    description:
      "canvas or svg. Both paint the same retained text placements. Forced colors uses SVG.",
  },
  {
    name: "colorBy",
    type: "string | function",
    description:
      "Optional categorical color accessor; colorScheme accepts a named palette, array or mapping.",
  },
  {
    name: "title",
    type: "string",
    description: "Accessible title; does not reserve visible title space.",
  },
  { name: "description", type: "string", description: "Accessible reading guidance." },
  { name: "summary", type: "string", description: "Accessible task summary." },
  {
    name: "accessibleTable",
    type: "boolean | object",
    default: "true",
    description:
      "Source values with placement/omission status. Keep enabled unless providing an equivalent reading.",
  },
  {
    name: "tooltip",
    type: "boolean | function | object",
    description:
      "Original source datum; false/null/empty content suppresses the tooltip without disabling linked hover.",
  },
  {
    name: "linkedHover",
    type: "boolean | string | object",
    description: "Standard named linked selection; default field is the term identity accessor.",
  },
  {
    name: "selection",
    type: "object",
    description: "Consume a named selection to dim other terms.",
  },
  {
    name: "annotations",
    type: "array",
    description: "{id, label, dx?, dy?} annotations anchored to placed term IDs.",
  },
  {
    name: "onLayout",
    type: "function",
    description: "Receives immutable placements, omitted rows and diagnostics after preparation.",
  },
  {
    name: "onLayoutError",
    type: "function",
    description:
      "Receives a typed WordCloudLayoutError, including missing Canvas, invalid mask or stale layout.",
  },
  {
    name: "onClick",
    type: "function",
    description: "Original datum and plot point; also invoked by Enter or Space on a focused term.",
  },
]

export default function WordCloudPage() {
  return (
    <PageLayout title="Word Cloud" tier="charts">
      <ComponentMeta
        componentName="WordCloud"
        tier="charts"
        importStatement={'import { WordCloud, prepareWordCloudLayout } from "semiotic/wordcloud"'}
      />
      <p>
        Native text marks arranged with d3-cloud 2.0. A cloud offers an impression of frequent
        terms; pair it with exact values because word length and shape also affect apparent
        prominence.
      </p>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <WordCloud
          data={data}
          width={640}
          height={260}
          responsiveWidth
          title="Illustrative values"
          description="Six authored terms with weights, not measured observations."
        />
      </div>
      <ChartGrounding
        component="WordCloud"
        props={{
          data,
          title: "Illustrative values",
          description:
            "Font size encodes weight. Placement is decorative, and omitted terms remain in the data summary.",
        }}
      />
      <p>
        Explore <Link to="/examples/word-cloud">A story takes shape</Link> for masks with holes,
        inside/outside occupancy, linked reading, keyboard inspection and exports.
      </p>
      <h2>Prepare once, render the same placements</h2>
      <CodeBlock
        code={`import { prepareWordCloudLayout, WordCloud } from "semiotic/wordcloud"

const options = {
  data: [{ text: "care", value: 34 }, { text: "trust", value: 25 }],
  width: 640, height: 400, fontFamily: "Arial", seed: 42
}
// Run in a browser after loading the intended font, or supply a Canvas adapter.
const layout = await prepareWordCloudLayout(options)
// Keep options and layout together when caching or serializing.
<WordCloud {...options} layout={layout} />

// On the server, no Canvas dependency or layout computation is needed:
import { renderChartWithEvidence, renderToImage } from "semiotic/server"
const { svg, evidence } = renderChartWithEvidence("WordCloud", { ...options, layout })
const png = await renderToImage("WordCloud", { ...options, layout })
console.log(evidence.wordCloud) // placed count, omissions, mask and font identity`}
      />
      <p>
        Synchronous server/MCP calls reject missing or stale layouts. Changing data, mask, font,
        rotation, seed or plot dimensions requires preparation again. Color, selection and tooltips
        reuse geometry. Server PNG exports require the intended font to be available to Sharp’s
        text renderer (for example through the host font configuration). Saving
        coordinates does not embed a font in a server SVG.
      </p>
      <h2>Silhouettes and omissions</h2>
      <CodeBlock
        code={`const mask = {
  type: "svgPath",
  path: "M0 0H200V200H0Z M60 60H140V140H60Z",
  viewBox: [0, 0, 200, 200],
  fillRule: "evenodd", // preserves the central hole
  mode: "inside"
}
<WordCloud data={data} mask={mask} seed={42} onLayout={layout => {
  console.log(layout.words.length, layout.omitted)
}} />`}
      />
      <p>
        Each input row has exactly one outcome: a placed word or an omission with its source index
        and reason. Duplicate IDs, missing labels, invalid values, term limits, failed rasterization
        and lack of space remain distinguishable. The hidden mask obstacle never counts as a mark.
      </p>
      <h2>Fonts, Node and interaction</h2>
      <p>
        Browser preparation awaits font loading. Node preparation accepts a second argument with
        canvas, path and loadImage adapters plus an optional fontIdentity; Semiotic does not install
        a native Canvas package. Layout JSON records font settings and fingerprints, not font files.
        Font substitution on another host can change the painted ink.
      </p>
      <p>
        Tab reaches the first term, arrows move in frequency order, Enter/Space activates the
        original datum, and Escape dismisses its tooltip. Hit testing uses stored rotated bounds.
        Shape changes repack discretely; there is no incremental push API or layout animation.
      </p>
      <PropTable props={props} componentName="WordCloud" />
    </PageLayout>
  )
}
