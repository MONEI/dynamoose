# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### General

- Faster reads and writes: `utils.object.entries` and `keys` track ancestors instead of walking each nested object's whole subtree for cycles, schema lookups skip the list-index regex for keys without an index, and `Item.attributesWithSchema` reuses a cached tree of the schema's attributes. `get` and `update` are about 5-35% faster than 4.2.6 on the benchmark schemas, also without the removed `Model.update` caches
- Removed the `Model.update` caches (`attributeTypeCache`, `schemaAttributesCache`, `updateTypesMapCache`, `convertKeyToObjectCache`), `utils/LRUCache` and `Model.clearCache()`. The schema lookup cache covers them, and `attributeTypeCache` made the request for an undeclared `saveUnknown` attribute depend on the first update of the model
- Improved performance by caching schema lookups per Schema: `Model.create`/`Item.save`, `Model.get` and `Model.update` are about 1.5 to 2.5 times as fast on large schemas
- Improved `Model.update` performance for nested paths (`a.b`, `a[0].b`): the nested paths of one update are converted together instead of one full schema pass per path, about 10 to 30 times as fast as 4.2.4
- A Schema caches its lookups: it assumes that its definitions and dynamoose's internal methods are not changed or wrapped after `new Schema()` (for example an edited nested definition object, a type constructor whose `toString()` changes, lookup methods redefined as getters, or a wrapped `getInternalProperties`)

### Bug Fixes

- Fixed `readStrict: false` reads returning `ANY` lists as empty, dropping the fields of range-key model references and throwing on a multi-type attribute with a `get` modifier. Reads now run the type check and return a mismatched value as stored (same code as upstream's `readStrict`); the fork's default stays `false`
- Fixed `save`/`Model.create` writing `get`-modified values back onto the item (a second save applied `set` twice) and marking the item stored before `putItem`, also for `{"return": "request"}` and when `putItem` fails. `save` now resolves with a new item in the form `Model.get` returns, and the saved item keeps its values
- Fixed the primitive fast path of `convertToAttr` differing from the AWS SDK: `NaN`, `Infinity`, numbers outside the safe integer range and `undefined` now go to the SDK (which throws), and converter options are respected
- Fixed `Model.update` being impossible to run against a schema whose hash or range key is a `Combine` attribute
- Fixed `deep_copy` dropping sibling properties that share the same object reference (e.g. a single `Date` used for both `createdAt` and `updatedAt`, or a single address used for both `billingAddress` and `shippingAddress`). Circular reference detection now tracks only the current ancestor path rather than every object ever visited, which also removes an infinite-recursion risk on self-referencing arrays and a shared-reference leak on class instances containing circular properties
- Fixed `dynamoose.transaction` get results skipping schema `get` modifiers. Items returned from a `transactGetItems` transaction now run attribute `get` functions the same as `Model.get`, `Model.batchGet`, `Model.query`, and `Model.scan`
- Fixed `Model.update` refusing `$REMOVE` of a nested path (`a.b`, `a[0]`) when its top-level parent is required
- Fixed `Model.update` turning `$REMOVE` of a nested path into a `SET` of the parent's whole default value
- Fixed `Model.update` sending a raw, unconverted value when a forced default replaces a `$SET` on a nested path
- Fixed `Model.update` writing nested-path values without the schema: `Date` threw, `enum`, `validate` and `set` modifiers were skipped, and `$ADD` of an array to a nested set sent a list
- Fixed `Model.update` writing `NULL` for a nested path set to `undefined` instead of removing it, which also skipped the required check
- Fixed `Model.update` writing a nested forced default as a top-level attribute named after its dotted path
- Fixed `Model.update` typing a value by another attribute's schema when a `$REMOVE` or nested path came before it, for example writing a list as a string set
- Fixed `Model.update` treating a nested path component as the top-level attribute of the same name, for combine sources and forced defaults
- Fixed `Model.update` throwing "all or none of the combine attributes" when the update writes none of them
- Fixed `Model.update` writing `NULL` for a nested key the schema drops (not declared and not covered by `saveUnknown`, also inside a schemaless `Object`); the path is skipped, as a full write of the parent drops the key
- Fixed `Model.update` applying a parent attribute's forced default over a nested-path value. A nested path under a parent with declared children and its own `validate` or `set` now throws `InvalidParameter` (write the whole parent): that rule would see only the written key. A parent without declared children (a record, a schemaless `Object`) still runs its `validate` and `set` on the written entries
- Fixed `Model.update` writing an empty map for a nested path through `__proto__`; a nested path through `__proto__` or `constructor` now throws `InvalidParameter`
- Fixed `Model.update` succeeding without writing anything requested (or sending an empty update, which DynamoDB rejects) when every key it requests is a nested key the schema drops; it now throws `InvalidParameter` naming those keys, also when timestamps or forced defaults would still be written
- Fixed `Model.update` removing a nested path under an attribute with several definitions (`[A, B]`) when no definition accepts the value; it now throws `TypeMismatch`
- Fixed `Model.update` skipping the required check of a nested path written in another spelling (`reps.[0].name`, `reps[0]name`): every check now uses the parsed path, and a path with a name right after a list index or without a leading attribute name throws
- Fixed `Model.update` skipping `required` on the children of an object written to a nested path (`{"$SET": {"a.b": {"c": "1"}}}` with `a.b.d` required)
- Fixed `Model.update` refusing `$REMOVE` of a key inside a list element (`reps[0].email`), which DynamoDB accepts
