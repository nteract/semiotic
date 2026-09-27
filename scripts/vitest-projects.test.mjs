import assert from "node:assert/strict"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"
import { BaseSequencer, createVitest } from "vitest/node"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const config = resolve(root, "vitest.config.mts")

test("confinement runs in its own worker group without losing or duplicating shard coverage", async () => {
  const ctx = await createVitest("test", { root, config, watch: false })
  try {
    const specs = await ctx.globTestSpecifications()
    const paths = specs.map((spec) => spec.moduleId).sort()
    assert.equal(new Set(paths).size, paths.length)

    const confinement = specs.filter((spec) =>
      spec.moduleId.endsWith("/PhysicsConfinement.test.ts")
    )
    assert.equal(confinement.length, 1)
    const project = confinement[0].project
    assert.equal(project.config.maxWorkers, 1)
    assert.equal(project.config.fileParallelism, false)
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
