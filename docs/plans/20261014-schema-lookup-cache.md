# Speed up dynamoose without changing behaviour

## Overview

`@monei-js/dynamoose` runs in every MONEI payment flow. Measurements on 2026-10-14 show that more than half
of the CPU time in `Model.update` and `Item.save` goes to schema lookups that are repeated for every
attribute on every call. This plan caches those lookups per Schema, and adds performance tests that
identify bottlenecks and a CI gate against slowdowns, so that create and update get faster with **no change
in behaviour**.

Hard rules (from the user):

- No change to existing behaviour: same requests to DynamoDB, same returned items, same errors in the same
  order, same mutation of Item instances and of caller inputs, same calls to user functions.
- Validation stays. Nothing bypasses dynamoose.
- Prod payment Lambdas are hot, so a per-process cache stays warm across invocations.

## Context (from discovery)

- Repo: the MONEI fork of dynamoose, `~/Work/MONEI/dynamoose` (`MONEI/dynamoose`), package
  `packages/dynamoose`, published by hand from `main` (current 4.2.4, on npm). Upstream remote: `upstream`.
- Hot functions (CPU profile, large schema, create and update), all in `lib/Schema.ts`:
  - `js-object-utilities` `get`, called from `Schema.prototype.getAttributeValue`: about 21–23% self time
  - `getAttributeValue` itself: about 12%
  - `getAttributeTypeDetails` + its `getType`: about 12–16%
  - `getAttributeSettingValue` and `getAttributeType` call `getAttributeValue` / `getAttributeTypeDetails`
    (`Schema.ts:1349-1360`, `1414-1424`), so caching those two covers them.
- The schema is NOT fixed after construction: `Table/index.ts:278-290` writes a `ttl` attribute into
  `schemaObject` of every schema of the table's models when `expires` is set. The default Table is created
  lazily (`Model/index.ts:403-409`), after the Schema constructor has already looked up every attribute.
- `typeIndexOptionMap` is computed on every `objectFromSchema` call (`Item.ts:657`), so a rule "skip the
  cache when a map is passed" would skip it on the hot path. The map is read only inside
  `getAttributeValue` when the path walk meets an array of attribute definitions (`Schema.ts:1621-1637`).
  Common's nullable fields are `type: [String, NULL]` (an array of types inside one definition), which
  never reaches that branch.
- Values returned by the lookups are references into schema-owned objects, and some are written by
  dynamoose itself (`Schema.ts:1686/1688` write `typeSettings.model`). Freezing them would change
  behaviour; the plan review audited the callers in `lib/` and found no other writes.
- `save` runs a second conversion (`conformToSchema`, commit `76f3924e`) so that it returns what a read
  would return; it writes the converted values back onto the Item and sets `storedInDynamo`, also for
  `{return: "request"}`. It stays exactly as it is. It accounts for the whole create gap to upstream (fork
  150 vs upstream 255 ops/s on the large benchmark schema; 85 vs 140 on extra-large).
- Earlier fork speed commits (`34871cc0`, `a2f2b7eb`, `d5421eee`, `4e7c347a`, `8e00aec9`, `8e2353b8`,
  `e72b2823`) show no measurable gain. They are not removed in this plan: removing `attributeTypeCache`
  can change requests (see Task 8).
- Existing benchmarks (`packages/dynamoose/benchmarks/`) are broken: the toDynamo benchmark never awaits
  `item.toDynamo`, and the "2–3x" claims in the history were never measured.
- Prod reference: trace `6acf7387000000004ab23db28390bcc8` (`monei-prod-payments-createPaymentInternal`,
  197 ms) has a 38 ms gap with no span before `putItem monei-prod-checkoutsTable`.
- Tests import the built `dist` (`test/_setup.js`), so every test run must follow `npm run build`.
- Tests today: 2564 unit tests (`npm test` in `packages/dynamoose`), 26 DynamoDB Local tests
  (`npm run test:integration`, `DYNAMODB_ENDPOINT`), lint (`npm run lint` at the root), type tests
  (`npm run test:types`). jest's `testMatch` is `**/test/**/*.[jt]s?(x)`: helper files must live outside
  `test/` or be listed in `testPathIgnorePatterns`.

