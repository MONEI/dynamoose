const {execFileSync} = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

describe("benchmark --quick", () => {
	let output;
	beforeAll(() => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-benchmark-"));
		const jsonFile = path.join(directory, "results.json");
		execFileSync(process.execPath, ["--expose-gc", path.join(__dirname, "benchmark.js"), "--quick", "--json", jsonFile], {"stdio": "pipe"});
		output = JSON.parse(fs.readFileSync(jsonFile, "utf8"));
		fs.rmSync(directory, {"recursive": true});
	});

	// A dropped operation or an operation that never ran would make a comparison silently incomplete.
	it("reports every operation of every schema", () => {
		expect(output.results.map((result) => `${result.schema} ${result.operation}`)).toEqual([
			"small create",
			"small create-request",
			"small get",
			"small update",
			"medium create",
			"medium create-request",
			"medium get",
			"medium update",
			"medium update-nested",
			"large create",
			"large create-request",
			"large get",
			"large update",
			"large update-nested",
			"extra-large create",
			"extra-large create-request",
			"extra-large get",
			"extra-large update",
			"extra-large update-nested"
		]);
	});

	it("reports a positive finite ops/s for both builds", () => {
		for (const result of output.results) {
			for (const build of ["baseline", "current"]) {
				expect(Number.isFinite(result[build].median) && result[build].median > 0).toBe(true);
			}
		}
	});
});
