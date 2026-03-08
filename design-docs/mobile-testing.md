# Mobile Testing Strategy

This document outlines testing patterns and best practices for the React Native mobile application. These patterns ensure reliable, maintainable, and isolated tests.

## Testing Patterns

### 1. Mock Factory Pattern

**Use a mock factory pattern with fluent API** for configuring mock behavior. This pattern allows:

- Clear test setup with readable configuration
- Reusable mock implementations
- Captured operations for verification
- Flexible state management

**Fluent API Pattern (Recommended for Screens/Integration Tests):**

```typescript
export class MockAuthClient {
  private authState = { user: null, session: null };
  private capturedOperations: CapturedOperation[] = [];
  private shouldFailSignIn = false;

  withAuthState(user: any, session: any): this {
    this.authState = { user, session };
    return this;
  }

  withSignInFailure(shouldFail: boolean = true): this {
    this.shouldFailSignIn = shouldFail;
    return this;
  }

  async signInWithPassword(credentials: any) {
    this.capturedOperations.push({ operation: "signIn", credentials });
    
    if (this.shouldFailSignIn) {
      return { data: null, error: new Error("Invalid credentials") };
    }
    
    return { data: { user: this.authState.user, session: this.authState.session }, error: null };
  }

  getLastOperation() {
    return this.capturedOperations[this.capturedOperations.length - 1];
  }
}

export function createMockAuthClient(): MockAuthClient {
  return new MockAuthClient();
}
```

**Queue-Based Pattern (For Complex Sequences):**

Use queues when tests need to configure different responses for sequential calls:

```typescript
export class MockApiClient {
  private _responses: ((args: unknown) => { data: unknown; error: unknown })[] = [];

  withResponse(callback: (args: unknown) => { data: unknown; error: unknown }): this {
    this._responses.push(callback);
    return this;
  }

  async call(args: unknown) {
    const callback = this._responses.shift();
    if (!callback) {
      throw new Error("No response configured");
    }
    try {
      return Promise.resolve(callback(args));
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
```

Exception propagation in mocks enables testing catch blocks by configuring callbacks that throw.

### 2. Dependency Injection Pattern

**Abstract client initialization via a `deps` object for easy mocking in tests.** When dependencies are wrapped in a `deps` object, they can be stubbed:

#### Implementation

```typescript
// Provider.tsx
export const deps = {
  getBackendClient: () => backendClient,
};

export function AuthProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const client = deps.getBackendClient();
    client.auth.getSession().then(({ data, error }) => { /* ... */ });
  }, []);
}
```

#### Testing

```typescript
import { deps } from "../../../src/contexts/AuthContext/Provider";

let mockClient: ReturnType<typeof createMockClient>;
let clientSpy: jest.SpyInstance;

beforeEach(() => {
  mockClient = createMockClient();
  clientSpy = jest.spyOn(deps, "getBackendClient").mockReturnValue(mockClient);
});

afterEach(() => {
  clientSpy.mockRestore();
  jest.clearAllMocks();
});
```

### 3. Test Structure

#### Setup → Execute → Assert → Cleanup

```typescript
beforeEach(() => {
  mockClient = createMockClient();
  clientSpy = jest.spyOn(deps, "getBackendClient").mockReturnValue(mockClient);
});

afterEach(() => {
  clientSpy.mockRestore();
  jest.clearAllMocks();
});

it("should sign in successfully", async () => {
  // Configure mock
  mockClient.auth.withGetSessionResponse(() => ({
    data: { session: null },
    error: null,
  }));
  mockClient.auth.withSignInResponse(() => ({
    data: { user: mockUser, session: mockSession },
    error: null,
  }));

  // Execute
  const { result } = renderHook(() => useAuthContext(), {
    wrapper: AuthProvider,
  });

  await waitFor(() => {
    expect(result.current.state.loading).toBe(false);
  });

  await act(async () => {
    await result.current.actions.signIn("test@example.com", "password");
  });

  // Assert
  await waitFor(() => {
    expect(result.current.state.isAuthenticated).toBe(true);
  });
});
```

