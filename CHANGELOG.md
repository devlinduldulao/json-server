# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.6] - 2026-02-14

### Fixed

- Fixed flat route config handling in `applyCustomRoutes()` — string route mappings (e.g., `{"/api/posts/:id": "/posts/:id"}`) were being iterated character-by-character, causing "Unsupported HTTP method" errors
- Updated `RoutesConfig` type to correctly support both flat string route mappings and method-level handlers
- Fixed type narrowing in `addRoute()` when overwriting string routes with method handlers

### Added

- Comprehensive test suite achieving 100% statement, function, and line coverage (289 tests across 14 suites)
- New test files: `cli-styles.test.ts`, `utils-comprehensive.test.ts`, `server-comprehensive.test.ts`, `index.test.ts`, `middleware-branches.test.ts`

### Changed

- Support for Deno runtime via mod.ts entry point
- Support for multiple package managers (npm, pnpm, yarn, bun)
- Added comprehensive documentation for all methods and classes
- Added ESLint rules for enforcing camelCase naming conventions
- Added contribution guidelines and code of conduct
- Updated dependencies to latest versions
- Improved type definitions with more specific types
- Enhanced error handling and logging
- Fixed middleware type issues with Express
- Resolved module resolution issues in tests

## [1.0.0] - 2025-04-01

### Added

- Initial release of TypeScript json-server
- RESTful API endpoints
- Custom routes support
- Delay middleware
- CORS support
- Read-only mode
- Static file serving
- Custom ID field support
- CLI with various configuration options
- Programmatic API
