<!--
SYNC IMPACT REPORT
==================
Version Change: N/A (initial fill) → 1.0.0
Modified Principles: N/A — initial authoring from blank template

Added Sections:
  - Core Principles (I. Code Quality, II. Testing Standards, III. UX Consistency, IV. Performance)
  - Development Workflow & Quality Gates
  - Technology Constraints & Tooling
  - Governance

Removed Sections: N/A

Templates Reviewed:
  - .specify/templates/plan-template.md — Constitution Check gates align with new quality gates ✅
  - .specify/templates/spec-template.md — Success Criteria + acceptance scenarios align ✅
  - .specify/templates/tasks-template.md — Polish phase covers performance & security tasks ✅

Deferred TODOs: None — all placeholders resolved.
-->

# Avify Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

All production code MUST meet the following standards before merging:

- **Readability**: Code MUST be written for the next developer. Functions and variables MUST have
  clear, descriptive names. Comments MUST explain *why*, not *what*.
- **Single Responsibility**: Every function, class, and module MUST have one clearly defined
  purpose. Cross-cutting logic MUST be extracted into shared utilities.
- **No Dead Code**: Unused imports, variables, functions, and commented-out blocks MUST be removed
  before merge. Code kept "just in case" is prohibited.
- **Consistent Style**: All code MUST pass linting and formatting checks defined by the project
  toolchain. Style violations are treated as build failures.
- **Review Gate**: All changes MUST be reviewed by at least one other developer before merging to
  the main branch.

**Rationale**: Code quality directly affects long-term maintainability and team velocity. A codebase
that is hard to read is a codebase that is hard to change safely.

### II. Testing Standards (NON-NEGOTIABLE)

All features MUST be accompanied by automated tests before merging:

- **Coverage Floor**: Unit test coverage MUST NOT fall below 80% for new code. Critical paths
  (authentication, data mutations, payment flows) MUST reach 100%.
- **Test-First Preferred**: TDD is the preferred approach. Tests SHOULD be written before
  implementation to validate assumptions early.
- **Test Independence**: Each test MUST be independently runnable. Tests MUST NOT depend on
  execution order, shared mutable state, or external services unless explicitly labeled as
  integration tests.
- **Test Classification**: Tests MUST be classified as unit, integration, or contract. Integration
  tests MUST run against real dependencies — mocking the database or external services in
  integration tests is prohibited.
- **Flake Zero Policy**: Flaky tests MUST be fixed or removed within one sprint of detection. A
  flaky test is worse than no test.
- **Acceptance Gate**: Every user story MUST have at least one passing acceptance scenario before
  the story is considered done.

**Rationale**: Testing standards exist to catch regressions early and enable confident refactoring.
An untested feature is considered incomplete, not shipped.

### III. User Experience Consistency

All user-facing features MUST adhere to a consistent design and interaction model:

- **Design System**: All UI components MUST be drawn from the established design system. Custom
  one-off components require documented justification in the feature spec.
- **Interaction Patterns**: Common actions (navigation, form submission, error display, loading
  states) MUST follow established patterns across the entire application.
- **Error Messaging**: Error messages shown to users MUST be human-readable, actionable, and
  consistent in tone. Technical error details MUST NOT be exposed to end users.
- **Accessibility**: All UI MUST meet WCAG 2.1 AA compliance. Keyboard navigation and screen
  reader support are REQUIRED, not optional.
- **Responsive Behavior**: All interfaces MUST be tested at the target viewport sizes defined in
  the design system. Untested breakpoints MUST be noted in the feature spec.

**Rationale**: Inconsistent UX erodes user trust and increases support burden. Predictable
interfaces lower the learning curve and improve user satisfaction.

### IV. Performance Requirements

All features MUST meet defined performance thresholds before shipping:

- **Response Time**: API endpoints MUST respond within 200ms at p95 under normal load. Pages MUST
  achieve First Contentful Paint under 1.5 seconds on a simulated 4G connection.
- **Load Targets**: The system MUST sustain defined concurrent user load without degradation. Load
  targets are documented per feature in the plan's Performance Goals field.
- **Regression Prevention**: Performance MUST be benchmarked before and after significant changes.
  A measurable regression (>10% increase in p95 latency) is a merge blocker.
- **Resource Efficiency**: Features MUST NOT introduce unbounded memory growth, N+1 query patterns,
  or polling where event-driven alternatives are available.
- **Measurement Required**: Performance claims MUST be backed by profiler output or benchmark
  results. Subjective assessments ("feels fast") are insufficient for approval.

**Rationale**: Performance is a feature. Slow software degrades user experience and has direct
business impact. Performance debt compounds rapidly and is expensive to remediate late.

## Development Workflow & Quality Gates

Every feature MUST pass the following gates before merging to main:

1. **Spec Gate**: A `spec.md` exists, is approved, and all acceptance scenarios are clearly defined.
2. **Test Gate**: All tests pass in CI. Coverage thresholds are met. No new flaky tests introduced.
3. **Code Review Gate**: At least one peer review approval. Constitution compliance verified by
   the reviewer.
4. **Performance Gate**: Benchmarks run and meet thresholds for any feature touching critical paths.
5. **UX Gate**: UI changes reviewed against the design system. Accessibility checked.
6. **No-Placeholder Gate**: No `TODO`, `FIXME`, or placeholder code in production paths.

All gates apply to every PR. Any gate failure blocks merge until resolved. Urgency is not an
acceptable justification for bypass.

## Technology Constraints & Tooling

- Language versions and framework versions MUST be documented in the `Technical Context` section
  of each feature's `plan.md`.
- Dependencies MUST be reviewed for known security vulnerabilities before adoption. No dependency
  with a known critical CVE may be merged.
- Toolchain choices (linters, formatters, test runners) MUST be consistent across the project.
  Per-developer overrides to project-level tooling standards are prohibited.
- Build and test pipelines MUST be reproducible from a clean checkout. "Works on my machine" is
  not an acceptable state.
- Secrets MUST NEVER be committed to source control. Environment variables and secret managers
  are the only acceptable mechanisms.

## Governance

This constitution supersedes all other development practices and conventions within this project.
Conflicts between team norms and this constitution are resolved in favour of the constitution.

**Amendment Procedure**:
1. Any team member may propose an amendment via a PR to `.specify/memory/constitution.md`.
2. Amendments require review and approval from at least two core contributors.
3. The proposer MUST include a migration plan for any existing code that would violate the amended
   principle.
4. Version MUST be bumped per semantic versioning rules: MAJOR for removals or redefinitions,
   MINOR for additions or materially expanded guidance, PATCH for clarifications and wording fixes.
5. `Last Amended` date MUST be updated on merge.

**Compliance Review**: Constitution compliance MUST be verified at every code review. Reviewers
are empowered and expected to block PRs that violate these principles.

**Guidance File**: See `CLAUDE.md` and the current feature's `plan.md` for runtime development
guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
