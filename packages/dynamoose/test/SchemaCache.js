const dynamoose = require("../dist");
const Internal = require("../dist/Internal").default;
const {internalProperties} = Internal.General;

// The lookup cache must never change what a lookup returns. test/Equivalence.js compares whole
// operations with dynamoose-baseline; these tests pin the cache rules that a corpus case can miss.
describe("Schema lookup cache", () => {
	const lookupCache = (schema) => schema.getInternalProperties(internalProperties).lookupCache;
	const model = (name, schema, options = {}) => dynamoose.model(name, schema, {"create": false, "waitForActive": false, ...options});

	it("Should return the same type details object on a second lookup", () => {
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}});
		const first = schema.getAttributeTypeDetails("address.city");
		expect(first.name).toEqual("String");
		expect(schema.getAttributeTypeDetails("address.city")).toBe(first);
	});

	it("Should return the same attribute definition for paths with different list indexes", () => {
		const schema = new dynamoose.Schema({"id": String, "lines": {"type": Array, "schema": [{"type": Object, "schema": {"sku": String}}]}});
		expect(schema.getAttributeValue("lines.3.sku")).toBe(schema.getAttributeValue("lines.0.sku"));
		expect(schema.getAttributeTypeDetails("lines.7.sku")).toBe(schema.getAttributeTypeDetails("lines.0.sku"));
	});

	// attributes() returned a new array on every call before the cache; a caller that changes the
	// array must not change the next result.
	it("Should return a new attributes array on every call", () => {
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}});
		const first = schema.attributes();
		first.push("changed");
		expect(schema.attributes()).toEqual(["id", "address", "address.city"]);
		expect(schema.attributes()).not.toBe(schema.attributes());
	});

	it("Should add the ttl attribute after a lookup when an explicit table sets expires", async () => {
		const schema = new dynamoose.Schema({"id": String});
		expect(schema.attributes()).toEqual(["id"]);
		expect(() => schema.getAttributeTypeDetails("ttl")).toThrow("Invalid Attribute: ttl");
		const Cat = model("CacheCat", schema);
		new dynamoose.Table("CacheCatTable", [Cat], {"expires": 1000, "initialize": false});

		expect(schema.attributes()).toEqual(["id", "ttl"]);
		expect(schema.getAttributeTypeDetails("ttl").name).toEqual("Date");
		const request = await Cat.create({"id": "1"}, {"return": "request"});
		expect(Object.keys(request.Item)).toEqual(["id", "ttl"]);
	});

	it("Should add the ttl attribute when the model's own table is made after the lookups", async () => {
		const schema = new dynamoose.Schema({"id": String});
		const Cat = model("CacheLazyCat", schema, {"expires": {"ttl": 1000, "attribute": "expiresAt"}});
		expect(schema.attributes()).toEqual(["id"]);

		const request = await Cat.create({"id": "1"}, {"return": "request"});
		expect(Object.keys(request.Item)).toEqual(["id", "expiresAt"]);
		expect(schema.attributes()).toEqual(["id", "expiresAt"]);
	});

	// The nested schema's attributes object is shared, so the ttl write reaches the outer schema too.
	it("Should add the ttl attribute to a schema that nests the schema the table changes", () => {
		const inner = new dynamoose.Schema({"id": String});
		const outer = new dynamoose.Schema({"id": String, "sub": inner});
		expect(outer.attributes()).toEqual(["id", "sub", "sub.id"]);
		new dynamoose.Table("CacheNestedTable", [model("CacheNested", inner)], {"expires": 1000, "initialize": false});

		expect(outer.attributes()).toEqual(["id", "sub", "sub.id", "sub.ttl"]);
		expect(outer.getAttributeTypeDetails("sub.ttl").name).toEqual("Date");
	});

	describe("Array of attribute definitions", () => {
		const schema = () => new dynamoose.Schema({
			"id": String,
			"data": [
				{"type": Object, "schema": {"a": String}},
				{"type": Object, "schema": {"b": Number}}
			]
		});

		it("Should use the typeIndexOptionMap after a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeValue("data.b")).toEqual(Number);
			expect(value.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 0}})).toBeUndefined();
			expect(value.getAttributeValue("data.b", {"typeIndexOptionMap": {"data": 1}})).toEqual(Number);
			expect(value.getAttributeValue("data", {"typeIndexOptionMap": {"data": 1}})).toBe(value.getAttributeValue("data")[1]);
		});

		it("Should not reuse a result computed with a typeIndexOptionMap for a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeValue("data", {"typeIndexOptionMap": {"data": 0}})).toEqual({"type": Object, "schema": {"a": String}});
			expect(value.getAttributeValue("data")).toHaveLength(2);
		});

		it("Should use the typeIndexOptionMap for type details after a lookup without one", () => {
			const value = schema();
			expect(value.getAttributeTypeDetails("data.b").name).toEqual("Number");
			expect(() => value.getAttributeTypeDetails("data.b", {"typeIndexOptionMap": {"data": 0}})).toThrow("Invalid Attribute: data.b");
			expect(value.getAttributeTypeDetails("data", {"typeIndexOptionMap": {"data": 1}})).toHaveProperty("name", "Object");
		});
	});

	// Keys allowed by saveUnknown come from outside input; caching misses would grow without bound.
	it("Should add no entry for a miss or a thrown error", () => {
		const schema = new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}}, {"saveUnknown": true});
		const sizes = () => [lookupCache(schema)?.values?.size ?? 0, lookupCache(schema)?.typeDetails?.size ?? 0];
		const before = sizes();

		expect(schema.getAttributeValue("unknown")).toBeUndefined();
		expect(() => schema.getAttributeValue("unknown.deeper")).toThrow(TypeError);
		expect(() => schema.getAttributeTypeDetails("unknown")).toThrow("Invalid Attribute: unknown");
		expect(() => schema.getAttributeTypeDetails("address.unknown")).toThrow("Invalid Attribute: address.unknown");
		expect(sizes()).toEqual(before);
	});

	it("Should call a function default on every call", async () => {
		const defaultFunction = jest.fn(() => "generated");
		const Cat = model("CacheDefault", {"id": String, "name": {"type": String, "default": defaultFunction}});
		const first = await Cat.create({"id": "1"}, {"return": "request"});
		const second = await Cat.create({"id": "2"}, {"return": "request"});
		expect([first.Item.name, second.Item.name]).toEqual([{"S": "generated"}, {"S": "generated"}]);
		expect(defaultFunction).toHaveBeenCalledTimes(2);
	});

	it("Should never share entries between two schemas", () => {
		const first = new dynamoose.Schema({"id": String, "data": String});
		const second = new dynamoose.Schema({"id": String, "data": Number});
		expect(first.getAttributeTypeDetails("data").name).toEqual("String");
		expect(second.getAttributeTypeDetails("data").name).toEqual("Number");
		expect(first.getAttributeValue("data")).toEqual(String);
		expect(second.getAttributeValue("data")).toEqual(Number);
	});

	// A plain object cache would return Object.prototype members for these keys.
	describe("Keys named like Object.prototype members", () => {
		const schema = () => new dynamoose.Schema({"id": String, "address": {"type": Object, "schema": {"city": String}}}, {"saveUnknown": true});

		it("Should resolve constructor through the attributes object, as without the cache", () => {
			const value = schema();
			expect(value.getAttributeValue("constructor")).toBe(Object);
			expect(value.getAttributeValue("address.constructor")).toBe(Object);
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Object");
			expect(value.getAttributeValue("constructor")).toBe(Object);
		});

		it("Should resolve __proto__ through the attributes object, as without the cache", () => {
			const value = schema();
			expect(value.getAttributeValue("__proto__")).toBe(Object.prototype);
			expect(() => value.getAttributeTypeDetails("__proto__")).toThrow(TypeError);
			expect(() => value.getAttributeTypeDetails("__proto__")).toThrow(TypeError);
			expect(value.getAttributeValue("__proto__")).toBe(Object.prototype);
		});

		it("Should add no entry for a key the attributes object only inherits", () => {
			const value = schema();
			value.getAttributeValue("constructor");
			value.getAttributeValue("address.toString");
			value.getAttributeTypeDetails("constructor");
			expect(lookupCache(value)?.values?.has("constructor") ?? false).toEqual(false);
			expect(lookupCache(value)?.values?.has("address.toString") ?? false).toEqual(false);
			expect(lookupCache(value)?.typeDetails?.has("constructor") ?? false).toEqual(false);
		});

		it("Should resolve an attribute named constructor that the schema defines", () => {
			const value = new dynamoose.Schema({"id": String, "constructor": Number});
			expect(value.getAttributeValue("constructor")).toEqual(Number);
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Number");
			expect(value.getAttributeTypeDetails("constructor").name).toEqual("Number");
		});
	});
});
