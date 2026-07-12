const SOURCE_LOADERS_BY_PATH = {
  "/examples/art-movement-genealogy": () =>
    import("./ArtMovementGenealogyExamplePage.jsx?raw").then((module) => module.default),
  "/examples/climate-anomaly": () =>
    import("./ClimateAnomalyExamplePage.jsx?raw").then((module) => module.default),
  "/examples/climate-radial-weather": () =>
    import("./ClimateRadialWeatherExamplePage.jsx?raw").then((module) => module.default),
  "/examples/creative-contours": () =>
    import("./CreativeContoursExamplePage.jsx?raw").then((module) => module.default),
  "/examples/data-centers-isotype": () =>
    import("./DataCentersIsotypeExamplePage.jsx?raw").then((module) => module.default),
  "/examples/dataviz-people": () =>
    import("./DatavizPeopleExamplePage.jsx?raw").then((module) => module.default),
  "/examples/distant-reading": () =>
    import("./DistantReadingExamplePage.jsx?raw").then((module) => module.default),
  "/examples/erie-railroad-organization": () =>
    import("./ErieRailroadOrganizationExamplePage.jsx?raw").then((module) => module.default),
  "/examples/gestalt-principles": () =>
    import("./GestaltPrinciplesExamplePage.jsx?raw").then((module) => module.default),
  "/examples/hot-dog-contest-variations": () =>
    import("./HotDogContestVariationsExamplePage.jsx?raw").then((module) => module.default),
  "/examples/insight-forge": () =>
    import("./InsightForgeExamplePage.jsx?raw").then((module) => module.default),
  "/examples/lake-travis-isotype": () =>
    import("./LakeTravisIsotypeExamplePage.jsx?raw").then((module) => module.default),
  "/examples/merge-pressure": () =>
    import("./MergePressureExamplePage.jsx?raw").then((module) => module.default),
  "/examples/not-in-my-backyard": () =>
    import("./NimbyExamplePage.jsx?raw").then((module) => module.default),
  "/examples/local-government-explorer": () =>
    import("./LocalGovernmentExplorerExamplePage.jsx?raw").then((module) => module.default),
  "/examples/mobile-data-visualization": () =>
    import("./MobileDataVisualizationExamplePage.jsx?raw").then((module) => module.default),
  "/examples/network-visualization": () =>
    import("./NetworkVizExamplePage.jsx?raw").then((module) => module.default),
  "/examples/octopus-metaphor": () =>
    import("./OctopusMetaphorExamplePage.jsx?raw").then((module) => module.default),
  "/examples/oregon-trail": () =>
    import("./OregonTrailExamplePage.jsx?raw").then((module) => module.default),
  "/examples/paris-isometric-landmarks": () =>
    import("./ParisIsometricLandmarksExamplePage.jsx?raw").then((module) => module.default),
  "/examples/port-congestion-replay": () =>
    import("./PortCongestionReplayExamplePage.jsx?raw").then((module) => module.default),
  "/examples/scroll-youre-telling": () =>
    import("./ScrollYoureTellingExamplePage.jsx?raw").then((module) => module.default),
  "/examples/semiotic-architecture": () =>
    import("./SemioticArchitectureExamplePage.jsx?raw").then((module) => module.default),
  "/examples/sometimes-better-discrete": () =>
    import("./SometimesDiscreteExamplePage.jsx?raw").then((module) => module.default),
  "/examples/stakeholder-journey": () =>
    import("./StakeholderJourneyExamplePage.jsx?raw").then((module) => module.default),
  "/examples/urine-wheel": () =>
    import("./UrineWheelExamplePage.jsx?raw").then((module) => module.default),
  "/examples/us-war-timeline": () =>
    import("./USWarTimelineExamplePage.jsx?raw").then((module) => module.default),
  "/examples/watermarks": () =>
    import("./WatermarksExamplePage.jsx?raw").then((module) => module.default),
  "/examples/what-the-machine-sees": () =>
    import("./WhatTheMachineSeesExamplePage.jsx?raw").then((module) => module.default),
  "/examples/wikipedia-realtime": () =>
    import("./WikipediaRealtimeExamplePage.jsx?raw").then((module) => module.default),
  "/examples/world-of-funnels": () =>
    import("./WorldOfFunnelsExamplePage.jsx?raw").then((module) => module.default),
}

