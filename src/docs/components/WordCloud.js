import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { NetworkFrame } from "../../components";

const networkSettings = {
  type: "wordcloud",
  rotate: d => d.score < 0.1,
  fontSize: 36,
  fontWeight: 900
};

const nodeStyleFn = d => ({ fill: d.color });

const words = [
  {
    token_text: "sankey",
    topic_id: "20170726:0",
    score: 1.5,
    color: "rgb(0, 162, 206)",
    text: "sankey"
  },
  {
    token_text: "bar chart",
    topic_id: "20170726:0",
    score: 3,
    color: "rgb(0, 162, 206)",
    text: "bar chart"
  },
  {
    token_text: "pie",
    topic_id: "20170726:0",
    score: 0.3,
    color: "rgb(0, 162, 206)",
    text: "pie"
  },
  {
    token_text: "stacked",
    topic_id: "20170726:0",
    score: 1.8,
    color: "rgb(0, 162, 206)",
    text: "stacked"
  },
  {
    token_text: "line",
    topic_id: "20170726:0",
    score: 1.9,
    color: "rgb(0, 162, 206)",
    text: "line"
  },
  {
    token_text: "chord",
    topic_id: "20170726:0",
    score: 1.5,
    color: "rgb(0, 162, 206)",
    text: "chord"
  },
  {
    token_text: "parallel",
    topic_id: "20170726:0",
    score: 2.5,
    color: "rgb(0, 162, 206)",
    text: "parallel"
  },
  {
    token_text: "hexbin",
    topic_id: "20170726:0",
    score: 0.5,
    color: "rgb(0, 162, 206)",
    text: "hexbin"
  },
  {
    token_text: "bump",
    topic_id: "20170726:0",
    score: 0.8,
    color: "rgb(0, 162, 206)",
    text: "bump"
  },
  {
    token_text: "dot plot",
    topic_id: "20170726:0",
    score: 1.5,
    color: "rgb(0, 162, 206)",
    text: "dot plot"
  },
  {
    token_text: "Marimekko",
    topic_id: "20170726:0",
    score: 1.8,
    color: "rgb(0, 162, 206)",
    text: "Marimekko"
  },
  {
    token_text: "heat map",
    topic_id: "20170726:0",
    score: 1.4,
    color: "rgb(0, 162, 206)",
    text: "Heat map"
  },
  {
    token_text: "waterfall",
    topic_id: "20170726:0",
    score: 1.3,
    color: "rgb(0, 162, 206)",
    text: "Waterfall"
  },
  {
    token_text: "swarm",
    topic_id: "20170726:0",
    score: 2,
    color: "rgb(0, 162, 206)",
    text: "swarm"
  },
  {
    token_text: "diverging",
    topic_id: "20170726:0",
    score: 2,
    color: "rgb(0, 162, 206)",
    text: "diverging"
  },
  {
    token_text: "cartogram",
    topic_id: "20170726:0",
    score: 2,
    color: "rgb(0, 162, 206)",
    text: "cartogram"
  },
  {
    token_text: "voronoi",
    topic_id: "20170726:0",
    score: 2,
    color: "rgb(0, 162, 206)",
    text: "voronoi"
  },
  {
    token_text: "sooo",
    topic_id: "20170726:0",
    score: 1.5,
    color: "rgb(0, 162, 206)",
    text: "sooo"
  },
  {
    token_text: "datavisualization",
    topic_id: "20170726:0",
    score: 1.3,
    color: "rgb(0, 162, 206)",
    text: "datavisualization"
  },
  {
    token_text: "semiotic",
    topic_id: "20170726:0",
    score: 1.8,
    color: "rgb(179, 51, 29)",
    text: "semiotic"
  },
  {
    token_text: "violin",
    topic_id: "20170726:0",
    score: 0.5,
    color: "rgb(0, 162, 206)",
    text: "violin"
  },
  {
    token_text: "histogram",
    topic_id: "20170726:0",
    score: 0.9,
    color: "rgb(0, 162, 206)",
    text: "histogram"
  },
  {
    token_text: "joy",
    topic_id: "20170726:0",
    score: 4,
    color: "rgb(0, 162, 206)",
    text: "joy"
  }
];

const chartSize = [700, 500];

const components = [];

components.push({
  name: "WordCloud"
});

export default class WordCloudDocs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      additionalAnnotation: {
        type: "node",
        dy: -100,
        dx: 0,
        id: "semiotic",
        label: "awesome?"
      }
    };
  }

  render() {
    const examples = [];
    examples.push({
      name: "Basic",
      demo: (
        <NetworkFrame
          size={chartSize}
          nodes={words}
          nodeStyle={nodeStyleFn}
          nodeSizeAccessor={"score"}
          nodeIDAccessor={"token_text"}
          networkType={networkSettings}
          annotations={[
            {
              type: "node",
              dy: -100,
              dx: 0,
              id: "datavisualization",
              label: "hashtag?"
            },
            this.state.additionalAnnotation
          ]}
          hoverAnnotation={true}
          tooltipContent={d => (
            <div className="tooltip-content">
              <p>Token: "{d.token_text}"</p>
              <p>Score: {d.score}</p>
            </div>
          )}
          customClickBehavior={d => {
            this.setState({
              additionalAnnotation: Object.assign({
                type: "node",
                dy: -100,
                dx: 0,
                id: d.token_text,
                label: "awesome?"
              })
            });
          }}
        />
      ),
      source: `
const words = [
    {"token_text":"brick","topic_id":"20170726:0","score":0.5,"color":"rgb(0, 162, 206)","text":"brick"},
    {"token_text":"show","topic_id":"20170726:0","score":3,"color":"rgb(0, 162, 206)","text":"show"},
    {"token_text":"guy","topic_id":"20170726:0","score":0.3,"color":"rgb(0, 162, 206)","text":"guy"},
...]
          <NetworkFrame
            size={[ 700,500 ]}
            nodes={words}
            nodeStyle={d => ({ fill: d.color })}
            nodeSizeAccessor={d => d.score}
            nodeIDAccessor={d => d.token_text}
            networkType={{ type: "wordcloud" , rotate: d => d.score < 0.1, fontSize: 36, fontWeight: 900 }}
            annotations={[ { type: 'node', dy: -50, dx: 0, id: 'datavisualization', label: 'hashtag?' }
            ]}
          />
      `
    });

    return (
      <DocumentComponent
        name="Word Cloud"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The Word Cloud uses either the circle packing algorithm (the kind used
          for bubble charts) or a more complex collision-based system if you
          enable rotated words
        </p>
      </DocumentComponent>
    );
  }
}

WordCloudDocs.title = "Word Cloud";
