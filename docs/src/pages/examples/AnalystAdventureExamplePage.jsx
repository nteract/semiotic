import React from "react"
import ExamplePageLayout from "./ExamplePageLayout"
import AnalystAdventureGame from "./analyst-adventure/AnalystAdventureGame"

export default function AnalystAdventureExamplePage() {
  return (
    <ExamplePageLayout title="Analyst Adventure: The Case of the Vanishing Visionary">
      <AnalystAdventureGame />
    </ExamplePageLayout>
  )
}

