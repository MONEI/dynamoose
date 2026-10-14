# Dynamoose Benchmarks

`benchmark.js` measures the CPU cost of dynamoose operations. It loads two builds in one process:

- **current**: this package's `dist` (run `npm run build` first)
- **baseline**: the published `@monei-js/dynamoose` named in the `dynamoose-baseline` devDependency

Both builds use a stub DynamoDB client with canned responses, so no request leaves the process and
the numbers contain no network time.

## Running

```bash
# In packages/dynamoose
npm run build
npm run benchmark                                  # full run (5 minutes or more)
npm run benchmark -- --quick                       # few short rounds, numbers are noisy
npm run benchmark -- --json results.json           # also write the results as JSON
npm run benchmark:smoke                            # jest: see below
npm run benchmark -- --profile update large        # CPU profile of one operation or stage
npm run benchmark -- --profile create large --build baseline --out create.cpuprofile
EXTRA_SCHEMA=path/to/module.js npm run benchmark  # also run one more schema, see below
BASELINE=../other/packages/dynamoose npm run benchmark  # compare against another build (needs its dist)
BASELINE=../base/packages/dynamoose npm run benchmark -- --gate   # the CI gate, see below
BASELINE=... npm run benchmark -- --gate --quick   # 2 rounds of 20 ms: checks the run, never significant
```

The script needs `node --expose-gc`; the npm script passes it.

`npm run benchmark:smoke` (jest, `smoke.test.js` and `gate.test.js`) checks that `--quick` reports
every operation and stage, that `--profile` writes a profile (update on large) and works with
`EXTRA_SCHEMA`, the gate's verdict rule, and that `--gate` passes on two quick rounds, refuses to run
without `BASELINE`, and on a forced slowdown (`BENCHMARK_SCALE_CURRENT`, a test hook) re-runs, exits
with code 1 and writes the profiles and comparisons.

## Method

- Every operation warms up on both builds, then runs in rounds. A round measures each operation on
  both builds for a fixed time, with `gc()` before each measurement. The build that goes first
  alternates per round.
- The input of each call (a new Item, a key, an update object) is made outside the timed part.
- The table shows the median ops/s over the rounds per build, and the change of current against
  baseline. The JSON file also has the samples of every round.

## Operations

| operation        | call                                             | stub response                 |
| ---------------- | ------------------------------------------------ | ----------------------------- |
| `create`         | `new Model(data).save()`                         | `putItem`: `{}`               |
| `create-request` | `new Model(data).save({"return": "request"})`    | none                          |
| `get`            | `Model.get(key)`                                 | `getItem`: the stored item    |
| `update`         | `Model.update(key, {attribute: object})`         | `updateItem`: the stored item |
| `update-nested`  | `Model.update(key, {"$SET": {"a.b": value}})`    | `updateItem`: the stored item |

The stored item is the `putItem` request of the baseline build for one generated item.

## Stages (report only)

The run also measures internal stages of the operations above, on every schema, in a second table
(`stages` in the JSON file). The settings are the ones `save` and `get` pass.

| stage                         | call                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| `getAttributeValue`           | `schema.getAttributeValue(attribute)` for every attribute (one op)   |
| `getAttributeTypeDetails`     | `schema.getAttributeTypeDetails(attribute)` for every attribute      |
| `attributes`                  | `schema.attributes()`                                                |
| `getTypePaths`                | `schema.getTypePaths(data, {"type": "toDynamo"})`                    |
| `objectFromSchema-toDynamo`   | `Item.objectFromSchema` with the `save` settings                     |
| `objectFromSchema-fromDynamo` | `Item.objectFromSchema` with the `get` settings, on the stored item  |
| `save-conform`                | `conformToSchema` on the stored item, the second pass of `save`      |

## Profile mode

`--profile <name> <schema>` runs one operation or stage on one build (`--build current|baseline`,
default `current`) under the V8 CPU profiler, 5 seconds (`--quick`: 0.3 seconds) after a warm-up. The
inputs are made before the profiler starts. It writes a `.cpuprofile` (`--out <file>`, default
`<build>-<schema>-<name>.cpuprofile`; open it in Chrome DevTools or speedscope) and prints:

- the top functions by self time and by total time, with file and line in `dist` (the line of the
  compiled JavaScript)
- the self time per file, dynamoose and its dependencies

Total time counts a function once per sample, also when it is on the stack more than once.

## CI gate

The `benchmark-gate` job of `.github/workflows/ci.yml` runs when a pull request is opened or gets new
commits, on Node 24 (the runtime of the prod Lambdas). It checks out the pull request and its base branch, installs and builds
both, runs `npm run benchmark:smoke`, then `npm run benchmark -- --gate` with `BASELINE` set to the
base checkout. `--gate` refuses to run without `BASELINE`, so that it cannot compare with the published
release by mistake.

`--gate` runs the operations and stages of the large and checkout schemas, 20 interleaved rounds of
150 ms. Only `create`, `get` and `update` on these two schemas can fail the job. All other rows are report
only. A gated operation fails when both are true:

- its median ops/s is more than 15% below the base
- a one-sided Mann-Whitney U test over the round samples gives p < 0.01

A failed operation runs again (20 new rounds; `--rounds <n>` changes the count). Only a failure in both
runs fails the job. Then the gate
profiles the operation on both builds and writes to `--artifacts <directory>` (default `benchmark-gate`):
the `.cpuprofile` and the summary (`.txt`) per build, and `<schema>-<operation>-comparison.txt`, the
functions whose self time per call grew most. The job uploads that directory as the `benchmark-gate`
artifact, and the log prints the comparison.

