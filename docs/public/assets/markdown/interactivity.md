## Hover behavior

You can set the `hoverAnnotation` property (and [[ORFrame]] has a `pieceHoverAnnotation`) to `true` which enables a voronoi overlay on the interaction layer or a columnar overlay for ORFrame columns.

- By **default** this creates tooltips on hover. See [[Customizing Tooltips]] for how to style the default tooltips and customize the content of the tooltip
- To **customize** hover with the voronoi layer, see the [[Using Annotations - Custom Annotation Rules|Using Annotations#custom-annotation-rules]] section, because when you hover, semoitic automatically adds in an annotation in the annotations array with the hover point's data. You can then process this hover annotation as would any other annotation.

## Custom Interactivity Behavior

If you want more control over what happens on interaction, for instance if you want to update state, you can define custom events for the frame using `customClickBehavior`, `customHoverBehavior` and `customDoubleclick` behavior. The click and doubleclick are pretty straightforward, they pass the associated datapoint to whatever function you define, while the hover passes the datapoint on `onMouseEnter` and passes undefined to that function on `onMouseLeave`.

```jsx
<XYFrame
  hoverAnnotation={true}
  customClickBehavior={d => {
    this.setState({ clicked: d.id });
  }}
  customDoubleclickBehavior={d => {
    this.setState({ doubleclicked: d.id });
  }}
  customHoverBehavior={d => {
    this.setState({ hover: d.id });
  }}
/>
```