## React Native Specific Considerations

### Hook Testing

**Use `renderHook` from `@testing-library/react-native`** (not the deprecated `@testing-library/react-hooks`):

```typescript
import { renderHook, act, waitFor } from "@testing-library/react-native";

const { result } = renderHook(() => useAuthContext(), {
  wrapper: AuthProvider,
});
```

### Async State Updates

**Use `waitFor()` for components with useEffect on mount:**

```typescript
it("should render placeholder text", async () => {
  renderRouter(
    { _layout: RootLayout, "(tabs)/search": SearchScreen },
    { initialUrl: "/search" }
  );
  
  await waitFor(() => {
    expect(screen.getByText("Search")).toBeTruthy();
  });
});
```

**Separate `act()` blocks for form state updates:**

```typescript
// ❌ Wrong — state updates don't complete before button press
await act(async () => {
  fireEvent.changeText(emailInput, "test@example.com");
  fireEvent.changeText(passwordInput, "password123");
  fireEvent.press(signUpButton); // May read stale state!
});

// ✅ Correct — state updates complete before button press
await act(async () => {
  fireEvent.changeText(emailInput, "test@example.com");
});
await act(async () => {
  fireEvent.changeText(passwordInput, "password123");
});
await act(async () => {
  fireEvent.press(signUpButton); // Reads updated state
});
```

**Hook testing with `act()` and `waitFor()`:**

```typescript
await waitFor(() => {
  expect(result.current.state.loading).toBe(false);
});

await act(async () => {
  await result.current.actions.signIn(email, password);
});

await waitFor(() => {
  expect(result.current.state.isAuthenticated).toBe(true);
});
```

### Mocking React Native APIs

**Mock useColorScheme:**

```typescript
import { mockUseColorScheme } from "@/tests/test-utils";

beforeEach(() => {
  mockUseColorScheme("light");
});
```

**Configure AsyncStorage (globally mocked in setup):**

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

it("should load saved theme", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
  // ... test code
});
```

### React Native Reanimated Testing

**Use the official test setup** from `react-native-reanimated`. The `setUpTests()` call in setup provides proper animation testing infrastructure.

**Timer management for animations:**

```typescript
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

**Advance timers to progress animations:**

```typescript
it("should animate on button press", () => {
  const { getByTestId } = render(<AnimatedComponent />);
  
  fireEvent.press(getByTestId("button"));
  jest.advanceTimersByTime(500);
  
  const view = getByTestId("animated-view");
  expect(view).toHaveAnimatedStyle({ opacity: 1 });
});
```

**Do NOT create custom reanimated mocks** — they override the proper test setup from `setUpTests()`:

```typescript
// ❌ Wrong — breaks animation testing
jest.mock("react-native-reanimated", () => ({
  useSharedValue: jest.fn(),
  useAnimatedStyle: jest.fn(),
}));

// ✅ Correct — use the setup, no mock needed
```

### React Native Gesture Handler Testing

**Capture gesture objects** for testing gesture interactions:

```typescript
let capturedGesture: any = null;

jest.mock("react-native-gesture-handler", () => {
  const View = require("react-native").View;
  return {
    GestureDetector: ({ children, gesture }: any) => {
      if (gesture) {
        capturedGesture = gesture;
      }
      return <View>{children}</View>;
    },
    Gesture: {
      Pan: () => {
        const gesture: any = {
          onStart: (handler: any) => { gesture._onStart = handler; return gesture; },
          onUpdate: (handler: any) => { gesture._onUpdate = handler; return gesture; },
          onEnd: (handler: any) => { gesture._onEnd = handler; return gesture; },
        };
        return gesture;
      },
    },
  };
});
```

**Simulate gestures in tests:**

```typescript
it("should handle swipe gesture", () => {
  const { getByTestId } = render(<SwipeableComponent />);
  
  if (capturedGesture && capturedGesture._onUpdate) {
    capturedGesture._onUpdate({ translationX: -50 });
    jest.advanceTimersByTime(100);
    
    expect(getByTestId("content")).toBeTruthy();
  }
});
```

