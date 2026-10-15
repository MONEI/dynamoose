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
- Schema lookup cache (`lib/Schema.ts`): a write by `lib/` that can reach a built schema's definition
  drops the cache of every schema, also when it throws: `clearAllLookupCaches()` on a schema's internal
  properties (the Schema constructor calls `clearSchemaLookupCaches()` in `finally`). Lookups by `lib/`
  use the internal `getSharedAttributeTypeDetails` and never change its result.
  Accepted difference from 4.2.4: the cache assumes schema definitions and dynamoose's internal methods
  are not changed or wrapped after `new Schema()` (an edited nested definition, a type constructor whose
  `toString()` changes, lookup methods redefined as getters, a wrapped `getInternalProperties`).
  The full rules are in `docs/plans/completed/20261014-schema-lookup-cache.md` (Task 11) and `test/SchemaCache.js`.
- Read path: with the fork's default `readStrict: false`, reads run the normal type check and keep a
  mismatched value as stored (upstream's `readStrict` code). Its speed comes from shared hot paths, not
  from skipping the check: `utils.object.entries`/`keys` (`lib/utils/object_entries.ts`) track ancestors,
  `standardizeKey` skips the regex for keys without a list index, and `Item.attributesWithSchema` reads the
  cached attribute tree (`getSharedAttributeTree`). Do not add a fork-only fast path or `Model.update`
  caches back: the old ones lost data (`ANY` lists) and typed `saveUnknown` values by the first update
  (`test/SaveUnknownUpdateTypes.js`).
- Upstream sync: `docs/plans/upstream-prs.md` lists the `upstream-pr/*` branches. lib/ should match
  upstream plus those branches; the fork-only lib lines are the `readStrict` default (`Table/defaults.ts`
  and its JSDoc). `eslint.config.js` does not report upstream's unused `eslint-disable` comments, so they
  stay unchanged.

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