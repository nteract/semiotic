`<FacetController />` is a wrapper that synchronizes any child frames based on the settings you pass to `FacetController`. It automatically passes down its props to children and modifies children if you change any of the shared extent props below. The FacetController propagates any `hoverAnnotation` or `pieceHoverAnnotation` to its child elements so that by default you will have cross-highlighting.

## Sample usage:

**Table of Contents**

```jsx
<FacetController
  sharedXExtent={ true }
  sharedYExtent={ true }
  ...otherPropsPassedToChildren >
  <XYFrame ...someSpecificPropsForThisFrame />
  <XYFrame ...someSpecificPropsForThisFrame />
  <XYFrame ...someSpecificPropsForThisFrame />
</FacetController>
```

- [General Properties](#general-properties)
  - [sharedXExtent: { _boolean_ }](#sharedXExtent-boolean-)
  - [sharedYExtent: { _boolean_ }](#sharedYExtent-boolean-)
  - [sharedRExtent: { _boolean_ }](#sharedRExtent-boolean-)
  - [react15Wrapper: { _Element_ }](#react15Wrapper-Element-)

### sharedXExtent: { _boolean_ }

If _sharedXExtent_ is specified, the child frames will have the same x extent calculated from the min/max of all the data in the child frames.

```jsx
<FacetController sharedXExtent={ true } ... />
```

### sharedYExtent: { _boolean_ }

If _sharedYExtent_ is specified, the child frames will have the same y extent calculated from the min/max of all the data in the child frames.

```jsx
<FacetController sharedYExtent={ true } ... />
```

### sharedRExtent: { _boolean_ }

If _sharedRExtent_ is specified, the child frames will have the same r extent calculated from the min/max of all the data in the child frames.

```jsx
<FacetController sharedRExtent={ true } ... />
```

### react15Wrapper: { _Element_ }

By default, children of a FacetController will be wrapped in a `React.Fragment`. If you're using React 15, though, you will need to pass an element to serve as the container. This can be as simple as a `<div />`.