Limits: the gate compares each pull request with its base only, so slowdowns under 15% can add up over
several pull requests, and it covers only the gated rows. Compare with the published release
(`npm run benchmark` without `BASELINE`) before a release to see the total change.

## Results: schema lookup cache vs 4.2.4

Measured on 2026-10-14, plain `node --expose-gc`, full runs (10 rounds of 200 ms), median ops/s, on a
12-core machine that also ran other work. Absolute ops/s depend on the load, so compare only the change
within one run. In a quiet run the noise is about ±2.5% (±7% for small `get`).

- Run A: Node 24.21, load average 5.9 to 7.7, first version of the cache.
- Run B: Node 24.22, load average 40.4 to 62.7, first version of the cache.
- Run C: Node 24.22, load average 8.0 to 4.5, after the review fixes (the public `getAttributeTypeDetails`
  builds a new result per call, `lib/` uses the shared one). This is the current code.

| schema      | operation | run A change | run B change | run C baseline | run C current | run C change |
| ----------- | --------- | -----------: | -----------: | -------------: | ------------: | -----------: |
| large       | create    |      +126.5% |       +79.7% |          129.9 |         297.4 |      +129.0% |
| large       | get       |      +145.7% |      +147.0% |          270.5 |         661.7 |      +144.6% |
| large       | update    |      +141.9% |      +135.9% |          157.7 |         379.9 |      +140.9% |
| extra-large | create    |      +113.6% |      +108.0% |           74.7 |         164.6 |      +120.3% |
| extra-large | get       |            - |      +154.2% |          154.3 |         364.5 |      +136.2% |
| extra-large | update    |      +122.1% |      +127.0% |           92.1 |         219.8 |      +138.6% |
| checkout    | create    |       +53.9% |       +61.8% |          147.3 |         219.0 |       +48.6% |
| checkout    | get       |       +79.7% |       +99.8% |          321.0 |         562.4 |       +75.2% |
| checkout    | update    |      +140.7% |      +121.5% |           98.3 |         240.4 |      +144.4% |

Every operation on every schema was faster in all three runs. In run C the `getAttributeTypeDetails`
stage (the public method, now uncached) is +13% to +61%, and the checkout `getTypePaths` stage, which the
cache does not cover, is -3.3% (noise level); every other stage is faster. Under `node --import tsx` the
gains look smaller (checkout create about +14%), because tsx hooks every `require` and `Item` calls
`require` inline per value. Use plain `node` for numbers.

## Schemas

`schemas.js` holds the schemas, their test data and the configs that `benchmark.js` and the equivalence
corpus use. Each factory takes the dynamoose build, so each build gets its own Schema instance.

- **small**: flat, five attributes. No nested attribute, so no `update-nested`.
- **medium**: nested objects, an array, `validate`, `enum`, `default`.
- **large**: hash and range key, deep nesting, arrays of objects, many `validate`, `enum`,
  `required` and `default` settings.
- **extra-large**: large plus sets, `Buffer`, a multi-type attribute, `NULL` and a Date `storage`
  setting.
- **checkout**: `fixtures/checkout-schema.js`, the schema of `@monei/common` `OperationModel` (the
  `checkouts` table), generated once from common. Its header comment says how, and which function
  settings it replaces with plain functions. The data is a confirmed card payment with invented values.

## Live schema from `@monei/common` (EXTRA_SCHEMA)

The fixture lacks the cost of common's zod-backed `validate` functions. To measure the real schema,
set `EXTRA_SCHEMA` to a module that exports one schema in the shape of the fixture (`name`, `create`,
`data`, `key`, `update`, optional `nestedUpdate`). `name` must differ from the built-in schemas. Run
it from a checkout of common with `tsx`, so the module can import common's TypeScript source:

```ts
// live-checkout.ts, next to a checkout of common
import {operationSchema} from './src/models/OperationModel';
import {extractTimestamps, toSchemaDef} from './src/zod/converter';
import {dynamoose as commonDynamoose} from './src/utils/dynamoose';
const fixture = require('<dynamoose>/packages/dynamoose/benchmarks/fixtures/checkout-schema.js');

// common's dynamoose.type symbols are not the symbols of the benchmarked builds.
const remap = (value: any, types: any): any => {
  for (const name of ['NULL', 'ANY', 'THIS']) if (value === commonDynamoose.type[name]) return types[name];
  if (Array.isArray(value)) return value.map((v) => remap(v, types));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v, types)]));
  return value;
};

module.exports = {
  ...fixture,
  name: 'checkout-live',
  create: (dynamoose: any) => {
    const {schema, saveUnknown} = toSchemaDef(operationSchema as any);
    const {createdAt, updatedAt, ...definition} = schema as any; // what toDynamooseSchema omits
    return new dynamoose.Schema(remap(definition, dynamoose.type), {saveUnknown, timestamps: extractTimestamps(operationSchema as any)});
  }
};
```

```bash
# In the checkout of common (the env values are the ones of vitest.config.ts)
STAGE=dev PROJECT=monei AWS_REGION=us-east-1 POWERTOOLS_LOG_LEVEL=SILENT EXTRA_SCHEMA=live-checkout.ts \
  node --expose-gc --import tsx <dynamoose>/packages/dynamoose/benchmarks/benchmark.js
```
