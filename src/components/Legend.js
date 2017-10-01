import React from "react";
import PropTypes from "prop-types";

const typeHash = {
  fill: style => <rect style={style} width={20} height={20} />,
  line: style => <line style={style} x1={0} y1={0} x2={20} y2={20} />
};

class Legend extends React.Component {
  renderLegendGroup(legendGroup) {
    const { type = "fill", styleFn, items } = legendGroup;
    const renderedItems = [];
    let itemOffset = 0;
    items.forEach((item, i) => {
      const Type = typeHash[type];
      let renderedType;
      if (Type) {
        const style = styleFn(item, i);
        renderedType = Type(style);
      } else {
        renderedType = type(item);
      }
      renderedItems.push(
        <g key={`legend-item-${i}`} transform={`translate(0,${itemOffset})`}>
          {renderedType}
          <text y={15} x={30}>
            {item.label}
          </text>
        </g>
      );
      itemOffset += 25;
    });
    return renderedItems;
  }

  render() {
    const { legendGroups, title = "Legend", width = 100 } = this.props;
    let offset = 30;
    const renderedGroups = [];
    legendGroups.forEach((l, i) => {
      offset += 5;
      renderedGroups.push(
        <line
          key={`legend-top-line legend-symbol-${i}`}
          stroke="gray"
          x1={0}
          y1={offset}
          x2={width}
          y2={offset}
        />
      );
      offset += 10;
      if (l.label) {
        offset += 20;
        renderedGroups.push(
          <text
            key={`legend-text-${i}`}
            y={offset}
            className="legend-group-label"
          >
            {l.label}
          </text>
        );
        offset += 10;
      }

      renderedGroups.push(
        <g
          key={`legend-group-${i}`}
          className="legend-item"
          transform={`translate(0,${offset})`}
        >
          {this.renderLegendGroup(l)}
        </g>
      );
      offset += l.items.length * 25 + 10;
    });

    return (
      <g>
        <text className="legend-title" y={20} x={width / 2} textAnchor="middle">
          {title}
        </text>
        {renderedGroups}
      </g>
    );
  }
}

Legend.propTypes = {
  title: PropTypes.string,
  width: PropTypes.number,
  legendGroups: PropTypes.array
};

module.exports = Legend;
