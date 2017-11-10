import React from "react";
import { ORFrame } from "../../components";
import { sum } from "d3-array";

import DocumentComponent from "../layout/DocumentComponent";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported
const pieChartData = [
  { user: "Jason", tweets: 10, retweets: 5, favorites: 15 },
  { user: "Susie", tweets: 5, retweets: 100, favorites: 100 },
  { user: "Matt", tweets: 20, retweets: 25, favorites: 50 },
  { user: "Betty", tweets: 30, retweets: 20, favorites: 10 }
];

const deaths1855 = [
  { month: "Jan", type: "Wounds & injuries", casualties: 83 },
  { month: "Feb", type: "Wounds & injuries", casualties: 42 },
  { month: "Mar", type: "Wounds & injuries", casualties: 32 },
  { month: "Apr", type: "Wounds & injuries", casualties: 48 },
  { month: "May", type: "Wounds & injuries", casualties: 49 },
  { month: "Jun", type: "Wounds & injuries", casualties: 209 },
  { month: "Jul", type: "Wounds & injuries", casualties: 134 },
  { month: "Aug", type: "Wounds & injuries", casualties: 164 },
  { month: "Sep", type: "Wounds & injuries", casualties: 276 },
  { month: "Oct", type: "Wounds & injuries", casualties: 53 },
  { month: "Nov", type: "Wounds & injuries", casualties: 33 },
  { month: "Dec", type: "Wounds & injuries", casualties: 18 },
  { month: "Jan", type: "All other causes", casualties: 324 },
  { month: "Feb", type: "All other causes", casualties: 361 },
  { month: "Mar", type: "All other causes", casualties: 172 },
  { month: "Apr", type: "All other causes", casualties: 57 },
  { month: "May", type: "All other causes", casualties: 37 },
  { month: "Jun", type: "All other causes", casualties: 31 },
  { month: "Jul", type: "All other causes", casualties: 33 },
  { month: "Aug", type: "All other causes", casualties: 25 },
  { month: "Sep", type: "All other causes", casualties: 20 },
  { month: "Oct", type: "All other causes", casualties: 18 },
  { month: "Nov", type: "All other causes", casualties: 32 },
  { month: "Dec", type: "All other causes", casualties: 28 },
  { month: "Jan", type: "Zymotic diseases", casualties: 2761 },
  { month: "Feb", type: "Zymotic diseases", casualties: 2120 },
  { month: "Mar", type: "Zymotic diseases", casualties: 1205 },
  { month: "Apr", type: "Zymotic diseases", casualties: 477 },
  { month: "May", type: "Zymotic diseases", casualties: 508 },
  { month: "Jun", type: "Zymotic diseases", casualties: 802 },
  { month: "Jul", type: "Zymotic diseases", casualties: 382 },
  { month: "Aug", type: "Zymotic diseases", casualties: 483 },
  { month: "Sep", type: "Zymotic diseases", casualties: 189 },
  { month: "Oct", type: "Zymotic diseases", casualties: 128 },
  { month: "Nov", type: "Zymotic diseases", casualties: 178 },
  { month: "Dec", type: "Zymotic diseases", casualties: 91 }
];

const windRoseData = [
  { angle: "005-015", wind: 0.37 },
  { angle: "015-025", wind: 0.344 },
  { angle: "025-035", wind: 0.257 },
  { angle: "035-045", wind: 0.231 },
  { angle: "045-055", wind: 0.182 },
  { angle: "055-065", wind: 0.193 },
  { angle: "065-075", wind: 0.372 },
  { angle: "075-085", wind: 0.647 },
  { angle: "085-095", wind: 0.598 },
  { angle: "095-105", wind: 0.453 },
  { angle: "105-115", wind: 0.491 },
  { angle: "115-125", wind: 0.491 },
  { angle: "125-135", wind: 0.323 },
  { angle: "135-145", wind: 0.352 },
  { angle: "145-155", wind: 0.436 },
  { angle: "155-165", wind: 0.338 },
  { angle: "165-175", wind: 0.471 },
  { angle: "175-185", wind: 0.653 },
  { angle: "185-195", wind: 0.653 },
  { angle: "195-205", wind: 0.647 },
  { angle: "205-215", wind: 0.577 },
  { angle: "215-225", wind: 0.557 },
  { angle: "225-235", wind: 0.586 },
  { angle: "235-245", wind: 0.661 },
  { angle: "245-255", wind: 0.78 },
  { angle: "255-265", wind: 1.103 },
  { angle: "265-275", wind: 1.753 },
  { angle: "275-285", wind: 2.382 },
  { angle: "285-295", wind: 1.914 },
  { angle: "295-305", wind: 2.391 },
  { angle: "305-315", wind: 1.966 },
  { angle: "315-325", wind: 1.317 },
  { angle: "325-335", wind: 0.944 },
  { angle: "335-345", wind: 0.817 },
  { angle: "345-355", wind: 0.569 }
];

