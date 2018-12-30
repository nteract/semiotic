To turn on tooltips for any frame:

- Set the `hoverAnnotation` property to `true`
- Add this CSS to your app:

```css
.tooltip-content {
  background: white;
  border: 1px solid black;
  color: black;
  padding: 10px;
  z-index: 99;
  min-width: 120px;
}

.tooltip-content:before {
  background: white;
  content: "";
  padding: 0px;
  transform: rotate(45deg);
  width: 15px;
  height: 15px;
  position: absolute;
  z-index: 99;
}

circle.frame-hover {
  fill: none;
  stroke: black;
  r: 10;
}
```

Semiotic automatically creates a voronoi of hoverable regions on your chart. For ORFrame, it defaults to hovering for the entire column, if you'd prefer to have hover enabled for individual pieces, you can set `pieceHoverAnnotation` to `true`.

```jsx
// Point hovering for XYFrame or NetworkFrame and column hovering for ORFrame
<XYFrame
   hoverAnnotation={true}
/>

// Point hovering for ORFrame
<ORFrame
   pieceHoverAnnotation={true}
/>
```

As you hover over the chart, you will see an HTML tooltip as well as an SVG circle over the point you're hovering.

By default, tooltips will show minimal information. If you want to adjust the content of a tooltip, use the `tooltipContent` prop to pass HTML JSX elements to the tooltip:

```jsx
<XYFrame
  tooltipContent={d => (
    <div className="tooltip-content">
      <p>Name: {d.name}</p>
      <p>Salary: {d.salary}</p>
      <p>Date: {d.timestamp.toString()}</p>
    </div>
  )}
/>
```

If you're ambitious, you could even drop another frame in the tooltip to show data visualization on hover:

```jsx
<XYFrame
  tooltipContent={d => (
    <div>
      <p>Bar Chart for: {d.name}</p>
      <ORFrame
        data={d.evaluation}
        oAccessor={"category"}
        rAccessor={"level"}
        oLabel={true}
      />
    </div>
  )}
/>
```

Tooltips are processed along with any other annotation, so you can override them by writing [[custom annotation rules|Using Annotations#htmlannotationrules--function-]] to handle the `frame-hover` or `column-hover` event.
