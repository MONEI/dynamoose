Title: Exporting public option and schema types and allowing mixed update operators in UpdatePartial

<!-- THANK YOU for your contribution to Dynamoose, we really appreciate you taking the time to improve this package, and look forward to reviewing your PR and getting the changes integrated into the package. Thanks again!! -->


### Summary:

Several types that appear in public method signatures are declared without `export`, so TypeScript users cannot name them. For example, you cannot type a settings object or a schema attribute definition that you declare outside the call. This PR exports them from the module that declares them:

- `lib/General.ts`: `ModelItemConstructor`
- `lib/Schema.ts`: `AttributeType`, `SchemaSettings`, `IndexDefinition`, `AttributeDefinitionTypeSettings`, `AttributeDefinition`, `SchemaGetAttributeTypeSettings`, `SchemaGetAttributeSettingValue`
- `lib/Model/index.ts`: `ModelGetSettings`, `ModelDeleteSettings`, `ModelBatchPutSettings`, `ModelUpdateSettings`, `ModelBatchGetItemsResponse`, `ModelBatchGetSettings`, `ModelBatchDeleteSettings`, `UpdatePartial`

The package entry `lib/index.ts` uses `export =`, and a module with `export =` cannot have other exports. So these types are not on the root import. Users import them from the declaring module, the same way the docs already show for `Item` (`import {Item} from "dynamoose/dist/Item"`):

```ts
import {ModelUpdateSettings, UpdatePartial} from "dynamoose/dist/Model";
import {AttributeDefinition, SchemaSettings} from "dynamoose/dist/Schema";
```

The PR also changes `UpdatePartial<T>` from a union to an intersection:

```ts
// Before
type UpdatePartial<T> =
  | Partial<T>
  | { $SET: Partial<T> }
  | { $ADD: Partial<T> }
  | { $REMOVE: { [K in keyof T]?: null } | string[] }
  | { $DELETE: Partial<T> };

// After
export type UpdatePartial<T> = Partial<T> & {
	$SET?: Partial<T>;
	$ADD?: Partial<T>;
	$REMOVE?: { [K in keyof T]?: null } | string[];
	$DELETE?: Partial<T>;
};
```

`Model.update` accepts one object that holds plain attributes and several operators at runtime. With the union, an update object declared with the type and built step by step is narrowed to `Partial<T>`, and assigning `$SET`, `$ADD` or `$REMOVE` to it fails with `Property '$SET' does not exist on type 'Partial<User>'`. The intersection fixes that. Operator values are still checked against `T` (a type test pins this).

Note: an object literal that mixes operators, for example `Model.update(key, {"$SET": {...}, "$ADD": {...}})` or a plain attribute together with `$REMOVE`, already compiles with the union. The only failure is the step-by-step case above.

Docs: added a FAQ entry to the TypeScript page that shows how to import these types. Changelog: one Features line and one Bug Fixes line in `PENDING_CHANGELOG.md`.


### Code sample:

#### General
```ts
import * as dynamoose from "dynamoose";
import {Item} from "dynamoose/dist/Item";
import {ModelUpdateSettings, UpdatePartial} from "dynamoose/dist/Model";

class Cat extends Item {
	id: number;
	name: string;
	lives: number;
}
const CatModel = dynamoose.model<Cat>("Cat", {"id": Number, "name": String, "lives": Number});

const update: UpdatePartial<Cat> = {"name": "Bob"};
update.$ADD = {"lives": -1}; // Before: error TS2339, Property '$ADD' does not exist on type 'Partial<Cat>'
const settings: ModelUpdateSettings = {"returnValues": "ALL_NEW"}; // Before: error TS2459, declared locally but not exported
await CatModel.update({"id": 1}, update, settings);
```


### Other information:

Type tests added to `test/types/Model.ts` and `test/types/Schema.ts`. They import and use each exported type, build an update object step by step, and check that a wrong operator value type is still rejected (`@ts-expect-error`).

Results of `npm run test:types`:
- On `main` without the lib changes: fails. TS2459 (declared locally but not exported) for all 16 types, and TS2322 at the `batchGet` call that uses the unresolved settings type.
- With the exports but `UpdatePartial` kept as a union: fails with TS2339 at the three operator assignments of the step-by-step update object.
- With this PR: passes.

I do not think the union to intersection change is breaking: every call shape that compiled before still compiles, and the wrong-value cases that failed before still fail. I selected "I'm not sure" because type changes can affect inference in user code that I cannot see.


### Type (select 1):
- [ ] Bug fix
- [x] Feature implementation
- [ ] Documentation improvement
- [ ] Testing improvement
- [ ] Test added to report bug (GitHub issue #---- @---)
- [ ] Something not listed here


### Is this a breaking change? (select 1):
- [ ] 🚨 YES 🚨
- [ ] No
- [x] I'm not sure


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

Compare: https://github.com/dynamoose/dynamoose/compare/main...MONEI:dynamoose:upstream-pr/types-export?expand=1