export function getExampleSourceLoader(pathname) {
  return CLEAN_SOURCE_LOADERS_BY_PATH[pathname]
}

export const EXAMPLE_SOURCE_PATHS = Object.keys(SOURCE_LOADERS_BY_PATH)

const NARRATIVE_CODE_NAMES = ["implementationCode", "combinedCode"]
const CLEAN_SOURCE_LOADERS_BY_PATH = Object.fromEntries(
  Object.entries(SOURCE_LOADERS_BY_PATH).map(([path, loader]) => [
    path,
    () => loader().then(cleanExampleSourceForFullCode),
  ]),
)

export function cleanExampleSourceForFullCode(source) {
  let cleaned = removeNarrativeCodeConstants(source)
  cleaned = removeCodeBlockJsx(cleaned)
  cleaned = removeNarrativeCodeProps(cleaned)
  cleaned = removeCodeBlockImport(cleaned)
  return cleanupBlankLines(cleaned)
}

function removeCodeBlockImport(source) {
  return source.replace(/^\s*import\s+CodeBlock\s+from\s+["'][^"']*CodeBlock["']\s*\n/gm, "")
}

function removeNarrativeCodeConstants(source) {
  let cleaned = source
  for (const name of NARRATIVE_CODE_NAMES) {
    cleaned = removeTemplateConst(cleaned, name)
  }
  return cleaned
}

function removeTemplateConst(source, name) {
  let next = source
  let cursor = 0
  const declaration = `const ${name} = \``

  while (cursor < next.length) {
    const start = next.indexOf(declaration, cursor)
    if (start === -1) break
    const templateStart = start + declaration.length - 1
    const templateEnd = findTemplateLiteralEnd(next, templateStart)
    if (templateEnd === -1) break

    let end = templateEnd + 1
    while (end < next.length && /[ \t]/.test(next[end])) end += 1
    if (next[end] === ";") end += 1
    if (next[end] === "\r" && next[end + 1] === "\n") end += 2
    else if (next[end] === "\n") end += 1

    next = `${next.slice(0, start)}${next.slice(end)}`
    cursor = start
  }

  return next
}

function findTemplateLiteralEnd(source, start) {
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]
    if (char === "\\") {
      index += 1
      continue
    }
    if (char === "`") return index
  }
  return -1
}

function removeNarrativeCodeProps(source) {
  return source.replace(
    new RegExp(`\\n\\s+code=\\{(?:${NARRATIVE_CODE_NAMES.join("|")})\\}`, "g"),
    "",
  )
}

function removeCodeBlockJsx(source) {
  let cleaned = source
  let cursor = 0

  while (cursor < cleaned.length) {
    const start = cleaned.indexOf("<CodeBlock", cursor)
    if (start === -1) break
    const end = findJsxElementEnd(cleaned, start, "CodeBlock")
    if (end === -1) {
      cursor = start + 1
      continue
    }
    cleaned = `${cleaned.slice(0, start)}${cleaned.slice(end)}`
    cursor = start
  }

  return cleaned
}

function findJsxElementEnd(source, start, tagName) {
  const tagEnd = findJsxStartTagEnd(source, start)
  if (tagEnd === -1) return -1
  if (isSelfClosingStartTag(source, tagEnd)) return tagEnd + 1

  const closeTag = `</${tagName}>`
  const closeStart = source.indexOf(closeTag, tagEnd + 1)
  if (closeStart === -1) return -1
  return closeStart + closeTag.length
}

function findJsxStartTagEnd(source, start) {
  let quote = null
  let template = false
  let braceDepth = 0

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    const prev = source[index - 1]

    if (quote) {
      if (char === quote && prev !== "\\") quote = null
      continue
    }

    if (template) {
      if (char === "\\") {
        index += 1
        continue
      }
      if (char === "$" && source[index + 1] === "{") {
        index += 1
        continue
      }
      if (char === "`") template = false
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      continue
    }

    if (char === "`") {
      template = true
      continue
    }

    if (char === "{") {
      braceDepth += 1
      continue
    }

    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }

    if (char === ">" && braceDepth === 0) return index
  }

  return -1
}

function isSelfClosingStartTag(source, tagEnd) {
  for (let index = tagEnd - 1; index >= 0; index -= 1) {
    if (/\s/.test(source[index])) continue
    return source[index] === "/"
  }
  return false
}

function cleanupBlankLines(source) {
  return source
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
}
