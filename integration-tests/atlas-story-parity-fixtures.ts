import { atlasStory } from "../scripts/network-atlas/stories/atlasStories"

/** JSON-safe inputs exercise the published reader, not a source layout. */
export function makeAtlasStoryParityCases() {
  return (["checkout", "search"] as const).map((id) => {
    const story = atlasStory(id)
    return {
      id: `atlas-motif-braid-${id}`,
      component: "MotifBraidChart",
      props: JSON.parse(
        JSON.stringify({
          ...story.props,
          title: story.question,
          description: story.takeaway,
          summary: story.limitations.join(" ")
        })
      )
    }
  })
}
