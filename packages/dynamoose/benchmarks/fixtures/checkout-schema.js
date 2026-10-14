// Dynamoose schema of the operations ("checkouts") table of @monei/common: `OperationModel`, the model
// behind `monei-<stage>-checkoutsTable`. common has no model named `CheckoutModel`.
//
// Generated once on 2026-10-14 from @monei/common 11.9.0 (34fde00c). A tsx script ran what
// `createModel("checkouts", operationSchema)` passes to `new dynamoose.Schema`:
//   const {schema, saveUnknown} = toSchemaDef(operationSchema);
//   definition = schema without createdAt and updatedAt (timestamps are on);
//   settings = {saveUnknown, "timestamps": extractTimestamps(operationSchema)};
// and printed the result as JavaScript. Types, nesting, `required` (also `required: undefined`),
// `enum`, `index`, `hashKey`, `saveUnknown` and the Date storage of the timestamps are kept as
// generated.
//
// common's function settings call zod `safeParse`. This fork must not depend on zod, so each one is
// a plain function below that accepts the same values, with one exception: `isSafeString` checks for
// `<` and `>` where common runs the `xss` sanitizer. The fixture lacks the cost of zod and `xss` in
// the `validate` calls, so it underestimates prod. Decisions use a live run of the real schema
// (EXTRA_SCHEMA, see benchmarks/README.md); the CI gate uses this fixture.
const crypto = require("crypto");

const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
// `z.custom<IOperationCommonData>()` without a check accepts every value.
const acceptAny = () => true;
const isSafeString = (value) => typeof value === "string" && !/[<>]/.test(value);
const isCountryCode = (value) => typeof value === "string" && (!value || /^[A-Z]{2}$/.test(value));
const isSessionId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(value);
const isPointOfSaleId = (value) => typeof value === "string" && /^[0-9a-fA-F]{40}$/.test(value);
const isInstallmentSelection = (value) => isRecord(value) &&
	[true, false, "true", "false"].includes(value.financingAccept) &&
	(value.quotaNum === undefined || !Number.isNaN(Number(value.quotaNum))) &&
	(value.installmentType === undefined || typeof value.installmentType === "string");
// zod output of `installmentSelectionStoredSchema`: unknown keys dropped, financingAccept a boolean.
function conformInstallmentSelection (value) {
	if (!isInstallmentSelection(value)) {
		return value;
	}
	const data = {"financingAccept": value.financingAccept === true || value.financingAccept === "true"};
	if (value.quotaNum !== undefined) {
		data.quotaNum = Number(value.quotaNum);
	}
	if (value.installmentType !== undefined) {
		data.installmentType = value.installmentType;
	}
	return data;
}

