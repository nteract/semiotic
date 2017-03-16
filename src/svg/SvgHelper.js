import { select } from 'd3-selection'

export const drawAreaConnector = ({ x1, x2, y1, y2, sizeX1, sizeY1, sizeX2, sizeY2 }) => {
  return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L" + (x2 + sizeX2) + "," + (y2 + sizeY2) + "L" + (x1 + sizeX1) + "," + (y1 + sizeY1) + "Z"
}

export const wrap = (text, width) => {
  text.each(function() {
    let textNode = select(this),
        words = textNode.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = textNode.attr("y"),
        dy = parseFloat(textNode.attr("dy")),
        tspan = textNode.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

    while (words.length > 0) {
      word = words.pop()
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [ word ];

        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}

export const hexToRgb = (hex) => {
    const  result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [ parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16) ]
    : [ 0,0,0 ];
}
