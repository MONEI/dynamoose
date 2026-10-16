Title: Adding Model.update tests against DynamoDB Local

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

The unit suite stubs the DynamoDB client and checks only the request dynamoose builds. Whether DynamoDB accepts that request, and what it stores, is not tested: a value sent with the wrong type, or an expression DynamoDB rejects, passes the unit suite.

`packages/dynamoose/integration/` creates a table per case on DynamoDB Local, runs `Model.update` and reads the item back raw, so the stored attribute types are visible. It covers nested `$SET`/`$REMOVE`/`$ADD`/`$DELETE`, the schema rules on nested values, value typing next to a `$REMOVE`, combine attributes (also as a hash key) and transaction `get` modifiers. Run with `npm run test:integration` in `packages/dynamoose` (`DYNAMODB_ENDPOINT` overrides `http://localhost:8000`). CI runs it in the `test` job, which already starts DynamoDB Local. It has its own jest config, so `npm test` still needs no database.


### Other information:

Depends on `upstream-pr/feat-update-nested-paths` (most cases exercise nested paths). Against main's library 23 of the 28 cases fail; with the stack all 28 pass. AGENTS.md gets one line on how to run it.


### Type (select 1):
- [ ] Bug fix
- [ ] Feature implementation
- [ ] Documentation improvement
- [x] Testing improvement
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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/test-update-integration?expand=1
Depends on upstream-pr/feat-update-nested-paths; compare against that branch until it merges: https://github.com/MONEI/dynamoose/compare/upstream-pr/feat-update-nested-paths...upstream-pr/test-update-integration
