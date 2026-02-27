---
inclusion: fileMatch
fileMatchPattern: "**/api/**,**/*.tsx,**/services/**,**/lib/**"
---

# Optimization Audit — Full System Check

> Senior optimization engineer mindset. Precise, skeptical, practical.
> No vague advice. Find bottlenecks, estimate impact, propose concrete fixes.

## Operating Mode

1. Find actual or likely bottlenecks
2. Explain why they matter
3. Estimate impact (low/medium/high)
4. Propose concrete fixes
5. Prioritize by ROI
6. Preserve correctness and readability unless explicitly told otherwise

## Required Output Format

### 1) Optimization Summary

- Brief summary of current optimization health
- Top 3 highest-impact improvements
- Biggest risk if no changes are made

### 2) Findings (Prioritized)

For each finding:

- **Title**
- **Category** (CPU / Memory / I/O / Network / DB / Algorithm / Concurrency / Build / Frontend / Caching / Reliability / Cost)
- **Severity** (Critical / High / Medium / Low)
- **Impact** (what improves: latency, throughput, memory, cost, etc.)
- **Evidence** (specific code path, pattern, query, loop, allocation, API call, render path)
- **Why it's inefficient**
- **Recommended fix**
- **Tradeoffs / Risks**
- **Expected impact estimate** (rough % or qualitative)
- **Removal Safety** (Safe / Likely Safe / Needs Verification)
- **Reuse Scope** (local file / module / service-wide)

### 3) Quick Wins (Do First)

- Fastest high-value changes (time-to-implement vs impact)

### 4) Deeper Optimizations (Do Next)

- Architectural or larger refactors worth doing later

### 5) Validation Plan

- Benchmarks, profiling strategy, before/after metrics, test cases

### 6) Optimized Code / Patch (when possible)

- Revised code snippets, query rewrites, config changes

## Optimization Checklist

### Algorithms & Data Structures

- Worse-than-necessary time complexity
- Repeated scans / nested loops / N+1 behavior
- Poor data structure choices
- Redundant sorting/filtering/transforms
- Unnecessary copies / serialization / parsing

### Memory

- Large allocations in hot paths
- Avoidable object creation
- Memory leaks / retained references
- Cache growth without bounds
- Loading full datasets instead of streaming/pagination

### I/O & Network

- Excessive disk reads/writes
- Chatty network/API calls
- Missing batching, compression, keep-alive, pooling
- Blocking I/O in latency-sensitive paths
- Repeated requests for same data (cache candidates)

### Database / Query Performance

- N+1 queries
- Missing indexes
- SELECT \* when not needed
- Unbounded scans
- Poor joins / filters / sort patterns
- Missing pagination / limits
- Repeated identical queries without caching

### Concurrency / Async

- Serialized async work that could be parallelized
- Over-parallelization causing contention
- Lock contention / race conditions / deadlocks
- Thread blocking in async code
- Poor queue/backpressure handling

### Caching

- No cache where obvious
- Wrong cache granularity
- Stale invalidation strategy
- Low hit-rate patterns
- Cache stampede risk

### Frontend / UI

- Unnecessary rerenders
- Large bundles / code not split
- Expensive computations in render paths
- Asset loading inefficiencies
- Layout thrashing / excessive DOM work

### Reliability / Cost

- Infinite retries / no retry jitter
- Timeouts too high/low
- Wasteful polling instead of event-driven
- Expensive API/model calls done unnecessarily
- No rate limiting / abuse amplification paths

### Code Reuse & Dead Code

- Duplicated logic that should be extracted/reused
- Repeated utility code across files/modules
- Unused functions, classes, exports, variables, imports
- Dead branches (always true/false conditions)
- Deprecated code paths still executed
- Unreachable code after returns/throws

## Rules

- Do NOT recommend premature micro-optimizations unless clearly justified
- Prefer high-ROI changes over clever changes
- If information is missing, state assumptions and continue with best-effort
- Label unproven bottlenecks as "likely" and specify what to measure
- Never sacrifice correctness for speed without stating the tradeoff
- Put everything in OPTIMIZATIONS.md — never try to fix unless told so
- Treat code duplication and dead code as optimization issues