const colors = ["#00a2ce", "#4d430c", "#b3331d", "#b6a756"];

const colorHash = {
  Jason: "#00a2ce",
  Susie: "#4d430c",
  Matt: "#b3331d",
  Betty: "#b6a756",
  "Zymotic diseases": "#00a2ce",
  "Wounds & injuries": "#b3331d",
  "All other causes": "#4d430c"
};

components.push({
  name: "Creating a Pie Chart"
});

export default class CreatingPieChart extends React.Component {
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
          <p>This is the first dataset we'll be using in our examples:</p>
        </div>
      ),
      source: `const pieChartData = [
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
            To make a pie chart out of this data, we need to use the "bar" type
            and the "radial" projection (because pie charts are basically just
            radial bar charts). That's not enough, that would just give us
            something like the Wind Rose below because it's still conveying
            value based on length.
          </p>
          <p>
            In a pie chart, the columns are the "slices" and the way we convey
            value in the columns is to use dynamicColumnWidth. If we don't
            define an rAccessor, it will by default look for "value" or, if it
            doesn't find that, it will return a fixed value, which will give us
            the fixed slice "length" we want for a pie chart.
          </p>
          <p>
            If labels are turned on in radial projection the labels are placed
            on the centroid of the pie slice.
          </p>
          <ORFrame
            size={[300, 300]}
            data={pieChartData}
            oAccessor={"user"}
            dynamicColumnWidth={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            projection={"radial"}
            oLabel={true}
          />
        </div>
      ),
      source: `<ORFrame
            size={[300, 300]}
            data={pieChartData}
            oAccessor={"user"}
            dynamicColumnWidth={"tweets"}
            style={{ fill: "#00a2ce", stroke: "white" }}
            type={"bar"}
            projection={"radial"}
            oLabel={true}
          />`
    });

    examples.push({
      name: "Donut",
      demo: (
        <div>
          <p>
            Instead of just passing "bar" you can send an object with "type":
            "bar" to the ORFrame type and also send an innerRadius value to make
            a donut chart. This example also uses a colorHash to set the color
            of each slice and sets the oPadding value to show how you can also
            use padding with your pie and donut charts.
          </p>
          <p>
            The size of ORFrame pie charts is based on the total width of the
            frame, which means if you want to make a smaller pie chart you can
            adjust the left and right margins or the width of the frame.
          </p>
          <p>
            This example sets hoverAnnotation to true to give simple tooltips.
            Mouse over the slices to see their glory.
          </p>
          <ORFrame
            title={"A Donut Chart with Padding and Tooltips"}
            size={[300, 300]}
            data={pieChartData}
            oAccessor={"user"}
            dynamicColumnWidth={d => sum(d.map(p => p.retweets + p.favorites))}
            style={d => ({ fill: colorHash[d.user], stroke: "white" })}
            type={{ type: "bar", innerRadius: 50 }}
            projection="radial"
            margin={{ top: 50, bottom: 50, left: 50, right: 50 }}
            oPadding={1}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `<ORFrame
            title={"A Donut Chart with Padding and Tooltips"}
            size={[300, 300]}
            data={pieChartData}
            oAccessor={"user"}
            dynamicColumnWidth={d => sum(d.map(p => p.retweets + p.favorites))}
            style={d => ({ fill: colorHash[d.user], stroke: "white" })}
            type={{ type: "bar", innerRadius: 50 }}
            projection="radial"
            margin={{ top: 50, bottom: 50, left: 50, right: 50 }}
            oPadding={1}
            hoverAnnotation={true}
          />`
    });

    examples.push({
      name: "Wind Rose Data",
      demo: (
        <div>
          <p>
            You can use a dynamic rAccessor in radial projection to make radial
            bar charts. One use of these charts is a wind rose, which shows wind
            strength based on angle or cardinal direction and has data like
            this.
          </p>
        </div>
      ),
      source: `const windRoseData = [
  { angle: "005-015", wind: 0.37 },
  { angle: "015-025", wind: 0.344 },
  { angle: "025-035", wind: 0.257 },
  { angle: "035-045", wind: 0.231 },
  { angle: "045-055", wind: 0.182 },
  { angle: "055-065", wind: 0.193 },
  { angle: "065-075", wind: 0.372 },
  { angle: "075-085", wind: 0.647 },
  { angle: "085-095", wind: 0.598 },
  { angle: "095-105", wind: 0.453 },
  { angle: "105-115", wind: 0.491 },
  { angle: "115-125", wind: 0.491 },
  { angle: "125-135", wind: 0.323 },
  { angle: "135-145", wind: 0.352 },
  { angle: "145-155", wind: 0.436 },
  { angle: "155-165", wind: 0.338 },
  { angle: "165-175", wind: 0.471 },
  { angle: "175-185", wind: 0.653 },
  { angle: "185-195", wind: 0.653 },
  { angle: "195-205", wind: 0.647 },
  { angle: "205-215", wind: 0.577 },
  { angle: "215-225", wind: 0.557 },
  { angle: "225-235", wind: 0.586 },
  { angle: "235-245", wind: 0.661 },
  { angle: "245-255", wind: 0.78 },
  { angle: "255-265", wind: 1.103 },
  { angle: "265-275", wind: 1.753 },
  { angle: "275-285", wind: 2.382 },
  { angle: "285-295", wind: 1.914 },
  { angle: "295-305", wind: 2.391 },
  { angle: "305-315", wind: 1.966 },
  { angle: "315-325", wind: 1.317 },
  { angle: "325-335", wind: 0.944 },
  { angle: "335-345", wind: 0.817 },
  { angle: "345-355", wind: 0.569 }
];`
    });

    examples.push({
      name: "Wind Rose",
      demo: (
        <div>
          <p>For charts like these, you can also turn on a radial axis.</p>
          <ORFrame
            title={"Wind Rose"}
            size={[500, 500]}
            data={windRoseData}
            oAccessor={"angle"}
            rAccessor={"wind"}
            style={{ fill: "#00a2ce" }}
            type={"bar"}
            projection={"radial"}
            axis={{
              label: { name: "Windiness", locationDistance: 15 }
            }}
            oPadding={1}
            margin={{ bottom: 50, top: 70, left: 25, right: 25 }}
            hoverAnnotation={true}
            ordinalAlign="center"
          />
        </div>
      ),
      source: `<ORFrame
    title={"Wind Rose"}
    size={[500, 500]}
    data={windRoseData}
    oAccessor={"angle"}
    rAccessor={"wind"}
    style={{ fill: "#00a2ce", stroke: "white" }}
    type={"bar"}
    projection={"radial"}
    axis={{
        label: { name: "Windiness", locationDistance: 15 }
    }}
    oPadding={1}
    margin={{ bottom: 50, top: 70, left: 25, right: 25 }}
    hoverAnnotation={true}
