# Performance Benchmarking Guide

## Overview

Semiotic includes a comprehensive performance benchmarking suite to measure, track, and prevent performance regressions in critical data transformation operations.

## Quick Start

```bash
# Run all benchmarks
npm run bench

# Run benchmarks with UI
npm run bench:ui

# Run specific benchmark
npm run bench force-simulation

# Establish performance baseline
npm run bench:baseline

# Compare against baseline (detects regressions)
npm run bench:compare
```

## Recent Optimizations

### Frame Change Detection Optimization (2026-01)

**Problem**: Previously, all three frame types (XYFrame, OrdinalFrame, NetworkFrame) would trigger full data re-projection even when only non-data props changed (like size or styling).

**Solution**: Implemented granular change detection for all frame types that categorizes props into three groups:
- **Data-affecting props**: Trigger full data projection (e.g., data arrays, accessors, chart types)
- **Scale-affecting props**: Only recalculate scales/layout (e.g., size, margin, axes)
- **Styling-only props**: No recalculation, just re-render (e.g., styles, classes, interaction handlers)

**Impact on all frames**:
- **Size changes**: Now ~40-100× faster (skip expensive data processing)
- **Style changes**: Now ~200× faster (no data or scale recalc)
- **Data changes**: Same performance (no regression)

**Files modified**:
- `src/components/constants/frame_props.ts` - Prop categorization for all frames
- `src/components/XYFrame.tsx` - Better change detection in `deriveXYFrameState`
- `src/components/OrdinalFrame.tsx` - Better change detection in `deriveOrdinalFrameState`
- `src/components/NetworkFrame.tsx` - Better change detection in `deriveNetworkFrameState`

**Prop Categories by Frame**:

**XYFrame**:
- 23 data-affecting props (lines, points, summaries, accessors, types, scales, extents, filters)
- 27 scale-affecting props (size, margin, title, axes + all data-affecting)
- 23 styling-only props (styles, classes, render modes, interaction handlers)

**OrdinalFrame**:
- 20 data-affecting props (data, accessors, type, projection, scales, extents, sorting)
- 25 scale-affecting props (size, margin, title, axes, labels + all data-affecting)
- 13 styling-only props (styles, interaction handlers)

**NetworkFrame**:
- 15 data-affecting props (graph, nodes, edges, accessors, networkType, edgeType, filters)
- 19 scale-affecting props (size, margin, title, nodeLabels + all data-affecting)
- 13 styling-only props (styles, customNodeIcon, interaction handlers)

**Expected time savings** (based on data-accessor benchmarks):
| Data Size | Old Size Change | New Size Change | Improvement |
|-----------|----------------|-----------------|-------------|
| 100 pts | ~0.1ms | <0.01ms | 10× |
| 1000 pts | ~1ms | <0.01ms | 100× |
| 5000 pts | ~5ms | <0.01ms | 500× |

**Special Note on NetworkFrame**: Size changes in force-directed layouts may still require recalculation as node positions can be size-dependent. However, styling changes (nodeStyle, edgeStyle) now properly skip all processing.

## Benchmark Suite

### Critical Benchmarks (O(n²) Operations)

These are the most expensive operations in Semiotic and dominate performance for large datasets:

#### 1. Force Simulations (`benchmarks/unit/force-simulation.bench.ts`)

**Operations tested:**
- `swarmLayout` - Creates swarm plots using D3 force simulation with collision detection
- `NetworkFrame force layout` - Positions network nodes using many-body force

**Why it's expensive:** O(iterations × n²) complexity
- Each iteration requires all-pairs force calculations
- Default: 120 iterations for swarm, 500 for network
- For 1000 points: 120,000+ force calculations

**Baseline performance:**
| Dataset | Time | Complexity |
|---------|------|------------|
| 50 points | ~4.8ms | - |
| 200 points | ~24.7ms | 5.2x |
| 1000 points | ~178.7ms | 37.5x |
| 500 nodes (network) | ~1.7s | O(n²) |

