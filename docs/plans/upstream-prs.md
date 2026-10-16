# Upstream PRs from the fork

Status 2026-10-16: every branch re-verified against `upstream/main` 12d22a37. Goal: send every fork change that upstream can use to dynamoose/dynamoose, so that later syncs from upstream are cheap.

Fork `origin/main` a9c3aef8 (4.3.0) against `upstream/main` 12d22a37. The fork is synced: their merge base is upstream/main.

`upstream/main` has not moved since the branches were written, so no branch needed a rebase. Every branch still has `upstream/main` as its merge base.

All branches are on `origin` (MONEI/dynamoose) only. No PR, issue or comment exists on dynamoose/dynamoose. Upstream AGENTS.md requires that a human approves each submission. You post the CLA dedication comment yourself on the first PR.

Each PR body is in [upstream-prs/](upstream-prs/), as `<topic>.md`. Line 1 is the title. The body follows upstream's PR template and ends with the AI disclosure. The disclosure says that the human reviewed the changes and ran the tests. That statement is true only after you do so. Leave the "searched PRs" and "license" boxes for yourself.

## Branches

All suite counts are for the full unit suite (`npx jest` in `packages/dynamoose`). Upstream/main has 2388 passed, 18 skipped. Lint, `test:types` and `build:sourcemap` pass on every branch.

| # | Branch | Title | Depends on | Tests | Compare |
|---|---|---|---|---|---|
| 1 | `upstream-pr/fix-update-value-types` | Fixing Model.update typing a value by another attribute after a $REMOVE | - | 1 new test, fails without the fix. 2390 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-update-value-types?expand=1) |
| 2 | `upstream-pr/fix-nested-force-default` | Fixing Model.update writing nested forceDefault attributes as top-level attributes | - | 2 new tests, both fail without the fix. 2392 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-nested-force-default?expand=1) |
| 3 | `upstream-pr/fix-combine-no-source` | Fixing Model.update requiring combine attributes when none of them are updated | - (same lines as 4) | 1 new test, fails without the fix. 2390 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-combine-no-source?expand=1) |
| 4 | `upstream-pr/fix-combine-key` | Fixing Model.update on schemas whose hash or range key is a Combine attribute | - (same lines as 3) | 4 new tests, all fail without the fix. 2396 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-combine-key?expand=1) |
| 5 | `upstream-pr/feat-update-nested-paths` | Adding nested path support to Model.update | 1-4 (its first 4 commits) | 75 new tests, 71 fail without the change. 2554 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/feat-update-nested-paths?expand=1) |
| 6 | `upstream-pr/test-update-integration` | Adding Model.update tests against DynamoDB Local | 5 | 28 DynamoDB Local cases: 23 fail on main's library, 28 pass. Unit 2554 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/test-update-integration?expand=1) |
| 7 | `upstream-pr/perf-nested-update-batching` | Converting the nested paths of one Model.update together | 5 | N/A, performance only. 2554 passed. 10 nested paths: 46-56 ms to 11.5-12.7 ms per update | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-nested-update-batching?expand=1) |
| 8 | `upstream-pr/types-export` | Exporting public option and schema types and allowing mixed update operators in UpdatePartial | - | Type tests fail to compile without the change. 2388 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/types-export?expand=1) |
| 9 | `upstream-pr/perf-converter-deep-copy` | Speeding up primitive attribute conversion and deep_copy | - | N/A, performance only. 26 new tests compare the fast path with the SDK. 2414 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-converter-deep-copy?expand=1) |
| 10 | `upstream-pr/perf-schema-lookup-cache` | Adding a per-schema cache for attribute lookups | - | 2 of 21 SchemaCache tests fail without the cache. 50 equivalence cases against published 4.2.0 pass. 2459 passed. Benchmark: create +46-97%, get +53-181%, update +139-153% | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-schema-lookup-cache?expand=1) |
| 11 | `upstream-pr/feat-read-strict` | Adding readStrict table option to skip schema type checks on reads | - | 22 of 26 new tests and 1 type test fail without the change. 2414 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/feat-read-strict?expand=1) |
| 12 | `upstream-pr/fix-save-return-conformed` | Fixing save and create returning items in DynamoDB form instead of the schema form | - | 7 new tests fail without the fix (incl. a mapped timestamp). 2400 passed. Breaking | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-save-return-conformed?expand=1) |
| 13 | `upstream-pr/test-block-http` | Blocking real HTTP requests in unit tests | - | N/A, test setup only. 2388 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/test-block-http?expand=1) |
| 14 | `upstream-pr/perf-hot-paths` | Speeding up object entries, key standardization and the attribute tree | 10 | 1 of 4 new tests fails without the change (a cycle). Equivalence against 4.2.0 unchanged. 2463 passed. Against 10 alone: get +14-29%, update +14-56% | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-hot-paths?expand=1) |
| 15 | `upstream-pr/fix-stream-options-undefined` | Fixing table creation with streamOptions set to undefined | - | 1 new test, fails without the fix. 2390 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-stream-options-undefined?expand=1) |

