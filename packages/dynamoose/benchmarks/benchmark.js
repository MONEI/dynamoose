// CPU-only benchmark: runs the same operations through the current build (`dist`) and the published
// baseline (`dynamoose-baseline`) in one process, against a stub DynamoDB client that never touches
// the network. Usage: node --expose-gc benchmarks/benchmark.js [--quick] [--json <file>]
const fs = require("fs");
const {performance} = require("perf_hooks");
const {createSmallSchema, createMediumSchema, createLargeSchema, createExtraLargeSchema} = require("./schemas");

// Test data generators for different schema types
function generateTestData (schemaType) {
	switch (schemaType) {
	case "small":
		return {
			"id": `small-${Date.now()}-${Math.random()}`,
			"name": "Test User",
			"email": "test@example.com",
			"age": 25,
			"active": true
		};

	case "medium":
		return {
			"id": `medium-${Date.now()}-${Math.random()}`,
			"name": "John Doe",
			"email": "john.doe@example.com",
			"profile": {
				"firstName": "John",
				"lastName": "Doe",
				"age": 30
			},
			"preferences": {
				"theme": "dark",
				"notifications": true,
				"language": "en"
			},
			"tags": ["user", "premium", "verified"],
			"metadata": {
				"source": "web",
				"campaign": "signup_2024"
			},
			"version": 1,
			"createdAt": new Date(),
			"updatedAt": new Date()
		};

	case "large":
		return {
			"id": `large-${Date.now()}-${Math.random()}`,
			"userId": `user-${Math.random()}`,
			"personalInfo": {
				"firstName": "John",
				"lastName": "Doe",
				"dateOfBirth": new Date("1990-01-01"),
				"gender": "male",
				"nationality": "US",
				"languages": ["English", "Spanish"]
			},
			"contactInfo": {
				"primaryEmail": "john.doe@example.com",
				"secondaryEmail": "john.personal@example.com",
				"phoneNumbers": [{
					"type": "mobile",
					"number": "+1234567890",
					"countryCode": "+1",
					"isPrimary": true
				}],
				"addresses": [{
					"type": "home",
					"street": "123 Main St",
					"city": "New York",
					"state": "NY",
					"zipCode": "10001",
					"country": "US",
					"isDefault": true
				}]
			},
			"professionalInfo": {
				"currentPosition": {
					"title": "Software Engineer",
					"company": "Tech Corp",
					"department": "Engineering",
					"startDate": new Date("2020-01-01"),
					"salary": 100000,
					"currency": "USD"
				},
				"workHistory": [{
					"title": "Junior Developer",
					"company": "Previous Corp",
					"startDate": new Date("2018-01-01"),
					"endDate": new Date("2019-12-31"),
					"description": "Developed web applications",
					"achievements": ["Improved performance by 20%"]
				}],
				"skills": [{
					"name": "JavaScript",
					"level": "advanced",
					"yearsOfExperience": 5,
					"certifications": ["AWS Certified"]
				}],
				"education": [{
					"institution": "University of Technology",
					"degree": "Bachelor",
					"fieldOfStudy": "Computer Science",
					"startDate": new Date("2014-09-01"),
					"endDate": new Date("2018-05-31"),
					"gpa": 3.8,
					"honors": ["Magna Cum Laude"]
				}]
			},
			"preferences": {
				"appearance": {
					"theme": "dark",
					"fontSize": "medium",
					"colorScheme": "blue"
				},
				"notifications": {
					"email": {
						"marketing": true,
						"product": true,
						"security": true
					},
					"push": {
						"enabled": true,
						"frequency": "immediate"
					},
					"sms": {
						"enabled": false,
						"emergencyOnly": true
					}
				},
				"privacy": {
					"profileVisibility": "friends",
					"dataSharing": false,
					"analytics": true
				}
			},
			"socialConnections": {
				"linkedAccounts": [{
					"platform": "github",
					"accountId": "johndoe123",
					"username": "johndoe",
					"isVerified": true,
					"connectedAt": new Date()
				}],
				"friends": ["friend1", "friend2"],
				"followers": ["follower1"],
				"following": ["following1"]
			},
			"activityLog": [{
				"action": "login",
				"timestamp": new Date(),
				"ipAddress": "192.168.1.1",
				"userAgent": "Mozilla/5.0",
				"location": {
					"country": "US",
					"city": "New York",
					"latitude": 40.7128,
					"longitude": -74.0060
				},
				"metadata": {"source": "web"}
			}],
			"settings": {
				"security": {
					"twoFactorEnabled": false,
					"loginAlerts": true,
					"passwordChangeDate": new Date(),
					"securityQuestions": [{
						"question": "What is your pet's name?",
						"answerHash": "hashed_answer"
					}]
				},
				"billing": {
					"plan": "premium",
					"billingCycle": "monthly",
					"paymentMethods": [{
						"type": "credit_card",
						"last4": "1234",
						"expiryMonth": 12,
						"expiryYear": 2025,
						"isDefault": true
					}]
				}
			},
			"customFields": {
				"field1": "value1",
				"field2": 123,
				"field3": true,
				"field4": new Date(),
				"field5": {"nested": "object"},
				"field6": ["array", "values"],
				"field7": "value7",
				"field8": 456,
				"field9": false,
				"field10": new Date()
			},
			"metadata": {
				"version": 1,
				"source": "registration",
				"importedFrom": "legacy_system",
				"tags": ["premium", "active"],
				"flags": ["beta_user"],
				"experiments": {
					"activeExperiments": ["experiment1"],
					"completedExperiments": ["experiment2"]
				}
			},
			"audit": {
				"createdAt": new Date(),
				"createdBy": "system",
				"updatedAt": new Date(),
				"updatedBy": "user",
				"version": 1,
				"changeLog": [{
					"timestamp": new Date(),
					"userId": "admin",
					"action": "create",
					"changes": {"created": true},
					"reason": "Initial creation"
				}]
			}
		};

	case "extra-large": {
		const largeData = generateTestData("large");
		return {
			...largeData,
			"complexDataTypes": {
				"stringSet": new Set(["tag1", "tag2", "tag3"]),
				"numberSet": new Set([1, 2, 3, 4, 5]),
				"binaryData": Buffer.from("test binary data"),
				"bufferSet": new Set([Buffer.from("data1"), Buffer.from("data2")]),
				"multiType": Math.random() > 0.5 ? "stringValue" : 42,
				"nullableField": null,
				"constantValue": "EXTRA_LARGE_SCHEMA",
				"combinedIds": `${Date.now()}-combined`,
				"dateWithOptions": new Date(),
				"nestedSets": {
					"tags": new Set(["performance", "benchmark", "test"]),
					"scores": new Set([95, 87, 92])
				}
			},
			"complexAnalytics": {
				"behaviorData": [{
					"sessionId": `session-${Math.random()}`,
					"startTime": new Date(Date.now() - 3600000),
					"endTime": new Date(),
					"pageViews": [{
						"url": "/home",
						"title": "Home Page",
						"timeSpent": 120000,
						"interactions": [{
							"type": "click",
							"element": "button-cta",
							"timestamp": new Date(),
							"coordinates": {"x": 500, "y": 300}
						}]
					}],
					"deviceInfo": {
						"browser": "Chrome",
						"browserVersion": "91.0",
						"os": "macOS",
						"osVersion": "11.0",
						"device": "desktop",
						"screenResolution": "1920x1080",
						"viewport": {"width": 1920, "height": 1080}
					}
				}],
				"performanceMetrics": [{
					"timestamp": new Date(),
					"metric": "page_load_time",
					"value": 1200,
					"unit": "ms",
					"context": {"page": "/home"}
				}]
			},
			"businessData": {
				"companies": [{
					"id": "company-1",
					"name": "Tech Corp",
					"industry": "Technology",
					"size": "large",
					"revenue": 10000000,
					"employees": [{
						"id": "emp-1",
						"name": "John Doe",
						"position": "Engineer",
						"department": "Engineering",
						"reports": [{
							"id": "report-1",
							"title": "Monthly Report",
							"data": {"content": "performance report"},
							"generatedAt": new Date()
						}]
					}],
					"projects": [{
						"id": "proj-1",
						"name": "Web Platform",
						"status": "active",
						"milestones": [{
							"id": "milestone-1",
							"title": "MVP Release",
							"dueDate": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
							"tasks": [{
								"id": "task-1",
								"title": "Implement authentication",
								"assignee": "emp-1",
								"status": "in-progress",
								"priority": "high",
								"estimatedHours": 40,
								"actualHours": 35,
								"dependencies": []
							}]
						}]
					}]
				}]
			},
		};
	}

	default:
		return generateTestData("small");
	}
}

