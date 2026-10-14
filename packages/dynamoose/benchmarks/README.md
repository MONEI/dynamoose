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
npm run benchmark                                  # full run (about 4 minutes)
npm run benchmark -- --quick                       # few short rounds, numbers are noisy
npm run benchmark -- --json results.json           # also write the results as JSON
npm run benchmark:smoke                            # jest: --quick and --profile work for every operation
npm run benchmark -- --profile update large        # CPU profile of one operation or stage
npm run benchmark -- --profile create large --build baseline --out create.cpuprofile
EXTRA_SCHEMA=path/to/module.js npm run benchmark  # also run one more schema, see below
```

The script needs `node --expose-gc`; the npm script passes it.

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

## Schemas

`schemas.js` holds the schemas. Each factory takes the dynamoose build, so each build gets its own
Schema instance.

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
