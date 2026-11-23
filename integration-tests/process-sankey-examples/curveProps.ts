export const curveMargin = { top: 0, right: 0, bottom: 0, left: 0 }

export function curveProps(
  width: number,
  renderAs: "canvas" | "svg",
  curves: "straight" | "smooth"
) {
  return {
    nodes: [{ id: "Intake" }, { id: "Queue" }, { id: "Done" }],
    edges: [
      {
        id: "first",
        source: "Intake",
        target: "Queue",
        startTime: 5,
        endTime: 15,
        value: 3
      },
      {
        id: "second",
        source: "Intake",
        target: "Queue",
        startTime: 25,
        endTime: 40,
        value: 7
      },
      {
        id: "exit",
        source: "Queue",
        target: "Done",
        startTime: 75,
        endTime: 85,
        value: 10
      }
    ],
    domain: [0, 100] as [number, number],
    width,
    height: 280,
    curves,
    showLabels: false,
    showLegend: false,
    accessibleTable: true,
    colorBy: "id",
    colorScheme: { Intake: "#556677", Queue: "#237752", Done: "#554488" },
    margin: curveMargin,
    frameProps: { renderAs }
  }
}
