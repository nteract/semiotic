/** Separate Node process so fontconfig is configured before sharp loads. */
import { readFileSync, writeFileSync } from "node:fs"
import {
  renderChartWithEvidence,
  renderToImage
} from "../../src/components/server/renderToStaticSVG"

async function main() {
  const [input, output] = process.argv.slice(2)
  const { options, layout } = JSON.parse(readFileSync(input, "utf8"))
  const props = { ...options, layout, background: "#ffffff" }
  const { svg, evidence } = renderChartWithEvidence("WordCloud", props)
  writeFileSync(`${output}.svg`, svg)
  writeFileSync(`${output}.json`, JSON.stringify(evidence))
  writeFileSync(`${output}.png`, await renderToImage("WordCloud", props))
}
void main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  }
)
