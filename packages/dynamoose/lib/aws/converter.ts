import * as DynamoDBUtil from "@aws-sdk/util-dynamodb";

type ConverterType = {
	marshall: typeof DynamoDBUtil.marshall;
	unmarshall: typeof DynamoDBUtil.unmarshall;
	convertToAttr: typeof DynamoDBUtil.convertToAttr;
	convertToNative: typeof DynamoDBUtil.convertToNative;
};

// Fast path for primitive type conversions
// These match AWS SDK behavior exactly but avoid function call overhead
const fastConvertToAttr = (value: any): any => {
	// Handle primitive types with fast paths
	const type = typeof value;

	// String fast path
	if (type === "string") {
		return {"S": value};
	}

	// Number fast path (including NaN and Infinity handling)
	if (type === "number") {
		// AWS SDK converts NaN and Infinity to strings
		if (Number.isNaN(value) || !Number.isFinite(value)) {
			return {"S": String(value)};
		}
		return {"N": String(value)};
	}

	// Boolean fast path
	if (type === "boolean") {
		return {"BOOL": value};
	}

	// Null/undefined fast path
	if (value === null || value === undefined) {
		return {"NULL": true};
	}

	// For all other types (objects, arrays, dates, etc.), use the full converter
	return DynamoDBUtil.convertToAttr(value);
};

let customConverter: ConverterType | undefined;
const defaultConverter: ConverterType = {
	"marshall": DynamoDBUtil.marshall,
	"unmarshall": DynamoDBUtil.unmarshall,
	"convertToAttr": fastConvertToAttr, // Use fast path version
	"convertToNative": DynamoDBUtil.convertToNative
};
function main (): ConverterType {
	return customConverter || defaultConverter;
}
main.set = (converter: ConverterType): void => {
	customConverter = converter;
};
main.revert = (): void => {
	customConverter = undefined;
};

export default main;