## Verification, 2026-10-16

Run against `upstream/main` 12d22a37 in a clean worktree, one branch at a time, with `npm ci` whenever the lockfile changed and `npm run build` before every run.

- All 15 branches: `npm run build`, `npm run lint`, `npm run test:types` and `npx jest` pass. Every suite count in the table above was reproduced exactly.
- `upstream-pr/test-update-integration`: the 28 DynamoDB Local cases pass against `amazon/dynamodb-local` on port 8000.
- `upstream-pr/perf-hot-paths`: `npm run benchmark:smoke` passes, 14 tests.
- No branch adds a fork-only line. No branch touches the package name, `publishConfig`, `private`, `prepack`, `packageManager`, `NPM_TOKEN`, `.npmrc`, `CLAUDE.md`, `.mcp.json` or `docs/plans/`. The only `dynamoose-baseline` references are in 10 and 14, where the alias is the published `npm:dynamoose@4.2.0`, not the scoped fork package.
- Benchmark timings were not re-measured. The numbers in the table are from 2026-10-15.

## Stacks

Four branches are bases that other branches carry. Submit a stacked branch only after its base merges, then rebase it on `upstream/main`.

```
upstream/main
├── 1  fix-update-value-types            (independent)
├── 2  fix-nested-force-default          (independent)
├── 3  fix-combine-no-source             (independent)
├── 4  fix-combine-key                   (independent, same lines as 3)
├── 5  feat-update-nested-paths          carries 1 → 2 → 3 → 4 → "await exec in the Query and Scan promise tests"
│   ├── 6  test-update-integration       carries 5
│   └── 7  perf-nested-update-batching   carries 5
├── 8  types-export                      (independent)
├── 9  perf-converter-deep-copy          (independent)
├── 10 perf-schema-lookup-cache          (independent; also carries the benchmark and the CI gate)
│   └── 14 perf-hot-paths                carries 10
├── 11 feat-read-strict                  (independent)
├── 12 fix-save-return-conformed         (independent)
├── 13 test-block-http                   (independent)
└── 15 fix-stream-options-undefined      (independent)
```

Branch 5 carries rebased copies of 1-4. The added lines are identical to the standalone branches; only the surrounding context differs, because each fix sits on the one below it. Branch 5 also carries one commit that has no branch of its own: "Awaiting the request in the Query and Scan 'Should return a promise' tests". The same hunk is in 13, so both can merge in either order (see below).

Until a base merges, review a stacked branch against its base, for example `https://github.com/MONEI/dynamoose/compare/upstream-pr/feat-update-nested-paths...upstream-pr/perf-nested-update-batching`.

## Conflicts between independent branches

From `git merge-tree` of every pair against `upstream/main`. Every pair not listed merges cleanly, apart from `PENDING_CHANGELOG.md`, which 28 of the 105 pairs touch. That one is unavoidable for any set of parallel PRs and is a one-line resolution.

