`<SparkNetworkFrame />` is a wrapper around NetworkFrame that renders it as a `<span>` so it can be placed in a `<p>`. Its height (and width if not set) are based on the computed `line-height` of the line it is embedded in.

Some of the built-in defaults of the frame are different from the usual NetworkFrame:

- `networkType` has the following default settings:

```
      edgeStrength: 2
      edgeDistance: 5
      nodePadding: 1
      nodeWidth: 5
      groupWidth: 4
```