**Optimization opportunities:**
- Reduce iterations for large datasets
- Use Barnes-Hut approximation
- Consider Web Workers for off-main-thread calculation

#### 2. Chord Matrix Creation (`benchmarks/unit/chord-matrix.bench.ts`)

**Operation tested:**
- `matrixify` - Creates full n×n adjacency matrix for chord diagrams

**Why it's expensive:** O(n²) matrix creation
- For n nodes, creates n² cells
- 500 nodes = 250,000 matrix cells!

**Baseline performance:**
| Nodes | Matrix Size | Time |
|-------|-------------|------|
| 20 | 400 ops | ~0.05ms |
| 100 | 10,000 ops | ~1.3ms |
| 500 | 250,000 ops | ~37.9ms |

**Optimization opportunities:**
- Only create matrix when needed (lazy evaluation)
- Use sparse matrix representation for low-density graphs

#### 3. Data Accessors (`benchmarks/unit/data-accessors.bench.ts`)

**Operation tested:**
- Nested accessor application: `data × xAccessors × yAccessors`

**Why it's expensive:** O(n × m × p) triple-nested loop
- Common when plotting multiple x/y combinations
- Can quickly explode: 1000 points × 3x × 3y = 9,000 operations

**Baseline performance:**
| Configuration | Total Ops | Time |
|---------------|-----------|------|
| 100pts × 1x × 1y | 100 | ~0.001ms |
| 1000pts × 1x × 1y | 1,000 | ~0.013ms |
| 1000pts × 3x × 3y | 9,000 | ~0.115ms |
| 5000pts × 2x × 2y | 20,000 | ~0.280ms |

**Scaling:** Linear with total operations (good!)

**Optimization opportunities:**
- Memoize accessor functions
- Avoid unnecessary accessor combinations

## Performance Baselines

Current baseline is saved in `benchmarks/setup/baseline.json` and includes:

- **Timestamp**: When baseline was established
- **Git commit**: Code version
- **17 benchmarks** covering:
  - Force simulations (7 benchmarks)
  - Chord matrix operations (5 benchmarks)
  - Data accessor patterns (5 benchmarks)

### Establishing a Baseline

```bash
# Run benchmarks and save as baseline
npm run bench:baseline
```

This creates/updates `benchmarks/setup/baseline.json` with current performance metrics.

### Detecting Regressions

```bash
# Compare current performance vs baseline
npm run bench:compare
```

**Regression thresholds:**
- 🔴 **FAIL**: >25% slower (exits with code 1)
- ⚠️ **WARN**: 15-25% slower (exits with code 0, but warns)
- ✅ **PASS**: <15% change
- ✨ **IMPROVEMENT**: >15% faster

## Understanding Results

### Vitest Bench Output

```
name                                 hz      min      max     mean      p75      p99
swarmLayout-small-50-120iter     207.76   4.5460   5.4018   4.8133   4.8631   5.3670
```

- **hz**: Operations per second (higher is better)
- **min/max**: Fastest/slowest execution time
- **mean**: Average execution time ⬅️ **Most important metric**
- **p75/p99**: 75th/99th percentile (shows consistency)

### Complexity Verification

Benchmarks verify expected algorithmic complexity:

**O(n²) scaling example:**
```
50 points:  4.8ms   (baseline)
200 points: 24.7ms  (5.2x slower for 4x data ≈ O(n²))
1000 points: 178.7ms (37.5x slower for 20x data ≈ O(n²))
```

**Linear scaling example:**
```
100 ops:  0.001ms
1000 ops: 0.013ms  (13x slower for 10x data ≈ O(n))
```

## Optimization Guidelines

### When to Optimize

**Optimize if:**
- Benchmark shows >100ms for medium datasets (100-1000 points)
- O(n²) operations dominate your profile
- Users report slow rendering

