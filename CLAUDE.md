# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a TypeScript/JavaScript monorepo for Dynamoose, a DynamoDB modeling tool for Node.js inspired by Mongoose. The repository uses Lerna for monorepo management with three main packages:

- `packages/dynamoose`: Core Dynamoose functionality
- `packages/dynamoose-logger`: Optional logging functionality  
- `packages/dynamoose-utils`: Shared utilities used by other packages

## Common Commands

**Build the project:**
```bash
npm run build                    # Build all packages
npm run build:clean             # Clean build artifacts
npm run build:watch             # Build in watch mode
npm run build:sourcemap         # Build with source maps
npm run build:sourcemap:watch   # Build with source maps in watch mode
```

**Testing:**
```bash
npm test                        # Run tests with coverage
npm run test:types              # Run TypeScript type tests

# In packages/dynamoose:
npm run test:nocoverage         # Run tests without coverage (faster)
npm test -- --testNamePattern="pattern"  # Run specific tests
```

`packages/dynamoose/integration/` runs `Model.update` against DynamoDB Local and reads the stored
item back raw. The unit suite blocks HTTP and checks only the request; this suite checks what
DynamoDB accepts and stores. CI runs it. Locally:

```bash
docker run -d --rm -p 8000:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -inMemory
cd packages/dynamoose && npm run build && npm run test:integration   # DYNAMODB_ENDPOINT overrides the URL
```

**Benchmarking (in packages/dynamoose, after `npm run build`):**
```bash
npm run benchmark                              # Current dist vs dynamoose-baseline, full run (5 minutes or more)
npm run benchmark -- --quick                   # Short rounds, noisy numbers
npm run benchmark -- --profile update large    # CPU profile of one operation or stage
npm run benchmark:smoke                        # jest: the modes still run, the gate verdict and failure path
EXTRA_SCHEMA=path/to/module.js npm run benchmark   # Add one schema (a module common's live schema needs node --import tsx, see the README)
```

See "Performance work" below and `packages/dynamoose/benchmarks/README.md` for details.

**Linting:**
```bash
npm run lint                    # Check code style
npm run lint:fix               # Fix code style issues automatically
```

**Documentation site:**
```bash
npm run site:install           # Install docs dependencies
npm run site:start             # Start development server
npm run site:build             # Build documentation site
npm run site:crowdin:sync      # Sync translations
```

**Package-specific commands:**
Run the same commands within individual package directories (e.g., `packages/dynamoose/`) to target specific packages.

## Architecture

### Core Components

**Model System:**
- `Model` (`lib/Model/index.ts`): Core model class handling CRUD operations, queries, scans, transactions
- `ModelStore` (`lib/ModelStore.ts`): Registry for managing model instances
- `Schema` (`lib/Schema.ts`): Defines data structure, validation rules, and DynamoDB type mappings
- `Item` (`lib/Item.ts`): Represents individual database records with change tracking and validation

**Data Layer:**
- `aws/ddb/` (`lib/aws/ddb/`): DynamoDB client abstraction and internal operations
- `aws/converter.ts` (`lib/aws/converter.ts`): Converts between JavaScript objects and DynamoDB AttributeValues
- `Serializer` (`lib/Serializer.ts`): Handles object serialization/deserialization

**Query/Scan Operations:**
- `ItemRetriever` (`lib/ItemRetriever.ts`): Base class for Query and Scan operations
- `Condition` (`lib/Condition.ts`): Builds DynamoDB condition expressions
- `Transaction` (`lib/Transaction.ts`): Handles DynamoDB transactions

**Table Management:**
- `Table/` (`lib/Table/`): Table creation, updates, and configuration management
- `Instance` (`lib/Instance.ts`): Global configuration and AWS settings

### Type System

The Schema system supports:
- Native JavaScript types (String, Number, Boolean, Date, Buffer, Object, Array)
- DynamoDB-specific types (sets, maps)
- Custom validation and transformation functions
- Nested schemas and dynamic typing
- Single table design with multiple schema variants

### Key Relationships

**Model-Schema-Item Pattern:**
- Each `Model` has exactly one `Schema` that defines its structure
- `Item` instances are created from Models and tracked for changes
- Items use the parent Model's Schema for validation and serialization

**AWS SDK Integration:**
- Uses AWS SDK v3 (`@aws-sdk/client-dynamodb` and `@aws-sdk/util-dynamodb`)
- Internal methods follow pattern: `internal.name()` for DynamoDB operations
- Converter handles marshalling/unmarshalling between JS and DynamoDB types

### Package Structure

**dynamoose package:**
- `lib/index.ts`: Main entry point exporting public API
- `lib/utils/`: Utility functions for internal operations
- `test/`: Comprehensive test suite using Jest
- `dist/`: Compiled JavaScript output

**dynamoose-logger package:**
- Pluggable logging system with configurable providers
- Console provider included by default
- Event-based logging architecture

**dynamoose-utils package:**
- Shared error handling utilities
- Common validation functions
- Type checking utilities

## Development Notes

