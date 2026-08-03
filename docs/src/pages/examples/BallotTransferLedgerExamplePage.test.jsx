import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BallotTransferTooltip } from "./BallotTransferLedgerExamplePage"
import {
  NYC_RCV_PROCESS_EDGES,
  NYC_RCV_PROCESS_NODES,
} from "./data/nycMayoralRcvFlow"

describe("BallotTransferTooltip", () => {
  it("explains node accounts instead of returning an empty tooltip", () => {
    const inactive = NYC_RCV_PROCESS_NODES.find((node) => node.id === "INACTIVE")

    render(<BallotTransferTooltip hover={inactive} />)

    expect(screen.getByText("Inactive ballots")).toBeTruthy()
    expect(screen.getByText(/no continuing valid ranked choice/i)).toBeTruthy()
  })

  it("audits a transfer ribbon against its elimination pool", () => {
    const transfer = NYC_RCV_PROCESS_EDGES.find((edge) => edge.id === "wiley-garcia")

    render(<BallotTransferTooltip hover={{ data: transfer }} />)

    expect(screen.getByText("Maya Wiley eliminated")).toBeTruthy()
    expect(screen.getByText("Maya Wiley → Kathryn Garcia")).toBeTruthy()
    expect(screen.getByText("130,384 ballots")).toBeTruthy()
    expect(screen.getByText(/51.2% of the 254,728-ballot pool/)).toBeTruthy()
  })
})
