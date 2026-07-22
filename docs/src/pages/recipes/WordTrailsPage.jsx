import React from "react"
import { Link } from "react-router-dom"
import RecipeLayout from "../../components/RecipeLayout"
import WordTrails from "../../examples/recipes/WordTrails"

const fullSourceCode = `import { OrdinalCustomChart } from "semiotic/ordinal"
import { wordTrailsLayout } from "semiotic/recipes"

// One row per (speaker, word, segment) with the count in that segment.
// weight → font size, speaker → column, segment → vertical position.
const data = [
  { word: "jobs",    speaker: "Clinton", segment: 3,  weight: 6 },
  { word: "nuclear", speaker: "Clinton", segment: 18, weight: 5 },
  { word: "years",   speaker: "Trump",   segment: 2,  weight: 7 },
  { word: "segment", speaker: "Holt",    segment: 5,  weight: 4 },
  // ...one row per word occurrence
]

export default function DebateWordTrails() {
  return (
    <OrdinalCustomChart
      data={data}
      layout={wordTrailsLayout}
      layoutConfig={{
        textAccessor: "word",
        weightAccessor: "weight",
        columnAccessor: "speaker",
        segmentAccessor: "segment",
        segmentDomain: [0, 19],
        columnOrder: ["Clinton", "Holt", "Trump"],
        // repeatWords: true,  // let a word trail down its column per segment
        scaleToFit: true,      // shrink all words uniformly until nothing overlaps
        segmentAxisLabel: "Debate timeline →",
      }}
      width={880}
      height={580}
      responsiveWidth
      tooltip
    />
  )
}
`

