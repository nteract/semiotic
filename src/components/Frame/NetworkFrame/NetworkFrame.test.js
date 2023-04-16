import React from "react"
import { render } from '@testing-library/react'
import NetworkFrame from "./NetworkFrame"

const someEdgeData = [
  { source: "Heathcliff", target: "Garfield" },
  { source: "Fexix", target: "Tom" },
  { source: "Bill", target: "Hobbes" }
]

//Enzyme doesn't do well with context so disable it for now

describe("NetworkFrame", () => {
  it("renders", () => {
    render(<NetworkFrame edges={someEdgeData} disableContext={true} />)
  })

  it("renders an element with passed test-class", () => {
    const { container } = render(
      <NetworkFrame edges={someEdgeData} disableContext={true} className="test-class"/>
    )
    
    expect(container.getElementsByClassName("test-class").length).toEqual(1)
  })

  // it("renders some edges", () => {
  //   const { container } = render(
  //     <NetworkFrame edges={someEdgeData} disableContext={true} />
  //   )
  //   const renderedEdgeGroups = container.getElementsByClassName("edge")
    
  //   expect(renderedEdgeGroups.length).toEqual(3)
  // })
})
