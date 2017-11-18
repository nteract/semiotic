import { forceSimulation, forceX, forceY, forceCollide } from "d3-force";

const basicPointSizeFunction = () => {
  return 5;
};
const basicLabelSizeFunction = noteData => {
  const text = noteData.note.label || noteData.note.title;

  const textLength = text.length;
  const circleSize =
    noteData.note && noteData.note.wrap
      ? Math.min(noteData.note.wrap, textLength * 3)
      : textLength * 3;
  return circleSize;
};

export function basicVerticalSorting({
  axes,
  adjustableAnnotations,
  margin,
  size,
  orient,
  textHeight = 30,
  textPadding = 5,
  textMargin = 0
}) {
  let x = size[0] - margin.right + 10 + textMargin;
  if (axes && axes.find(d => d.props.orient === "right")) {
    x += 65;
  }
  if (orient === "left") {
    x = margin.left - 10 - textMargin;
    if (axes && axes.find(d => d.props.orient === "left")) {
      x -= 65;
    }
  }

  let gap = 0;
  let lastPosition = 0;
  adjustableAnnotations.forEach(baseNote => {
    const note = baseNote.props.noteData;
    note.nx = x;
    note.ny = textHeight * 2;
    note.align = "bottom";
  });
  adjustableAnnotations.forEach((baseNote, notei) => {
    let note = baseNote.props.noteData;
    const nextBaseNote = adjustableAnnotations[notei + 1];

    if (
      nextBaseNote &&
      note.ny + textHeight + textPadding > nextBaseNote.props.noteData.ny
    ) {
      const nextNote = nextBaseNote.props.noteData;
      nextNote.ny = note.ny + textHeight + textPadding;
    } else {
      for (let step = lastPosition; step <= notei; step++) {
        adjustableAnnotations[step].props.noteData.ny -= gap;
      }
      if (nextBaseNote) {
        const nextNote = nextBaseNote.props.noteData;
        gap = Math.min(
          80,
          Math.max(0, nextNote.ny - (note.ny + textHeight + textPadding))
        );
        lastPosition = notei + 1;
      }
    }
  });
  return adjustableAnnotations;
}

export function bumpAnnotations(adjustableNotes, props) {
  let {
    pointSizeFunction = basicPointSizeFunction,
    labelSizeFunction = basicLabelSizeFunction
  } = props;

  //      if (this.state.font) {
  //        return adjustableNotes
  //      }

  const labels = adjustableNotes.map((d, i) => {
    const anchorX =
      d.props.noteData.x +
      (d.props.noteData.dx !== undefined
        ? d.props.noteData.dx
        : (i % 3 - 1) * -10);
    const anchorY =
      d.props.noteData.y +
      (d.props.noteData.dy !== undefined
        ? d.props.noteData.dy
        : (i % 3 - 1) * 10);
    return {
      anchorX,
      anchorY,
      above: anchorY < d.props.noteData.y,
      left: anchorX < d.props.noteData.x,
      r: labelSizeFunction(d.props.noteData),
      type: "label",
      originalNote: d
    };
  });
  const points = adjustableNotes.map(d => ({
    anchorX: d.props.noteData.x,
    anchorY: d.props.noteData.y,
    fx: d.props.noteData.x,
    fy: d.props.noteData.y,
    r: pointSizeFunction(d.props.noteData),
    type: "point",
    originalNote: d
  }));

  const labelsAndPoints = [...labels, ...points];

  const labelSim = forceSimulation()
    .force(
      "x",
      forceX(a => a.anchorX).strength(
        a => (a.left && a.originalNote.props.noteData.x > a.x ? 3 : 1)
      )
    )
    .force(
      "y",
      forceY(a => a.anchorY).strength(
        a => (a.top && a.originalNote.props.noteData.y > a.y ? 3 : 1)
      )
    )
    .force("collision", forceCollide(a => a.r).iterations(2))
    .alpha(0.5)
    .nodes(labelsAndPoints);

  for (let i = 0; i < 300; ++i) labelSim.tick();

  labelsAndPoints.forEach(d => {
    if (d.type === "label") {
      d.originalNote.props.noteData.nx = d.x;
      d.originalNote.props.noteData.ny = d.y;
    }
  });

  return adjustableNotes;
}
