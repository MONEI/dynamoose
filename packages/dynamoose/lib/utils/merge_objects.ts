// This function is used to merge objects for combining multiple responses.

import {GeneralObject} from "js-object-utilities";
import {ArrayItemsMerger} from "../Types";
import keyBy from "./keyBy";

enum MergeObjectsCombineMethod {
	ObjectCombine = "object_combine",
	ArrayMerge = "array_merge",
	ArrayMergeNewArray = "array_merge_new_array"
}

interface MergeObjectsSettings {
	combineMethod: MergeObjectsCombineMethod;
	arrayItemsMerger?: ArrayItemsMerger;
}

const main = (settings: MergeObjectsSettings = {"combineMethod": MergeObjectsCombineMethod.ArrayMerge}) => <T>(...args: GeneralObject<T>[]): GeneralObject<T> => {
	let returnObject: { [x: string]: any };

	args.forEach((arg, index) => {
		if (typeof arg !== "object") {
			throw new Error("You can only pass objects into merge_objects method.");
		}

		if (index === 0) {
			returnObject = arg;
		} else {
			if (Array.isArray(returnObject) !== Array.isArray(arg)) {
				throw new Error("You can't mix value types for the merge_objects method.");
			}

			Object.keys(arg).forEach((key) => {
				if (typeof returnObject[key] === "object" && typeof arg[key] === "object" && !Array.isArray(returnObject[key]) && !Array.isArray(arg[key]) && returnObject[key] !== null) {
					if (settings.combineMethod === MergeObjectsCombineMethod.ObjectCombine) {
						returnObject[key] = {...returnObject[key], ...arg[key]};
					} else if (settings.combineMethod === MergeObjectsCombineMethod.ArrayMergeNewArray) {
						returnObject[key] = main(settings)(returnObject[key], arg[key] as any);
					} else {
						returnObject[key] = [returnObject[key], arg[key]];
					}
				} else if (Array.isArray(returnObject[key]) && Array.isArray(arg[key])) {
					returnObject[key] = settings.arrayItemsMerger ? settings.arrayItemsMerger(returnObject[key], arg[key] as any) : [...returnObject[key], ...(arg[key] as any)];
				} else if (Array.isArray(returnObject[key])) {
					returnObject[key] = [...returnObject[key], arg[key]];
				} else if (returnObject[key]) {
					if (settings.combineMethod === MergeObjectsCombineMethod.ArrayMergeNewArray) {
						returnObject[key] = [returnObject[key], arg[key]];
					} else if (typeof returnObject[key] === "number") {
						(returnObject[key] as number) += (arg[key] as number);
					} else {
						returnObject[key] = arg[key];
					}
				} else {
					returnObject[key] = arg[key];
				}
			});
		}
	});

	return returnObject;
};

const schemaAttributesMerger: ArrayItemsMerger = (target, source) => {
	if (!target.length && !source.length) {
		return [];
	}

	const firstElement = target[0] || source[0];

	const keyByIteratee = "AttributeName" in firstElement ? "AttributeName" : "IndexName";

	const targetKeyBy = keyBy(target, keyByIteratee);
	const sourceKeyBy = keyBy(source, keyByIteratee);
	const merged = main({"combineMethod": MergeObjectsCombineMethod.ObjectCombine})<(typeof target)[0]>({}, targetKeyBy, sourceKeyBy);

	return Object.values(merged);
};

const returnObject: any = main();
returnObject.main = main;
returnObject.MergeObjectsCombineMethod = MergeObjectsCombineMethod;
returnObject.schemaAttributesMerger = schemaAttributesMerger;

export = returnObject;
