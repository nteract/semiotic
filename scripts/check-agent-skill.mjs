#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const skill = path.join(root, "agent-skill/semiotic-charts/SKILL.md")
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"))
const text = fs.readFileSync(skill, "utf8")

if (!/^---\r?\n/.test(text) || !/^name:\s*semiotic-charts$/m.test(text) || !/^description:\s*.+$/m.test(text)) {
  throw new Error("Agent Skill requires YAML frontmatter with name: semiotic-charts and a description.")
}
if (!/^#\s+Generating charts with Semiotic$/m.test(text)) {
  throw new Error("Agent Skill requires its canonical top-level workflow heading.")
}
if (!text.includes("prepareChart") || !text.includes("semiotic-mcp")) {
  throw new Error("Agent Skill must cover both the trust loop and MCP delivery.")
}
if (!packageJson.files.includes("agent-skill/semiotic-charts/SKILL.md")) {
  throw new Error("Agent Skill must be included in the published npm package.")
}
console.log(`✅ Agent Skill valid and packaged for semiotic@${packageJson.version}`)