| Pair | Conflicting file | Note |
|---|---|---|
| 3 ↔ 4 | `lib/Model/index.ts`, `test/Model.js` | Both rewrite the combine loop. Merge 3 first, then rebase 4 |
| 8 ↔ 5, 6, 7 | `lib/Model/index.ts` | One hunk: both insert at the same place near the top of the file. No shared logic |
| 10, 14 ↔ 5, 7 | `lib/Model/index.ts` | The lookup cache rewrites the combine loop that 5 also rewrites. The one real overlap in the set |
| 10, 14 ↔ 6 | `lib/Model/index.ts`, `packages/dynamoose/package.json` | Both add a script next to `test:types` |
| 11 ↔ 5, 6, 7 | `lib/Item.ts` | Both change the same modifier guard in `conformToSchema` |
| 13 ↔ 5, 6, 7 | - | Resolved on 2026-10-16: 13's `test/Query.js` and `test/Scan.js` hunk is now byte-identical to the one in 5, so git merges them in either order. 13 was force-pushed (`483b8b90` → `747d3660`), comment wording only |

12 and 15 conflict with nothing at all, not even the changelog. 9 conflicts only on the changelog.

## How the upstream branches differ from the fork

The branches do not copy the fork. Where the fork code is wrong or fork-specific, the upstream branch differs:

- **No separate PR for fork PRs 15, 18 and 20.** Upstream has no nested-path updates at all: today `{"address.city": "x"}` writes a top-level attribute named `address.city`. Fork PRs 9-11 added paths that skipped the schema (a validation bypass). PRs 15, 18 and 20 and the 4.2.5 rules fixed that. So upstream gets the corrected feature in one PR (5). The batching from 4.2.5 is a separate performance PR (7).
- **5 allows `$REMOVE` of a key inside a list element** (`reps[0].email`). The fork rejects it ("DynamoDB does not support removing properties from objects within lists"). DynamoDB Local accepts it and removes the key.
- **5 rejects malformed paths and checks the parsed path.** See fork bug 1 below.
- **5 checks `required` below a written object.** See fork bug 2 below.
- **5 uses `CustomError.InvalidParameter`** for path errors. The fork throws plain `Error`. The messages are the same.
- **6 is on top of 5.** It adds 2 cases (remove inside a list element, nested `$DELETE`) and a line in AGENTS.md.
- **11 keeps the default `readStrict: true`.** It reuses the type check and does not use the fork's lightweight read path (see fork bug 5). It is leniency only, without the fork's speed gain.
- **10 compares with published `dynamoose@4.2.0`** and has a neutral `order` fixture. The fork's checkouts schema is MONEI's internal data model. The readStrict equivalence case is removed.
- **12 returns a new item and does not change the saved one.** See fork bug 4.
- **9 handles only values where it gives the same result as the SDK.** See fork bug 3.

## Fork-only (not sent)

| Change | Reason |
|---|---|
| Package name `@monei-js/dynamoose`, version, `publishConfig`, `private: true`, `prepack`, `packageManager: yarn`, `NPM_TOKEN` in publish.yml, removal of `.npmrc` `provenance=true` | MONEI publishing of the scoped package |
| `packages/dynamoose/README.md` | Copy of the root README, committed for the scoped package |
| `CLAUDE.md`, `.mcp.json`, `.vscode/settings.json`, `docs/plans/**` | MONEI agent and process files |
| `readStrict` default `false` | MONEI read-path choice. Upstream must keep the current behaviour as default |
| `dynamoose-baseline` alias to `@monei-js/dynamoose`, bump after each release | Fork release flow. Upstream PR 10 uses the published `dynamoose` |
| ESLint 9 flat config, removed `eslint-disable` comments, Node >= 20, `.nvmrc` 22, CI matrix 20+ | Tooling and engine policy. Dropping Node 16-19 is breaking for upstream. Propose it as an issue if wanted |
| `Model.update` caches (`attributeTypeCache`, `schemaAttributesCache`, `updateTypesMapCache`, `convertKeyToObjectCache`), `utils/LRUCache.ts`, `Model.clearCache()` | `attributeTypeCache` has a known bug (`test/AttributeTypeCache.js`, `it.failing`). The schema lookup cache (PR 10) makes the rest cheap. The fork should remove them |
| `docs/fixcrowdin.js` and `Error.ts` comment edits, `merge_objects.ts` cast | Part of the lint migration, or no effect upstream |
| CI `pull_request` `reopened` trigger | Upstreamable, but a one-line change. Not branched. Add it to any CI PR if wanted |

## Fork bugs found

