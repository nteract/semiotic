import React from "react"
import { render } from "@testing-library/react"
import Legend, { GradientLegend } from "./Legend"
// import "@testing-library/jest-dom"

const legendGroups = [
    {
        styleFn: () => ({ fill: "red", stroke: "blue" }),
        items: [{ label: "nothing" }],
        label: "cool test legend"
    }
]

/*
title?: string
width?: number
height?: number
orientation?: string
position?: "left" | "right"
*/

describe("Legend", () => {
    it("renders without crashing", () => {
        render(<svg><Legend
            legendGroups={legendGroups}
        /></svg>)
    })

    it("horizontal legend renders items centered", () => {
        render(<svg><Legend
            legendGroups={legendGroups}
            orientation="horizontal"
        /></svg>)
    })

    it("legend items have explicit fill on text", () => {
        const { container } = render(<svg><Legend
            legendGroups={legendGroups}
        /></svg>)
        const textElements = container.querySelectorAll("text")
        expect(textElements.length).toBeGreaterThan(0)
    })
})

describe("GradientLegend", () => {
    const gradientConfig = {
        colorFn: (v) => `rgb(${Math.round(v)},0,0)`,
        domain: [0, 255],
        label: "Intensity"
    }

    it("renders horizontal orientation", () => {
        const { container } = render(
            <svg>
                <GradientLegend
                    config={gradientConfig}
                    orientation="horizontal"
                    width={200}
                />
            </svg>
        )
        expect(container.querySelector("rect")).toBeTruthy()
        expect(container.querySelector("linearGradient")).toBeTruthy()
    })

    it("renders vertical orientation", () => {
        const { container } = render(
            <svg>
                <GradientLegend
                    config={gradientConfig}
                    orientation="vertical"
                    width={200}
                />
            </svg>
        )
        expect(container.querySelector("rect")).toBeTruthy()
    })

    it("uses format function", () => {
        const configWithFormat = {
            ...gradientConfig,
            format: (v) => v.toFixed(1)
        }
        const { container } = render(
            <svg>
                <GradientLegend
                    config={configWithFormat}
                    orientation="horizontal"
                    width={200}
                />
            </svg>
        )
        const textContent = container.textContent
        expect(textContent).toContain(".0")
    })
})