## Development Approach

- **testing approach**: TDD. The equivalence check is built first and pins today's behaviour against the
  published 4.2.4; cache tests are written before the cache.
- complete each task fully before moving to the next
- make small, focused changes
- **CRITICAL: every task MUST include new/updated tests** for code changes in that task
- **CRITICAL: all tests must pass before starting next task** - no exceptions
- **CRITICAL: update this plan file when scope changes during implementation**
- every test step: `npm run build` in `packages/dynamoose` first, then the tests; `npm run lint` at the root
- an equivalence failure is a bug in the change, never a reason to change the baseline

## Testing Strategy

- **equivalence check (live, against the published build)**: add
  `"dynamoose-baseline": "npm:@monei-js/dynamoose@4.2.4"` as a devDependency. A jest suite runs every case
  through the baseline and the current build in the same process and compares with `toStrictEqual` plus an
  explicit `Object.keys` order check. No golden file, so nothing can be re-recorded by mistake.
- compared per case: the DynamoDB request, the returned item (class, own keys including `undefined`
  values, key order, `Date`/`Set`/`Buffer` types and contents, `item.original()`), the Item instance after
  the call (`storedInDynamo`, own keys), the caller's input object after the call, the order and count of
  calls to user `default`/`set`/`get`/`validate` functions, errors (class, message, and whether it was a
  synchronous throw or a rejected promise).
- normal `save`/`get`/`query` calls run against a stub client (`dynamoose.aws.ddb.set` with canned
  responses, as the unit tests do), so the response path is covered, not only `{return: "request"}`.
- clock-dependent values (timestamps, `ttl` defaults) run under `jest.useFakeTimers().setSystemTime`.
- **unit tests**: the existing suite passes unchanged, plus new cache tests.
- **DynamoDB Local**: the 26 integration tests pass unchanged.
- **consumer check**: the full `@monei/common` suite against the new build (worktree of common, build
  copied over `node_modules/@monei-js/dynamoose/dist`).

## Progress Tracking

- mark completed items with `[x]` immediately when done
- add newly discovered tasks with ➕ prefix
- document issues/blockers with ⚠️ prefix
- update plan if implementation deviates from original scope

## Solution Overview

1. **Performance tests that find bottlenecks.** One CPU-only benchmark replaces the broken scripts:
   operations (create, read, top-level update, nested-path update) on the existing schemas and a fixture of
   common's Checkout schema; a profile mode that names the top functions by self and total time; and
   report-only micro-benchmarks of the internal stages.
2. **Pin behaviour.** A live equivalence suite compares the current build with the published 4.2.4.
3. **Cache schema lookups per Schema instance**: `getAttributeValue`, `getAttributeTypeDetails` and
   `attributes()` (no arguments), with invalidation at the one post-construction write.
4. **Measure what remains** and record it; any further change goes in a new plan.
5. **CI gate** against slowdowns, built to tolerate runner noise.

## Technical Details

Cache: a `Map` on the Schema's internal properties, created lazily, never a plain object (paths such as
`constructor` or `__proto__` must not collide with prototype keys).

- `getAttributeValue(key, settings)`: key = the normalized path (`standardKey` handling as today). While
  computing a value, record whether the path walk reached an `Array.isArray(result)` branch (an array of
  attribute definitions). Use the cached value when that flag is false, or when no
  `typeIndexOptionMap` is passed. When the flag is true and a map is passed, compute without the cache.
  This gives identical results in every case.
- `getAttributeTypeDetails(key, settings)`: same keying and the same flag rule (it calls
  `getAttributeValue` with the same map).
- `attributes()`: cache only the call without arguments.
- No separate caches for `getAttributeType` or `getAttributeSettingValue`: they go through the two cached
  functions. Their `value` argument is used only on the unknown-attribute path, which is a miss.
- Never cache a miss or a thrown error: keys allowed by `saveUnknown` can come from outside input and must
  not grow the cache. Hits are bounded by the schema's own attributes.
- Invalidation: clear the Schema's cache right after `Table/index.ts:280` writes the `ttl` attribute. Search
  `lib/` once more for any other write to `schemaObject` or schema settings after construction and
  invalidate there too.
