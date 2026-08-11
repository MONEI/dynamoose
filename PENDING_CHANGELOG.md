# Dynamoose Changelog

---

### Features

- Added support for enabling and configuring DynamoDB Streams through Table options

### Bug Fixes

- Fixed `Model.update` being impossible to run against a schema whose hash or range key is a `Combine` attribute