const builds = {
	"baseline": {
		"dynamoose": require("dynamoose-baseline"),
		"version": require("dynamoose-baseline/package.json").version
	},
	"current": {
		"dynamoose": require("../dist"),
		"version": require("../package.json").version
	}
};

const compositeKey = (data) => ({"id": data.id, "userId": data.userId});
const schemas = {
	"small": {
		"create": createSmallSchema,
		"data": () => generateTestData("small"),
		"key": (data) => ({"id": data.id}),
		"update": () => ({"name": "Updated Name"})
	},
	"medium": {
		"create": createMediumSchema,
		"data": () => generateTestData("medium"),
		"key": (data) => ({"id": data.id}),
		"update": () => ({"profile": {...generateTestData("medium").profile, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"profile.firstName": "Updated"}})
	},
	"large": {
		"create": createLargeSchema,
		"data": () => generateTestData("large"),
		"key": compositeKey,
		"update": () => ({"personalInfo": {...generateTestData("large").personalInfo, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"personalInfo.firstName": "Updated"}})
	},
	"extra-large": {
		"create": createExtraLargeSchema,
		"data": () => generateTestData("extra-large"),
		"key": compositeKey,
		"update": () => ({"personalInfo": {...generateTestData("extra-large").personalInfo, "firstName": "Updated"}}),
		"nestedUpdate": () => ({"$SET": {"personalInfo.firstName": "Updated"}})
	}
};

