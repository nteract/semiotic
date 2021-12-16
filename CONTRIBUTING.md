# CONTRIBUTING

Welcome to Semiotic. We're glad to see you here.

*This document is currently under development as we move toward a 2.0 release
and modernization of the build tooling.*

## Documentation

There are currently two sources for documentation:
- **developer docs**: This repo contains docs useful during development of
  Semiotic.
- **user docs**: The [semiotic-docs](https://github.com/nteract/semiotic-docs) 
  repo contains the source for documentation about using semiotic.

*Note: At some point, the `semiotic-docs` repo content may be moved to this
repo.*

### Documentation Modernization FAQ

1. Which repo is providing the source for semiotic.nteract.io?
    - Currently, semiotic-docs using Vercel project settings.
2. The semiotic repo refers to gh-pages. Are we using that?
    - Looking at the repo setting gh-pages is disabled.
    - (2021-12-16) Added a Vercel project for semiotic under the
      vercel nteract org (Next step: Remove gh-pages deploy scripts.
    - Recommend removing gh-page build scripts from repo. 
    - Update build script for dev docs using parcel and add to vercel dev doc builds for PRs.)
3. Most nteract docs use vercel/now for deployment. Is this being used for semiotic-docs?  
   - Yes. For semiotic-docs but not deployed in approximately 2 years.
   - semiotic-docs is also building to GH Pages https://nteract.github.io/semiotic-docs/


### Building and deploying developer docs

### Building and deploying user docs

Currently, use [semiotic-docs] and vercel/now project configuration.