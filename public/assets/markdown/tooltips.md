Tooltips are a type of [annnotation](/guides/annotations), called `frame-hover`. You could manually send that annotation type to the `annotations` prop and manage hover state to handle tooltips, or you can use the following built-in conveniences to turn on tooltips for any frame:

- Set the `hoverAnnotation` property to `true`
- Base CSS for tooltips to get you started:

```css
.tooltip-content {
  background: white;
  position: relative;
  border: 1px solid #ddd;
  color: black;
  padding: 10px;
  z-index: 100;
  transform: translateX(-50%) translateY(5px);
  min-width: 120px;
}

circle.frame-hover {
  stroke: #aaa;
  r: 4;
}
```

Semiotic automatically creates a voronoi of hover regions on your chart. For \`ORFrame\`, it defaults to hovering for the entire column, if you'd prefer to have hover enabled for individual pieces, you can set `pieceHoverAnnotation` to `true`.

```jsx
// Point hovering for XYFrame or NetworkFrame and column hovering for ORFrame
<XYFrame
   hoverAnnotation={true}
/>

// Column hovering for ORFrame
<ORFrame
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

Tooltips are processed along with any other annotation, so you can override them by writing [custom annotation rules](/guides/annotations#custom-annotation-rules) to handle the `frame-hover` or `column-hover` event.
