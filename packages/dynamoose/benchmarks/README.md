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
npm run benchmark                                  # full run (about 1.5 minutes)
npm run benchmark -- --quick                       # few short rounds, numbers are noisy
npm run benchmark -- --json results.json           # also write the results as JSON
npm run benchmark:smoke                            # jest: --quick reports a number for every operation
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

## Schemas

`schemas.js` holds the schemas. Each factory takes the dynamoose build, so each build gets its own
Schema instance.

- **small**: flat, five attributes. No nested attribute, so no `update-nested`.
- **medium**: nested objects, an array, `validate`, `enum`, `default`.
- **large**: hash and range key, deep nesting, arrays of objects, many `validate`, `enum`,
  `required` and `default` settings.
- **extra-large**: large plus sets, `Buffer`, a multi-type attribute, `NULL` and a Date `storage`
  setting.