- Do not freeze or copy cached values: today's callers already receive references into the schema, so
  returning the same reference keeps behaviour identical.

Benchmark (`packages/dynamoose/benchmarks/benchmark.js`):

- Loads two builds in one process (current `dist` and `dynamoose-baseline`), interleaves A/B rounds, runs
  with `--expose-gc` and calls `gc()` between rounds; reports medians and the change per operation.
- Uses a stub DynamoDB client, so measured paths match prod minus the network.
- Profile mode writes a `.cpuprofile` and prints the top functions by self and total time with file and
  line, and the share per dynamoose source file.

## What Goes Where

- **Implementation Steps**: code, tests, benchmark, CI workflow and docs in the fork.
- **Post-Completion**: the manual release, consumer bumps, the prod trace comparison, the upstream PR
  for the cache, and decisions that change behaviour.

## Implementation Steps

### Task 1: Benchmark runner with a stub client

**Files:**
- Create: `packages/dynamoose/benchmarks/benchmark.js`
- Create: `packages/dynamoose/benchmarks/smoke.test.js`
- Delete: `packages/dynamoose/benchmarks/schema-conversions-benchmark.js`
- Delete: `packages/dynamoose/benchmarks/model-operations-benchmark.js`
- Modify: `packages/dynamoose/benchmarks/README.md`
- Modify: `packages/dynamoose/package.json` (`benchmark` script, `dynamoose-baseline` devDependency)
- ➕ Modify: `packages/dynamoose/benchmarks/schemas.js` (each factory takes the dynamoose build)
- ➕ Create: `packages/dynamoose/jest.benchmark.config.js` (`npm run benchmark:smoke`)
- ➕ Delete: `packages/dynamoose/benchmarks/utils/benchmark-runner.js` (used only by the deleted scripts)
- ➕ Modify: `CLAUDE.md` (the removed `benchmark:*` scripts)

- [x] add `"dynamoose-baseline": "npm:@monei-js/dynamoose@4.2.4"` to devDependencies
- [x] write `benchmark.js`: stub DynamoDB client with canned responses; operations create (`save()` and
  `save({return: "request"})`), read (`get` through the stub), top-level update, nested-path update; every
  async call awaited
- [x] load the current `dist` and `dynamoose-baseline` in one process, interleave A/B rounds, `--expose-gc`
  with `gc()` between rounds; print median ops/s and the change per operation and schema, plus JSON output
- [x] move the test data generators from the deleted scripts into the new benchmark
- [x] `--quick` mode (few iterations); `smoke.test.js` runs it (jest config for benchmarks, outside
  `test/`) and checks that every operation reports a number for both builds
- [x] `npm run build`, smoke test, unit suite, lint - must pass before next task
- ⚠️ installing `dynamoose-baseline` hoisted the AWS SDK to the root `node_modules` and moved it from
  3.782.0 to 3.1151.0 (the version range `^3.782.0` is unchanged). Both builds now load the same SDK in
  one process. The unit suite passes on it.

### Task 2: Profile mode that names the bottlenecks

**Files:**
- Modify: `packages/dynamoose/benchmarks/benchmark.js`
- Modify: `packages/dynamoose/benchmarks/smoke.test.js`
- ➕ Modify: `packages/dynamoose/benchmarks/README.md` (stages and profile mode)
- ➕ Modify: `.gitignore` (`*.cpuprofile`)

- [x] `--profile <operation> <schema> [--build current|baseline]`: runs the operation under the V8 CPU
  profiler (`inspector` module), writes the `.cpuprofile` (opens in Chrome DevTools or speedscope)
- [x] print the top functions by self time and by total time, with file and line, and the share per
  dynamoose source file
- [x] report-only micro-benchmarks of the internal stages: `Schema.getAttributeValue`,
  `Schema.getAttributeTypeDetails`, `Schema.attributes()`, `Item.objectFromSchema` (toDynamo and
  fromDynamo), `Schema.getTypePaths`, the `save` conform pass (`conformToSchema` on a saved item)
- [x] extend the smoke test: profile mode produces a non-empty table and a `.cpuprofile` file
- [x] `npm run build`, smoke test, unit suite, lint - must pass before next task

