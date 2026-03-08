# Design Documentation

This directory contains design documentation for this project. These documents serve as a reference for contributors and coding agents, documenting architectural decisions, design patterns, and best practices. Design docs should be added to over time as new patterns emerge and architectural decisions are made.

## Non-Negotiable Principles

The following principles are mandatory and must never be violated. Code that violates these principles must be refactored before merging.

### 1. Red/Green TDD

Always follow red/green test-driven development. Write tests first, then implement to make them pass. Be critical of the current codebase for TDD violations. Complex test setup is a signal that the source code has a testability problem and needs refactoring — fix the source, not the test. See [Mobile Testing Strategy](./mobile-testing.md#tdd-principle-testability-first).

### 2. Type Safety — No `as` Overrides

Never override TypeScript's type system with explicit `as` casts unless absolutely necessary (e.g., test utilities). Always use type guards, discriminated unions, or proper generic constraints instead. An explicit `as` is a signal of potential type unsafety and an underlying structural issue with the code.

```typescript
// ❌ BAD: Casting hides type unsafety
const user = response.data as User;

// ✅ GOOD: Type guard validates at runtime
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null && "id" in data && "email" in data;
}
if (isUser(response.data)) {
  // response.data is safely narrowed to User
}
```

### 3. Favor Lower Complexity

Favor simplicity whenever possible. Avoid adding optional parameters, configuration options, or feature flags that introduce unnecessary branching and conditional logic. Every branch is a potential bug. If a parameter is always passed the same value, remove it. If a configuration option has only one reasonable setting, hardcode it.

```typescript
// ❌ BAD: Unnecessary configuration surface
function fetchData(url: string, options?: {
  retries?: number;
  timeout?: number;
  cache?: boolean;
  transform?: (data: unknown) => unknown;
}) { ... }

// ✅ GOOD: Minimal surface, extend only when needed
function fetchData(url: string): Promise<Response> { ... }
```

### 4. Runtime Performance Awareness

Be critical of expensive runtime operations. When an implementation results in O(n) runtime or higher, consider whether an O(log n) or O(1) solution is possible. Use appropriate data structures (Maps for lookups, Sets for membership checks) rather than scanning arrays. Profile before optimizing, but design with performance in mind from the start.

```typescript
// ❌ BAD: O(n) lookup on every call
const item = items.find(i => i.id === targetId);

// ✅ GOOD: O(1) lookup via Map
const item = itemsMap.get(targetId);
```

### 5. Accessibility Is Mandatory

All mobile components must follow the [Mobile Accessibility](./mobile-accessibility.md) guidelines. Accessibility requirements are not optional and must be implemented for all interactive components.

### 6. Testability Is a Design Requirement

Code must be designed for testability from the start. Complex test patterns signal that source code needs refactoring. When tests require elaborate helpers, tree traversal, or workarounds, refactor the source code rather than accepting the complexity. See [Mobile Testing Strategy](./mobile-testing.md#tdd-principle-testability-first).

## Available Design Docs

- **[TypeScript Documentation](./typescript-documentation.md)** — TypeScript documentation patterns and best practices for interfaces, types, and functions.

- **[Mobile App Patterns](./mobile-app-patterns.md)** — Core design patterns for the React Native/Expo mobile app, including testing strategy, state management, and component architecture.

- **[Mobile Optimization](./mobile-optimization.md)** — Performance optimization patterns for React Native, including state management, memoization, cleanup patterns, and memory management.

- **[Mobile Accessibility](./mobile-accessibility.md)** — Accessibility patterns and best practices for the mobile app, including required accessibility props, animation patterns, and screen reader support.

- **[Mobile Logging](./mobile-logging.md)** — Logging infrastructure patterns for event tracking, session management, and crash reporting.

- **[Mobile Testing Strategy](./mobile-testing.md)** — Testing patterns and best practices for the React Native mobile app, including mock factories, dependency injection, and test structure.

- **[Native Modules](./native-modules.md)** — Patterns and best practices for building Expo native modules, including iOS and Android implementation, TypeScript integration, threading, ref forwarding, and testing.
