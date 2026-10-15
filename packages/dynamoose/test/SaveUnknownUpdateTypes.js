const dynamoose = require("../dist");

// Regression tests for a bug the fork had until its Model.update caches were removed: the DynamoDB type of
// an attribute the schema does not declare was cached per `${attribute}|${typeof value}`, so the first
// update on a model decided the type of later updates (a Set, an array and an object share typeof "object").
describe("Model.update types of saveUnknown attributes", () => {
	const model = (name) => dynamoose.model(name, new dynamoose.Schema({"id": String}, {"saveUnknown": true}), {"create": false, "waitForActive": false});
	const values = async (Model, update) => (await Model.update({"id": "1"}, update, {"return": "request"})).ExpressionAttributeValues;

	it("Should write an array as a list after a Set update on the same model", async () => {
		const Model = model("AttributeTypeCacheSetThenList");
		expect(await values(Model, {"tags": new Set(["a"])})).toEqual({":v0": {"SS": ["a"]}});
		expect(await values(Model, {"tags": ["a", "b"]})).toEqual({":v0": {"L": [{"S": "a"}, {"S": "b"}]}});
	});

	it("Should write a Set as a string set after an array update on the same model", async () => {
		const Model = model("AttributeTypeCacheListThenSet");
		expect(await values(Model, {"tags": ["a", "b"]})).toEqual({":v0": {"L": [{"S": "a"}, {"S": "b"}]}});
		expect(await values(Model, {"tags": new Set(["a"])})).toEqual({":v0": {"SS": ["a"]}});
	});
});
