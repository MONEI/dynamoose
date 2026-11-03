Title: Fixing Model.update typing a value by another attribute after a $REMOVE

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

The final type pass in `Model.update` paired `ExpressionAttributeNames` with `ExpressionAttributeValues` by array position. A `$REMOVE` adds a name without a value, so every later value was typed by the attribute before it. With a `Set` attribute removed and an `Array` attribute set in the same update, the list was sent (and stored) as a string set.

Value `:vN` always belongs to name `#aN`; the pass now looks the name up by key.


### Code sample:
#### Model
```js
const User = dynamoose.model("User", {"id": Number, "tags": {"type": Set, "schema": [String]}, "list": {"type": Array, "schema": [String]}});
await User.update({"id": 1}, {"$REMOVE": ["tags"], "$SET": {"list": ["a", "b"]}});
// Before: :v1 = {"SS": ["a", "b"]}  After: :v1 = {"L": [{"S": "a"}, {"S": "b"}]}
```


### Type (select 1):
- [x] Bug fix
- [ ] Feature implementation
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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-update-value-types?expand=1