### Task 3: Fixture of common's Checkout schema

**Files:**
- Create: `packages/dynamoose/benchmarks/fixtures/checkout-schema.js`
- Modify: `packages/dynamoose/benchmarks/benchmark.js`
- ➕ Modify: `packages/dynamoose/benchmarks/smoke.test.js` (checkout rows, EXTRA_SCHEMA run)
- ➕ Modify: `packages/dynamoose/benchmarks/README.md` (checkout schema, EXTRA_SCHEMA with an example module)

- [x] generate the fixture once from `@monei/common` `CheckoutModel` (its dynamoose schema from
  `toDynamooseSchema`): types, nesting, `required`, `enum`, `saveUnknown`, storage settings; function
  `default`s replaced by equivalent plain functions where possible
- [x] header comment: how the fixture was made and which function settings it lacks (it underestimates prod;
  decisions use the live run below, CI uses the fixture)
- [x] realistic Checkout test data (shape of a real checkout, no real customer data)
- [x] `EXTRA_SCHEMA=<path to module>` hook, so a run from common benchmarks the live `CheckoutModel` schema
- [x] extend the smoke test to cover the fixture
- [x] record baseline numbers in this plan: current `main` vs `dynamoose-baseline`, and fork vs upstream for
  reference
- [x] `npm run build`, smoke test, unit suite, lint - must pass before next task
- ⚠️ common has no `CheckoutModel`. The model of `monei-<stage>-checkoutsTable` is `OperationModel`
  (`createModel('checkouts', operationSchema)`). The fixture is its schema, from common 11.9.0 (34fde00c).
  The only function `default` (`createdAt`) is dropped by `toDynamooseSchema` (timestamps are on); the
  replaced functions are the 20 `validate` and one `set`, all zod `safeParse` wrappers. A script checked
  that the fixture's definition and settings equal common's output (functions aside, key order included)
  and that each plain function returns what the zod one returns on sample values.

**Baseline numbers (2026-10-14, node v24.21.0, full run: 10 rounds of 200 ms, medians in ops/s)**

Current `main` (4.2.4 dist) vs `dynamoose-baseline` 4.2.4, load average 4.7 at start, 4.5 at end. Same
code on both sides, so the change column is the noise floor: within ±2.4%, except `small get` −6.8%.

| schema      | operation      | baseline | current | change |
| ----------- | -------------- | -------: | ------: | -----: |
| large       | create         |    122.1 |   121.6 |  −0.4% |
| large       | create-request |    126.8 |   126.7 |  −0.0% |
| large       | get            |    255.9 |   256.3 |  +0.1% |
| large       | update         |    150.4 |   150.2 |  −0.1% |
| large       | update-nested  |    165.1 |   168.3 |  +1.9% |
| extra-large | create         |     73.6 |    73.4 |  −0.2% |
| extra-large | update         |     87.7 |    87.8 |  +0.1% |
| checkout    | create         |    140.9 |   141.4 |  +0.3% |
| checkout    | create-request |    143.6 |   145.3 |  +1.2% |
| checkout    | get            |    311.4 |   316.4 |  +1.6% |
| checkout    | update         |     96.1 |    96.0 |  −0.0% |
| checkout    | update-nested  |    152.0 |   155.6 |  +2.4% |

Fork 4.2.4 vs upstream `dynamoose` 4.2.0 (reference only; upstream installed in a scratch directory,
not a dependency), load average 4.3 at start, 6.1 at end:

| schema      | operation     | upstream | fork  | change |
| ----------- | ------------- | -------: | ----: | -----: |
| large       | create        |    195.3 | 124.7 | −36.1% |
| large       | get           |    223.3 | 264.3 | +18.4% |
| large       | update        |    129.3 | 150.1 | +16.1% |
| extra-large | create        |    118.8 |  75.2 | −36.7% |
| extra-large | update        |     76.9 |  89.0 | +15.6% |
| checkout    | create        |    223.0 | 142.1 | −36.3% |
| checkout    | get           |    242.6 | 311.5 | +28.4% |
| checkout    | update        |     81.8 |  95.3 | +16.5% |
| checkout    | update-nested |    118.1 | 158.9 | +34.5% |

