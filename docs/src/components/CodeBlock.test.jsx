import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import CodeBlock from "./CodeBlock"

describe("CodeBlock", () => {
  it("makes the code scroller keyboard-focusable with a default label", () => {
    render(<CodeBlock code={'const answer = "inspectable"'} language="jsx" />)

    expect(screen.getByRole("region", { name: "JSX code sample" })).toHaveAttribute("tabindex", "0")
  })

  it("accepts a purpose-specific label for the code scroller", () => {
    render(
      <CodeBlock
        code={'const policy = "editorial"'}
        language="js"
        codeAreaLabel="Strict publication check code"
      />,
    )

    expect(
      screen.getByRole("region", { name: "Strict publication check code" }),
    ).toBeInTheDocument()
  })
})
