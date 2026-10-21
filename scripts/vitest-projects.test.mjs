import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { BaseSequencer, createVitest } from "vitest/node"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const config = resolve(root, "vitest.config.mts")

test("Vitest discovery excludes Node test suites while retaining script unit tests", async () => {
  const ctx = await createVitest("test", { root, config, watch: false })
  try {
    const specs = await ctx.globTestSpecifications()
    const nodeTests = specs.filter((spec) =>
      /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']node:test["']/.test(
        readFileSync(spec.moduleId, "utf8")
      )
    )
    assert.deepEqual(
      nodeTests.map((spec) => spec.moduleId),
      [],
      "Node test suites must run via node --test, outside Vitest's browser environment"
    )
    assert(
      specs.some((spec) =>
        spec.moduleId.endsWith("/scripts/network-atlas/acceptance.test.tsx")
      )
    )
  } finally {
    await ctx.close()
  }
})

test("heavy physics simulations run serially without losing or duplicating shard coverage", async () => {
  const ctx = await createVitest("test", { root, config, watch: false })
  try {
    const specs = await ctx.globTestSpecifications()
    const paths = specs.map((spec) => spec.moduleId).sort()
    assert.equal(new Set(paths).size, paths.length)

    const simulationPaths = [
      resolve(root, "src/components/stream/physics/PhysicsConfinement.test.ts"),
      resolve(
        root,
        "src/components/stream/physics/PhysicsReducedMotionSettle.test.ts"
      ),
      resolve(root, "src/components/charts/physics/EventDropLiveRuntime.test.ts"),
      resolve(root, "src/components/charts/physics/PhysicsReducedMotion.test.tsx"),
      resolve(root, "src/components/charts/physics/PhysicsCharts.server.test.tsx"),
      resolve(root, "docs/src/pages/examples/emitterPlaygroundModel.test.ts")
    ].sort()
    const simulations = specs.filter((spec) =>
      simulationPaths.includes(spec.moduleId)
    )
    assert.deepEqual(
      simulations.map((spec) => spec.moduleId).sort(),
      simulationPaths
    )
    const project = simulations[0].project
    assert(simulations.every((spec) => spec.project === project))
    assert.equal(project.name, "physics-simulations")
    assert.deepEqual(
      specs
        .filter((spec) => spec.project === project)
        .map((spec) => spec.moduleId)
        .sort(),
      simulationPaths
    )
    assert.equal(project.config.maxWorkers, 1)
    assert.equal(project.config.fileParallelism, false)
    assert.equal(project.config.testTimeout, 60_000)
    assert.equal(
      ctx.projects.find((p) => p.name === "unit").config.testTimeout,
      5_000
    )
    assert(specs.some((spec) => spec.project !== project))
    assert(
      specs.every(
        (spec) =>
          spec.project === project ||
          spec.project.config.sequence.groupOrder <
            project.config.sequence.groupOrder
      )
    )

    // Compare actual discovery with the unpartitioned suite, using the same
    // exclusions. Moving a file between projects must never drop its coverage.
    const baseline = await createVitest("test", {
      root,
      config: false,
      watch: false,
      exclude: ctx.config.exclude
    })
    try {
      const expected = await baseline.globTestSpecifications()
      assert.deepEqual(paths, expected.map((spec) => spec.moduleId).sort())
    } finally {
      await baseline.close()
    }

    const shards = []
    for (let index = 1; index <= 2; index++) {
      const sequencer = new BaseSequencer({
        config: { ...ctx.config, shard: { index, count: 2 } }
      })
      shards.push(...(await sequencer.shard(specs)))
    }
    assert.deepEqual(shards.map((spec) => spec.moduleId).sort(), paths)
  } finally {
    await ctx.close()
  }
})

test("benchmarks retain one project and run each benchmark file once", async () => {
  const ctx = await createVitest("benchmark", { root, config, watch: false })
  try {
    const specs = await ctx.globTestSpecifications()
    assert.equal(ctx.projects.length, 1)
    assert(specs.length > 0)
    assert.equal(new Set(specs.map((spec) => spec.moduleId)).size, specs.length)
    assert(specs.every((spec) => spec.moduleId.endsWith(".bench.ts")))
  } finally {
    await ctx.close()
  }
})
