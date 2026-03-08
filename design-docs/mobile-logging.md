# Mobile Logging Strategy

This document outlines the logging infrastructure and patterns for the mobile application. The logging system provides comprehensive event tracking for debugging, crash reporting, and analytics.

## Overview

The mobile app should include a logging system that:

- **Stores recent log entries** in an in-memory ring buffer for crash/bug reporting
- **Tracks user sessions** with a unique session ID included in all logs and API requests
- **Logs five event types**: navigation, user actions, API calls, app lifecycle, and errors
- **Is fully testable** via dependency injection

## Architecture

```plaintext
┌─────────────────────────────────────────────────────────┐
│                      Application                        │
├─────────────────────────────────────────────────────────┤
│  Navigation Logger  │  Lifecycle Logger  │  Components  │
│  (route changes)    │  (foreground/bg)   │  (actions)   │
└──────────┬──────────┴──────────┬──────────┴──────┬──────┘
           │                     │                  │
           v                     v                  v
    ┌──────────────────────────────────────────────────┐
    │              Logger Service                      │
    │  - logNavigation()                              │
    │  - logUserAction()                              │
    │  - logApiCall()                                 │
    │  - logLifecycle()                               │
    │  - logError()                                   │
    └───────────────┬──────────────────┬──────────────┘
                    │                  │
                    v                  v
         ┌──────────────────┐  ┌─────────────────┐
         │   Ring Buffer    │  │ Session Manager │
         │  (N entries)     │  │  (UUID + regen) │
         └──────────────────┘  └─────────────────┘
```

### Recommended File Structure

- `src/utils/ring-buffer.ts` — In-memory circular buffer
- `src/utils/session-manager.ts` — Session ID generation and management
- `src/utils/logger.ts` — Core logging service
- `src/utils/navigation-logger.ts` — Automatic navigation event logging
- `src/utils/lifecycle-logger.ts` — App lifecycle event logging
- `src/components/ErrorBoundary.tsx` — Error catching and logging

## Logging Events

### Event Types

#### 1. Navigation Events

Log when users navigate between screens. Automatic logging via a `useNavigationLogger()` hook using Expo Router's `usePathname()`.

```typescript
getLogger().logNavigation({
  from: "/login",
  to: "/reader",
  params: { contentId: "123" },
});
```

#### 2. User Action Events

Log user interactions like button taps, form submissions, or other UI actions.

```typescript
getLogger().logUserAction({
  action: "tap",
  target: "submit-button",
  metadata: { formType: "signup" },
});
```

**When to log:** Critical user actions (sign in, delete, submit), feature usage, state changes triggered by user.

**When NOT to log:** Every touch or gesture, navigation (already automatic), background state updates.

#### 3. API Call Events

Log API requests. Prefer automatic logging via an authenticated fetch wrapper.

```typescript
getLogger().logApiCall({
  method: "POST",
  endpoint: "/api/resource",
  statusCode: 200,
  duration: 1523,
  error: "Timeout",
});
```

#### 4. Lifecycle Events

Log app foreground/background transitions. Automatic logging via a `useLifecycleLogger()` hook.

```typescript
getLogger().logLifecycle("foreground");
```

#### 5. Error Events

Log errors caught by error boundaries or in catch blocks.

```typescript
try {
  // risky operation
} catch (error) {
  getLogger().logError({
    error: error as Error,
    errorInfo: { context: "processing content" },
  });
}
```

Automatic logging via an `ErrorBoundary` component for uncaught errors in the React tree.

## Session Management

### Session Lifecycle

1. **App Load**: Session created when app starts
2. **Login**: New session generated after successful authentication
3. **Session ID Usage**:
   - Included in every log entry
   - Sent as a header in all authenticated API requests for backend log correlation

```typescript
const sessionId = getSessionManager().getSessionId();
getSessionManager().regenerateSession(); // e.g., on login
```

## Testing

### Testing Components That Log

Mock the logger to avoid side effects:

```typescript
import { createMockLogger } from "@/tests/__mocks__/logger.mock";

describe("MyComponent", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    jest.spyOn(require("@/utils/logger"), "getLogger").mockReturnValue(mockLogger);
  });

  it("should log user action on button press", () => {
    const { getByTestId } = render(<MyComponent />);
    fireEvent.press(getByTestId("submit-button"));

    expect(mockLogger.getUserActionLogs()).toHaveLength(1);
  });
});
```

### Testing Logger Utilities

**Follow TDD principles** when modifying logger utilities. Mock dependencies via `deps` objects:

- `logger.ts`: `deps.getRingBuffer`, `deps.getSessionManager`, `deps.getTimestamp`, `deps.generateId`
- `session-manager.ts`: `deps.generateUuid`
- `navigation-logger.ts`: `deps.usePathname`, `deps.getLogger`
- `lifecycle-logger.ts`: `deps.getAppState`, `deps.getLogger`

### Do Not Test Logs Themselves

**Test the logger utility itself, but do not assert on log content in component tests.**

```typescript
// ❌ BAD: Testing logs, not behavior
expect(getLogger().getLogEntries()).toHaveLength(5);

// ✅ GOOD: Test behavior, mock logger if needed
fireEvent.press(getByTestId("button"));
expect(screen.getByText("Success")).toBeTruthy();
```

## Best Practices

### DO

- **Log user-initiated actions** that help understand feature usage and user flows
- **Log errors in catch blocks** for async operations outside error boundaries
- **Include meaningful metadata** to aid debugging
- **Use a logger singleton** via `getLogger()` — don't create new instances
- **Test logger utilities** with dependency injection patterns

### DON'T

- **Don't log in every render** or on every state change
- **Don't log sensitive data** like passwords, tokens, or PII
- **Don't manually log navigation or lifecycle events** — these are already automatic
- **Don't create custom logger instances** — use the singleton
- **Don't test log content in component tests** — focus on behavior

### Ring Buffer Considerations

- **In-memory only**: Logs don't persist across app restarts
- **O(1) push operations**: Use freely without performance concerns
- Oldest entries overwritten when full

### Session ID Best Practices

- Don't modify session IDs manually — managed automatically
- Session regeneration only on app initialization and successful login
- Session ID is automatically included in all log entries and authenticated API requests

## Related Documentation

- [Mobile Testing Strategy](./mobile-testing.md) — Testing patterns for logger and mocks
- [Mobile App Patterns](./mobile-app-patterns.md) — Component patterns and TDD principles
