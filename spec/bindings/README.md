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
} from "./vega-lite.mjs"

let spec = { mark: "bar", encoding: { /* … */ } }
spec = attachIdid(spec, { capability, audience })          // ride under usermeta.idid
spec = attachIdidAnnotations(spec, [provenancedNote])       // + a note with its evidence

// An IDID-aware host reads it back and acts on it — e.g. routes the carried
// capability + audience through any chart-suggestion engine:
const input = suggestionInputFromSpec(spec)                 // { capability, audience } | null
```

The output is byte-compatible with Semiotic's TypeScript binding
(`semiotic/experimental`: `unstable_attachIDID`, `unstable_readIDID`,
`unstable_attachIDIDAnnotations`, …), so a spec enriched in one can be read in
the other. Validate the carried metadata against the published
[JSON Schemas](../v0.1).