**Testing Requirements:**
- Write comprehensive tests covering all code paths and edge cases
- Use Jest configuration in `jest.config.js` 
- Type tests are located in `test/types/` and use separate TypeScript configuration
- Run `npm run test:types` to validate TypeScript definitions

**Code Style:**
- Project uses ESLint with TypeScript support
- Maximum 0 warnings allowed (`--max-warnings 0`)
- Automatically fixable issues can be resolved with `npm run lint:fix`

**Documentation:**
- JSDoc comments in code generate API documentation
- Main documentation lives in `docs/docs_src/`
- Update `PENDING_CHANGELOG.md` when making changes
- Some docs use replaceable JSDoc patterns like `dyno_jsdoc_dist/Model/index.js|model.table`

**Performance work:**

- Benchmark: `benchmarks/benchmark.js` loads the current `dist` and `dynamoose-baseline` in one process and
  interleaves rounds. A stub DynamoDB client gives canned responses, so the numbers have no network time.
  It measures operations (create, create-request, get, update, nested update) and report-only internal
  stages. Run the numbers under plain `node`, not `tsx`: tsx hooks every `require`, and `Item.ts` calls
  `require("./Schema")` inline per value. Details, the CI gate (`--gate`, job `benchmark-gate`) and its
  limits are in `packages/dynamoose/benchmarks/README.md`.
- Equivalence suite: `test/Equivalence.js` (cases in `equivalence/corpus.js`, harness in
  `equivalence/compare.js`) runs every case on the current build and on `dynamoose-baseline` (an npm alias
  of the published `@monei-js/dynamoose`) and compares requests, results, errors, mutations and user
  function calls. A failure is a bug in the change. Never edit a case or the baseline to make it pass. A
  deliberate behaviour change lists the steps it changes in the case's `differs` with a `reason`; the
  suite then checks that they differ. Bump the alias to the new version after each release and remove the
  `differs` entries the release contains.
- Schema lookup cache (`lib/Schema.ts`): `getAttributeValue` and `attributes()` without arguments are
  cached per Schema, keyed by the normalized path. The public `getAttributeTypeDetails` is not cached: each
  call builds a new result, as 4.2.4 does, so a caller can change it without changing the next result.
  Code in `lib/` calls `getSharedAttributeTypeDetails` instead, which shares one cached result per path:
  it must only read that result, never write into it.
  - Writes by `lib/` that can reach a schema built earlier call `clearSchemaLookupCaches()`, which drops
    the cache of every schema (nested schemas share objects): the `ttl` attribute in `lib/Table/index.ts`,
    and the Schema constructor, which writes into the caller's definition objects (timestamp attributes,
    nested Schema instances and models). The constructor clears in `finally`, because the timestamps loop
    can throw after it wrote some attributes. A new such write must call it too, also when it throws.
  - Misses, thrown errors, keys only inherited from a prototype (`constructor`, `__proto__`) and paths
    through an array of attribute definitions (they depend on the `typeIndexOptionMap`) are never cached,
    so `saveUnknown` input cannot grow the cache.
  - Cached attribute definitions are the schema's own objects, not copies. `attributes()` returns a new
    copy per call.
  - `attributes()` and the shared type details are not cached when computing them called a
    function-valued setting (a Set's `schema` function), or ran a type lookup that wrote
    `typeSettings.model` (THIS and Model types) or threw: the function call and the write happen on every
    lookup, as in 4.2.4. The settings object can belong to a definition that several schemas share.
  - The cache is used only while `getAttributeTypeDetails`, `getAttributeValue`, `getAttributeSettingValue`
    (and `getAttributeType` for `attributes()`) are the built-in methods. When user code replaces one (a
    spy, a plugin, a subclass), every lookup calls it with the same arguments, as in 4.2.4.
  - Accepted difference from 4.2.4: the constructor copies only the top level of the definition, so every
    object below it (each attribute's definition object, each nested `schema`) stays the caller's. A
    nested definition that the caller adds, removes or replaces after the constructor is not seen by
    `getAttributeValue` and the lookups built on it, and `attributes()` sees no change to these objects
    after its first call. A getter on such an object that the path walk reads (`schema`) runs on the first
    lookup only. `Model.clearCache()` does not clear the schema lookup cache either, so it does not make
    such a change visible. `test/SchemaCache.js` pins the difference.
- Known bug, not fixed: `Model.update`'s `attributeTypeCache` makes the request for an undeclared
  `saveUnknown` attribute depend on the first update on the model. `test/AttributeTypeCache.js` pins it
  with `it.failing`; plan `docs/plans/20261014-schema-lookup-cache.md`, Task 8.

**Monorepo Management:**
- Lerna handles package dependencies and publishing
- Run `npm run prepare` to bootstrap and build all packages
- Individual packages can be built independently
- Package versions are managed centrally via `lerna.json`

**Pull Request Requirements:**
- Add a summary to `PENDING_CHANGELOG.md` when making changes
- Use `CHANGELOG.md` as a template for formatting
- Ensure all tests pass and coverage is maintained
- Run linter before submitting (`npm run lint`)