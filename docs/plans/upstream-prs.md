# Upstream PRs from the fork

Status 2026-10-15 (updated the same evening: branch 14, fork port). Goal: send every fork change that upstream can use to dynamoose/dynamoose, so that later syncs from upstream are cheap.

Fork `origin/main` a26ceb6c (4.2.5) against `upstream/main` 12d22a37. The fork is synced: their merge base is upstream/main.

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
| 11 | `upstream-pr/feat-read-strict` | Adding readStrict table option to skip schema validation on reads | - | 22 of 26 new tests and 1 type test fail without the change. 2414 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/feat-read-strict?expand=1) |
| 12 | `upstream-pr/fix-save-return-conformed` | Fixing save and create returning items in DynamoDB form instead of the schema form | - | 6 new tests fail without the fix. 2398 passed. Breaking | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-save-return-conformed?expand=1) |
| 13 | `upstream-pr/test-block-http` | Blocking real HTTP requests in unit tests | - | N/A, test setup only. 2388 passed | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/test-block-http?expand=1) |
| 14 | `upstream-pr/perf-hot-paths` | Speeding up object entries, key standardization and the attribute tree | 10 | 1 of 4 new tests fails without the change (a cycle). Equivalence against 4.2.0 unchanged. 2463 passed. Against 10 alone: get +14-29%, update +14-56% | [compare](https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-hot-paths?expand=1) |

Stacked branches (5, 6, 7, 14) carry their base commits. Until the base merges, review them against the base branch, for example `https://github.com/MONEI/dynamoose/compare/upstream-pr/feat-update-nested-paths...upstream-pr/perf-nested-update-batching`. After each merge, rebase the next branch on upstream/main.

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

The work found bugs in the fork's own code. The upstream branches do not have them. Bugs 1, 2 and 6 are fixed in the fork by https://github.com/MONEI/dynamoose/pull/27 (published as 4.2.6). Bugs 3-5 are fixed by the port of the upstream branches into the fork (`chore/port-upstream-prs`), which also removes the `Model.update` caches:

1. **Validation bypass: two spellings of one nested path.** The required and default checks use a regex on the key. The expression uses the parser. `{"$REMOVE": ["reps[0]name"]}` sends `REMOVE #a0[0].#a1` without the required check of `reps.0.name`. `{"$REMOVE": ["reps.[0].name"]}` sends an empty `UpdateExpression`. Checked against published 4.2.5.
2. **Validation bypass: a nested `$SET` of an object skips required on its children.** `{"$SET": {"a.b": {"c": "1"}}}` is sent although `a.b.d` is required (the conversion passes `required: false`). Checked against published 4.2.5.
3. **`fastConvertToAttr` does not match the AWS SDK.** `NaN` and `Infinity` become `{"S": ...}` (the SDK throws). Numbers outside the safe integer range are stored imprecisely (the SDK throws). `undefined` becomes `{"NULL": true}` (the SDK throws). The converter options are ignored.
4. **`save` (76f3924e) applies `set` twice.** It copies `get`-modified values onto the item, so a second save stores `set(get(set(x)))`. It also changes the item and marks it stored before `putItem`, also with `{"return": "request"}` and when `putItem` fails.
5. **The `readStrict: false` read path loses data.** It returns lists with an `ANY` schema as empty and drops the fields of range-key model references. It throws "modifierFunction is not a function" on a multi-type attribute with a `get` modifier.
6. **`$REMOVE` inside a list element is rejected,** although DynamoDB accepts it (see above).

Bugs 1 and 2 matter only where caller input reaches an update key. Check the services before you decide on urgency.

## Suggested submission order

1. **1-4, the four `Model.update` fixes.** They are small and independent. Send 3 before 4, or rebase the second one: they touch the same lines. Post the CLA dedication comment on the first one.
2. **8 (types) and 9 (converter).** They are small and change no behaviour.
3. **5 (nested paths)** after 1-4 merge. Then **6 (integration tests)** and **7 (batching)**.
4. **10 (schema lookup cache)**, then **14 (hot paths)**. 10 is large but independent. It conflicts slightly with 5 in the combine loop. Send it after 5, or rebase it. Its equivalence suite compares with the last release, so a behaviour-changing PR that merges after it needs `differs` entries until upstream releases.
5. **11 (readStrict).** It is a feature. A short issue first lets the maintainers agree on the semantics. A mismatched value skips `get` and schema filtering.
6. **12 (save return).** It is breaking. Open an issue first. It probably belongs in the next major version.
7. **13 (block HTTP).** `mitm` is AGPL-3.0. Ask in an issue whether upstream accepts an AGPL devDependency before you send it.

After each merge: sync the fork from upstream, delete the fork's copy of that change, and bump `dynamoose-baseline`. After the port, the fork's lib/ differs from upstream plus these branches only by the `readStrict` default (`false` in the fork).
