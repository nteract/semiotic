# IDID spec bindings

Reference implementations of the [IDID portability spec](../README.md) for
specific host formats. **These are zero-dependency, library-neutral, and free to
copy.** They exist to prove the spec is implementable without the reference
library — the leading indicator that a standard is actually portable is someone
implementing it in a stack that isn't the original.

## `vega-lite.mjs`

The IDID-over-Vega-Lite binding: carries chart capability, audience profile, and
provenanced/lifecycled annotations on an ordinary Vega-Lite spec under
`usermeta.idid` (which every Vega-Lite renderer ignores), so the spec and its
meaning travel together.

```js
import {
  attachIdid, readIdid, attachIdidAnnotations, readIdidAnnotations,
  suggestionInputFromSpec,
} from "semiotic/spec/bindings/vega-lite.mjs"

let spec = { mark: "bar", encoding: { /* … */ } }
spec = attachIdid(spec, { capability, audience })          // ride under usermeta.idid
spec = attachIdidAnnotations(spec, [provenancedNote])       // + a note with its evidence

// An IDID-aware host reads it back and acts on it:
const input = suggestionInputFromSpec(spec)                 // { capability, audience } | null
```

The binding is available from the npm package at
`semiotic/spec/bindings/vega-lite.mjs`; the three schemas and six worked
fixtures resolve under `semiotic/spec/v0.1/`.

`suggestionInputFromSpec` extracts metadata; it does not invent executable
chart behavior. The portable capability contains static rubric/intent metadata
but deliberately omits host-specific `fits` and `buildProps` functions. A host
with a suggestion engine that requires those functions must resolve
`capability.component` to its own implementation before scoring it. This
standalone binding refuses to assume that every carried chart fits every
dataset.

The output is byte-compatible with Semiotic's TypeScript binding
(`semiotic/experimental`: `unstable_attachIDID`, `unstable_readIDID`,
`unstable_attachIDIDAnnotations`, …), so a spec enriched in one can be read in
the other. Validate the carried metadata against the published
[JSON Schemas](../v0.1).
