import { resolveFixture } from "./fixtures"

export function cutawayFixture(
  example: "single" | "multi" | "missing" = "multi"
) {
  const single = example === "single"
  return resolveFixture(
    single
      ? ["A", "x1", "x2", "D"]
      : ["A", "C", "x1", "x2", "y1", "y2", "B", "D"],
    single
      ? [
          ["a", "A", "x1"],
          ["b", "x2", "x1"],
          ["c", "x2", "D"]
        ]
      : [
          ["ax1", "A", "x1"],
          ["cx2", "C", "x2"],
          ["x1y1", "x1", "y1"],
          ["x1y2", "x1", "y2"],
          ["x2y2", "x2", "y2"],
          ["y1b", "y1", "B"],
          ["y2d", "y2", "D"]
        ],
    { rules: [{ kind: "group-authored", version: "1", hierarchyRef: "h" }] },
    {
      edgeSemantics: [],
      authoredHierarchies: [
        {
          id: "h",
          groups: [
            {
              id: "x",
              label: single ? "False quotient route" : "Two entries, two exits",
              sourceNodeIds: single ? ["x1", "x2"] : ["x1", "x2", "y1", "y2"]
            }
          ]
        }
      ]
    },
    example === "multi"
      ? [
          {
            id: "one",
            entityId: "1",
            nodePath: ["A", "x1", "y1", "B"],
            complete: true
          },
          {
            id: "two",
            entityId: "2",
            nodePath: ["C", "x2", "y2", "D"],
            complete: true
          }
        ]
      : undefined
  )
}
