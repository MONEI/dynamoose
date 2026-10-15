Title: Fixing save and create returning items in DynamoDB form instead of the schema form

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

`item.save()` and `Model.create()` resolve with an item built straight from the attributes sent to `putItem`. Those values are in the stored form, not the schema form:

- timestamps and `Date` attributes are numbers (or ISO strings / seconds, depending on `storage`)
- schema `get` modifiers are not applied
- custom types are not converted back to their JS form

`Model.get`, `query`, `scan` and `batchGet` return the schema form for the same data. So the item from `Model.create` and the same item read back with `Model.get` do not match (for example `createdAt` is `1700000000000` in one and a `Date` in the other). Also, because the returned item holds `set`-applied values without `get`, saving the returned item again applies `set` a second time to an already set value.

This PR makes `save` resolve with the saved item in the same form as `Model.get`. It conforms the saved attributes with the same settings that `Model.get` uses, except the expired item check (a just-saved item must not resolve to `undefined`).

Other details:
- The conversion runs before `putItem`. A conversion error rejects the save before anything is written.
- The item is marked as stored only after `putItem` succeeds.
- The item that `save` is called on keeps the values the user gave. Save already writes the timestamps onto it in storage form, and this PR replaces them with the returned `Date` values. That keeps `item.save(); item.save()` consistent with the returned item. Other attributes are not copied back. Copying `get`-modified values onto the instance would make the next save run `set` on a `get` result. That corrupts data when `set` and `get` are not exact inverses (a test pins this).

Docs: the `item.save` page and the JSDoc said "Nothing will be passed into the result", which was already wrong. They now describe the returned item. Changelog: an entry under "🚨 Breaking Changes 🚨" in `PENDING_CHANGELOG.md`.


### Code sample:

#### Schema
```js
const User = dynamoose.model("User", new dynamoose.Schema({
	"id": Number,
	"birthday": Date,
	"name": {"type": String, "set": (v) => `${v}-set`, "get": (v) => v.replace(/-set$/, "")}
}, {"timestamps": true}));
```

#### Model
```js
const user = await User.create({"id": 1, "birthday": new Date(10000), "name": "Charlie"});

// Before: user.birthday === 10000, typeof user.createdAt === "number", user.name === "Charlie-set"
// After:  user.birthday instanceof Date, user.createdAt instanceof Date, user.name === "Charlie"
// After matches: await User.get(1)
```


### Other information:

Tests added or changed:
- `test/Item.js` › `item.save` (Promise and Callback):
  - "Should return Date attributes as Date objects after saving": fails on `main` (returns `10000`).
  - "Should return item with get modifiers applied after saving": fails on `main` (returns `"Charlie-set"`).
  - "Should not apply set modifier twice when saving the same item twice": passes on `main`, guards the instance against a copy-back of `get` values.
  - "Should not modify the item if return request is set": passes on `main`.
  - "Should not modify the item if saving fails": passes on `main`.
- `test/Model.js` › `model.create()` › "Should return correct result after saving with timestamps": now expects `Date` timestamps instead of numbers. Fails on `main`.

An earlier version of this change copied every `get`-modified value onto the instance before `putItem`. That version failed the last three tests: the second save stored `"Charlie-set-get-set"`, and the instance changed even with `{"return": "request"}` or when `putItem` failed. This PR does not do that.

Breaking change: YES. The resolved value of `item.save()` and `Model.create()` changes for any schema with timestamps, `Date` attributes, custom types or `get` modifiers. Code that does `typeof result.createdAt === "number"` or arithmetic on the returned timestamps breaks. Timestamps on the saved instance also change from the storage form to `Date`. The new values match what `Model.get` already returns for the same item.


### Type (select 1):
- [x] Bug fix
- [ ] Feature implementation
- [ ] Documentation improvement
- [ ] Testing improvement
- [ ] Test added to report bug (GitHub issue #---- @---)
- [ ] Something not listed here


### Is this a breaking change? (select 1):
- [x] 🚨 YES 🚨
- [ ] No
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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/fix-save-return-conformed?expand=1
