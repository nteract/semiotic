# HRA/WPP × IDID workshop field kit

Prepared for the Human Reference Atlas & Whole Person Physiome Hackathon,
August 3–5, 2026.

## Purpose

Test one claim, not a general biomedical visualization platform:

> Can Semiotic's existing audience, intent, provenance, grounding, and
> namespaced-extension primitives carry an expert domain typology without
> flattening ontology identity or hiding behavior that multiple tools must
> share?

The pinned evidence is `kidney-v1.6-pilot.json`. It is generated from
<https://purl.humanatlas.io/asct-b/kidney/v1.6> and compares the eight observed
direct children of `kidney (UBERON:0002113)`. Ontology identifiers are semantic
keys. Labels are display text. Counts are set memberships, not an additive
partition.

## Files

- `kidney-v1.6-pilot.json` — exact generated chart rows, review rows, source
  metadata, aggregation method, and pre-workshop failure evidence.
- `response-template.json` — one response record to fill during the session.
- `response-schema.json` — portable contract for captured responses.
- `co-sign-template.md` — exact follow-up language; do not quote a participant
  until they approve it in writing.

## Thirty-minute protocol

### 0–3 minutes — orient and get attribution preference

1. State that this is a schema/communication test, not a usability evaluation
   of the participant.
2. Record role, organization, domain-literacy terms, and whether the response
   may be attributed by name.
3. Do not infer literacy from job title.

### 3–8 minutes — unaided reading

Show `/interoperability/hra-wpp` without explaining the orange bars.

Ask:

1. What comparison do you think the chart is asking you to make?
2. What does one bar count?
3. Which decision, if any, could you make from this view?
4. What would you incorrectly assume if the ontology IDs were hidden?

Record the first misreading in `failureCase`, even if the participant later
corrects it.

### 8–15 minutes — identity and terminology review

Reveal the source/methodology and the three observed label collisions. Review
the terms currently carried under `x-hra`:

- roles: subject-matter expert, ontology curator, research software engineer;
- domain literacy: ASCT+B, ontology crosswalk;
- scale path: organ → anatomical structure → cell type;
- use context: atlas coverage review;
- task: aggregate, compare, rank, review crosswalk.

For every changed or rejected term, capture the participant's replacement,
source/ontology, owner, and whether another tool must interpret it.

### 15–22 minutes — communicative-act contrast

Ask for two roles using the same kidney data:

1. What should the chart ask role A to notice or do?
2. What should role B notice or do differently?
3. Does the difference change prose only, annotation status, available
   interactions, ranking/scoring, or the chart form?

Record the contrast in `communicativeActContrast`.

### 22–27 minutes — cross-tool behavior test

Ask the exact workshop question:

> Where does this typology mapping break for WPP? Which facts must be typed and
> acted on across tools rather than merely preserved as ontology-linked
> extension metadata?

For each candidate fact, name the producer, every consumer, and the observable
behavior that changes.

### 27–30 minutes — decision and co-sign

Apply the decision rubric below. Read back the captured failure and decision.
Ask whether the participant is willing to receive the written co-sign request.
Consent in the room is not permission to quote.

## Decision rubric

Choose exactly one:

1. **`extension-sufficient`** — the domain fields must survive interchange, but
   receivers only preserve or display them. Keep `x-hra`; do not add core
   schema.
2. **`grounding-context-envelope`** — agent or screen-reader reception needs
   selected domain context beside chart grounding, but no shared object is
   updated or governed across tools. Prototype an opt-in `contextExtensions`
   envelope; do not open `ContextProfile`.
3. **`context-profile-rfc-candidate`** — at least two independent tools must
   resolve the same stable context identity and use it to change validation,
   scoring, permitted actions, or governance state. Record those tools and the
   behavior before opening a scoped RFC.
4. **`insufficient-evidence`** — the participant identified a concern but no
   reproducible cross-tool behavior. Preserve the response and gather another
   case.

`context-profile-rfc-candidate` is necessary evidence, not automatic approval.
Promotion still requires a second workflow or adopter to show the vocabulary
is not HRA-specific.

## Success criteria

The session is complete only when the response contains:

- one reviewed role/domain-literacy vocabulary with an owner/source;
- one remaining failure in the corrected chart or grounding envelope;
- one role-dependent communicative-act contrast;
- an explicit decision from the rubric with producer/consumer behavior;
- attribution and quote-permission state.

## Offline operation

The page, chart data, response files, and code sample are local build assets.
Load the page once from the local docs server before disconnecting. The HRA PURL
is provenance only; the session does not require a network fetch. Use the
checked-in JSON if the external source is unavailable.
