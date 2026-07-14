import React from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import SentenceStructureExplorer from "./sentence-structure/SentenceStructureExplorer"

export default function SentenceStructureExamplePage() {
  return (
    <ExamplePageLayout title="The Sentence Is Not the Words">
      <SentenceStructureExplorer />
    </ExamplePageLayout>
  )
}
