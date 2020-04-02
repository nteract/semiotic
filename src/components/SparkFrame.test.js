import { xyFrameDefaults, networkFrameDefaults } from "./SparkFrame"

describe("SparkFrame", () => {

    const networkSettings = {
        networkType: "force"
    }

    const xySettings = {
        axes: [{ orient: "left" }, { orient: "bottom" }]
    }

    /*
    const ordinalSettings = {
        axes: [{ orient: "left" }, { orient: "bottom" }]
    }
    */

    const sparkNetworkSettings = networkFrameDefaults(networkSettings)

    it("calculatedExtent from summaries, lines & points", () => {
        expect(sparkNetworkSettings.networkType.edgeStrength).toEqual(2)
        expect(sparkNetworkSettings.nodeSizeAccessor).toEqual(2)
    })

    const sparkXYSettings = xyFrameDefaults(xySettings)
    it("calculatedExtent from summaries, lines & points", () => {
        expect(sparkXYSettings.axes[0].baseline).toEqual(false)
        expect(sparkXYSettings.axes[0].tickFormat(20)).toEqual("")
    })

}
)