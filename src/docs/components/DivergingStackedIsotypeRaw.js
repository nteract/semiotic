import React from "react"
import { answers } from "../sampledata/questions"
import { OrdinalFrame } from "../../components"
import cow from "material-design-icons-svg/paths/cow"
import cat from "material-design-icons-svg/paths/cat"
import cake from "material-design-icons-svg/paths/cake"
import cannabis from "material-design-icons-svg/paths/cannabis"

const iconHash = {
  disagree: cow,
  stronglydisagree: cat,
  agree: cake,
  stronglyagree: cannabis
}

export default (
  <OrdinalFrame
    size={[700, 300]}
    data={answers}
    type={{
      type: "bar",
      icon: d => iconHash[d.type],
      iconPadding: 0,
      resize: "fixed"
    }}
    projection="horizontal"
    oAccessor={"question"}
    rAccessor={"percent"}
    style={(d, i) => ({
      fill: d.color,
      stroke: "black",
      strokeWidth: 0.5
    })}
    margin={{ top: 30, bottom: 0, left: 10, right: 80 }}
    oPadding={4}
    oLabel={{ orient: "right" }}
    axis={{
      orient: "top",
      tickValues: [-0.3, -0.15, 0, 0.2, 0.4, 0.6, 0.8, 1]
    }}
  />
)