The create gap to upstream is the `save` conform pass (Context); update and get are faster on the fork.

### Task 4: Live equivalence suite against 4.2.4

**Files:**
- Create: `packages/dynamoose/equivalence/corpus.js`
- Create: `packages/dynamoose/equivalence/compare.js`
- Create: `packages/dynamoose/test/Equivalence.js`
- ➕ Modify: `packages/dynamoose/benchmarks/benchmark.js` (exports the schema configs the corpus reuses)

- [x] `compare.js`: runs one case through a given build and returns everything listed in Testing Strategy
  (request, returned item, instance state, input object after the call, user function call log, error kind)
- [x] corpus: the benchmark schemas, the Checkout fixture, and edge schemas: multi-type attributes, an array
  of attribute definitions (`[{type: Object, schema: A}, {type: Object, schema: B}]`), `[T, NULL]` as
  common emits it, sets, lists of maps, Combine incl. key, `forceDefault`, function `default`, `get`/`set`
  modifiers, `validate`, `enum`, `saveUnknown` paths, Date storages, nested paths and list indices,
  Table `expires`, `dynamoose.type.THIS`, Model-typed attributes, a model with several schemas, alias/map,
  `readStrict: false`, timestamps, Constant, ANY, a nested Schema instance, `$ADD`/`$REMOVE`/`$DELETE`,
  transactions, and sequences of calls on the same model
- [x] operations per schema: create, `save()` and `save({return: "request"})`, update top-level and nested,
  `get`, `query`; include inputs that fail validation, and several invalid fields at once
- [x] `test/Equivalence.js`: for every case, run baseline and current, compare with `toStrictEqual` and an
  explicit key order check; fake timers for clock-dependent cases
- [x] check that the suite catches a change: a temporary edit in `lib` (not committed) makes it fail
- [x] `npm run build`, unit suite incl. equivalence, lint - must pass before next task
- ⚠️ the corpus pins these 4.2.4 behaviours as failing steps (not fixed here, they are behaviour): `$SET` on
  a list index (`tags.1`, `lines.0.meta.color`) rejects with "Expected tags to be of type array"; a `Set`
  of `Date` rejects with `val.map is not a function`; a `saveUnknown` key named `constructor` rejects (nested)
  or fails to marshall (top level); a `default` inside one definition of an array of definitions is applied
  whichever definition the item matches.
- the suite was checked against two temporary edits in `lib/Schema.ts` (reverted, never committed): a cache of
  `getAttributeValue` keyed by path only fails 3 cases (array of definitions, multi-type, extra-large); a
  memoized function `default` fails the defaults case.

### Task 5: Cache schema lookups per Schema instance

**Files:**
- Create: `packages/dynamoose/test/SchemaCache.js`
- Modify: `packages/dynamoose/lib/Schema.ts`
- Modify: `packages/dynamoose/lib/Table/index.ts`

- [ ] write the tests first (`test/SchemaCache.js`): a second lookup returns the same reference; a lookup,
  then `new Table(..., {expires})`, then `attributes()` contains `ttl` and the ttl default is applied; an
  array-of-definitions attribute with a `typeIndexOptionMap` returns the per-item result; a miss or a
  thrown error adds no entry; a function `default` runs on every call; two schemas never share entries;
  `constructor` and `__proto__` paths behave as uncached
- [ ] search `lib/` for writes to `schemaObject` or schema settings after construction; record the result
  in this plan
- [ ] implement the cache for `getAttributeValue`, `getAttributeTypeDetails` and `attributes()`
  (no arguments), following Technical Details
- [ ] clear the cache after the `ttl` write in `Table/index.ts`, and at any other write found above
- [ ] `npm run build`; cache tests, equivalence suite, unit suite, lint, type tests pass
- [ ] run the DynamoDB Local tests
- [ ] run the benchmark and the live `EXTRA_SCHEMA` Checkout run; record the numbers in this plan

### Task 6: Re-profile and record what remains

**Files:**
- Modify: this plan (findings)

- [ ] profile create and update on the large schema and the live Checkout schema with the cache in place
- [ ] record the top functions and their shares in this plan, and the next candidates for a follow-up plan
  (for example the `save` conform pass); no code change in this task