### Rendering with Providers

**Create helper functions** to render components with all necessary providers:

```typescript
export function renderWithProviders(
  ui: React.ReactElement,
  options: { initialTheme?: Theme } = {}
) {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}
```

## expo-router Testing

**Use `renderRouter` with RootLayout** for screen tests:

```typescript
import { renderRouter, screen, waitFor } from "expo-router/testing-library";
import { deps } from "@/contexts/AuthContext/Provider";
import RootLayout from "@/app/_layout";
import SignupScreen, { AUTH_TEST_IDS } from "@/app/(auth)/signup";

describe("SignupScreen", () => {
  let mockAuth: MockAuthClient;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth = createMockAuthClient();
    mockClient = { get auth() { return mockAuth; } };
    jest.spyOn(deps, "getBackendClient").mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should render signup form", async () => {
    renderRouter(
      {
        _layout: RootLayout,
        "(auth)/signup": SignupScreen,
      },
      { initialUrl: "/signup" }
    );

    await waitFor(() => {
      expect(screen.getByTestId(AUTH_TEST_IDS.emailInput)).toBeTruthy();
    });
  });
});
```

**Mock navigation destinations inline:**

```typescript
const MOCK_TEST_IDS = {
  mockReaderScreen: "mock-reader-screen",
} as const;

export const MockReaderScreen = () => (
  <View testID={MOCK_TEST_IDS.mockReaderScreen}>
    <Text>Reader</Text>
  </View>
);

it("should navigate after signup", async () => {
  renderRouter(
    {
      _layout: RootLayout,
      "(auth)/signup": SignupScreen,
      "(tabs)/reader": MockReaderScreen,
    },
    { initialUrl: "/signup" }
  );

  // ... perform signup actions ...

  await waitFor(() => {
    expect(screen.getByTestId(MOCK_TEST_IDS.mockReaderScreen)).toBeTruthy();
  });
});
```

## Component Testing Patterns

### Query Strategies

**Use testID for complex structures:**

```typescript
const writtenForm = getByTestId("vocab-item-written-form");
const children = writtenForm.props.children;
expect(children[0]).toBe("hello");
```

**Use getAllByText for duplicate content:**

```typescript
const items = getAllByText("Hello; Good afternoon");
expect(items.length).toBeGreaterThan(0);
```

**Use getByLabelText for accessibility testing:**

```typescript
const link = screen.getByLabelText("Go to destination");
expect(link.props.accessibilityRole).toBe("link");
```

### TestID Conventions

**Components suffix testIDs for interactive elements.** The wrapper View has one testID, the actual interactive element has a suffixed testID.

**Button Component:**

```typescript
// Button.tsx internally does:
<TouchableOpacity testID={testID ? `${testID}-button` : undefined}>
```

**Test must use the suffixed ID:**

```typescript
// ❌ Wrong — gets the wrapper View
const button = getByTestId(AUTH_TEST_IDS.signUpButton);
fireEvent.press(button); // Won't work!

// ✅ Correct — gets the actual TouchableOpacity
const button = getByTestId(`${AUTH_TEST_IDS.signUpButton}-button`);
fireEvent.press(button); // Works!
```

**TextInput Component:**

```typescript
// TextInput.tsx structure:
<View testID={testID ? `${testID}-container` : undefined}>
  <Text testID={testID ? `${testID}-label` : undefined}>{label}</Text>
  <RNTextInput testID={testID ? `${testID}-input` : undefined} />
</View>
```

**Common Suffixes:**

- `-button` — TouchableOpacity/Pressable in Button component
- `-input` — RNTextInput in TextInput component
- `-container` — Wrapper View in TextInput
- `-label` — Label Text in TextInput
- `-icon` — Icon elements
- `-loading` — ActivityIndicator elements

## Best Practices

