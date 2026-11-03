Title: Speeding up primitive attribute conversion and deep_copy

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

This is a performance-only change. Results do not change.

1. `lib/aws/converter.ts`: the default `convertToAttr` now handles the common primitive values itself. `Item.objectToDynamo(value, {"type": "value"})` runs for every condition value and for attribute type detection of unknown attributes. It calls `convertToAttr` from `@aws-sdk/util-dynamodb`, which runs a chain of `Array.isArray`, `constructor.name` and binary checks before it reaches the string, number and boolean branches. The new function returns the same result directly for:
   - strings: `{"S": value}`
   - finite numbers in the safe integer range: `{"N": value.toString()}`
   - booleans: `{"BOOL": value}`
   - `null`: `{"NULL": true}`

   Everything else goes to the SDK, and so does every call that passes `options`. `NaN`, `Infinity`, `-Infinity`, numbers outside the safe integer range and `undefined` still throw the SDK errors, and `convertEmptyValues` / `allowImpreciseNumbers` still work. A custom converter set with `dynamoose.aws.converter.set` replaces the whole default converter, so the new function does not run for it.

2. `lib/utils/deep_copy.ts`: returns primitives, `null`, `undefined` and functions before the `instanceof` checks, and uses `Object.keys` instead of `for...in` with `hasOwnProperty`. Both give the own enumerable string keys in the same order.


### Other information:

Tests added:
- `test/aws/main.js`, `Converter › convertToAttr`: compares the default `convertToAttr` with the SDK's `convertToAttr` for strings (including empty and unicode), integers, decimals, `-0`, exponent notation, `MAX_SAFE_INTEGER` / `MIN_SAFE_INTEGER`, values just outside the safe range, `NaN`, `Infinity`, `-Infinity`, booleans, `null`, `undefined`, an object, a Set, a Buffer, and the two options that change primitive results. When the SDK throws, the test expects the same error message.
- `test/aws/main.js`, `Converter › Set`: a custom converter's `convertToAttr` is used for condition values (`Model.scan("name").eq("Bob").getRequest()`).
- `test/utils/deep_copy.js`: primitives, `null`, `undefined` and functions are returned unchanged. Only own enumerable properties of a class instance are copied (inherited and non-enumerable ones are not).

These tests pass on `main` too, because this PR does not change behaviour. They guard the fast paths: an earlier version of this optimization returned `{"S": "NaN"}` for `NaN` and `Infinity`, `{"NULL": true}` for `undefined`, `{"N": ...}` for unsafe integers, and ignored `options`. That version failed 7 of these tests.

Micro-benchmark (Node 24.22, Apple Silicon, not committed). It runs 5M calls over a mix of strings, numbers, booleans and null, and 1M deep copies of a nested item with 9 attributes. Two runs:

| | before | after |
|---|---|---|
| `convertToAttr`, primitive mix | 146-187 ns/op | 16-23 ns/op (6-11x faster) |
| `deep_copy`, nested item | 1198-1238 ns/op | 844-993 ns/op (1.2-1.5x faster) |

Changelog: one line under a new "### Other" section of `PENDING_CHANGELOG.md`. No docs change, because the public behaviour does not change.


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

N/A: this is a performance change with no behaviour change. The new tests pin that the output stays identical to the SDK and to the previous `deep_copy`, so they pass with and without the change.


### Other:
- [x] I have read through and followed the Contributing Guidelines
- [ ] I have searched through the GitHub pull requests to ensure this PR has not already been submitted
- [x] I have updated the Dynamoose documentation (if required) given the changes I made
- [x] I have added/updated the Dynamoose test cases (if required) given the changes I made
- [ ] I agree that all changes made in this pull request may be distributed and are made available in accordance with the [Dynamoose license](https://github.com/dynamoose/dynamoose/blob/main/LICENSE)
- [x] All of my commits and commit messages are detailed, explain what changes were made, and are easy to follow and understand
- [x] I have filled out all fields above

This pull request was created by an AI agent (Claude Code, Opus 5.5). The human contributor reviewed the changes, ran the relevant tests, and approved the submission.

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/perf-converter-deep-copy?expand=1
