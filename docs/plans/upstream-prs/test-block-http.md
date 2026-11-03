Title: Blocking real HTTP requests in unit tests

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

The unit tests mock DynamoDB with `dynamoose.aws.ddb.set(...)`. If a test calls DynamoDB after its mock was removed, or forgets the mock, the call goes to the real AWS SDK client. When AWS credentials and a region are in the environment (a developer machine, or a CI runner with AWS access), that sends a real request to AWS, and the test can still pass.

This PR makes that impossible:

- `test/_setup.js` uses [`mitm`](https://www.npmjs.com/package/mitm) to intercept every socket that a test opens.
- Connections to `localhost`, `127.0.0.1` and `::1` go through, so DynamoDB Local keeps working.
- Any other request gets a non-retryable `400` response, so the SDK call fails at once and does not retry with backoff. The `afterEach` hook then fails the test with the blocked method, host and path, for example `Real HTTP requests are not allowed in unit tests. Blocked: POST dynamodb.us-east-1.amazonaws.com/`.
- The hook throws an error instead of calling `expect`, so tests that use `expect.assertions(n)` keep their count.
- Nothing is printed to the console.

The Query and Scan "Should return a promise" tests created a request and did not await it. They now await it, so the request finishes while the mocked client is still set and does not run after `afterEach` restores the real client.

`mitm` is added to the root `devDependencies`. The `package-lock.json` change only adds `mitm@1.7.3` and its `semver@5.7.2` dependency.


### Other information:

- The current suite makes no real requests. I checked this by logging every intercepted connection during a full run, with and without `AWS_REGION` and fake credentials in the environment. So no existing test changes result. To check that the block works, I used a temporary test (not committed) that sets a real `DynamoDB` client with fake credentials and calls `Model.get`. The call rejected at once with the block message, and the test failed in `afterEach`. A second temporary test with `endpoint: "http://localhost:8000"` reached DynamoDB Local.
- Full suite: 2388 passed, 18 skipped (same as `main`) on Node 16.20, 20.2, 22.16 and 24.22. `npm test` (with coverage) also passes.
- License note for the maintainers: `mitm` is licensed `AGPL-3.0-or-later WITH GPL-3.0-linking-exception`. It is a devDependency only and is not part of the published package, but you may have a policy about this. If so, I can replace it with a small `http`/`https` request stub in `_setup.js`.
- The warning "A worker process has failed to exit gracefully" also shows on `main` and is not related to this change.


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
- [x] Yes
- [ ] No


### Are all the tests currently passing on this PR? (select 1):
- [x] Yes
- [ ] No


### Does at least one test added in this PR fail without the implementation changes in the PR? (select one):

It's important that you write test(s) that fail without the implementation changes in the PR. If you revert all non-test changes, at least one test you added should fail. This ensures that your tests are actually testing the new functionality and protects against regression.

- [ ] Yes
- [ ] No
- [x] N/A

N/A: this PR changes only the test setup, and the library code does not change. The guard fails a test only when that test makes a real HTTP request, and no current test does. I checked the guard with a temporary test, as described above.


### Other:
- [x] I have read through and followed the Contributing Guidelines
- [ ] I have searched through the GitHub pull requests to ensure this PR has not already been submitted
- [x] I have updated the Dynamoose documentation (if required) given the changes I made
- [x] I have added/updated the Dynamoose test cases (if required) given the changes I made
- [ ] I agree that all changes made in this pull request may be distributed and are made available in accordance with the [Dynamoose license](https://github.com/dynamoose/dynamoose/blob/main/LICENSE)
- [x] All of my commits and commit messages are detailed, explain what changes were made, and are easy to follow and understand
- [x] I have filled out all fields above

This pull request was created by an AI agent (Claude Code, Opus 5.5). The human contributor reviewed the changes, ran the relevant tests, and approved the submission.

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/test-block-http?expand=1
