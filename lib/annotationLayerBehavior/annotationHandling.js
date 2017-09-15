"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.basicVerticalSorting = basicVerticalSorting;
exports.bumpAnnotations = bumpAnnotations;

var _d3Force = require("d3-force");

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function basicVerticalSorting(_ref) {
  var axes = _ref.axes,
      adjustableAnnotations = _ref.adjustableAnnotations,
      margin = _ref.margin,
      size = _ref.size,
      orient = _ref.orient,
      _ref$textHeight = _ref.textHeight,
      textHeight = _ref$textHeight === undefined ? 30 : _ref$textHeight,
      _ref$textPadding = _ref.textPadding,
      textPadding = _ref$textPadding === undefined ? 5 : _ref$textPadding,
      _ref$textMargin = _ref.textMargin,
      textMargin = _ref$textMargin === undefined ? 0 : _ref$textMargin;

  var x = size[0] - margin.right + 10 + textMargin;
  if (axes && axes.find(function (d) {
    return d.props.orient === "right";
  })) {
    x += 65;
  }
  if (orient === "left") {
    x = margin.left - 10 - textMargin;
    if (axes && axes.find(function (d) {
      return d.props.orient === "left";
    })) {
      x -= 65;
    }
  }

  var gap = 0;
  var lastPosition = 0;
  adjustableAnnotations.forEach(function (baseNote) {
    var note = baseNote.props.noteData;
    note.nx = x;
    note.ny = textHeight * 2;
    note.align = "bottom";
  });
  adjustableAnnotations.forEach(function (baseNote, notei) {
    var note = baseNote.props.noteData;
    var nextBaseNote = adjustableAnnotations[notei + 1];

    if (nextBaseNote && note.ny + textHeight + textPadding > nextBaseNote.props.noteData.ny) {
      var nextNote = nextBaseNote.props.noteData;
      nextNote.ny = note.ny + textHeight + textPadding;
    } else {
      for (var step = lastPosition; step <= notei; step++) {
        adjustableAnnotations[step].props.noteData.ny -= gap;
      }
      if (nextBaseNote) {
        var _nextNote = nextBaseNote.props.noteData;
        gap = Math.min(80, Math.max(0, _nextNote.ny - (note.ny + textHeight + textPadding)));
        lastPosition = notei + 1;
      }
    }
  });
  return adjustableAnnotations;
}

function bumpAnnotations(adjustableNotes, props) {
  var basicPointSizeFunction = function basicPointSizeFunction() {
    return 5;
  };
  var basicLabelSizeFunction = function basicLabelSizeFunction(noteData) {
    var text = noteData.note.label || noteData.note.title;

    var textLength = text.length;
    var circleSize = noteData.note && noteData.note.wrap ? Math.min(noteData.note.wrap, textLength * 3) : textLength * 3;
    return circleSize;
  };

  var _props$pointSizeFunct = props.pointSizeFunction,
      pointSizeFunction = _props$pointSizeFunct === undefined ? basicPointSizeFunction : _props$pointSizeFunct,
      _props$labelSizeFunct = props.labelSizeFunction,
      labelSizeFunction = _props$labelSizeFunct === undefined ? basicLabelSizeFunction : _props$labelSizeFunct;

  //      if (this.state.font) {
  //        return adjustableNotes
  //      }

  var labels = adjustableNotes.map(function (d, i) {
    var anchorX = d.props.noteData.x + (d.props.noteData.dx !== undefined ? d.props.noteData.dx : (i % 3 - 1) * -10);
    var anchorY = d.props.noteData.y + (d.props.noteData.dy !== undefined ? d.props.noteData.dy : (i % 3 - 1) * 10);
    return {
      anchorX: anchorX,
      anchorY: anchorY,
      above: anchorY < d.props.noteData.y,
      left: anchorX < d.props.noteData.x,
      r: labelSizeFunction(d.props.noteData),
      type: "label",
      originalNote: d
    };
  });
  var points = adjustableNotes.map(function (d) {
    return {
      anchorX: d.props.noteData.x,
      anchorY: d.props.noteData.y,
      fx: d.props.noteData.x,
      fy: d.props.noteData.y,
      r: pointSizeFunction(d.props.noteData),
      type: "point",
      originalNote: d
    };
  });

  var labelsAndPoints = [].concat(_toConsumableArray(labels), _toConsumableArray(points));

  var labelSim = (0, _d3Force.forceSimulation)().force("x", (0, _d3Force.forceX)(function (a) {
    return a.anchorX;
  }).strength(function (a) {
    return a.left && a.originalNote.props.noteData.x > a.x ? 3 : 1;
  })).force("y", (0, _d3Force.forceY)(function (a) {
    return a.anchorY;
  }).strength(function (a) {
    return a.top && a.originalNote.props.noteData.y > a.y ? 3 : 1;
  })).force("collision", (0, _d3Force.forceCollide)(function (a) {
    return a.r;
  }).iterations(2)).alpha(0.5).nodes(labelsAndPoints);

  for (var i = 0; i < 300; ++i) {
    labelSim.tick();
  }labelsAndPoints.forEach(function (d) {
    if (d.type === "label") {
      d.originalNote.props.noteData.nx = d.x;
      d.originalNote.props.noteData.ny = d.y;
    }
  });

  return adjustableNotes;
}