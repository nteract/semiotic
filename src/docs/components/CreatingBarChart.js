import React from "react";
import { ORFrame } from "../../components";

import DocumentComponent from "../layout/DocumentComponent";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported
const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];

const inflatedBarChartData = [
  { user: "Jason", type: "tweets", value: 10 },
  { user: "Susie", type: "tweets", value: 5 },
  { user: "Matt", type: "tweets", value: 20 },
  { user: "Betty", type: "tweets", value: 30 },
  { user: "Jason", type: "retweets", value: 5 },
  { user: "Susie", type: "retweets", value: 100 },
  { user: "Matt", type: "retweets", value: 25 },
  { user: "Betty", type: "retweets", value: 20 },
  { user: "Jason", type: "favorites", value: 15 },
  { user: "Susie", type: "favorites", value: 100 },
  { user: "Matt", type: "favorites", value: 50 },
  { user: "Betty", type: "favorites", value: 10 }
];

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const colorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
};

const barSize = [300, 500];
const stackedBarStyle = d => ({ fill: colorHash[d.type], stroke: "white" });
const stackedBarLabel = d => (
  <text transform="translate(-15,0)rotate(45)">{d}</text>
);
const stackedBarAxis = {
  orient: "left",
  label: "Tweets + Favorites + Retweets"
};
const stackedBarMargin = { left: 70, bottom: 50, right: 5, top: 5 };

components.push({
  name: "Creating a Bar Chart"
});

export default class CreatingBarChart extends React.Component {
  constructor(props) {
    super(props);
    this.columnHoverBehavior = this.columnHoverBehavior.bind(this);
    this.state = {
      hoverPoint: undefined
    };
  }
  columnHoverBehavior(d) {
    this.setState({ hoverPoint: d });
  }

  barAnnotator({ d, i, categories }) {
    if (!d.type === "hover") {
      return null;
    }

    return (
      <rect
        key={`annotation-${i}`}
        x={categories[d.user].x}
        y={d.y}
        height={d._orFR}
        width={categories[d.user].width}
        style={{ fill: "none", stroke: "#00a2ce", strokeWidth: 5 }}
      />
    );
  }
  render() {
    const examples = [];
    examples.push({
      name: "Data",
      demo: (
        <div>
          <p>
            ORFrame operates on an array of data referred to in the API as
            "pieces". These pieces can be shown individually or stacked in a bar
            chart, or as points on a dot plot or you can show summary
            visualizations of the patterns of the data.
          </p>
          <p>This is the dataset we'll be using in our examples:</p>
        </div>
      ),
      source: `const barChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];      `
    });

    examples.push({
      name: "Simple",
      demo: (
        <div>
          <p>
            To get a bar chart of that data, pass it to the data property of
            ORFrame and pass the attribute you want to split by into the
            oAccessor (the "ordinal" or categorical mapping) and the attribute
            you want to measure into the rAccessor (the "range" or quantitative
            mappong). You also want to give the ORFrame a "size" which is an
            array of [height, width]. This example also turns on labels
            (oLabel), margins and a title.
          </p>
          <ORFrame
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
          />
        </div>
      ),
      source: `<ORFrame
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={true}
          />`
    });

    examples.push({
      name: "Complex",
      demo: (
        <div>
          <p>
            The rAccessor can be a simple string or it can be a function that
            returns a more complex value. The labels can also take a function
            that returns SVG JSX so you can move them or rotate them or change
            them as you like. You can adjust margins and easily turn on an axis
            and add some padding (oPadding).
          </p>
          <ORFrame
            title={"A Bar Chart"}
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={d => d.retweets + d.favorites}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{ orient: "left", label: "Favorites + Retweets" }}
            margin={{ left: 70, bottom: 50, right: 5, top: 55 }}
            oPadding={5}
          />
        </div>
      ),
      source: `<ORFrame
            title={"A Bar Chart"}
            size={[300, 500]}
            data={barChartData}
            oAccessor={"user"}
            rAccessor={d => d.retweets + d.favorites}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{ orient: "left", label: "Favorites + Retweets" }}
            margin={{ left: 70, bottom: 50, right: 5, top: 55 }}
            oPadding={5}
          />`
    });

    examples.push({
      name: "Stacked Data",
      demo: (
        <div>
          <p>
            Because of the way ORFrame models information, it can be useful to
            reformat your data to slice it into smaller pieces so that you can
            use its automatic stacking and other data visualization modes. So,
            for instance, we could take the original dataset and make it a bit
            more verbose to make a stacked chart.
          </p>
        </div>
      ),
      source: `const inflatedBarChartData = [
  { user: "Jason", type: "tweets", value: 10 },
  { user: "Susie", type: "tweets", value: 5 },
  { user: "Matt", type: "tweets", value: 20 },
  { user: "Betty", type: "tweets", value: 30 },
  { user: "Jason", type: "retweets", value: 5 },
  { user: "Susie", type: "retweets", value: 100 },
  { user: "Matt", type: "retweets", value: 25 },
  { user: "Betty", type: "retweets", value: 20 },
  { user: "Jason", type: "favorites", value: 15 },
  { user: "Susie", type: "favorites", value: 100 },
  { user: "Matt", type: "favorites", value: 50 },
  { user: "Betty", type: "favorites", value: 10 }
];`
    });

    examples.push({
      name: "Stacked Bar Chart",
      demo: (
        <div>
          <p>
            With that data, we just need to figure out a way to color each
            different kind of action (tweet, retweet, favorite) differently and
            get you automatically get a simple stacked bar chart.
          </p>
          <p>
            Here I define a simple hash that associates each action with a
            different color and use the "style" functionality to pass a data
            that colors each piece based on its type.
          </p>
          <p>
            One thing to notice is that the sorting of items in ORFrame is based
            on the sorting of the data array you send in, so if you want certain
            columns or pieces to appear first, then pre-sort your data.
          </p>
          <ORFrame
            size={barSize}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={stackedBarStyle}
            type={"bar"}
            oLabel={stackedBarLabel}
            axis={stackedBarAxis}
            margin={stackedBarMargin}
            oPadding={5}
            pieceHoverAnnotation={true}
            customHoverBehavior={this.lineHoverBehavior}
            annotations={
              this.state.hoverPoint ? (
                [Object.assign({}, this.state.hoverPoint, { type: "hover" })]
              ) : (
                undefined
              )
            }
            svgAnnotationRules={this.barAnnotator}
          />
        </div>
      ),
      source: `const colorHash = {
  tweets: "#4d430c",
  retweets: "#b3331d",
  favorites: "#b6a756"
}
          <ORFrame
            size={[300, 500]}
            data={inflatedBarChartData}
            oAccessor={"user"}
            rAccessor={"value"}
            style={d => ({ fill: colorHash[d.type], stroke: "white" })}
            type={"bar"}
            oLabel={d => (
              <text transform="translate(-15,0)rotate(45)">{d}</text>
            )}
            axis={{ orient: "left", label: "Tweets + Favorites + Retweets" }}
            margin={{ left: 70, bottom: 50, right: 5, top: 5 }}
            oPadding={5}
          />
`
    });

    return (
      <DocumentComponent
        name="Creating a Bar Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The very basics of how to create a bar chart or stacked bar chart with
          labels and an axis in Semiotic.
        </p>
      </DocumentComponent>
    );
  }
}

CreatingBarChart.title = "Creating a Bar Chart";
