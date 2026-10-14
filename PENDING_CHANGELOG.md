# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `Model.update` being impossible to run against a schema whose hash or range key is a `Combine` attribute
- Fixed `Model.update` refusing `$REMOVE` of a nested path (`a.b`, `a[0]`) when its top-level parent is required
- Fixed `Model.update` turning `$REMOVE` of a nested path into a `SET` of the parent's whole default value
