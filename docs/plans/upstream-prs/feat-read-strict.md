Title: Adding readStrict table option to skip schema validation on reads

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

Today a read throws `TypeMismatch` when a stored value does not match the schema type. One bad attribute makes the whole `get`, `query` or `scan` fail. This happens after a schema change, or when other code writes to the table, and there is no way to opt out.

This PR adds a `readStrict` Table option. The default is `true`, so current behavior does not change. With `readStrict: false`:

- `Model.get`, `Model.batchGet`, `Model.query`, `Model.scan`, the item that `Model.update` returns and `dynamoose.transaction` get requests return the item instead of throwing.
- A value that matches no type of its attribute is returned exactly as stored, together with all values below it. Custom type conversion (for example to `Date`) and the attribute `get` function do not run on that value. Keys below it are not filtered by the schema either. So with `readStrict: false`, a `get` function used to mask a value, or a schema that leaves out a nested key, does not protect a value whose stored type does not match: it is returned as stored.
- Everything else on the read path does not change: values that match the schema are processed as before, attributes not in the schema are removed (unless `saveUnknown` allows them), and the expired item check runs.
- Reads never run `validate`, `required`, `enum` or `default`, with or without the option.

Implementation: in `Item.objectFromSchema`, a type mismatch with `readStrict: false` marks the key as a valid parent instead of throwing. Custom type conversion and `get` modifiers skip values that match no type. The read call sites pass the table option through to `conformToSchema`. Valid data takes the same code path as before, and a test checks that `readStrict: false` returns the same item as the default for sets, lists, model references (hash and range key), `THIS`, `ANY` objects and lists, and multi-type attributes with `get` functions.

Docs: JSDoc row in the Table options table, and a new "Reading items that do not match the schema" section in `docs/docs_src/guide/Table.md` that also states the risk (code must handle values of any type, and saving such an item fails the type check).


### Code sample:
#### General
```js
const User = dynamoose.model("User", {"id": Number, "age": Number});
const Table = new dynamoose.Table("User", [User], {"readStrict": false});

// Stored item: {"id": {"N": "1"}, "age": {"S": "unknown"}}
const user = await User.get(1);
console.log(user.age); // "unknown" (with the default `readStrict: true` this throws TypeMismatch)
```


### Other information:

An earlier version of this feature was opened as https://github.com/dynamoose/dynamoose/pull/1752. It was closed without review because the CLA was never signed. That version defaulted to `false` (a behavior change) and replaced the type check with a separate lightweight path. That path dropped the elements of `ANY` lists and the fields of range-key model references, and threw "modifierFunction is not a function" on multi-type attributes with `get` functions. This PR keeps the default at `true` and reuses the existing type check, so valid data is handled exactly as before.


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


### Other:
- [x] I have read through and followed the Contributing Guidelines
- [ ] I have searched through the GitHub pull requests to ensure this PR has not already been submitted
- [x] I have updated the Dynamoose documentation (if required) given the changes I made
- [x] I have added/updated the Dynamoose test cases (if required) given the changes I made
- [ ] I agree that all changes made in this pull request may be distributed and are made available in accordance with the [Dynamoose license](https://github.com/dynamoose/dynamoose/blob/main/LICENSE)
- [x] All of my commits and commit messages are detailed, explain what changes were made, and are easy to follow and understand
- [x] I have filled out all fields above

This pull request was created by an AI agent (Claude Code, Opus 5.5). The human contributor reviewed the changes, ran the relevant tests, and approved the submission.

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/feat-read-strict?expand=1
