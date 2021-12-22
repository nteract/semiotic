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
    - Recommend removing gh-page build scripts from repo. (Removed 2021-12-22)
    - Update build script for dev docs using parcel and add to vercel dev doc builds for PRs.)
3. Most nteract docs use vercel/now for deployment. Is this being used for semiotic-docs?  
   - Yes. For semiotic-docs but not deployed in approximately 2 years.
   - semiotic-docs is also building to GH Pages https://nteract.github.io/semiotic-docs/


### Building and deploying developer docs

### Building and deploying user docs

Currently, use [semiotic-docs] and vercel/now project configuration.

## Modernization plan

1. upgrade react to 17
2. upgrade d3
4. switch to esm/cjs dual bundle
5. move d3/react to peer dependencies (thus making sure that the users’ dependencies are the same as semiotic’s)
6. add sideEffects: true (a small nice thing to have in package.json, once previous steps are complete)
7. replace enzyme with react-testing-library 
8. add acceptance testing via playwright (to cover things like canvas, a11y, and some user-based testing scenarios)

## Tools we use

### Build toolchain

- Parcel
  - [Parcel](https://parceljs.org) is a performant, zero config, end to end build tool

- Rollup
  - [Rollup](https://rollupjs.org/guide/en/) is a module bundler for JavaScript
  - `rollup.config.js` config file for creating esm and cjs dual bundle

### Testing

- Playwright
  - [Playwright](https://playwright.dev) is a fast test runner that supports screenshotting
  - `playwright.config.js` provides basic configuration
  - Used to run the integration tests found in `integration-tests` directory
- jest
  - used for unit tests
  - `jest.config.js` configures testing environment
  - Additional configuration is in `config/jest` directory containing transforms for Parcel
- GitHub actions (CI - Continuous Integration)
  - Used to automatically run tests on every PR
  - `.github` directory contains configuration
  
### Code quality

- GitHub's CodeQL action runs on every PR
- GitHub's Dependency alerts are used

## Publishing a release

1. Run all tests
2. Publish