/>`
    });

    // These are also seen in wind roses. In both cases the diagram requires a uniform distribution of values that is naturally cyclical (months of the year or directions).
    examples.push({
      name: "Nightingale Data",
      demo: (
        <div>
          <p>
            You can make the equivalent of stacked bar charts in radial
            projection. These are known as Nightingale diagrams after Florence
            Nightingale, who used them to highlight that casualties in war are
            much more due to disease than combat.
          </p>
          <p>
            Sorting of columns and stack value within columns is based on the
            sort order of the incoming array of data, so if you want columns to
            appear in a particular order or the stacked elements to appear in a
            particular order, just use the JavaScript .sort() method on the
            array to sort the elements how you want before you pass them to the
            ORFrame.
          </p>
        </div>
      ),
      source: `const deaths1855 = [
  { month: "Jan", type: "Wounds & injuries", casualties: 83 },
  { month: "Feb", type: "Wounds & injuries", casualties: 42 },
  { month: "Mar", type: "Wounds & injuries", casualties: 32 },
  { month: "Apr", type: "Wounds & injuries", casualties: 48 },
  { month: "May", type: "Wounds & injuries", casualties: 49 },
  { month: "Jun", type: "Wounds & injuries", casualties: 209 },
  { month: "Jul", type: "Wounds & injuries", casualties: 134 },
  { month: "Aug", type: "Wounds & injuries", casualties: 164 },
  { month: "Sep", type: "Wounds & injuries", casualties: 276 },
  { month: "Oct", type: "Wounds & injuries", casualties: 53 },
  { month: "Nov", type: "Wounds & injuries", casualties: 33 },
  { month: "Dec", type: "Wounds & injuries", casualties: 18 },
  { month: "Jan", type: "All other causes", casualties: 324 },
  { month: "Feb", type: "All other causes", casualties: 361 },
  { month: "Mar", type: "All other causes", casualties: 172 },
  { month: "Apr", type: "All other causes", casualties: 57 },
  { month: "May", type: "All other causes", casualties: 37 },
  { month: "Jun", type: "All other causes", casualties: 31 },
  { month: "Jul", type: "All other causes", casualties: 33 },
  { month: "Aug", type: "All other causes", casualties: 25 },
  { month: "Sep", type: "All other causes", casualties: 20 },
  { month: "Oct", type: "All other causes", casualties: 18 },
  { month: "Nov", type: "All other causes", casualties: 32 },
  { month: "Dec", type: "All other causes", casualties: 28 },
  { month: "Jan", type: "Zymotic diseases", casualties: 2761 },
  { month: "Feb", type: "Zymotic diseases", casualties: 2120 },
  { month: "Mar", type: "Zymotic diseases", casualties: 1205 },
  { month: "Apr", type: "Zymotic diseases", casualties: 477 },
  { month: "May", type: "Zymotic diseases", casualties: 508 },
  { month: "Jun", type: "Zymotic diseases", casualties: 802 },
  { month: "Jul", type: "Zymotic diseases", casualties: 382 },
  { month: "Aug", type: "Zymotic diseases", casualties: 483 },
  { month: "Sep", type: "Zymotic diseases", casualties: 189 },
  { month: "Oct", type: "Zymotic diseases", casualties: 128 },
  { month: "Nov", type: "Zymotic diseases", casualties: 178 },
  { month: "Dec", type: "Zymotic diseases", casualties: 91 }
]`
    });

    examples.push({
      name: "Nightingale Chart",
      demo: (
        <div>
          <p />
          <ORFrame
            title={
              <g style={{ textAnchor: "middle" }} transform="translate(250,15)">
                <text>DIAGRAM of the CAUSES of MORTALITY</text>
                <text y={15}>in the ARMY in the EAST</text>
              </g>
            }
            size={[500, 500]}
            data={deaths1855}
            oAccessor={"month"}
            rAccessor={"casualties"}
            style={d => ({
              fill: colorHash[d.type],
              fillOpacity: 0.75,
              stroke: colorHash[d.type],
              strokeWidth: 0.5
            })}
            type={"bar"}
            projection={"radial"}
            axis={{
              label: { name: "Casualties", locationDistance: 15 }
            }}
            margin={{ bottom: 50, top: 60, left: 40, right: 40 }}
            hoverAnnotation={true}
            oLabel={true}
          />
        </div>
      ),
      source: `
