# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

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