The work found bugs in the fork's own code. The upstream branches do not have them. Bugs 1, 2 and 6 are fixed in the fork by https://github.com/MONEI/dynamoose/pull/27 (published as 4.2.6). Bugs 3-5 are fixed by the port of the upstream branches into the fork, https://github.com/MONEI/dynamoose/pull/28, merged and published as 4.3.0 on 2026-10-15, which also removed the `Model.update` caches:

1. **Validation bypass: two spellings of one nested path.** The required and default checks use a regex on the key. The expression uses the parser. `{"$REMOVE": ["reps[0]name"]}` sends `REMOVE #a0[0].#a1` without the required check of `reps.0.name`. `{"$REMOVE": ["reps.[0].name"]}` sends an empty `UpdateExpression`. Checked against published 4.2.5.
2. **Validation bypass: a nested `$SET` of an object skips required on its children.** `{"$SET": {"a.b": {"c": "1"}}}` is sent although `a.b.d` is required (the conversion passes `required: false`). Checked against published 4.2.5.
3. **`fastConvertToAttr` does not match the AWS SDK.** `NaN` and `Infinity` become `{"S": ...}` (the SDK throws). Numbers outside the safe integer range are stored imprecisely (the SDK throws). `undefined` becomes `{"NULL": true}` (the SDK throws). The converter options are ignored.
4. **`save` (76f3924e) applies `set` twice.** It copies `get`-modified values onto the item, so a second save stores `set(get(set(x)))`. It also changes the item and marks it stored before `putItem`, also with `{"return": "request"}` and when `putItem` fails.
5. **The `readStrict: false` read path loses data.** It returns lists with an `ANY` schema as empty and drops the fields of range-key model references. It throws "modifierFunction is not a function" on a multi-type attribute with a `get` modifier.
6. **`$REMOVE` inside a list element is rejected,** although DynamoDB accepts it (see above).