1. **Simplify first** — if a test needs complex patterns, refactor source code for better testability
2. **Isolate tests** — use `beforeEach`/`afterEach` for setup and cleanup
3. **Always use `waitFor()` for initial render** — components with useEffect need waitFor() even for first assertions
4. **Separate `act()` blocks for form inputs** — each `fireEvent.changeText` needs its own act() to complete state updates
5. **Wrap state updates in `act()`** — manually triggered events that cause state updates must be wrapped in act()
6. **Use suffixed testIDs** — query interactive elements with `-button`, `-input` suffixes, not wrapper Views
7. **Match error handler outputs** — expect messages from error handlers, not raw mock errors
8. **Reset mocks** — call `jest.clearAllMocks()` in `beforeEach` and `jest.restoreAllMocks()` in `afterEach`
9. **Test error cases** — verify error handling and edge cases
10. **Inject dependencies via `deps`** — use `jest.spyOn(deps, "getX")` pattern for all external dependencies
11. **Use fake timers for animations** — wrap animation tests with `jest.useFakeTimers()` and advance with `jest.advanceTimersByTime()`
12. **Don't mock reanimated** — use the official `setUpTests()`, don't create custom reanimated mocks

## TDD Principle: Testability First

**Complex test patterns signal code that violates TDD principles.** When tests require elaborate helpers or tree traversal, the source code likely needs simplification.

### Example: Measurement Placeholder

Initial test required a complex helper to find a measurement View:

```typescript
// ❌ Complex pattern — signals testability issue
const findLayoutView = (element: any): any => {
  // 27 lines of tree traversal logic...
};
const placeholder = findLayoutView(UNSAFE_root);
```

**Solution:** Add a testID to the measurement placeholder in source code:

```typescript
// ✅ Source code change
<View 
  style={styles.measurementPlaceholder} 
  onLayout={handleLayout}
  testID={BOTTOM_SHEET_TEST_IDS.measurementPlaceholder}
/>
```

**Result:** Tests become simple and reliable:

```typescript
// ✅ Simple, direct test
const placeholder = getByTestId(BOTTOM_SHEET_TEST_IDS.measurementPlaceholder);
act(() => {
  fireEvent(placeholder, "layout", { nativeEvent: { layout: { height: 200 } } });
});
```

**Key Principle:** Before writing complex test helpers, ask: "Can I add a testID, export a dependency, or refactor the source code to make this simpler?" The answer is almost always yes.

## Implementation Requirements for Testability

Code must follow these patterns to be testable:

1. **Dependency injection via `deps` object** — export `deps` object with getter functions for all external dependencies
2. **Export test IDs** — export `TEST_IDS` constants from screen/component files
3. **Add testIDs to all testable elements** — even internal/hidden elements that have behavior worth testing
4. **Export error handlers** — make error mapping functions public for independent testing
5. **Set loading state on error** — when returning early from error, update loading to false
6. **Suffix testIDs in components** — interactive elements get suffixed testIDs (e.g., `-button`, `-input`)
7. **Use deps in all async operations** — replace direct imports with `deps.getX()` calls

**When tests become complex, refactor the source code for better testability.** Complex tests are a code smell, not a testing challenge.

## Common Issues and Solutions

### act() Warnings from Providers

Components that include providers with `useEffect` (e.g., AuthProvider calling `getSession()`) will trigger act() warnings because of asynchronous state updates. Suppress by using `waitFor()` for all assertions:

```typescript
await waitFor(() => {
  expect(screen.getByText("Search")).toBeTruthy();
});
```

### State Not Updating in Tests

If form state appears empty when handler runs, ensure each `fireEvent.changeText` is in its own `act()` block:

```typescript
await act(async () => { fireEvent.changeText(emailInput, "test@example.com"); });
await act(async () => { fireEvent.changeText(passwordInput, "password123"); });
await act(async () => { fireEvent.press(submitButton); }); // Now has correct state
```

### Button Press Not Working

Check if you're using the correct suffixed testID:

```typescript
const button = getByTestId(`${AUTH_TEST_IDS.signUpButton}-button`);
```

## Related Documentation

- [Mobile App Patterns](./mobile-app-patterns.md) — Component and state management patterns
- [Mobile Accessibility](./mobile-accessibility.md) — Accessibility requirements