const createCheckoutSchema = (dynamoose) => new dynamoose.Schema(
	{
		"id": {
			"type": String,
			"required": true,
			"hashKey": true
		},
		"transactionId": {
			"type": String,
			"required": true,
			"index": {
				"name": "transactionId-index",
				"type": "global"
			}
		},
		"transactionType": {
			"type": String,
			"enum": ["AUTH", "SALE", "REFUND", "CAPTURE", "CANCEL", "PAYOUT", "VERIF"],
			"required": true
		},
		"sessionId": {
			"type": String,
			"required": undefined
		},
		"partnerOrderId": {
			"type": String,
			"required": undefined
		},
		"storeId": {
			"type": String,
			"required": undefined
		},
		"pointOfSaleId": {
			"type": String,
			"required": undefined,
			"validate": isPointOfSaleId
		},
		"terminalId": {
			"type": String,
			"required": undefined
		},
		"status": {
			"type": String,
			"enum": ["PENDING", "PENDING_PROVIDER", "FRICTIONLESS_CHALLENGED", "CHALLENGED", "AUTHORIZED", "PRE_AUTHORIZED", "CONFIRMED", "REFUNDED", "CANCELED", "FAILED", "EXPIRED", "PAID_OUT"],
			"required": true
		},
		"statusCode": {
			"type": String,
			"required": undefined
		},
		"statusMessage": {
			"type": String,
			"required": undefined
		},
		"providerStatusCode": {
			"type": String,
			"required": undefined
		},
		"providerStatusMessage": {
			"type": String,
			"required": undefined
		},
		"issuerStatusCode": {
			"type": String,
			"required": undefined
		},
		"issuerStatusMessage": {
			"type": String,
			"required": undefined
		},
		"accountId": {
			"type": String,
			"required": true,
			"index": {
				"name": "partnerOrderId-index",
				"type": "global",
				"rangeKey": "partnerOrderId"
			}
		},
		"providerId": {
			"type": String,
			"required": undefined
		},
		"sequenceId": {
			"type": String,
			"required": undefined
		},
		"subscriptionId": {
			"type": String,
			"required": undefined
		},
		"relatedOperations": {
			"type": Set,
			"required": undefined,
			"schema": [
				{
					"type": String,
					"required": true
				}
			]
		},
		"lastRefundId": {
			"type": String,
			"required": undefined
		},
		"originCheckoutId": {
			"type": String,
			"required": undefined
		},
		"lastCaptureId": {
			"type": String,
			"required": undefined
		},
		"lastVoidId": {
			"type": String,
			"required": undefined
		},
		"lastCancelId": {
			"type": String,
			"required": undefined
		},
		"tokenId": {
			"type": String,
			"required": undefined
		},
		"stickyTokenId": {
			"type": String,
			"required": undefined
		},
		"generatePaymentToken": {
			"type": Boolean,
			"required": undefined
		},
		"partnerTranslationId": {
			"type": String,
			"required": undefined
		},
		"autoRegenerate": {
			"type": Boolean,
			"required": undefined
		},
		"commonData": {
			"type": Object,
			"required": true,
			"validate": acceptAny
		},
		"sessionDetails": {
			"type": Object,
			"required": undefined,
			"schema": {
				"ip": {
					"type": [String],
					"required": undefined
				},
				"userAgent": {
					"type": String,
					"required": undefined,
					"validate": isSafeString
				},
				"comment": {
					"type": String,
					"required": undefined,
					"validate": isSafeString
				},
				"countryCode": {
					"type": String,
					"required": undefined,
					"validate": isCountryCode
				},
				"lang": {
					"type": String,
					"required": undefined
				},
				"deviceType": {
					"type": String,
					"enum": ["desktop", "mobile", "smartTV", "tablet"],
					"required": undefined
				},
				"deviceModel": {
					"type": String,
					"required": undefined
				},
				"browser": {
					"type": String,
					"required": undefined
				},
				"browserVersion": {
					"type": String,
					"required": undefined
				},
				"browserAccept": {
					"type": String,
					"required": undefined
				},
				"os": {
					"type": String,
					"required": undefined
				},
				"osVersion": {
					"type": String,
					"required": undefined
				},
				"source": {
					"type": String,
					"required": undefined
				},
				"sourceVersion": {
					"type": String,
					"required": undefined
				},
				"browserColorDepth": {
					"type": String,
					"required": undefined
				},
				"browserScreenHeight": {
					"type": String,
					"required": undefined
				},
				"browserScreenWidth": {
					"type": String,
					"required": undefined
				},
				"browserTimezoneOffset": {
					"type": String,
					"required": undefined
				},
				"browserTimezoneName": {
					"type": String,
					"required": undefined
				},
				"browserDevicePixelRatio": {
					"type": String,
					"required": undefined
				},
				"browserHardwareConcurrency": {
					"type": String,
					"required": undefined
				},
				"browserDeviceMemory": {
					"type": String,
					"required": undefined
				},
				"browserMaxTouchPoints": {
					"type": String,
					"required": undefined
				},
				"browserPlatform": {
					"type": String,
					"required": undefined
				},
				"browserLanguages": {
					"type": String,
					"required": undefined
				},
				"fingerprint": {
					"type": String,
					"required": undefined
				},
				"sessionId": {
					"type": String,
					"required": undefined,
					"validate": isSessionId
				}
			}
		},
		"traceDetails": {
			"type": Object,
			"required": undefined,
			"schema": {
				"ip": {
					"type": [String],
					"required": undefined
				},
				"userAgent": {
					"type": String,
					"required": undefined,
					"validate": isSafeString
				},
				"comment": {
					"type": String,
					"required": undefined,
					"validate": isSafeString
				},
				"countryCode": {
					"type": String,
					"required": undefined,
					"validate": isCountryCode
				},
				"lang": {
					"type": String,
					"required": undefined
				},
				"deviceType": {
					"type": String,
					"enum": ["desktop", "mobile", "smartTV", "tablet"],
					"required": undefined
				},
				"deviceModel": {
					"type": String,
					"required": undefined
				},
				"browser": {
					"type": String,
					"required": undefined
				},
				"browserVersion": {
					"type": String,
					"required": undefined
				},
				"browserAccept": {
					"type": String,
					"required": undefined
				},
				"os": {
					"type": String,
					"required": undefined
				},
				"osVersion": {
					"type": String,
					"required": undefined
				},
				"source": {
					"type": String,
					"required": undefined
				},
				"sourceVersion": {
					"type": String,
					"required": undefined
				},
				"browserColorDepth": {
					"type": String,
					"required": undefined
				},
				"browserScreenHeight": {
					"type": String,
					"required": undefined
				},
				"browserScreenWidth": {
					"type": String,
					"required": undefined
				},
				"browserTimezoneOffset": {
					"type": String,
					"required": undefined
				},
				"browserTimezoneName": {
					"type": String,
					"required": undefined
				},
				"browserDevicePixelRatio": {
					"type": String,
					"required": undefined
				},
				"browserHardwareConcurrency": {
					"type": String,
					"required": undefined
				},
				"browserDeviceMemory": {
					"type": String,
					"required": undefined
				},
				"browserMaxTouchPoints": {
					"type": String,
					"required": undefined
				},
				"browserPlatform": {
					"type": String,
					"required": undefined
				},
				"browserLanguages": {
					"type": String,
					"required": undefined
				},
				"fingerprint": {
					"type": String,
					"required": undefined
				},
				"sessionId": {
					"type": String,
					"required": undefined,
					"validate": isSessionId
				},
				"apiKey": {
					"type": String,
					"required": undefined
				},
				"masterApiKey": {
					"type": String,
					"required": undefined
				},
				"userId": {
					"type": String,
					"required": undefined
				},
				"userEmail": {
					"type": String,
					"required": undefined
				},
				"userName": {
					"type": String,
					"required": undefined
				},
				"grantId": {
					"type": String,
					"required": undefined
				},
				"clientId": {
					"type": String,
					"required": undefined
				},
				"idVerificationRequested": {
					"type": Boolean,
					"required": undefined
				}
			}
		},
		"pageOpenedAt": {
			"type": Number,
			"required": undefined
		},
		"partnerRequest": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"providerRequest": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"providerResponse": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"installmentsData": {
			"type": Object,
			"required": undefined,
			"schema": {
				"txRef": {
					"type": String,
					"required": undefined
				},
				"installments": {
					"type": Array,
					"required": undefined,
					"schema": [
						{
							"type": Object,
							"schema": {
								"commision": {
									"type": [String, Number],
									"required": undefined
								},
								"commisionType": {
									"type": [String, Number],
									"required": undefined
								},
								"firstQuotaAmount": {
									"type": [String, Number],
									"required": undefined
								},
								"installmentType": {
									"type": String,
									"required": undefined
								},
								"quotaAmount": {
									"type": [String, Number],
									"required": undefined
								},
								"quotaNum": {
									"type": [String, Number],
									"required": undefined
								},
								"tae": {
									"type": [String, Number],
									"required": undefined
								},
								"totalAmount": {
									"type": [String, Number],
									"required": undefined
								},
								"tin": {
									"type": [String, Number],
									"required": undefined
								},
								"pendingChargesDateList": {
									"type": Array,
									"required": undefined,
									"schema": [
										{
											"type": String
										}
									]
								}
							}
						}
					]
				},
				"installmentSelection": {
					"type": Object,
					"required": undefined,
					"schema": {
						"financingAccept": {
							"type": [Boolean, String],
							"required": true
						},
						"quotaNum": {
							"type": Number,
							"required": undefined
						},
						"installmentType": {
							"type": String,
							"required": undefined
						}
					},
					"validate": isInstallmentSelection,
					"set": conformInstallmentSelection
				},
				"issuerName": {
					"type": String,
					"required": undefined
				},
				"issuerCsb": {
					"type": [String, Number],
					"required": undefined
				},
				"userAcceptanceText": {
					"type": String,
					"required": undefined
				},
				"transparencyFlag": {
					"type": [String, Number],
					"required": undefined
				},
				"debitCardInfo": {
					"type": String,
					"required": undefined
				}
			}
		},
		"installmentsOffered": {
			"type": Boolean,
			"required": undefined
		},
		"providerReferenceId": {
			"type": String,
			"required": undefined,
			"index": {
				"name": "providerReferenceId-index",
				"type": "global"
			}
		},
		"partnerResponse": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"providerWebhookResponse": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"partnerWebhookResponse": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"challengeData": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"frictionlessChallengeData": {
			"type": Object,
			"required": undefined,
			"validate": isRecord
		},
		"callback": {
			"type": Object,
			"required": undefined,
			"schema": {
				"status": {
					"type": String,
					"enum": ["PENDING", "EXECUTED", "FAILED"],
					"required": true
				},
				"statusCode": {
					"type": String,
					"required": undefined
				},
				"statusMessage": {
					"type": String,
					"required": undefined
				}
			}
		},
		"emailReceiptSent": {
			"type": Boolean,
			"required": undefined
		},
		"smsReceiptSent": {
			"type": Boolean,
			"required": undefined
		},
		"nativeHostedPayment": {
			"type": Boolean,
			"required": undefined
		},
		"authExpireAt": {
			"type": Number,
			"required": undefined
		},
		"expireAt": {
			"type": Number,
			"required": true
		},
		"masterAccountId": {
			"type": String,
			"required": undefined
		},
		"masterAccountGroupId": {
			"type": String,
			"required": undefined
		},
		"chargeback": {
			"type": Boolean,
			"required": undefined
		}
	},
	{
		"saveUnknown": ["commonData.**", "partnerRequest.**", "providerRequest.**", "providerResponse.**", "partnerResponse.**", "providerWebhookResponse.**", "partnerWebhookResponse.**", "challengeData.**", "frictionlessChallengeData.**"],
		"timestamps": {
			"createdAt": {
				"createdAt": {
					"type": {
						"value": Date,
						"settings": {
							"storage": "iso"
						}
					}
				}
			},
			"updatedAt": {
				"updatedAt": {
					"type": {
						"value": Date,
						"settings": {
							"storage": "iso"
						}
					}
				}
			}
		}
	}
);

