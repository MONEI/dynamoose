Title: Fixing Model.update on schemas whose hash or range key is a Combine attribute

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

`Model.update` could not run against a schema whose hash or range key is a `Combine` attribute. Omitting the sources threw "You must update all or none of the combine attributes", and supplying them added a `SET` on the key attribute, which DynamoDB rejects ("This attribute is part of the key").

A key is already fully specified in `Key` and is never written, so the combine handling now skips it. Its sources are immutable for the same reason: updating any of them, through `$SET`, `$REMOVE`, `$ADD` or `$DELETE`, throws a clear `InvalidParameter` instead.


### Code sample:
#### Model
```js
const Doc = dynamoose.model("Doc", {"entity": {"type": {"value": "Combine", "settings": {"attributes": ["entityType", "entityId"]}}, "hashKey": true}, "docId": {"type": String, "rangeKey": true}, "entityType": String, "entityId": String, "data": String});
await Doc.update({"entity": "ACCOUNT#1", "docId": "doc1"}, {"data": "x"}); // Before: throws  After: SET #a0 = :v0
await Doc.update({"entity": "ACCOUNT#1", "docId": "doc1"}, {"entityType": "IDENTITY", "entityId": "2"}); // throws "You cannot update the combine attributes of entity because it is part of the key ..."
```


### Other information:

Touches the same lines as `upstream-pr/fix-combine-no-source`; whichever merges second needs a trivial rebase.


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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-combine-key?expand=1
