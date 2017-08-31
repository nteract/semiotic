import React from "react";
import DocumentComponent from "../layout/DocumentComponent";
import { Mark, DraggableMark, MarkContext } from "../../components";

const components = [];
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Mark",
  proptypes: `
    {
    markType: PropTypes.string.isRequired,
    forceUpdate: PropTypes.bool,
    renderMode: PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.func
        ]),
    draggable: PropTypes.bool,
    dropFunction: PropTypes.func,
    resetAfter: PropTypes.bool,
    freezeX: PropTypes.bool,
    freezeY: PropTypes.bool,
    context: PropTypes.object,
    updateContext: PropTypes.func,
    className: PropTypes.string
    }
  `
});

export default class MarkDocs extends React.Component {
  constructor(props) {
    super(props);
    this.state = { source: undefined, target: undefined };
    this.dropMe = this.dropMe.bind(this);
  }

  dropMe(source, target) {
    this.setState({ source: source.nid, target: target.nid });
  }

  render() {
    const mark = (
      <Mark
        markType="rect"
        width={100}
        height={100}
        x={25}
        y={25}
        draggable={true}
        style={{ fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }}
      />
    );

    const circleMark = (
      <Mark
        markType="circle"
        renderMode="forcePath"
        r={50}
        cx={205}
        cy={255}
        style={{ fill: "#00a2ce", stroke: "blue", strokeWidth: "1px" }}
      />
    );

    const resetMark = (
      <Mark
        markType="rect"
        width={100}
        height={100}
        x={25}
        y={135}
        draggable={true}
        resetAfter={true}
        style={{ fill: "#4d430c" }}
      />
    );

    const verticalBarMark = (
      <Mark
        markType="verticalbar"
        width={50}
        height={100}
        x={185}
        y={150}
        style={{ fill: "#b3331d" }}
      />
    );

    const horizontalBarMark = (
      <Mark
        markType="horizontalbar"
        width={50}
        height={100}
        x={185}
        y={150}
        style={{ fill: "#b6a756" }}
      />
    );

    const sketchyMark = (
      <Mark
        markType="rect"
        renderMode="sketchy"
        width={100}
        height={100}
        x={25}
        y={250}
        style={{ fill: "#b86117", stroke: "#b86117", strokeWidth: "4px" }}
      />
    );

    const DragMark1 = (
      <DraggableMark
        nid={null}
        markType="circle"
        r={20}
        cx={50}
        cy={50}
        style={{
          fill: "gray",
          stroke: "black",
          strokeWidth: this.state.source === null ? "2px" : 0
        }}
        dropFunction={this.dropMe}
      />
    );

    const DragMark2 = (
      <DraggableMark
        nid={"painty"}
        markType="circle"
        renderMode={"painty"}
        r={20}
        cx={150}
        cy={50}
        style={{
          fill: "gray",
          stroke: "black",
          strokeWidth: this.state.source === "painty" ? "2px" : 0
        }}
        dropFunction={this.dropMe}
      />
    );

    const DragMark3 = (
      <DraggableMark
        nid={"sketchy"}
        markType="circle"
        renderMode={"sketchy"}
        r={20}
        cx={250}
        cy={50}
        style={{
          fill: "gray",
          stroke: "black",
          strokeWidth: this.state.source === "sketchy" ? "2px" : 0
        }}
        dropFunction={this.dropMe}
      />
    );

    const DragMark4 = (
      <DraggableMark
        markType="rect"
        nid={1}
        renderMode={this.state.target === 1 ? this.state.source : null}
        width={100}
        height={100}
        x={175}
        y={150}
        style={{ fill: "#00a2ce" }}
        dropFunction={this.dropMe}
      />
    );

    const DragMark5 = (
      <DraggableMark
        markType="rect"
        nid={2}
        renderMode={this.state.target === 2 ? this.state.source : null}
        width={100}
        height={100}
        x={25}
        y={150}
        style={{ fill: "#b3331d" }}
        dropFunction={this.dropMe}
      />
    );

    const buttons = [];

    const examples = [];
    examples.push(
      {
        name: "Basic",
        demo: (
          <svg height="365" width="500">
            {mark}
            {circleMark}
            {resetMark}
            {sketchyMark}
            {horizontalBarMark}
            {verticalBarMark}
          </svg>
        ),
        source: `
      import { Mark } from 'semiotic';

        const mark = <Mark
            markType='rect'
            width={100}
            height={100}
            x={25}
            y={25}
            draggable={true}
            style={{ fill: '#00a2ce', stroke: 'blue', strokeWidth: '1px' }}
            />

        const circleMark = <Mark
            markType='circle'
            renderMode='forcePath'
            r={50}
            cx={205}
            cy={255}
            style={{ fill: '#00a2ce', stroke: 'blue', strokeWidth: '1px' }}
            />

        const resetMark = <Mark
            markType='rect'
            width={100}
            height={100}
            x={25}
            y={135}
            draggable={true}
            resetAfter={true}
            style={{ fill: '#4d430c' }}
            />

        const verticalBarMark = <Mark
            markType='verticalbar'
            width={50}
            height={100}
            x={185}
            y={150}
            style={{ fill: '#b3331d' }}
            />

        const horizontalBarMark = <Mark
            markType='horizontalbar'
            width={50}
            height={100}
            x={185}
            y={150}
            style={{ fill: '#b6a756' }}
            />

        const sketchyMark = <Mark
            markType='rect'
            renderMode='sketchy'
            width={100}
            height={100}
            x={25}
            y={250}
            style={{ fill: '#b86117', stroke: '#b86117', strokeWidth: '4px' }}
            />

        <svg height='365' width='500'>
            {mark}
            {circleMark}
            {resetMark}
            {sketchyMark}
            {horizontalBarMark}
            {verticalBarMark}
        </svg>
      `
      },
      {
        name: "Drag and Drop",
        demo: (
          <svg height="365" width="500">
            <defs>
              <marker
                id="Triangle"
                refX={12}
                refY={6}
                markerUnits="userSpaceOnUse"
                markerWidth={12}
                markerHeight={18}
                orient="auto"
              >
                <path d="M 0 0 12 6 0 12 3 6" />
              </marker>
              <filter id="paintyFilterHeavy">
                <feGaussianBlur
                  id="gaussblurrer"
                  in="SourceGraphic"
                  stdDeviation={4}
                  colorInterpolationFilters="sRGB"
                  result="blur"
                />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
                  result="gooey"
                />
              </filter>
              <filter id="paintyFilterLight">
                <feGaussianBlur
                  id="gaussblurrer"
                  in="SourceGraphic"
                  stdDeviation={2}
                  colorInterpolationFilters="sRGB"
                  result="blur"
                />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7"
                  result="gooey"
                />
              </filter>
            </defs>
            <text
              x={190}
              y={125}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              Drag me!
            </text>
            <line
              markerEnd="url(#Triangle)"
              x1={155}
              y1={65}
              x2={190}
              y2={140}
              style={{
                userSelect: "none",
                pointerEvents: "none",
                stroke: "black",
                strokeWidth: "1px",
                strokeDasharray: "5 5"
              }}
            />
            <MarkContext>
              {DragMark4}
              {DragMark5}
              {DragMark1}
              {DragMark2}
              {DragMark3}
            </MarkContext>
          </svg>
        ),
        source: `
      import { Mark } from 'semiotic';

        const DragMark1 = <DraggableMark
            nid={null}
            markType='circle'
            r={20}
            cx={50}
            cy={50}
            style={{ fill: 'gray', stroke: 'black', strokeWidth: this.state.source === null ? '2px' : 0 }}
            dropFunction={this.dropMe}
            />

        const DragMark2 = <DraggableMark
            nid={'painty'}
            markType='circle'
            renderMode={'painty'}
            r={20}
            cx={150}
            cy={50}
            style={{ fill: 'gray', stroke: 'black', strokeWidth: this.state.source === 'painty' ? '2px' : 0 }}
            dropFunction={this.dropMe}
            />

        const DragMark3 = <DraggableMark
            nid={'sketchy'}
            markType='circle'
            renderMode={'sketchy'}
            r={20}
            cx={250}
            cy={50}
            style={{ fill: 'gray', stroke: 'black', strokeWidth: this.state.source === 'sketchy' ? '2px' : 0 }}
            dropFunction={this.dropMe}
            />

        const DragMark4 = <DraggableMark
            markType='rect'
            nid={1}
            renderMode={this.state.target === 1 ? this.state.source : null}
            width={100}
            height={100}
            x={175}
            y={150}
            style={{ fill: '#00a2ce' }}
            dropFunction={this.dropMe}
            />

        const DragMark5 = <DraggableMark
            markType='rect'
            nid={2}
            renderMode={this.state.target === 2 ? this.state.source : null}
            width={100}
            height={100}
            x={25}
            y={150}
            style={{ fill: '#b3331d' }}
            dropFunction={this.dropMe}
            />

        <svg height='365' width='500'>
        <defs>
            <marker
            id='Triangle'
            refX={12}
            refY={6}
            markerUnits='userSpaceOnUse'
            markerWidth={12}
            markerHeight={18}
            orient='auto'>
            <path d='M 0 0 12 6 0 12 3 6' />
            </marker>
          <filter id='paintyFilterHeavy'>
            <feGaussianBlur id='gaussblurrer' in='SourceGraphic'
              stdDeviation={4}
              colorInterpolationFilters='sRGB'
              result='blur'
            />
            <feColorMatrix in='blur'
              mode='matrix'
              values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7'
              result='gooey'
            />
          </filter>
          <filter id='paintyFilterLight'>
            <feGaussianBlur id='gaussblurrer' in='SourceGraphic'
              stdDeviation={2}
              colorInterpolationFilters='sRGB'
              result='blur'
            />
            <feColorMatrix in='blur'
              mode='matrix'
              values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 34 -7'
              result='gooey'
            />
          </filter>
        </defs>
            <text x={190} y={125} style={{ userSelect: 'none', pointerEvents: 'none' }}>Drag me!</text>
            <line markerEnd='url(#Triangle)' x1={155} y1={65} x2={190} y2={140} style={{ userSelect: 'none', pointerEvents: 'none', stroke: 'black', strokeWidth: '1px', strokeDasharray: '5 5' }} />
            <MarkContext>
                {DragMark4}
                {DragMark5}
                {DragMark1}
                {DragMark2}
                {DragMark3}
            </MarkContext>
        </svg>
      `
      }
    );

    return (
      <DocumentComponent
        name="Mark"
        api="https://github.com/emeeks/semiotic/wiki/Mark"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Mark allows you to declare different SVG elements and render them
          differently based on the attributes of the Mark.
        </p>

        <p>
          Mark automatically interpolates using D3 transitions across a
          whitelisted set of attributes and styles.
        </p>
      </DocumentComponent>
    );
  }
}

MarkDocs.title = "Mark";
