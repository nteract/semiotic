# CONTRIBUTING

Welcome to Semiotic. We're glad to see you here.

*This document is currently under development as we move toward a 2.0 release
and modernization of the build tooling.*

## Documentation

There are currently two sources for documentation:
- **developer docs**: This repo contains docs useful during development of
  Semiotic.
- **user docs**the [semiotic-docs](https://github.com/nteract/semiotic-docs) 
  repo contains the source for documentation about using semiotic.

*Note: At some point, the `semiotic-docs` repo content may be moved to this
repo.*

TODO and Notes:
- Which repo is providing the source for [semiotic.nteract.io]?
- The semiotic repo refers to gh-pages. Are we using that? Looking at the repo
  setting gh-pages is disabled. (Next step: Remove gh-pages deploy scripts.
  We can leave any gh-page build scripts if they are needed.)
- Most nteract docs use vercel/now for deployment. Is this being used for semiotic-docs?
  No. semiotic-docs is building to GH Pages https://nteract.github.io/semiotic-docs/
  Assuming that there is a redirect in our domain provider config to semiotic.nteract.io.

### Building and deploying developer docs

### Building and deploying user docs