Bugs 1 and 2, and the nested-removal bypass below, matter only where caller input reaches an update key. **All 16 services were audited on 2026-10-16 and none is exposed**, as a regression risk or as a security one: no service uses a nested removal in any of its three spellings (a dotted or bracketed `$REMOVE` path, a dotted `$SET` key set to `undefined`, or a dotted key set to `null`, which common's `removeNullFromDb` turns into a nested `$REMOVE`), and no caller-supplied input can become a dotted update key, since the services that spread a variable into an update build it internally and typed GraphQL inputs cannot carry an `"a.b"` field name. So this family is a correctness bug for MONEI, not an exposure.

## Submitted

All 15 are open on dynamoose/dynamoose, 2026-10-16, base `main`. Every branch still has `upstream/main` 12d22a37 as its merge base; upstream has not moved, so none needs a rebase. Tests pass on all 15. The only red checks are `CLAssistant` on every one (upstream's bot cannot write its signature file, see below) and `coverage/coveralls` on 10, 14, 5, 6 and 7, between -0.08% and -0.2%. Cross-fork stacked PRs are not possible: GitHub chains stacks through base branches, a base must exist in the target repository, and we have no push access to dynamoose/dynamoose. The 4 stacked PRs therefore target `main` and carry a `> Depends on #NNNN` line with a compare link to their own delta.

| # | Branch | Upstream PR | Depends on |
|---|---|---|---|
| 15 | `fix-stream-options-undefined` | https://github.com/dynamoose/dynamoose/pull/1813 | - |
| 1 | `fix-update-value-types` | https://github.com/dynamoose/dynamoose/pull/1814 | - |
| 2 | `fix-nested-force-default` | https://github.com/dynamoose/dynamoose/pull/1815 | - |
| 3 | `fix-combine-no-source` | https://github.com/dynamoose/dynamoose/pull/1816 | - |
| 4 | `fix-combine-key` | https://github.com/dynamoose/dynamoose/pull/1817 | 3 (same lines) |
| 8 | `types-export` | https://github.com/dynamoose/dynamoose/pull/1818 | - |
| 9 | `perf-converter-deep-copy` | https://github.com/dynamoose/dynamoose/pull/1819 | - |
| 10 | `perf-schema-lookup-cache` | https://github.com/dynamoose/dynamoose/pull/1820 | - |
| 11 | `feat-read-strict` | https://github.com/dynamoose/dynamoose/pull/1821 | - |
| 12 | `fix-save-return-conformed` | https://github.com/dynamoose/dynamoose/pull/1822 | - |
| 13 | `test-block-http` | https://github.com/dynamoose/dynamoose/pull/1823 | - |
| 5 | `feat-update-nested-paths` | https://github.com/dynamoose/dynamoose/pull/1824 | 1817 |
| 6 | `test-update-integration` | https://github.com/dynamoose/dynamoose/pull/1825 | 1824 |
| 7 | `perf-nested-update-batching` | https://github.com/dynamoose/dynamoose/pull/1826 | 1824 |
| 14 | `perf-hot-paths` | https://github.com/dynamoose/dynamoose/pull/1827 | 1820 |

### Validation bypass found and fixed in 5 (2026-10-16)

A nested `$REMOVE` skipped the partial-object guard that a nested `$SET` enforces. `refuseRuleOnPartialObject` refuses writing `a.b` when `a` has its own `set` or `validate` rule and declared children, because the rule cannot vet a partial object. A removal is a partial write too, but it carries no value, so it never reached that check:

```
$SET a.b             -> REFUSED
$REMOVE a.b          -> ALLOWED        (before the fix)
$SET a.b = undefined -> ALLOWED        (before the fix, same bypass, other spelling)
```

Reproduced against published `@monei-js/dynamoose@4.2.6` and `@4.3.0`, so the fork shipped it as well. Fixed in branch 5 by `refuseRemoveUnderRuleAncestor` in `Model/index.ts`, which refuses both spellings before the expression is built. Three regression tests: `$REMOVE`, `$SET` to undefined, and a path inside a list element (`reps[0].name`, so the index-to-`0` mapping of ancestors is pinned). Suite 2554 -> 2560, integration still 28/28.

Two notes on the implementation:

- The ancestor rule is read with `{"returnFunction": true}`. Without it `getAttributeSettingValue` **runs** the rule, which called the merchant's `validate` with no value; a first version of the guard did that and silently swallowed the resulting `TypeError`.
- The guard keeps upstream's "declares children" condition. An automated review asked for it to refuse whenever an ancestor has any rule. That would break the documented schemaless behaviour: with `saveUnknown`, a parent's `validate` runs per written entry (`{"x": "v"}`), which branch 5 has tests for. Verified by probe.

### The guard's own bug: a multi-type ancestor (2026-10-16)

The first version of the guard tested `Boolean(schema.getAttributeSettingValue(setting, ancestor, {"returnFunction": true}))`. For a **multi-type attribute that call answers with one entry per definition**, so `[undefined, undefined]` read as truthy and every nested `$REMOVE` under a multi-type parent was refused, rule or not:

```js
{"id": Number, "data": [{"type": Object, "schema": {"a": String}}, {"type": Object, "schema": {"b": Number}}]}
// {"$REMOVE": ["data.a"]} -> refused, although neither definition has set or validate
```

`Model/index.ts` already had `ancestorHasRule`, which handles the array correctly, and the guard should have reused it. Both now share `attributeHasRule`. One regression test covers the multi-type case. Fixed on 5, 6 and 7, and in the fork.

Both review bots (CodeRabbit and the Codex reviewer) found this on the fork PR; the test suite did not. Worth remembering for any other code that reads a schema setting: `getAttributeSettingValue` **runs** the rule unless `returnFunction` is set, and answers with an array for a multi-type attribute.

### Nothing to fix upstream for the bypass

The bypass does not exist on `upstream/main`: it has no nested-path updates, so `a.b` is one top-level attribute and there is no parent whose rule could be skipped. Checked against a build of 12d22a37:

```
$SET a.b             -> SET #a0 = :v0    {"#a0": "a.b"}
$REMOVE a.b          -> REMOVE #a0        {"#a0": "a.b"}
```

So the guard is part of 5, the PR that introduces nested paths, and needs no PR of its own. Only the fork shipped the bypass, because only the fork had the feature.

### CodeQL on 10 and 14, fixed

CodeQL raised 2 high-severity "insecure randomness" alerts on 1820, for `Math.random()` behind `userId` and `sessionId` in `benchmarks/schemas.js`. All 7 `Math.random()` uses are gone: the `schemas.js` fixture ids are a counter, and `externalOrderId` in `benchmarks/fixtures/order-schema.js` uses `crypto.randomInt`. The counter also removes a real benchmark defect, `multiType` flipping between a string and a number from run to run, which made the fixtures differ between the runs a benchmark compares. Folded into the existing benchmark commit on both branches, so neither PR gained a commit. Suite counts unchanged (2459 and 2463), benchmark smoke 14/14.

### Coverage (2026-10-16)

Upstream keeps ~100% line coverage, so Coveralls fails on any drop. Fixed on 1, 9, 10 and 14; 5, 6 and 7 keep one uncovered line.

- **9**: the new fast path (`typeof obj !== "object"`) also returns for a function, which left upstream's `if (obj instanceof Function)` block unreachable. Removed it, `deep_copy.js` back to 100%.
- **10 and 14**: `test/Equivalence.js` loads `equivalence/` and `benchmarks/`, so jest instrumented the harness and the corpus as library code (-1.1%). Added `coveragePathIgnorePatterns` for both. Back to 100% lines.
- **4**: the `.match(...) || []` fallback cannot be reached. Rewritten to test each name key against the expression text, which has no fallback. Exactly the upstream baseline (99.81 / 98.88 / 100 / 100). The same rewrite is in 5, which carries this fix.
- **5, 6, 7**: one uncovered line remains, the `return undefined` of `multiTypeAncestor`. It is only called for a path the schema declares, and every such path in the tests has a multi-type ancestor; no test reaches the default. Left as it is rather than restructured to hide it.

### Blocker: upstream's CLA bot cannot record a signature

The dedication comment was posted on 1813, but https://github.com/dynamoose/dynamoose/actions/runs/38887080746 failed:

```
Could not update the JSON file: Repository rule violations found
Changes must be made through a pull request.
2 of 2 required status checks are expected.
```

Upstream's ruleset "Require PRs and CI for main" was created 2026-10-11 with no bypass actors, so `.github/workflows/cla.yml` can no longer write `signatures/version1/cla.json`. The last recorded signature is 2026-06-21 (dynamoose/dynamoose#1783), before the ruleset. `recheck` fails the same way. It was flagged to the maintainer on 1813.

**Hold the remaining 14 until this is fixed.** Every one of them would land on the same red check. Once the maintainer adds a bypass actor, a `recheck` comment on 1813 records the signature for all of them.

## Submission order

Decided on 2026-10-16: **15 first, then 1, 2, 3.**

1. **15 (streamOptions).** It conflicts with nothing, and it fixes a bug in upstream's unreleased streams option, so it should land before their next release. Post the CLA dedication comment on this one.
2. **1, 2 and 3, the independent `Model.update` fixes.** Then **4**, after 3 merges: 3 and 4 touch the same lines, so 4 needs a rebase.
3. **8 (types) and 9 (converter).** Small and independent.
4. **5 (nested paths)** after 1-4 merge. Then **6 (integration tests)** and **7 (batching)**.
5. **10 (schema lookup cache)**, then **14 (hot paths)**. 10 is large but independent. It conflicts slightly with 5 in the combine loop. Send it after 5, or rebase it. Its equivalence suite compares with the last release, so a behaviour-changing PR that merges after it needs `differs` entries until upstream releases.
6. **11 (readStrict).** It is a feature. A short issue first lets the maintainers agree on the semantics. A mismatched value skips `get` and schema filtering.
7. **12 (save return).** It is breaking. Open an issue first. It probably belongs in the next major version.
8. **13 (block HTTP).** `mitm` is AGPL-3.0. Ask in an issue whether upstream accepts an AGPL devDependency before you send it. Its `test/Query.js` and `test/Scan.js` hunk is deliberately identical to the one inside 5, so the order against 5 does not matter.

Every stacked branch needs a rebase on `upstream/main` after its base merges, and the pairs in the conflict table need the earlier one merged first or a rebase. Nothing else in the set has an ordering constraint.

After each merge: sync the fork from upstream, delete the fork's copy of that change, and bump `dynamoose-baseline`.

Since https://github.com/MONEI/dynamoose/pull/28 the fork's `lib/` is upstream plus 14 of these branches, and the only fork-only difference is the `readStrict` default (`false` in the fork). That statement comes from the port itself. The 2026-10-16 pass did not re-derive it: merging all 15 branches into one tree needs the conflicts in the table above resolved by hand, which is the submission work, not a check.