const colorHash = {
  "Zymotic diseases": "#00a2ce",
  "Wounds & injuries": "#b3331d",
  "All other causes": "#4d430c"
};
<ORFrame
    title={
        <g style={{ textAnchor: "middle" }} transform="translate(250,15)">
        <text>DIAGRAM of the CAUSES of MORTALITY</text>
        <text y={15}>in the ARMY in the EAST</text>
        </g>
    }
    size={[500, 500]}
    data={deaths1855}
    oAccessor={"month"}
    rAccessor={"casualties"}
    style={d => ({
        fill: colorHash[d.type],
        fillOpacity: 0.75,
        stroke: colorHash[d.type]
    })}
    type={"bar"}
    projection={"radial"}
    axis={{
        label: { name: "Casualties", locationDistance: 15 }
    }}
    margin={{ bottom: 50, top: 70, left: 25, right: 25 }}
    hoverAnnotation={true}
/>
`
    });

    examples.push({
      name: "Nightingale Chart",
      demo: (
        <div>
          <p />
          <ORFrame
            title={
              <g style={{ textAnchor: "middle" }} transform="translate(250,15)">
                <text>DIAGRAM of the CAUSES of MORTALITY</text>
                <text y={15}>in the ARMY in the EAST</text>
              </g>
            }
            size={[700, 700]}
            data={deaths1855}
            oAccessor={"type"}
            rAccessor={"casualties"}
            dynamicColumnWidth={d => d.length}
            style={d => ({
              fill: colorHash[d.type],
              fillOpacity: 0.75,
              stroke: colorHash[d.type],
              strokeWidth: 0.5
            })}
            type={{
              type: "clusterbar",
              customMark: (d, i, xy) => {
                return (
                  <g>
                    <line
                      style={{ stroke: colorHash[d.type], strokeWidth: 2 }}
                      x2={xy.dx}
                      y2={xy.dy}
                    />
                    <circle
                      r={3}
                      cx={xy.dx}
                      cy={xy.dy}
                      style={{ fill: "none", stroke: colorHash[d.type] }}
                    />
                  </g>
                );
              }
            }}
            oPadding={40}
            projection={"radial"}
            rExtent={[0]}
            axis={{
              label: { name: "Casualties", locationDistance: 15 }
            }}
            margin={{ bottom: 50, top: 60, left: 40, right: 40 }}
            hoverAnnotation={true}
            oLabel={true}
          />
        </div>
      ),
      source: ``
    });
    return (
      <DocumentComponent
        name="Creating a Pie Chart"
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

CreatingPieChart.title = "Creating a Pie Chart";
