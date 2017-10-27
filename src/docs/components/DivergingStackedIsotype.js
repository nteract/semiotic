import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import DivergingStackedIsotypeRaw from "./DivergingStackedIsotypeRaw";
import { answers } from "../sampledata/questions";

const components = [];

components.push({
  name: "ISOTYPE Chart"
});

export default class DivergingStackedBar extends React.Component {
  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: DivergingStackedIsotypeRaw,
      source: `import React from "react";
import { answers } from "../sampledata/questions";
import { ORFrame } from "../../components";
import cow from "material-design-icons-svg/paths/cow";
import cat from "material-design-icons-svg/paths/cat";
import cake from "material-design-icons-svg/paths/cake";
import cannabis from "material-design-icons-svg/paths/cannabis";

const iconHash = {
  disagree: cow,
  stronglydisagree: cat,
  agree: cake,
  stronglyagree: cannabis
};

export default (
  <ORFrame
    size={[700, 700]}
    data={answers}
    type={{ type: "bar", icon: d => iconHash[d.type], iconPadding: 2 }}
    projection="horizontal"
    oAccessor={"question"}
    rAccessor={"percent"}
    style={d => ({ fill: d.color, stroke: "black", strokeWidth: 0.5 })}
    margin={{ top: 30, bottom: 0, left: 10, right: 80 }}
    oPadding={0}
    oLabel={{ orient: "right" }}
    axis={{
      orient: "top",
      tickValues: [-0.3, -0.15, 0, 0.2, 0.4, 0.6, 0.8, 1]
    }}
  />
);`
    });

    return (
      <DocumentComponent
        name="ISOTYPE Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Using the icon property to designate an svg path string to construct
          the bars with.
        </p>
      </DocumentComponent>
    );
  }
}

DivergingStackedBar.title = "ISOTYPE Chart";
