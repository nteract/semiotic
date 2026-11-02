import { normalizeWordCloudInput, type WordCloudProps, type WordCloudLayoutResult } from "semiotic/wordcloud"
import fixture from "../src/components/wordcloud/wordCloud.fixture.json"

/** Real saved placements, shared by the Node and browser package consumers. */
export function makeWordCloudParityCases() {
  return (["canvas", "svg"] as const).map((renderAs) => {
    const props: WordCloudProps = {
      ...fixture.options,
      fontSizeRange: [fixture.options.fontSizeRange[0], fixture.options.fontSizeRange[1]],
      width: 350,
      height: 222,
      margin: { left: 12, right: 18, top: 8, bottom: 14 },
      data: [
        ...fixture.options.data.map(({ text, value }) => ({ term: text, metrics: { count: value } })),
        { term: "" }
      ],
      textAccessor: (row) => row.term,
      valueAccessor: (row) => row.metrics.count,
      renderAs,
      tooltip: "multi",
      description: "Overlapping groups retain the same words and hulls in every renderer.",
      groupHulls: [
        { id: "care-trust", ids: ["care", "trust"], label: "Care and trust", color: "#a85730" },
        { id: "trust-wonder", ids: ["trust", "wonder"], label: "Trust and wonder", color: "#406fab" }
      ]
    }
    const normalized = normalizeWordCloudInput({ ...props, width: 320, height: 200 })
    props.layout = {
      ...(fixture.layout as unknown as WordCloudLayoutResult),
      inputCount: normalized.inputCount,
      inputFingerprint: normalized.inputFingerprint,
      omitted: normalized.omitted
    }
    return { id: `wordcloud-group-hulls-${renderAs}`, component: "WordCloud", props }
  })
}
