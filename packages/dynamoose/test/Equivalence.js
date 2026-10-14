// Runs every case of equivalence/corpus.js through the published build (dynamoose-baseline) and the
// current dist in the same process, and fails on any observable difference. Nothing is recorded to
// disk: the baseline is the published package.
const {builds, runCase} = require("../equivalence/compare");
const corpus = require("../equivalence/corpus");

describe("Equivalence with dynamoose-baseline", () => {
	beforeEach(() => {
		// Only Date is faked: timestamps, Date.now defaults and ttl values are the same on both builds.
		jest.useFakeTimers({
			"now": new Date("2026-10-14T12:00:00.000Z"),
			"doNotFake": ["hrtime", "nextTick", "performance", "queueMicrotask", "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "setImmediate", "clearImmediate", "setInterval", "clearInterval", "setTimeout", "clearTimeout"]
		});
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it("Should have unique case names", () => {
		const names = corpus.map((testCase) => testCase.name);
		expect(new Set(names).size).toEqual(names.length);
	});

	it.each(corpus.map((testCase) => [testCase.name, testCase]))("%s", async (name, testCase) => {
		const fixtures = testCase.fixtures ? testCase.fixtures() : {};
		const baseline = await runCase(builds.baseline, testCase, fixtures);
		const current = await runCase(builds.current, testCase, fixtures);

		// A case must reach its steps, and the steps a case expects to fail must fail on the baseline,
		// so that a broken case cannot pass by comparing two identical errors.
		const labels = baseline.steps.map((step) => step.label);
		expect(new Set(labels).size).toEqual(labels.length);
		const outcomes = Object.fromEntries(baseline.steps.map((step) => [step.label, step.outcome]));
		expect(outcomes.run).toEqual("resolve");
		for (const label of testCase.failing || []) {
			expect([label, outcomes[label]]).toEqual([label, expect.stringMatching(/^(throw|reject)$/)]);
		}
		for (const [label, outcome] of Object.entries(outcomes)) {
			if (!(testCase.failing || []).includes(label)) {
				expect([label, outcome]).toEqual([label, expect.stringMatching(/^(return|resolve)$/)]);
			}
		}

		expect(current.steps).toStrictEqual(baseline.steps);
		expect(current.keyOrder).toStrictEqual(baseline.keyOrder);
	});
});
