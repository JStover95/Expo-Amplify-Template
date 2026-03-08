# TypeScript Documentation Patterns

This document outlines TypeScript documentation patterns and best practices. These patterns ensure consistent, maintainable, and well-documented TypeScript code across both frontend and backend.

## Table of Contents

1. [Interface Documentation](#interface-documentation)
2. [Type Documentation](#type-documentation)
3. [Function Documentation](#function-documentation)
4. [Best Practices](#best-practices)

## Interface Documentation

### Pattern Overview

All TypeScript interfaces should be documented with:

1. **Interface-level JSDoc**: A comment block above the interface describing its purpose
2. **Property-level JSDoc**: Inline comments for each property using `/** ... */` format

### Standard Pattern

```typescript
/**
 * Brief description of what this interface represents
 */
export interface InterfaceName {
  /** Description of what this property represents */
  propertyName: string;
  /** Description of what this optional property represents */
  optionalProperty?: number;
  /** Description of a nested object property */
  nestedProperty: {
    /** Description of nested property field */
    field: string;
  };
}
```

### Examples

#### Frontend Example: Context State Interface

```typescript
/**
 * Authentication state
 */
export interface AuthState {
  /** Loading state for async operations */
  loading: boolean;
  /** Current authenticated user */
  user: User | null;
  /** Current session */
  session: Session | null;
  /** Error message if operation failed */
  error: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
}
```

#### Frontend Example: Component Props Interface

```typescript
/**
 * VocabList component props
 */
interface VocabListProps {
  /** Array of vocabulary highlights to display */
  highlights: VocabHighlight[];
  /** Set of character indices with optimistic highlights (loading) */
  optimisticHighlights: Set<number>;
  /** ID of vocabulary item to scroll to */
  scrollToId?: string | null;
  /** Whether bottom sheet is currently open */
  isSheetOpen?: boolean;
  /** Callback when a vocabulary item is pressed */
  onVocabItemPress?: (highlightId: string) => void;
  /** Test ID for testing */
  testID?: string;
}
```

#### Backend Example: Configuration Interface

```typescript
/**
 * Backend service configuration
 */
export interface BackendConfig {
  /** Backend API URL */
  apiUrl: string;
  /** API key for service authentication */
  apiKey: string;
  /** AWS region */
  region: string;
}
```

#### Backend Example: Result Interface

```typescript
/**
 * Final agent result item with sense and entry data
 */
interface AgentResultItem {
  /** Unique identifier for the vocabulary item */
  id: string;
  /** The text that was matched */
  text: string;
  /** Reading/pronunciation of the word */
  reading: string;
  /** Excerpt from the source text */
  excerpt: string;
  /** Dictionary sense information */
  sense: QueryDictionaryItem;
  /** Full dictionary entry data */
  entry: unknown;
}
```

### Guidelines

1. **Always document interfaces**: Every interface should have both interface-level and property-level documentation
2. **Be concise but descriptive**: Property descriptions should be brief but clear about the property's purpose
3. **Document optional properties**: Clearly indicate when properties are optional and what their default behavior is
4. **Document complex types**: For nested objects or complex types, provide context about the structure
5. **Use consistent terminology**: Use the same terms across related interfaces (e.g., "Unique identifier" vs "ID")

## Type Documentation

### Type Aliases

Type aliases should follow the same documentation pattern as interfaces:

```typescript
/**
 * Theme setting options
 */
export type Theme = "light" | "dark" | "system";
```

### Union Types

For union types, document what each variant represents:

```typescript
/**
 * Bottom sheet position state
 */
type BottomSheetPosition = "closed" | "half" | "full";
```

### Generic Types

Document generic type parameters:

```typescript
/**
 * Result wrapper for operations that may fail
 * @template T - The success value type
 */
export interface Result<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result value if successful */
  data?: T;
  /** Error message if operation failed */
  error?: string;
}
```

## Function Documentation

### Function Signatures

Functions should be documented with JSDoc comments:

```typescript
/**
 * Makes an authenticated fetch request using the current session.
 * Throws an error if no active session exists or if the response is not ok.
 *
 * @param options - Fetch options including url, body, and optional method
 * @returns Promise resolving to the Response object
 * @throws Error if no session exists or response is not ok
 */
export async function expoFetch(
  options: ExpoFetchOptions
): Promise<Response> {
  // Implementation
}
```

### Method Documentation

Methods in classes should be documented similarly:

```typescript
/**
 * Handles a streaming response by reading chunks and accumulating text.
 * Calls the onEvent callback with progressively accumulated text after each chunk.
 *
 * @param options - Options including response and onEvent callback
 * @returns Promise that resolves when the stream is complete
 * @throws Error if no reader is available from the response body
 */
export async function handleStreamResponse(
  options: HandleStreamResponseOptions
): Promise<void> {
  // Implementation
}
```

### Parameter Documentation

Use `@param` tags for complex parameters:

```typescript
/**
 * Query the dictionary with a text query
 *
 * @param query - The text query to search for
 * @returns Promise resolving to dictionary query results
 */
queryDictionary: (query: string) => Promise<DictionaryQueryResult>;
```

## Best Practices

### 1. Consistency

- Use the same documentation style across all interfaces
- Maintain consistent terminology (e.g., "Unique identifier" vs "ID")
- Follow the same structure for similar interfaces

### 2. Clarity

- Write clear, concise descriptions
- Avoid redundant information
- Focus on the "what" and "why", not just the "how"

### 3. Completeness

- Document all public interfaces and types
- Document all exported functions
- Include parameter and return type documentation

### 4. Maintenance

- Update documentation when interfaces change
- Keep documentation in sync with code
- Review documentation during code reviews

### 5. Examples

When helpful, include usage examples in documentation:

```typescript
/**
 * Authentication actions
 *
 * @example
 * ```typescript
 * const { actions } = useAuthContext();
 * const result = await actions.signIn(email, password);
 * if (result.success) {
 *   // Handle success
 * }
 * ```
 */
export interface AuthActions {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<AuthResult>;
  // ...
}
```

### 6. Cross-References

Reference related design docs when applicable:

```typescript
/**
 * AuthContext - Authentication state and actions
 *
 * @see design-docs/context-pattern.md
 */
```

## When to Document

### ✅ Always Document

- Public interfaces and types
- Exported functions and methods
- Complex type definitions
- API contracts (props, parameters, return types)
- Configuration interfaces

### ⚠️ Consider Documenting

- Internal interfaces used across multiple files
- Complex utility types
- Type guards and validation functions
- Non-obvious implementation details

### ❌ Usually Skip

- Simple type aliases that are self-explanatory
- Private/internal interfaces used in a single file
- Obvious getters/setters
- Trivial utility functions

## Checklist

When creating or updating TypeScript code:

- [ ] All public interfaces have interface-level JSDoc
- [ ] All interface properties have property-level JSDoc
- [ ] All exported functions have function-level JSDoc
- [ ] Complex parameters are documented with `@param` tags
- [ ] Return types are documented with `@returns` tags
- [ ] Error conditions are documented with `@throws` tags
- [ ] Related design docs are referenced with `@see` tags
- [ ] Documentation is consistent with existing patterns
- [ ] Terminology is consistent across related interfaces

## Related Patterns

- **[Mobile App Patterns](./mobile-app-patterns.md)** — Component and state management patterns
