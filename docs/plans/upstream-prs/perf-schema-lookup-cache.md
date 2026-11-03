Title: Adding a per-schema cache for attribute lookups

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

Every `save`, `get` and `update` walks the schema definition once per attribute (`getAttributeValue`, `getAttributeTypeDetails`, `attributes()`), and builds the same results again on every call. On large schemas these lookups are most of the CPU time of an operation.

This PR adds a lookup cache per `Schema` instance (`lib/Schema.ts`):

- `getAttributeValue` results and the `attributes()` list are cached per path. `attributes()` still returns a new array on every call.
- dynamoose's own callers in `lib/` (`Item`, `Populate`, `getValueTypeCheckResult`, the combine check in `Model.update`, `getAttributeType`) use a new internal `getSharedAttributeTypeDetails`, which keeps one result per path. These callers only read the result. The public `getAttributeTypeDetails` still builds a new result per call, so a caller that changes a returned object cannot affect later lookups.
- Nothing is cached when a lookup has a side effect (a function-valued setting such as a Set `schema` function, a `THIS` or Model type, a lookup that throws), when a `typeIndexOptionMap` takes part, for keys that the definition only inherits (`constructor`, `toString`, which `saveUnknown` input can contain), or when user code replaced a lookup method on the prototype or instance (a spy, a plugin).
- Writes by dynamoose that can reach a built schema drop the cache of every schema: the Schema constructor (it writes timestamp attributes into the caller's definition object, which an earlier schema can share as a nested schema; also when it throws halfway) and the Table `expires` option (it adds the ttl attribute).

**Accepted behaviour difference.** The constructor copies only the top level of the definition, so nested definition objects stay shared with the caller. Without the cache, a lookup sees a nested definition object that the caller changes after `new Schema()`. With the cache, later lookups keep the definition as it was when the schema was built. The same applies to other changes after construction that the cache cannot see, for example a type constructor whose `toString()` changes. I added a caution to the `new Schema` JSDoc (the source of the Schema docs page): treat a schema definition as immutable once the schema is created, and create a new schema instead of changing a definition in place. `test/SchemaCache.js` pins this difference, so it fails if the difference goes away.

**Equivalence suite.** `test/Equivalence.js` (cases in `equivalence/corpus.js`, harness in `equivalence/compare.js`) runs 47 cases on this build and on the published `dynamoose@4.2.0` (devDependency `dynamoose-baseline`, an npm alias) in one process, with a stub DynamoDB client. It records and compares every DynamoDB request, every result and error (sync throw vs rejection), key order, the state of caller inputs and Items after each step, and every call to user functions (`default`, `set`, `get`, `validate`) with its arguments and order. The cases cover the benchmark schemas, multi-type attributes, arrays of attribute definitions, sets, lists of maps, combine, defaults, modifiers, validate, enum, `saveUnknown` (also keys named like `Object.prototype` members), date storages, ttl, `THIS`, model-typed attributes, several schemas per model, alias and map, timestamps, constants, `ANY`, nested Schema instances, update operators, transactions, populate, and direct calls to the public Schema methods. A step that should differ on purpose must be listed in the case's `differs` with a reason. No case differs on this branch, and no case differs between `main` without this change and 4.2.0 either (the unreleased changes in `PENDING_CHANGELOG.md` do not show in these cases). Each case also lists the steps that fail on the baseline (`failing`), so a case cannot pass by comparing two identical errors.

**Benchmark.** `npm run benchmark` (`benchmarks/benchmark.js`) measures `create`, `create-request`, `get`, `update` and a nested `$SET` update on five schemas, plus report-only internal stages. It runs this build and the baseline interleaved in one process with the same stub client, so the numbers contain no network time. `BASELINE=<package directory>` compares with another local build, `--profile` writes a CPU profile and prints the top functions, and `EXTRA_SCHEMA` adds an application's own schema. `benchmarks/fixtures/order-schema.js` is a large generic e-commerce schema (about 60 attributes, wide nested objects with `validate`, arrays of objects with multi-type attributes, `saveUnknown`, indexes, ISO timestamps). Details are in `benchmarks/README.md`.

Full run (10 rounds of 200 ms, median ops/s, Node 24.22), against a build of `main` without the cache, so only the cache differs:

| schema      | operation | main  | this PR | change  |
| ----------- | --------- | ----: | ------: | ------: |
| large       | create    | 175.4 |   304.8 |  +73.8% |
| large       | get       | 173.2 |   486.3 | +180.8% |
| large       | update    | 104.7 |   262.4 | +150.7% |
| extra-large | create    | 101.6 |   200.1 |  +96.9% |
| extra-large | get       | 118.0 |   269.0 | +128.0% |
| extra-large | update    |  60.6 |   153.0 | +152.7% |
| order       | create    | 230.6 |   336.0 |  +45.7% |
| order       | get       | 242.8 |   370.7 |  +52.7% |
| order       | update    |  81.9 |   196.0 | +139.3% |

Every operation on every schema was faster, also on the small and medium schemas. The machine ran other work during the run, so treat the exact percentages as approximate.

**CI gate.** A new `benchmark-gate` job in `.github/workflows/ci.yml` runs on pull requests only, with a read-only token. It checks out the pull request and its base, installs and builds both, runs `npm run benchmark:smoke` (jest tests of the benchmark script and of the gate's verdict rule), then `npm run benchmark -- --gate` with `BASELINE` set to the base checkout. Only `create`, `get` and `update` on the large and order schemas can fail the job. A row fails when its median is more than 15% below the base and a one-sided Mann-Whitney U test over the round samples gives p < 0.01, and only if a second run confirms it. Then it uploads CPU profiles of both builds and a per-function comparison as an artifact. If you would rather not add a CI job, I can drop it from this PR; the benchmark works without it.


### Other information:

Files:
- `lib/Schema.ts`: the cache, `getSharedAttributeTypeDetails`, `clearAllLookupCaches` on the internal properties, the JSDoc caution.
- `lib/Item.ts`, `lib/Populate.ts`, `lib/Model/index.ts`, `lib/utils/dynamoose/getValueTypeCheckResult.ts`: use `getSharedAttributeTypeDetails`.
- `lib/Table/index.ts`: drops the caches after it adds the ttl attribute.
- `test/SchemaCache.js`: cache rules that a corpus case can miss (list indexes share one entry, a new `attributes()` array per call, ttl from a table made before or after the lookups and from a nested schema, `typeIndexOptionMap`, no entry for misses, throws and inherited keys, function defaults run on every call, `THIS` shared by two schemas, replaced lookup methods, timestamps written into a shared nested definition, the accepted difference).
- `test/Equivalence.js`, `equivalence/`: the equivalence suite. It runs in the normal `npm test`.
- `benchmarks/`, `jest.benchmark.config.js`, scripts `benchmark` and `benchmark:smoke`: the benchmark and its smoke tests. They are outside `test/`, so `npm test` does not run them. `benchmarks/.eslintrc.js` turns off `no-console` there, because the script prints its results.
- `package.json` / `package-lock.json`: devDependency `dynamoose-baseline` (`npm:dynamoose@4.2.0`). After each release, bump the alias to the new version.
- `.gitignore`: `*.cpuprofile`.
- `PENDING_CHANGELOG.md`: one General entry.

Checks run locally: `npm run lint`, `npm run test:types`, `npm run build:sourcemap`, `npx jest` in `packages/dynamoose` (2459 passed, 18 skipped), `npm run benchmark:smoke` (14 passed).


### Type (select 1):
- [ ] Bug fix
- [ ] Feature implementation
- [ ] Documentation improvement
- [ ] Testing improvement
<!-- If you select the option below, please replace `----` below with the issue number of the GitHub issue raised, and the user who asked you to submit a broken test -->
- [ ] Test added to report bug (GitHub issue #---- @---)
- [x] Something not listed here


### Is this a breaking change? (select 1):
- [ ] 🚨 YES 🚨
- [ ] No
- [x] I'm not sure


### Is this ready to be merged into Dynamoose? (select 1):
- [x] Yes
- [ ] No


### Are all the tests currently passing on this PR? (select 1):
- [x] Yes
- [ ] No


### Does at least one test added in this PR fail without the implementation changes in the PR? (select one):

It's important that you write test(s) that fail without the implementation changes in the PR. If you revert all non-test changes, at least one test you added should fail. This ensures that your tests are actually testing the new functionality and protects against regression.

- [x] Yes
- [ ] No
- [ ] N/A

Without the `lib/` changes, two tests in `test/SchemaCache.js` fail: "Should keep one entry for paths that differ only in list indexes" and "Should not see a nested definition replaced after the constructor (accepted difference)". The other 19 tests in that file and the whole equivalence suite pass both with and without the change, because they check that the cache changes no observable behaviour. The performance gain itself is shown by the benchmark above, not by a test.

On "breaking change": I selected "I'm not sure" because of the accepted difference above. Code that changes a nested schema definition object after `new Schema()` and expects later operations to see the change now behaves differently. I do not know of a documented use of that.


### Other:
- [x] I have read through and followed the Contributing Guidelines
- [ ] I have searched through the GitHub pull requests to ensure this PR has not already been submitted
- [x] I have updated the Dynamoose documentation (if required) given the changes I made
- [x] I have added/updated the Dynamoose test cases (if required) given the changes I made
- [ ] I agree that all changes made in this pull request may be distributed and are made available in accordance with the [Dynamoose license](https://github.com/dynamoose/dynamoose/blob/main/LICENSE)
- [x] All of my commits and commit messages are detailed, explain what changes were made, and are easy to follow and understand
- [x] I have filled out all fields above

This pull request was created by an AI agent (Claude Code, Opus 5.5). The human contributor reviewed the changes, ran the relevant tests, and approved the submission.

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-schema-lookup-cache?expand=1
