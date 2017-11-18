import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import CustomMarkRaw from "./CustomMarkRaw";
import { MenuItem } from "material-ui/Menu";
import Input, { InputLabel } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";
import Select from "material-ui/Select";

const components = [];

components.push({
  name: "Custom Mark"
});

const typeOptions = ["none", "marginalia"].map(d => (
  <MenuItem key={"type-option-" + d} label={d} value={d}>
    {d}
  </MenuItem>
));

export default class CustomMark extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      type: "marginalia"
    };
  }

  render() {
    const examples = [];

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Annotations</InputLabel>
        <Select
          value={this.state.type}
          onChange={e => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>
    ];

    examples.push({
      name: "Basic",
      demo: CustomMarkRaw(this.state.type),
      source: `
      const data = [  { name: "Franklin Pierce", birth: 1804, start: 1853, end: 1857, death: 1869 },
  { name: "James Buchanan", birth: 1791, start: 1857, end: 1861, death: 1868 },
  { name: "Abraham Lincoln", birth: 1809, start: 1861, end: 1865, death: 1865 },
  { name: "Andrew Johnson", birth: 1808, start: 1865, end: 1869, death: 1875 }...]

function timeline({ data, rScale, adjustedSize, margin }) {
  const renderedPieces = [];

  const keys = Object.keys(data);

  keys.forEach(key => {
    //Only one piece of data per column though we'll render multiple graphical elements
    const column = data[key];
    const president = column.pieceData[0];

    //Calculate individual start and width of each graphical band
    const birthDate = rScale(president.birth);
    const termStart = rScale(president.start);
    const termEnd = rScale(president.end);
    const deathDate = rScale(president.death);
    const preTermWidth = termStart - birthDate;
    const termWidth = termEnd - termStart;
    const postTermWidth = deathDate - termEnd;

    //You can return an array of graphics or an array of objects with extra data (see the Waterfall chart demo)
    const markObject = (
      <g key={${"`piece-${key}`"}}>
        <rect
          fill="#00a2ce"
          width={preTermWidth}
          height={column.width}
          x={birthDate}
          y={column.x}
        />
        <rect
          fill="#4d430c"
          width={termWidth}
          height={column.width}
          x={termStart}
          y={column.x}
        />
        <rect
          fill="#b6a756"
          width={postTermWidth}
          height={column.width}
          x={termEnd}
          y={column.x}
        />
      </g>
    );

    renderedPieces.push(markObject);
  });

  return renderedPieces;
}

          <ORFrame
      projection="horizontal"
      data={data}
      size={[700, 700]}
      rExtent={[1732, 2018]}
      rAccessor="start"
      oAccessor="name"
      oLabel={(d, i) => (
        <text style={{ textAnchor: "end", opacity: i % 2 ? 0.5 : 1 }} y={4}>
          {d}
        </text>
      )}
      oPadding={3}
      type={{
        type: timeline
      }}
      hoverAnnotation={true}
      tooltipContent={d => (
        <div className="tooltip-content">
          <p>{d.pieces[0].name}</p>
          <p>
            {d.pieces[0].birth} - {d.pieces[0].death}
          </p>
          <p>
            Age at Start of Presidency: {d.pieces[0].start - d.pieces[0].birth}
          </p>
          <p>Age at End of Presidency: {d.pieces[0].end - d.pieces[0].birth}</p>
          <p>Age at Death: {d.pieces[0].death - d.pieces[0].birth}</p>
        </div>
      )}
      lineStyle={d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 })}
      axis={{ orient: "left" }}
      margin={{ left: 140, top: 10, bottom: 50, right: 20 }}
    />
  `
    });

    return (
      <DocumentComponent
        name="Custom Mark"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Another ORFrame custom type example (a more ambitious one is the
          Waterfall Chart). One challenge of using custom types is you can't
          rely on Semiotic's ability to generate the extent, so in this case
          because my extent is based on the earliest birth date and the latest
          date of death or term, I need to pass a manual rExtent.
        </p>
        <p>
          This uses Semiotic's built-in "marginalia" annotation handling to
          place annotation labels in the margins.
        </p>
      </DocumentComponent>
    );
  }
}

CustomMark.title = "Custom Mark";
