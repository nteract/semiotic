import * as React from "react"
import { WordCloud, useSelection, type WordCloudGroupHull, type WordCloudLayoutResult } from "semiotic/wordcloud"
import ExamplePageLayout from "./ExamplePageLayout"
import fixture from "./word-cloud/alice.json"
import { cloudMask, shapes, type ShapeName } from "./word-cloud/shapes"
import "./word-cloud/word-cloud.css"

const palette = {
  Characters: "#a63b3b",
  "Places & objects": "#376b62",
  "Story language": "#685987",
}
const storyThreads: WordCloudGroupHull[] = [
  { id: "tea", label: "The tea party", color: "#906024", ids: ["alice", "hatter", "hare", "dormouse", "tea", "time", "table"] },
  { id: "court", label: "The royal court", color: "#a63b3b", ids: ["alice", "queen", "king", "jury", "court", "head"] },
  { id: "rabbit", label: "Down the rabbit hole", color: "#376b62", ids: ["alice", "rabbit", "door", "garden", "curious", "wonder"] },
]
const fontFamily = "Crimson Text"
const fontEnvironment = {
  fontIdentity:
    "CrimsonText-Regular.ttf:sha256:48e6c5d5ad1d01599d374ecb817e15890d1feb3b8a3a88e527d44c90389e1f06",
}
const range: [number, number] = [9, 48]
const previewRange: [number, number] = [8, 34]

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function WordCloudExamplePage() {
  const host = React.useRef<HTMLDivElement>(null)
  const [width, setWidth] = React.useState(620)
  const [shape, setShape] = React.useState<ShapeName>("heart")
  const [mode, setMode] = React.useState<"inside" | "outside">("inside")
  const [count, setCount] = React.useState(120)
  const [seed, setSeed] = React.useState(42)
  const [rotate, setRotate] = React.useState<"horizontal" | "orthogonal">("horizontal")
  const [thread, setThread] = React.useState("tea")
  const [paint, setPaint] = React.useState<"canvas" | "svg">("svg")
  const [layout, setLayout] = React.useState<WordCloudLayoutResult>()
  const [error, setError] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState("alice")
  const [onlyOmitted, setOnlyOmitted] = React.useState(false)
  const name = `word-cloud-${React.useId()}`
  const hover = useSelection({ name, fields: ["text"] })
  React.useEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.min(800, Math.max(200, Math.floor(entry.contentRect.width)))),
    )
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  React.useEffect(() => hover.clear, [hover.clear])
  const data = React.useMemo(() => fixture.data.slice(0, count), [count])
  const mask = React.useMemo(() => cloudMask(shape, mode), [shape, mode])
  const height = Math.min(530, Math.max(320, (width * 0.85) | 0))
  const fontSizeRange = width < 400 ? previewRange : range
  const options = {
    data,
    width,
    height,
    seed,
    rotate,
    mask,
    fontFamily,
    fontSizeRange,
    maxWords: 300,
  }
  const current =
    layout?.width === width &&
    layout?.height === height &&
    layout?.seed === seed &&
    layout?.inputCount === count
      ? layout
      : undefined
  const groupHulls = React.useMemo(
    () => storyThreads.filter((group) => thread === "all" || group.id === thread),
    [thread],
  )
  const threadTerms = [...new Set(groupHulls.flatMap((group) => group.ids))]
  const placedIds = new Set(current?.words.map((word) => word.id))
  const omitted = new Map(current?.omitted.map((word) => [word.id, word.reason]) ?? [])
  const term = fixture.data.find((row) => row.text === selected)!
  const filtered = data.filter(
    (row) => row.text.includes(query.toLowerCase()) && (!onlyOmitted || omitted.has(row.text)),
  )
  const downloadLayout = () =>
    current &&
    save(
      new Blob(
        [
          JSON.stringify(
            {
              component: "WordCloud",
              props: { ...options, colorBy: "category", colorScheme: palette, groupHulls, layout: current },
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      "wonderland-word-cloud.json",
    )
  const svgExport = async () => {
    const node = host.current?.querySelector("svg[data-network-scene]")?.cloneNode(true) as SVGElement | undefined
    if (!node) return ""
    // The shared network frame composites its backgrounds, marks and annotations
    // in separate SVGs. Preserve that layer order in the standalone download.
    const background = host.current?.querySelector(".wordcloud-group-hulls")?.closest("svg")
    if (background) node.prepend(...Array.from(background.childNodes, (child) => child.cloneNode(true)))
    const overlay = host.current?.querySelector("svg[data-semiotic-overlay]")
    if (overlay) node.append(...Array.from(overlay.childNodes, (child) => child.cloneNode(true)))
    node.querySelectorAll('[role="button"]').forEach((element) => element.remove())
    const response = await fetch("/fonts/wordcloud/CrimsonText-Regular.ttf")
    if (!response.ok) throw new Error("Font unavailable for export")
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
    style.textContent = `@font-face{font-family:"Crimson Text";src:url(data:font/ttf;base64,${btoa(binary)}) format("truetype");font-weight:400;font-style:normal}`
    node.prepend(style)
    const license = await fetch("/fonts/wordcloud/OFL.txt")
    if (!license.ok) throw new Error("Font license unavailable for export")
    const metadata = document.createElementNS("http://www.w3.org/2000/svg", "metadata")
    metadata.textContent = await license.text()
    node.prepend(metadata)
    return new XMLSerializer().serializeToString(node)
  }
  const downloadImage = async (format: "svg" | "png") => {
    if (paint !== "svg") return
    let url: string | undefined
    try {
      const svg = await svgExport()
      if (format === "svg") {
        save(new Blob([svg], { type: "image/svg+xml" }), "wonderland-word-cloud.svg")
        return
      }
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = width * 2
      canvas.height = height * 2
      const ctx = canvas.getContext("2d")!
      ctx.fillStyle = "#fffaf1"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (blob) save(blob, "wonderland-word-cloud.png")
      })
    } catch {
      setError("The image could not be exported. The placement JSON remains available.")
    } finally {
      if (url) URL.revokeObjectURL(url)
    }
  }
  return (
    <ExamplePageLayout
      title="A story takes shape"
      showPageHeader={false}
      prevPage={undefined}
      nextPage={undefined}
    >
      <article className="wonderland" data-testid="word-cloud-example">
        <header className="wonderland-hero">
          <p className="wonderland-kicker">A small atlas of Wonderland · 1865</p>
          <h1>
            A story takes <em>shape.</em>
          </h1>
          <p>
            What stays with us after the last page? Follow the words through Lewis Carroll’s
            <cite> Alice’s Adventures in Wonderland</cite>. Change the silhouette. Keep the
            evidence.
          </p>
          <div className="wonderland-ledger">
            <span>
              <b>{fixture.tokens.toLocaleString()}</b> tokens in the book
            </span>
            <span>
              <b>{data.length}</b> terms in this reading
            </span>
            <span>
              <b>{current?.words.length ?? "…"}</b> placed · <b>{current?.omitted.length ?? "…"}</b>{" "}
              omitted
            </span>
          </div>
        </header>
        <div className="wonderland-controls" aria-label="Cloud controls">
          <label>
            Shape
            <select
              aria-label="Cloud shape"
              value={shape}
              onChange={(e) => {
                setLayout(undefined)
                setShape(e.target.value as ShapeName)
              }}
            >
              {Object.entries(shapes).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Occupy
            <select
              aria-label="Shape occupancy"
              value={mode}
              disabled={shape === "none"}
              onChange={(e) => {
                setLayout(undefined)
                setMode(e.target.value as typeof mode)
              }}
            >
              <option value="inside">Inside the silhouette</option>
              <option value="outside">Outside the silhouette</option>
            </select>
          </label>
          <label>
            Vocabulary
            <select
              aria-label="Term count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={60}>60 terms</option>
              <option value={120}>120 terms</option>
              <option value={200}>200 terms</option>
              <option value={300}>300 terms</option>
            </select>
          </label>
          <label>
            Reading direction
            <select
              aria-label="Word rotation"
              value={rotate}
              onChange={(e) => {
                setLayout(undefined)
                setRotate(e.target.value as typeof rotate)
              }}
            >
              <option value="horizontal">Horizontal</option>
              <option value="orthogonal">Horizontal + vertical</option>
            </select>
          </label>
          <button onClick={() => setSeed(seed + 1)}>
            Rearrange <span aria-hidden="true">↻</span>
          </button>
        </div>
        <div className="wonderland-grid">
          <section className="wonderland-paper" aria-label="Shaped reading">
            <div className="wonderland-paper-heading">
              <span>FIG. 01 / {shapes[shape].label}</span>
              <label>
                Paint with{" "}
                <select
                  aria-label="Word cloud renderer"
                  value={paint}
                  onChange={(e) => setPaint(e.target.value as typeof paint)}
                >
                  <option value="svg">SVG</option>
                  <option value="canvas">Canvas</option>
                </select>
              </label>
            </div>
            <div ref={host} className="wonderland-cloud">
              <WordCloud
                {...options}
                canvasEnvironment={fontEnvironment}
                renderAs={paint}
                colorBy="category"
                colorScheme={palette}
                groupHulls={groupHulls}
                onLayout={(value) => {
                  setLayout(value)
                  setError("")
                }}
                onLayoutError={(failure) => setError(failure.message)}
                title="Words in Alice’s Adventures in Wonderland"
                description="Font size encodes word frequency. Shape constrains placement; missing words remain in the ranked reading."
                summary={`${count} frequent terms, with exact values beside the cloud.`}
                accessibleTable={false}
                linkedHover={{ name, fields: ["text"] }}
                selection={{ name }}
                onClick={(row) => setSelected(String(row.text))}
                tooltip={(row) => (
                  <div>
                    <strong>{String(row.text)}</strong>
                    <div>
                      {String(row.value)} occurrences · {String(row.category)}
                    </div>
                    <small>Click or press Enter for a passage.</small>
                  </div>
                )}
              />
            </div>
            <div className="wonderland-threads" aria-label="Story threads">
              <div className="wonderland-thread-heading">
                <span className="wonderland-kicker">Pull a story thread</span>
                <span>Same words. Another connection.</span>
              </div>
              <div className="wonderland-thread-buttons">
                {storyThreads.map((group) => (
                  <button
                    key={group.id}
                    aria-pressed={thread === group.id}
                    style={{ "--thread-color": group.color } as React.CSSProperties}
                    onClick={() => setThread(group.id)}
                    onPointerEnter={() => hover.selectPoints({ text: group.ids })}
                    onPointerLeave={hover.clear}
                    onFocus={() => hover.selectPoints({ text: group.ids })}
                    onBlur={hover.clear}
                  >
                    <i aria-hidden="true" />{group.label}
                  </button>
                ))}
                <button aria-pressed={thread === "all"} onClick={() => setThread("all")}>All threads</button>
                <button aria-pressed={thread === "none"} onClick={() => setThread("none")}>Hide threads</button>
              </div>
              <p className="wonderland-thread-reading" aria-live="polite">
                {groupHulls.length ? <>
                  <b>{threadTerms.filter((id) => placedIds.has(id)).length} of {threadTerms.length} thread terms placed.</b>{" "}
                  {threadTerms.join(" · ")}
                </> : "Reveal a cast of characters, a scene, or a journey without moving a single word."}
              </p>
              <p className="wonderland-caption">
                These are hand-picked story groups, not discovered clusters. Alice belongs to all
                three. A hull wraps its members and may enclose other words along the way.
              </p>
            </div>
            <div className="wonderland-key">
              {Object.entries(palette).map(([category, color]) => (
                <span key={category}>
                  <i style={{ background: color }} />
                  {category}
                </span>
              ))}
            </div>
            <p className="wonderland-caption">
              Size suggests frequency; position suggests nothing. A silhouette changes what fits,
              not what was counted. Tab into the cloud, then use arrow keys to read its words.
            </p>
            <div className="wonderland-exports">
              <span>Keep this reading</span>
              <button disabled={!current} onClick={downloadLayout}>
                Placement JSON
              </button>
              <button
                disabled={!current || paint !== "svg"}
                onClick={() => void downloadImage("svg")}
              >
                SVG
              </button>
              <button
                disabled={!current || paint !== "svg"}
                onClick={() => void downloadImage("png")}
              >
                PNG
              </button>
            </div>
            {paint === "canvas" && (
              <p className="wonderland-caption">
                Switch to SVG to export the same placements as an image.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
          </section>
          <aside className="wonderland-ranking" aria-label="Exact word frequencies">
            <h2>A closer reading</h2>
            <p>
              All {count} source terms, including those that did not fit. Select one to find it in
              the book.
            </p>
            <label className="wonderland-search">
              Find a word
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “rabbit”…"
              />
            </label>
            <label className="wonderland-omissions">
              <input
                type="checkbox"
                checked={onlyOmitted}
                onChange={(e) => setOnlyOmitted(e.target.checked)}
              />{" "}
              Only omitted terms ({current?.omitted.length ?? "…"})
            </label>
            <ol className="wonderland-terms" data-testid="ranked-words">
              {filtered.map((row) => (
                <li key={row.text} data-dimmed={hover.isActive && !hover.predicate(row)}>
                  <button
                    aria-pressed={selected === row.text}
                    onClick={() => setSelected(row.text)}
                    onPointerEnter={() => hover.selectPoints({ text: [row.text] })}
                    onPointerLeave={hover.clear}
                    onFocus={() => hover.selectPoints({ text: [row.text] })}
                    onBlur={hover.clear}
                  >
                    <span className="wonderland-term">
                      <b>{row.text}</b>
                      <span>{row.value}</span>
                    </span>
                    <span
                      className="wonderland-bar"
                      style={{
                        width: `${(100 * row.value) / data[0].value}%`,
                        background: palette[row.category as keyof typeof palette],
                      }}
                    />
                    {omitted.has(row.text) && <small>Omitted · {omitted.get(row.text)}</small>}
                  </button>
                </li>
              ))}
            </ol>
            {!filtered.length && <p>No matching terms.</p>}
          </aside>
        </div>
        <section
          className="wonderland-passage"
          aria-label="Selected word passage"
          aria-live="polite"
        >
          <p className="wonderland-kicker">From the book · first occurrence</p>
          <h2>
            {term.text} <small>{term.value} occurrences</small>
          </h2>
          <blockquote>{term.excerpt}</blockquote>
          <p>Context is an excerpt, not a sentiment score. Repeated words are counted again.</p>
        </section>
        <section className="wonderland-notes">
          <div>
            <p className="wonderland-kicker">How to read this</p>
            <h2>A shape is a constraint.</h2>
            <p>
              The same seed, source, font and viewport produce the same placement in the same raster
              environment. Rearranging changes position, never frequency. Smaller screens repack the
              words; the ranked list keeps every input.
            </p>
            <p>
              The story threads reuse the network frame’s background layer and rounded hull
              geometry. The same frame handles word hover, keyboard navigation and linked
              highlighting, whether the words are painted with SVG or Canvas.
            </p>
            <p>
              A cloud is useful for a first impression. Use the exact counts for comparisons: word
              length, letter shapes and available space also affect how much ink a term occupies.
            </p>
          </div>
          <div>
            <p className="wonderland-kicker">Source & method</p>
            <h2>Nothing hidden in the silhouette.</h2>
            <p>
              <a href={fixture.source}>{fixture.title}, Project Gutenberg</a> · Lewis Carroll, 1865.
              Public domain in the USA. Source captured {fixture.retrieved}.
            </p>
            <p>{fixture.method}</p>
            <p>
              Only the 300 most frequent retained terms are available here. The chart receives
              aggregated counts; it does not tokenize text. Downloads include the input, options,
              placed words and omission reasons. SVG embeds the bundled typeface; PNG keeps its
              rendered pixels. Rendering the placement JSON on another host requires the same font.
            </p>
            <details>
              <summary>Inspect the stop list ({fixture.stopWords.length} words)</summary>
              <p>{fixture.stopWords.join(", ")}</p>
            </details>
          </div>
        </section>
      </article>
    </ExamplePageLayout>
  )
}
