const {gateVerdict} = require("./benchmark");

// Samples are ops/s per round. The gate must fail a real slowdown and pass runner noise.
describe("gateVerdict", () => {
	const baseline = [100, 101, 99, 102, 98, 100, 101, 99, 100, 100];

	it("fails a 20% slowdown that every round shows", () => {
		expect(gateVerdict(baseline, [80, 81, 79, 82, 78, 80, 81, 79, 80, 80]).slower).toBe(true);
	});

	it("passes a 20% median slowdown when the rounds overlap (noise)", () => {
		expect(gateVerdict([100, 60, 140, 100, 60, 140, 100, 60, 140, 100], [80, 140, 60, 80, 140, 60, 80, 140, 60, 80]).slower).toBe(false);
	});

	it("passes a significant slowdown of 15% or less", () => {
		expect(gateVerdict(baseline, [90, 91, 89, 92, 88, 90, 91, 89, 90, 90]).slower).toBe(false);
	});
});