// Each operation gets a fresh input from `prepare` (not timed), then `run` is timed.
const operations = {
	"create": {
		"prepare": (s) => new s.Model(s.config.data()),
		"run": (s, item) => item.save()
	},
	"create-request": {
		"prepare": (s) => new s.Model(s.config.data()),
		"run": (s, item) => item.save({"return": "request"})
	},
	"get": {
		"prepare": (s) => s.config.key(s.reference),
		"run": (s, key) => s.Model.get(key)
	},
	"update": {
		"prepare": (s) => [s.config.key(s.reference), s.config.update()],
		"run": (s, [key, update]) => s.Model.update(key, update)
	},
	"update-nested": {
		"needs": "nestedUpdate",
		"prepare": (s) => [s.config.key(s.reference), s.config.nestedUpdate()],
		"run": (s, [key, update]) => s.Model.update(key, update)
	}
};

// Canned responses keyed by table name: what DynamoDB would return for the stored reference item.
const storedItems = {};
const stubClient = {
	"putItem": () => Promise.resolve({}),
	"getItem": (params) => Promise.resolve({"Item": storedItems[params.TableName]}),
	"updateItem": (params) => Promise.resolve({"Attributes": storedItems[params.TableName]})
};

async function setup () {
	const suites = [];
	for (const [schemaName, config] of Object.entries(schemas)) {
		const tableName = `Benchmark_${schemaName}`;
		const models = {};
		for (const [buildName, build] of Object.entries(builds)) {
			build.dynamoose.aws.ddb.set(stubClient);
			models[buildName] = build.dynamoose.model(tableName, config.create(build.dynamoose), {"create": false, "waitForActive": false});
		}
		const reference = config.data();
		const request = await new models.baseline(reference).save({"return": "request"});
		storedItems[tableName] = request.Item;
		for (const [operationName, operation] of Object.entries(operations)) {
			if (operation.needs && !config[operation.needs]) {
				continue;
			}
			suites.push({"schema": schemaName, "operation": operationName, "steps": operation, config, reference, models});
		}
	}
	return suites;
}

async function measure (suite, buildName, durationMs) {
	const state = {"Model": suite.models[buildName], "config": suite.config, "reference": suite.reference};
	let count = 0;
	let elapsed = 0;
	while (elapsed < durationMs) {
		const input = suite.steps.prepare(state);
		const start = performance.now();
		await suite.steps.run(state, input);
		elapsed += performance.now() - start;
		count++;
	}
	return count / (elapsed / 1000);
}

const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

async function run ({rounds, roundMs, warmupMs}) {
	const suites = await setup();
	const buildNames = Object.keys(builds);
	for (const suite of suites) {
		for (const buildName of buildNames) {
			await measure(suite, buildName, warmupMs);
		}
	}

	const samples = suites.map(() => ({"baseline": [], "current": []}));
	for (let round = 0; round < rounds; round++) {
		// Alternate which build goes first, so neither one always runs on a warmer heap.
		const order = round % 2 ? [...buildNames].reverse() : buildNames;
		for (const [index, suite] of suites.entries()) {
			for (const buildName of order) {
				global.gc();
				samples[index][buildName].push(await measure(suite, buildName, roundMs));
			}
		}
	}

	return suites.map((suite, index) => {
		const baseline = median(samples[index].baseline);
		const current = median(samples[index].current);
		return {
			"schema": suite.schema,
			"operation": suite.operation,
			"baseline": {"median": baseline, "samples": samples[index].baseline},
			"current": {"median": current, "samples": samples[index].current},
			"change": (current / baseline - 1) * 100
		};
	});
}

function printTable (results) {
	const rows = [["schema", "operation", "baseline ops/s", "current ops/s", "change"]];
	for (const result of results) {
		const change = `${result.change >= 0 ? "+" : ""}${result.change.toFixed(1)}%`;
		rows.push([result.schema, result.operation, result.baseline.median.toFixed(1), result.current.median.toFixed(1), change]);
	}
	const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
	for (const row of rows) {
		console.log(row.map((cell, column) => column < 2 ? cell.padEnd(widths[column]) : cell.padStart(widths[column])).join("  "));
	}
}

async function main (args) {
	if (typeof global.gc !== "function") {
		throw new Error("Run with node --expose-gc");
	}
	const quick = args.includes("--quick");
	const jsonIndex = args.indexOf("--json");
	const settings = quick ? {"rounds": 2, "roundMs": 20, "warmupMs": 20} : {"rounds": 10, "roundMs": 200, "warmupMs": 500};

	console.log(`baseline ${builds.baseline.version} vs current ${builds.current.version} (dist), node ${process.version}, ${settings.rounds} rounds of ${settings.roundMs} ms`);
	const results = await run(settings);
	printTable(results);
	if (jsonIndex !== -1) {
		const output = {"node": process.version, "builds": {"baseline": builds.baseline.version, "current": builds.current.version}, ...settings, results};
		fs.writeFileSync(args[jsonIndex + 1], JSON.stringify(output, null, "\t"));
	}
}

if (require.main === module) {
	main(process.argv.slice(2)).catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
