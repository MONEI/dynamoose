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
			"extra-large update-nested",
			"checkout create",
			"checkout create-request",
			"checkout get",
			"checkout update",
			"checkout update-nested"
		]);
	});

	it("reports every stage of every schema", () => {
		const stages = ["getAttributeValue", "getAttributeTypeDetails", "attributes", "getTypePaths", "objectFromSchema-toDynamo", "objectFromSchema-fromDynamo", "save-conform"];
		const schemas = ["small", "medium", "large", "extra-large", "checkout"];
		expect(output.stages.map((result) => `${result.schema} ${result.operation}`)).toEqual(schemas.flatMap((schema) => stages.map((stage) => `${schema} ${stage}`)));
	});

	it("reports a positive finite ops/s for both builds", () => {
		for (const result of [...output.results, ...output.stages]) {
			for (const build of ["baseline", "current"]) {
				expect(Number.isFinite(result[build].median) && result[build].median > 0).toBe(true);
			}
		}
	});
});

describe("benchmark --profile", () => {
	let directory;
	let stdout;
	let profileFile;
	beforeAll(() => {
		directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-profile-"));
		profileFile = path.join(directory, "update.cpuprofile");
		stdout = execFileSync(process.execPath, ["--expose-gc", path.join(__dirname, "benchmark.js"), "--profile", "update", "large", "--quick", "--out", profileFile], {"encoding": "utf8"});
	});
	afterAll(() => {
		fs.rmSync(directory, {"recursive": true});
	});

	it("writes a CPU profile with samples", () => {
		const profile = JSON.parse(fs.readFileSync(profileFile, "utf8"));
		expect(profile.nodes.length).toBeGreaterThan(1);
		expect(profile.samples.length).toBeGreaterThan(0);
	});

	// The profile must cover the operation of the chosen build: the current build's Schema.js does the
	// lookups of an update, so it must show up among the functions and the files.
	it("prints functions and files of the profiled build", () => {
		const section = (title) => stdout.split(`\n${title}\n`)[1].split("\n\n")[0];
		expect(section("top functions by self time")).toMatch(/ dist\/Schema\.js:\d+/);
		expect(section("top functions by total time")).toMatch(/Item\.objectFromSchema +dist\/Item\.js:\d+/);
		expect(section("self time per file")).toMatch(/ dist\/Schema\.js$/m);
	});
});

// The live run of common's schema goes through EXTRA_SCHEMA; a module it cannot load must not pass
// unnoticed as a run without that schema.
describe("benchmark EXTRA_SCHEMA", () => {
	it("runs an operation on the extra schema", () => {
		const directory = fs.mkdtempSync(path.join(os.tmpdir(), "dynamoose-extra-"));
		const moduleFile = path.join(directory, "extra.js");
		fs.writeFileSync(moduleFile, `module.exports = {...require(${JSON.stringify(path.join(__dirname, "fixtures", "checkout-schema.js"))}), "name": "extra"};`);
		const stdout = execFileSync(process.execPath, ["--expose-gc", path.join(__dirname, "benchmark.js"), "--profile", "create-request", "extra", "--quick", "--out", path.join(directory, "extra.cpuprofile")], {"encoding": "utf8", "env": {...process.env, "EXTRA_SCHEMA": moduleFile}});
		fs.rmSync(directory, {"recursive": true});
		expect(stdout).toMatch(/^create-request on extra, current build /);
	});
});