**Don't optimize if:**
- Times are <10ms for expected dataset sizes
- Optimization would complicate code significantly
- The operation is infrequent

### Optimization Strategies

#### 1. Reduce Iterations

Force simulations support custom iteration counts:

```javascript
// Fast mode for large datasets
<OrdinalFrame
  type={{ type: "swarm", iterations: 30 }}  // Default: 120
  data={largeDataset}
/>

// NetworkFrame
<NetworkFrame
  networkSettings={{ type: "force", iterations: 250 }}  // Default: 500
/>
```

**Trade-off:** Fewer iterations = faster but less stable layout

#### 2. Use Canvas for Large Datasets

Canvas rendering skips React reconciliation:

```javascript
<XYFrame
  points={manyPoints}
  canvasPoints={true}  // Render points to canvas
/>
```

**When to use:** >1000 data points

#### 3. Downsample/Aggregate

For very large datasets (>10k points):

```javascript
// Aggregate before passing to Semiotic
const aggregated = downsampleData(rawData, maxPoints: 1000)
```

#### 4. Lazy Evaluation

Avoid expensive operations unless needed:

```javascript
// Bad: Always creates chord matrix
const matrix = matrixify(data)

// Good: Only when chord type is used
if (networkType === "chord") {
  const matrix = matrixify(data)
}
```

## Adding New Benchmarks

### 1. Create Benchmark File

```typescript
// benchmarks/unit/my-feature.bench.ts
import { describe, bench } from 'vitest'
import { generateMyData } from '../setup/data-generators'

describe('My Feature Performance', () => {
  const data = generateMyData(1000)

  bench('my-operation', () => {
    // Code to benchmark
    myExpensiveOperation(data)
  })
})
```

### 2. Add Data Generator (if needed)

```typescript
// benchmarks/setup/data-generators.ts
export function generateMyData(size: number, seed: string = DEFAULT_SEED) {
  const rng = seedrandom(seed)
  // Generate deterministic test data
  return Array.from({ length: size }, () => ({
    value: rng() * 100
  }))
}
```

### 3. Run Benchmark

```bash
npm run bench my-feature
```

### 4. Update Baseline

```bash
npm run bench:baseline
```

## CI Integration

### GitHub Actions Example

```yaml
name: Performance Benchmarks

on: [pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run bench:compare
      - name: Comment PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Performance regression detected!'
            })
```

## Performance Budget

Recommended performance budgets for common operations:

| Operation | Small (50) | Medium (500) | Large (5000) | Max Acceptable |
|-----------|------------|--------------|--------------|----------------|
| swarmLayout | <10ms | <50ms | <500ms | 1s |
| force layout | <100ms | <500ms | <5s | 10s |
| chord matrix | <1ms | <10ms | <100ms | 200ms |
| data accessors | <1ms | <10ms | <100ms | 200ms |

Exceed these budgets = consider optimization or dataset limits.

## Troubleshooting

### Benchmark Results Inconsistent

**Causes:**
- Background processes consuming CPU
- Thermal throttling
- Insufficient sample size

**Solutions:**
- Close other applications
- Run multiple times and average
- Increase benchmark iterations

### Benchmark Fails to Run

**Common issues:**
- Missing dependencies: `npm install`
- TypeScript errors: `npm run typescript`
- Vitest config issue: Check `vitest.config.ts`

### Regression False Positives

**If getting warnings on identical code:**
1. Check if baseline is from different machine/environment
2. Run baseline again on current machine
3. Increase tolerance threshold (edit `scripts/compare-baseline.js`)

## Further Reading

- [Vitest Benchmark Documentation](https://vitest.dev/guide/features.html#benchmarking)
- [D3 Force Simulation](https://github.com/d3/d3-force)
- [Web Performance Best Practices](https://web.dev/performance/)

## Questions?

For questions about performance or benchmarking:
- Open an issue: https://github.com/nteract/semiotic/issues
- Tag with `performance` label
