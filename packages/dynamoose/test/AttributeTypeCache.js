const dynamoose = require("../dist");

// Known bug, pinned with it.failing so the suite stays green and a fix turns these tests red (then
// change them to it): Model.update caches the DynamoDB type per
// `${attribute}|${typeof value}` (attributeTypeCache). For an attribute the schema does not declare,
// the type comes from the value, and a Set, an array and an object share typeof "object". The first
// update on a model then decides the type of later updates. Upstream and a fresh model write the
// value's own type. A fix changes requests, so it waits for the user's decision.
// See docs/plans/20261014-schema-lookup-cache.md, Task 8.
describe("Model.update attributeTypeCache for saveUnknown attributes", () => {
	const model = (name) => dynamoose.model(name, new dynamoose.Schema({"id": String}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
	const values = async (Model, update) => (await Model.update({"id": "1"}, update, {"return": "request"})).ExpressionAttributeValues;

	it.failing("Should write an array as a list after a Set update on the same model (fails: known bug, plan Task 8)", async () => {
		const Model = model("AttributeTypeCacheSetThenList");
		expect(await values(Model, {"tags": new Set(["a"])})).toEqual({":v0": {"SS": ["a"]}});
		expect(await values(Model, {"tags": ["a", "b"]})).toEqual({":v0": {"L": [{"S": "a"}, {"S": "b"}]}});
	});

	it.failing("Should write a Set as a string set after an array update on the same model (fails: known bug, plan Task 8)", async () => {
		const Model = model("AttributeTypeCacheListThenSet");
		expect(await values(Model, {"tags": ["a", "b"]})).toEqual({":v0": {"L": [{"S": "a"}, {"S": "b"}]}});
		expect(await values(Model, {"tags": new Set(["a"])})).toEqual({":v0": {"SS": ["a"]}});
	});
});