// A confirmed card payment with one refund, in the shape the payments service stores. All values are
// invented: test card BIN 424242, example.com addresses, documentation IP ranges.
function generateCheckoutData () {
	const id = crypto.randomBytes(20).toString("hex");
	const refundId = crypto.randomBytes(20).toString("hex");
	const accountId = crypto.randomUUID();
	const orderId = `${Math.floor(Math.random() * 1e12)}`;
	const customer = {"name": "Jane Tester", "email": "jane.tester@example.com", "phone": "+34600000000"};
	const shop = {"name": "EXAMPLE SHOP", "country": "ES"};
	const paymentMethod = {
		"method": "card",
		"card": {
			"country": "ES",
			"last4": "4242",
			"bin": "42424242",
			"threeDSecure": true,
			"threeDSecureFlow": "CHALLENGE",
			"threeDSecureVersion": "2.2.0",
			"expiration": 2048544000,
			"type": "credit",
			"brand": "visa",
			"cardholderName": "JANE TESTER"
		}
	};
	const address = {"line1": "Calle Ejemplo 1", "city": "Malaga", "state": "Malaga", "zip": "29001", "country": "ES"};
	const sessionDetails = {
		"ip": "192.0.2.10",
		"userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
		"countryCode": "ES",
		"lang": "es",
		"deviceType": "desktop",
		"browser": "Chrome",
		"browserVersion": "129.0.0.0",
		"browserAccept": "text/html,application/xhtml+xml",
		"os": "Mac OS",
		"osVersion": "10.15.7",
		"browserColorDepth": "24",
		"browserScreenHeight": "1117",
		"browserScreenWidth": "1728",
		"browserTimezoneOffset": "-120",
		"browserTimezoneName": "Europe/Madrid",
		"browserLanguages": "es-ES,es,en",
		"fingerprint": crypto.randomBytes(16).toString("hex"),
		"sessionId": crypto.randomBytes(16).toString("hex")
	};
	return {
		id,
		"transactionId": id,
		"transactionType": "SALE",
		"sessionId": sessionDetails.sessionId,
		"partnerOrderId": orderId,
		"storeId": crypto.randomUUID(),
		"status": "AUTHORIZED",
		"statusCode": "E000",
		"statusMessage": "Transaction approved",
		"providerStatusCode": "0",
		"providerStatusMessage": "Approved or completed successfully",
		"issuerStatusCode": "00",
		"issuerStatusMessage": "Approved or completed successfully",
		accountId,
		"providerId": crypto.randomUUID(),
		"relatedOperations": new Set([refundId]),
		"lastRefundId": refundId,
		"tokenId": crypto.randomBytes(20).toString("hex"),
		"generatePaymentToken": false,
		"autoRegenerate": true,
		"commonData": {
			"amount": 4250,
			"amountEUR": 4250,
			"authorizationCode": "123456",
			"billingDetails": {"name": customer.name, "email": customer.email, "phone": customer.phone, address},
			"billingPlan": "MONEI_X",
			"callbackUrl": "https://shop.example.com/monei/callback",
			"completeUrl": "https://shop.example.com/checkout/complete",
			"failUrl": "https://shop.example.com/checkout/fail",
			"cancelUrl": "https://shop.example.com/checkout/cancel",
			"currency": "EUR",
			customer,
			"description": `Order ${orderId}`,
			"descriptor": "EXAMPLE SHOP",
			"livemode": false,
			orderId,
			paymentMethod,
			"providerInternalId": "100000001",
			"providerReferenceId": crypto.randomBytes(16).toString("hex"),
			"providerName": "Test provider",
			"processor": "MONEIX_F",
			"acquirer": "MONEI_X",
			"shippingDetails": {"name": customer.name, address},
			shop,
			"expireAt": 1760500000,
			"fraudDetectorScore": 12.5,
			"metadata": {"cartId": "cart-1001", "channel": "web"}
		},
		sessionDetails,
		"traceDetails": {
			"ip": "192.0.2.20",
			"userAgent": "MONEI/Node/2.4.0",
			"source": "MONEI/Node",
			"sourceVersion": "2.4.0",
			"countryCode": "ES",
			"apiKey": "pk_test_000000"
		},
		"pageOpenedAt": 1760400030,
		"partnerRequest": {
			"amount": 4250,
			"currency": "EUR",
			orderId,
			"description": `Order ${orderId}`,
			customer,
			"callbackUrl": "https://shop.example.com/monei/callback",
			"completeUrl": "https://shop.example.com/checkout/complete",
			"allowedPaymentMethods": ["card", "bizum", "paypal"]
		},
		"providerRequest": {
			"merchantReferenceNumber": id,
			"amount": 4250,
			"currency": "EUR",
			"operationCode": "1",
			"merchantId": "TEST0001",
			"subMerchantData": {"subMerchantId": "100000001"},
			"endUserIpAddress": "192.0.2.10"
		},
		"providerResponse": {
			"responseCode": "0",
			"responseMessage": "The transaction has been executed successfully.",
			"processingResponseCode": "00",
			"processingResponseMessage": "Approved or completed successfully",
			"authCode": "123456",
			"amount": "4250",
			"cardBrandName": "VISA",
			"pan": "42424242...4242",
			"threeDs": {"trxId": crypto.randomUUID(), "version": "2.2.0"},
			"raw": {"a1": id, "a4": "4250", "a5": "EUR", "z2": "0", "z4": "123456", "z6": "00", "b1": "42424242...4242"}
		},
		"providerReferenceId": crypto.randomBytes(16).toString("hex"),
		"partnerResponse": {
			id,
			"amount": 4250,
			"currency": "EUR",
			orderId,
			accountId,
			"status": "SUCCEEDED",
			"statusCode": "E000",
			"statusMessage": "Transaction approved",
			"livemode": false,
			customer,
			shop,
			paymentMethod,
			"nextAction": {"type": "COMPLETE", "redirectUrl": `https://secure.example.com/payments/${id}/receipt`},
			"createdAt": 1760400000,
			"updatedAt": 1760400060
		},
		"callback": {"status": "EXECUTED", "statusCode": "200"},
		"emailReceiptSent": true,
		"nativeHostedPayment": true,
		"expireAt": 3299040211
	};
}

module.exports = {
	"name": "checkout",
	"create": createCheckoutSchema,
	"data": generateCheckoutData,
	"key": (data) => ({"id": data.id}),
	"update": () => ({"status": "REFUNDED", "statusCode": "E000", "statusMessage": "Transaction approved", "callback": {"status": "PENDING"}}),
	"nestedUpdate": () => ({"$SET": {"callback.status": "EXECUTED", "commonData.refundedAmount": 4250}})
};
