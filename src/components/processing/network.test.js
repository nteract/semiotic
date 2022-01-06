import { nodesEdgesFromHierarchy } from "./network"

const hierarchy = {
    key: "root",
    children: [
        { key: "child-1" },
        { key: "child-2" },
        { key: "child-3" },
        {
            key: "child-4", children: [
                { key: "child-4-1" },
                { key: "child-4-2" },
                { key: "child-4-3" }
            ]
        }

    ]
}

describe("dataFunctions", () => {

    const calculatedEdges = nodesEdgesFromHierarchy(hierarchy, d => d.key)

    const { edges, nodes } = calculatedEdges

    const firstEdge = edges[0]
    const firstNode = nodes[0]

    it("calculatedEdges generates nodes and edges", () => {
        expect(edges.length).toEqual(7)
        expect(nodes.length).toEqual(8)
        expect(firstEdge.target.hierarchicalID).toEqual("child-1--root")
        expect(firstEdge._NWFEdgeKey).toEqual("child-1--root")
        expect(firstNode.parent).toEqual(null)
    })

}
)