export default function WordTrailsPage() {
  return (
    <RecipeLayout
      title="Word Trails"
      breadcrumbs={[
        { label: "Recipes", path: "/recipes" },
        { label: "Word Trails", path: "/recipes/word-trails" },
      ]}
      dependencies={["semiotic/ordinal", "semiotic/recipes"]}
      fullSourceCode={fullSourceCode}
    >
      <p>
        A classic word cloud packs words into free space: only <em>size</em> means anything, and
        position is decorative. <strong>Word Trails</strong> is a word cloud with honest axes. Every
        word keeps its place in a coordinate space:
      </p>
      <ul>
        <li>
          <strong>Columns</strong> are a category — here, each voice in a debate (the two candidates
          and the moderator).
        </li>
        <li>
          <strong>Vertical position</strong> is an ordered value — the segment of the debate where
          the word peaked, so height reads as <em>when</em> it was said.
        </li>
        <li>
          <strong>Font size</strong> encodes frequency, and words never overlap — they settle into
          the nearest free space around their moment in time.
        </li>
        <li>
          <strong>Color</strong> encodes <em>distinctiveness</em>: each word&apos;s usage is split
          across the three voices and mixed from three primaries — blue (Democrat), red
          (Republican), yellow (moderator). A word one camp owns is pure-hued; a word everyone uses
          turns purple or muddy brown. &ldquo;nuclear,&rdquo; for instance, reads purple because
          both candidates said it.
        </li>
      </ul>
      <p>
        Read a column top-to-bottom to follow one speaker through the debate; read across a row to
        compare what everyone emphasized at the same moment. The example below runs on{" "}
        <strong>real transcripts</strong> from three presidential debates with different candidate
        mixes. It&apos;s built on <code>OrdinalCustomChart</code> plus the{" "}
        <code>wordTrailsLayout</code> recipe, so it inherits real axes, keyboard navigation,
        tooltips, and the accessible data table for free.
      </p>

      <h2 id="preview">Try it</h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
        Switch debates, hover any word for its speaker and segment, and push{" "}
        <strong>Words / speaker</strong> to the max — or turn on <strong>Repeat words</strong> to
        let a word trail down its column once per segment it appeared in. However crowded it gets,
        nothing overlaps.
      </p>
      <div
        style={{
          border: "1px solid var(--surface-3, #252530)",
          borderRadius: "12px",
          padding: "20px",
          background: "var(--surface-1, #0e0e14)",
          overflowX: "auto",
        }}
      >
        <WordTrails />
      </div>

      <h2 id="how-it-works">How it works</h2>
      <p>
        Each column is placed independently with a greedy, largest-first search: every word looks
        outward from its segment anchor for the nearest spot that clears every word already placed,
        so the layout is <em>overlap-free by construction</em> rather than by relaxation. Because
        that works on label <em>boxes</em> — not rasterized sprites — no canvas text measurement is
        needed, and the layout is pure and renders identically on the server.
      </p>
      <p>
        <strong>Scale to fit.</strong> Before placing, the recipe computes one global font scale
        from the total word area, then shrinks it further only if some word cannot find room. The
        scale is shared by every word, so relative magnitude is preserved everywhere: add more words
        (or turn on repeats) and the whole cloud gets smaller together rather than any word being
        clipped or dropped.
      </p>

      <h2 id="config">Key configuration</h2>
      <table>
        <thead>
          <tr>
            <th>Prop</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>textAccessor</code>
            </td>
            <td>The word text.</td>
          </tr>
          <tr>
            <td>
              <code>weightAccessor</code>
            </td>
            <td>Frequency → font size (sqrt-scaled).</td>
          </tr>
          <tr>
            <td>
              <code>columnAccessor</code>
            </td>
            <td>Category → column band.</td>
          </tr>
          <tr>
            <td>
              <code>segmentAccessor</code>
            </td>
            <td>Ordered value → vertical anchor position.</td>
          </tr>
          <tr>
            <td>
              <code>repeatWords</code>
            </td>
            <td>
              Keep every occurrence (a word trails per segment) instead of merging to its peak.
            </td>
          </tr>
          <tr>
            <td>
              <code>scaleToFit</code> / <code>packingDensity</code>
            </td>
            <td>Uniformly shrink all words until nothing overlaps; magnitude preserved.</td>
          </tr>
          <tr>
            <td>
              <code>collisionPadding</code>
            </td>
            <td>Gap between word boxes (px). Toward 0 = crowded; higher opens the cloud up.</td>
          </tr>
          <tr>
            <td>
              <code>wordColor</code> / <code>columnColor</code>
            </td>
            <td>
              Per-word and per-column fill overrides. Per-word callbacks receive the exact source{" "}
              <code>datum</code>, its data and column indices, and the resolved column color.
            </td>
          </tr>
          <tr>
            <td>
              <code>wordOpacity</code> / <code>weightOpacity</code>
            </td>
            <td>
              Progressive reveal without reflow: zero-opacity rows still reserve layout space but
              emit no glyph or hit target. Set <code>weightOpacity=false</code> when the callback
              should be the exact rendered opacity rather than multiply the default weight fade.
            </td>
          </tr>
          <tr>
            <td>
              <code>wordTrailsProgressiveReveal</code>
            </td>
            <td>
              A config helper for stable playback: reached segments fade linearly, future segments
              remain in the layout but emit no glyph or hit target, and weight opacity is disabled
              unless explicitly combined.
            </td>
          </tr>
          <tr>
            <td>
              <code>rotate</code>
            </td>
            <td>Max rotation magnitude in degrees (0 = all horizontal, most legible).</td>
          </tr>
          <tr>
            <td>
              <code>showSegmentAxis</code> / <code>segmentAxisLabel</code>
            </td>
            <td>The labeled vertical value axis.</td>
          </tr>
        </tbody>
      </table>

      <h3 id="progressive-traces">Progressive traces without reflow</h3>
      <p>
        Spread <code>wordTrailsProgressiveReveal</code> into the layout config when the segment axis
        represents recorded runs, rounds, or checkpoints. The helper keeps the current segment fully
        present, fades reached history toward an authored floor, and hides future rows while their
        boxes continue to reserve space.
      </p>
      <pre>
        <code>{`import { wordTrailsProgressiveReveal } from "semiotic/recipes"

const layoutConfig = {
  ...baseConfig,
  repeatWords: true,
  ...wordTrailsProgressiveReveal({
    currentSegment: currentRun,
    segmentDomain: [0, lastRun],
    oldestOpacity: 0.25,
  }),
}`}</code>
      </pre>

      <h3 id="source-aware-encodings">Source-aware, theme-aware encodings</h3>
      <p>
        <code>wordColor</code> and <code>wordOpacity</code> receive the retained source row as{" "}
        <code>datum</code>. For words merged to their peak, that is the peak row. They also receive{" "}
        <code>resolvedColumnColor</code>, so a second variable such as confidence, specificity, or
        distinctiveness can tint the column hue without rebuilding a lookup table. Returning CSS
        variables keeps the result responsive to light and dark theme changes without JavaScript
        theme detection.
      </p>
      <pre>
        <code>{`const topicColors = { Methods: "var(--topic-methods)" }

columnColor: (column) => topicColors[column],
wordColor: ({ datum, resolvedColumnColor }) =>
  "color-mix(in srgb, " + resolvedColumnColor + " " +
  datum.distinctiveness * 100 + "%, var(--semiotic-text))"

/* Override category variables on the chart wrapper in either theme. */
[data-theme="light"] .my-word-trails { --topic-methods: #174f66; }`}</code>
      </pre>

      <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "24px" }}>
        Transcripts: 2012 &amp; 2016 via debates.org (Commission on Presidential Debates); 2020 via
        the m-arg dataset. Tokenized with stopwords removed and binned into 20 time segments; see{" "}
        <code>debateWordTrails.build.mjs</code> for the exact pipeline.
      </p>

      <p>
        <strong>Another honest axis:</strong>{" "}
        <Link to="/examples/latent-crucible">The Latent Crucible</Link> turns the columns into
        anonymous LDA topics and the vertical axis into Gibbs-sampling iterations, so the same
        recipe shows probability distributions congealing rather than speakers progressing through a
        debate.
      </p>
    </RecipeLayout>
  )
}
