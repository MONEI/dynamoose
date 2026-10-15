Title: Speeding up object entries, key standardization and the attribute tree

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

CPU profiles of `Model.get` and `Model.update` on large schemas show three hot spots after the schema lookup cache:

- `utils.object.entries` (from `js-object-utilities`) checks each nested object for a cycle by walking its whole subtree, so its cost grows with the size of an item times its depth. It runs on every read (Item constructor and type check) and write. A local `entries`/`keys` tracks the ancestors instead: the same output for an object without cycles, and it stops at a cycle instead of overflowing the stack (today `entries({"a": a})` with `a.self = a` throws "Maximum call stack size exceeded").
- `standardizeKey` runs a regex on every cached lookup; it now scans for a list index first and runs the regex only when there is one.
- `Item.attributesWithSchema` rebuilds a tree of all schema attributes on every call, several times per `objectFromSchema`. The tree is kept in the schema lookup cache, under the same conditions as `attributes()`, and is built again when `attributes()` is replaced.


### Other information:

Depends on `upstream-pr/perf-schema-lookup-cache` (the attribute tree and `standardizeKey` live in its cache).

Interleaved runs against the lookup-cache branch alone (9 rounds of 500 ms each, Node 24, loaded machine, so approximate): `get` large +14.5%, extra-large +28.6%, order +22.5%; `update` large +44.8%, extra-large +56.3%, order +14.3%. The equivalence suite against published 4.2.0 passes unchanged.

New tests: `test/utils/object_entries.js` (output, shared references, a cycle; the cycle test fails without the change) and one `test/SchemaCache.js` guard that a replaced `attributes()` is still called.


### Type (select 1):
- [ ] Bug fix
- [ ] Feature implementation
- [ ] Documentation improvement
- [ ] Testing improvement
- [ ] Test added to report bug (GitHub issue #---- @---)
- [x] Something not listed here


### Is this a breaking change? (select 1):
- [ ] 🚨 YES 🚨
- [x] No
- [ ] I'm not sure


### Is this ready to be merged into Dynamoose? (select 1):
- [ ] Yes
- [x] No


### Are all the tests currently passing on this PR? (select 1):
- [x] Yes
- [ ] No


### Does at least one test added in this PR fail without the implementation changes in the PR? (select one):

It's important that you write test(s) that fail without the implementation changes in the PR. If you revert all non-test changes, at least one test you added should fail. This ensures that your tests are actually testing the new functionality and protects against regression.

- [x] Yes
- [ ] No
- [ ] N/A


### Other:
- [x] I have read through and followed the Contributing Guidelines
- [ ] I have searched through the GitHub pull requests to ensure this PR has not already been submitted
- [x] I have updated the Dynamoose documentation (if required) given the changes I made
- [x] I have added/updated the Dynamoose test cases (if required) given the changes I made
- [ ] I agree that all changes made in this pull request may be distributed and are made available in accordance with the [Dynamoose license](https://github.com/dynamoose/dynamoose/blob/main/LICENSE)
- [x] All of my commits and commit messages are detailed, explain what changes were made, and are easy to follow and understand
- [x] I have filled out all fields above

This pull request was created by an AI agent (Claude Code, Opus 5.5). The human contributor reviewed the changes, ran the relevant tests, and approved the submission.

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-hot-paths?expand=1
Depends on upstream-pr/perf-schema-lookup-cache; compare against that branch until it merges: https://github.com/MONEI/dynamoose/compare/upstream-pr/perf-schema-lookup-cache...upstream-pr/perf-hot-paths