### Task 7: CI job that fails on a slowdown

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `packages/dynamoose/benchmarks/benchmark.js` (gate mode)

- [ ] job on `pull_request` only: build the PR and its base, run both in one process with interleaved
  rounds, on the Node major used by the prod Lambdas
- [ ] gate only create and update on the large schema and the Checkout fixture; micro-benchmarks report only
- [ ] fail only when the median slowdown is over 15% and a significance check (bootstrap or Mann-Whitney)
  confirms it; on a failure, re-run once to confirm
- [ ] on a confirmed failure, run the profile mode for the slowed operation on both builds and upload the
  summaries and `.cpuprofile` files as artifacts
- [ ] run the job 5 times on a no-op PR: no failure; and once with a deliberate slowdown (temporary commit,
  not merged): it fails and names the function
- [ ] lint - must pass before next task

### Task 8: Confirm the suspected `attributeTypeCache` bug (report only)

**Files:**
- Create: `packages/dynamoose/test/AttributeTypeCache.js` (only if the bug is confirmed; marked `it.skip`
  with a reason, so the suite stays green)

- [ ] `Model/index.ts` caches the DynamoDB type per `${attribute}|${typeof value}` (around lines 990 and
  1296). For a `saveUnknown` attribute, `getAttributeType` depends on the value: an update that writes a Set
  followed by one that writes an array may convert the array into a Set. Write a test that checks this on
  the current build and on `upstream/main`
- [ ] record the result in this plan; no fix here (a fix changes behaviour and needs the user's decision)

### Task 9: Verify acceptance criteria

- [ ] create and update on the large, extra-large and Checkout schemas are faster by a recorded percentage;
  no operation slower beyond noise
- [ ] the equivalence suite passes against `dynamoose-baseline` 4.2.4
- [ ] `npm run build`, then the full unit suite: `cd packages/dynamoose && npm test`
- [ ] the DynamoDB Local tests: `cd packages/dynamoose && npm run test:integration`
- [ ] lint and type tests: `npm run lint`, `cd packages/dynamoose && npm run test:types`
- [ ] the full `@monei/common` suite against the new build (worktree, build copied over
  `node_modules/@monei-js/dynamoose/dist`)

### Task 10: Update documentation

- [ ] update `CLAUDE.md` (fork): benchmark usage, profile mode, the CI gate, the equivalence suite, and the
  cache rules (one post-construction write at `Table/index.ts`, misses not cached, values not copied or
  frozen)
- [ ] update `packages/dynamoose/benchmarks/README.md` with the measured numbers
- [ ] add a `PENDING_CHANGELOG.md` entry (performance, no behaviour change)

## Post-Completion

*Items requiring manual intervention or external systems - informational only*

**Release**
- Bump `packages/dynamoose` to 4.2.5 on `main`; the user publishes by hand (`npm publish --access public`
  in `packages/dynamoose`, browser authentication). Then bump `dynamoose-baseline` to the new version for
  later work.

**Consumers**
- Bump `@monei/common` to 4.2.5 (https://github.com/MONEI/common/pull/2477 is the open bump to 4.2.4).
- `payments-service` depends on the fork directly (`^4.1.5`, lockfile pinned to 4.1.6); bump it too.

**Prod verification**
- After deploy, compare the gap before `putItem monei-prod-checkoutsTable` in
  `monei-prod-payments-createPaymentInternal` traces before and after (reference trace
  `6acf7387000000004ab23db28390bcc8`, 38 ms gap).

**Decisions for the user**
- Task 8 result: whether to fix the `attributeTypeCache` behaviour (a behaviour change).
- Task 6 result: whether to start a follow-up plan (for example the `save` conform pass).
- Removing the earlier fork speed commits: no gain measured, but removal can change requests (Task 8); out
  of scope.

**Upstream**
- Port the cache to `upstream/main` as `upstream-pr/schema-lookup-cache` (separate small task after this
  plan); the user submits it with the AI disclosure upstream's policy requires.

**Separate investigation (out of scope)**
- Per-call AWS SDK and tracing overhead (3–4 ms per DynamoDB call) and connection reuse (a 32 ms
  `tcp.connect` seen in `hostedpayment`).
