Title: Adding nested path support to Model.update

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

An update key can now be a path into a nested attribute: dots for map keys and brackets for list indexes (`address.city`, `tags[0]`, `friends[0].name`), for `$SET`, `$ADD`, `$REMOVE` and `$DELETE`. Today such a key is sent as one attribute name, so DynamoDB creates a top-level attribute literally named `address.city`, and the only way to change one nested key is to rewrite the whole parent (racing other writers of its siblings).

- The expression gets one name per path part, list indexes stay literal: `SET #a0[0].#a1 = :v0`.
- Each nested value is wrapped in the object its path describes and converted by `objectFromSchema`, so type checks, `enum`, `validate`, `set` modifiers and custom types (`Date` storage, sets) apply exactly as for a full write. A new internal `nestedScope` setting limits the rules to the written path.
- `default` and `required` are checked on the nested attribute, not its top-level parent; `required` also covers what a written object holds below the path.
- A nested key the schema drops (undeclared, not covered by `saveUnknown`) is skipped, as a full write of the parent drops it. An update in which every key is skipped throws instead of sending only timestamps.
- A parent with declared children and its own `set` or `validate` refuses the nested write (that function would only see part of the object). A record or schemaless parent runs its rule on the written entry.
- A value no definition of a multi-type parent accepts throws instead of removing the stored value. `__proto__` and `constructor` path parts throw. Malformed paths throw (empty part, unclosed or non-numeric index, a name right after an index), and every check uses the parsed path, so two spellings of one path cannot resolve to different schema attributes.
- Combine sources and forced defaults now match only the top-level name of each expression term, since a nested path part can share a name with a top-level attribute.

The first commit awaits the request in the Query/Scan "Should return a promise" tests: they left a request pending past `afterEach`, which then ran against the real SDK inside "Should handle delay correctly on query.exec" once the read path got one more microtask tick.


### Code sample:
#### Model
```js
const User = dynamoose.model("User", {"id": Number, "address": {"type": Object, "schema": {"city": String, "zip": String, "since": Date}}, "reps": {"type": Array, "schema": [{"type": Object, "schema": {"name": String, "email": String}}]}});
await User.update({"id": 1}, {"address.city": "Madrid", "$SET": {"address.since": new Date()}, "$REMOVE": ["reps[0].email"]});
// REMOVE #a4[0].#a5 SET #a0.#a1 = :v0, #a2.#a3 = :v2   (address.since sent as {"N": ...}, as the schema says)
```


### Other information:

Depends on the four `Model.update` fixes (`upstream-pr/fix-update-value-types`, `fix-nested-force-default`, `fix-combine-no-source`, `fix-combine-key`), which are the first four commits here; this PR is ready once they merge. Docs: new "Nested paths" section under `model.update` in `docs/docs_src/guide/Model.md`.

A known trade-off for review: a record (an `Object` without declared children) runs its `validate` on the partial object holding only the written entry. A rule that compares entries with each other can be bypassed by nested writes; rules that check each entry work as before. The alternative is to refuse nested writes under any parent with a rule; we chose the less restrictive one, but are happy to switch.

75 new tests in `test/Model.js` (71 fail without the library change; each runs for Promise and callback); the DynamoDB Local suite in `upstream-pr/test-update-integration` checks what DynamoDB stores for these cases.


### Type (select 1):
- [ ] Bug fix
- [x] Feature implementation
- [ ] Documentation improvement
- [ ] Testing improvement
- [ ] Test added to report bug (GitHub issue #---- @---)
- [ ] Something not listed here


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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/feat-update-nested-paths?expand=1
Depends on upstream-pr/fix-combine-key (plus the other three fixes); compare against that branch until it merges: https://github.com/MONEI/dynamoose/compare/upstream-pr/fix-combine-key...upstream-pr/feat-update-nested-paths
