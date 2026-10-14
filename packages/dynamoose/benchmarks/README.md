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
