# Conference demo fallback

This directory contains the checked-in recovery package for the conference
demo:

- `conference-stage.mp4` — browser-recorded walkthrough for rooms where the
  live demo cannot run.
- `keyframe-01-candidates.png` — the initial question and ranked candidates.
- `keyframe-02-variant.png` — the admitted RidgelinePlot variant.
- `keyframe-03-handoff.png` — the defensible JSX handoff.
- `manifest.json` — byte counts and SHA-256 digests for the generated assets.

Regenerate the package from the real local demo with:

```sh
npm run capture:conference-demo
```

The capture blocks external HTTP requests, downloads the live conversation
arc, normalizes its timing fields, and converts Playwright's recording to an
MP4. Validate the committed artifacts with:

```sh
npm run test:conference-demo-assets
```
