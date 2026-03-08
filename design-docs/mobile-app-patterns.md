# Mobile App Design Patterns

This document outlines the core design patterns and architectural principles for the React Native/Expo mobile app.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [State Management](#state-management)
3. [Component Architecture](#component-architecture)
4. [Styling Patterns](#styling-patterns)

**For performance optimization patterns (memoization, state management, cleanup), see [Mobile Optimization](./mobile-optimization.md).**

## Testing Strategy

### Test ID Conventions

**Principle:** All routes must define test IDs for interactive and testable elements to enable reliable automated testing.

#### Test ID Implementation Pattern

```typescript
// Define test IDs as a constant object at the route level
export const AUTH_TEST_IDS = {
  emailInput: "auth-email-input",
  passwordInput: "auth-password-input",
  signInButton: "auth-sign-in-button",
  signUpButton: "auth-sign-up-button",
} as const;
```

#### Guidelines

1. **Route-level constants**: Define test IDs as exported constants at the top of each route file
2. **Naming convention**: Use `{FEATURE}_TEST_IDS` for the constant name
3. **ID format**: Use kebab-case with descriptive names: `{scope}-{element}-{type}`
4. **TypeScript const assertion**: Use `as const` to ensure type safety and autocompletion

#### Conditional Elements

For conditionally rendered elements (labels, errors, hints), apply test IDs conditionally:

```typescript
testID={testID ? `${testID}-label` : undefined}
```

**Rationale:** This ensures that:

- Optional UI elements can be tested when they appear
- Test IDs are only applied when a parent test ID is provided
- Component hierarchies maintain consistent test ID patterns

#### Best Practices

- Define test IDs for all interactive elements (buttons, inputs, links)
- Define test IDs for conditionally rendered elements (errors, loading states)
- Use consistent naming patterns across routes
- Export test ID constants for use in tests
- Never hard-code test IDs inline without constants

#### Example: Complete Implementation

```typescript
// Route file: app/(auth)/login.tsx
export const AUTH_TEST_IDS = {
  emailInput: "auth-email-input",
  passwordInput: "auth-password-input",
  signInButton: "auth-sign-in-button",
} as const;

export default function Login() {
  return (
    <View>
      <TextInput
        testID={AUTH_TEST_IDS.emailInput}
        // ... other props
      />
      <Button
        testID={AUTH_TEST_IDS.signInButton}
        // ... other props
      />
    </View>
  );
}
```

```typescript
// Component file: components/ui/TextInput.tsx
export const TextInput = ({ testID, label, error, hint, ...props }) => {
  return (
    <View testID={testID ? `${testID}-container` : undefined}>
      {label && (
        <Text testID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
      )}
      <RNTextInput
        testID={testID ? `${testID}-input` : undefined}
        {...props}
      />
      {error && (
        <Text testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      )}
      {hint && !error && (
        <Text testID={testID ? `${testID}-hint` : undefined}>
          {hint}
        </Text>
      )}
    </View>
  );
};
```

## State Management

### Single State Object Pattern

**Principle:** Group related state variables into a single state object for atomic, predictable updates.

#### Implementation Pattern

Multiple independent `useState` calls for related state can cause race conditions, non-atomic updates, and consistency issues. Group related state into a single object for atomic updates:

```typescript
// ✅ RECOMMENDED: Single state object
interface LoginState {
  email: string;
  password: string;
  errorMessage: string | null;
  hasError: boolean;
}

const [state, setState] = useState<LoginState>({
  email: "",
  password: "",
  errorMessage: null,
  hasError: false,
});

// Benefits:
// 1. Atomic updates - all related state changes happen together
// 2. Predictable - state is always consistent
// 3. Single re-render per update
const handleSubmit = async () => {
  setState((prev) => ({ 
    ...prev, 
    hasError: false, 
    errorMessage: null 
  })); // Single atomic update
  
  const { success, error } = await signIn(state.email, state.password);
  
  if (!success && error) {
    setState((prev) => ({ 
      ...prev, 
      errorMessage: error, 
      hasError: true 
    })); // Another single atomic update
  }
};
```

#### When to Use This Pattern

Use single state object when:

- State variables are related/coupled (e.g., form fields, error states)
- Multiple state variables need to update together
- State consistency is important
- Reducing re-renders is beneficial

Use separate `useState` hooks when:

- State variables are truly independent
- Over-engineering simple components (single boolean flag, etc.)
- Different state variables trigger different side effects

#### Single State Object Pattern Guidelines

1. **Define TypeScript interface**: Always type your state object
2. **Use functional updates**: Use `setState((prev) => ({ ...prev, ... }))` for atomic updates
3. **Spread previous state**: Always spread `prev` to preserve unchanged fields
4. **Group by relationship**: Only group state that logically belongs together

#### Example: Form with Validation

```typescript
interface FormState {
  // Form fields
  email: string;
  password: string;
  confirmPassword: string;
  
  // Validation state
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  
  // UI state
  isSubmitting: boolean;
  submitError: string | null;
}

const [state, setState] = useState<FormState>({
  email: "",
  password: "",
  confirmPassword: "",
  errors: {},
  isSubmitting: false,
  submitError: null,
});

// Atomic field update
const handleEmailChange = (email: string) => {
  setState((prev) => ({ 
    ...prev, 
    email,
    errors: { ...prev.errors, email: undefined } // Clear error atomically
  }));
};

// Atomic submit with multiple state changes
const handleSubmit = async () => {
  setState((prev) => ({ 
    ...prev, 
    isSubmitting: true, 
    submitError: null 
  }));
  
  try {
    await submitForm(state.email, state.password);
    // Success - navigate away or reset form
  } catch (error) {
    setState((prev) => ({ 
      ...prev, 
      isSubmitting: false,
      submitError: error.message 
    }));
  }
};
```

## Component Architecture

### Thin Wrapper Pattern

**Principle:** Create reusable UI components as thin wrappers around native React Native components to establish consistent patterns while maintaining flexibility.

#### Why Thin Wrappers?

1. **Consistency**: Enforce design system standards
2. **Reusability**: Share common patterns across the app
3. **Maintainability**: Single source of truth for component behavior
4. **Flexibility**: Don't over-abstract - keep close to native APIs
5. **Performance**: Add optimizations (memoization, etc.) in one place

#### Thin Wrapper Implementation Pattern

```typescript
// ✅ GOOD: Thin wrapper with focused enhancements
import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from "react-native";

interface TextInputProps {
  // Custom props for enhanced functionality
  label?: string;
  error?: string;
  hint?: string;
  testID?: string;
  
  // Pass through essential native props
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: RNTextInputProps["keyboardType"];
  autoCapitalize?: RNTextInputProps["autoCapitalize"];
  
  // Required accessibility props (see mobile-accessibility.md)
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityState: RNTextInputProps["accessibilityState"];
}

export const TextInput = React.memo(({ 
  label, 
  error, 
  hint, 
  testID,
  ...nativeProps 
}: TextInputProps) => {
  const { colors } = useTheme();
  
  return (
    <View>
      {label && <Text>{label}</Text>}
      <RNTextInput
        {...nativeProps}
        style={[styles.input, { color: colors.text }]}
        testID={testID ? `${testID}-input` : undefined}
      />
      {error && <Text style={{ color: colors.error }}>{error}</Text>}
      {hint && !error && <Text>{hint}</Text>}
    </View>
  );
});
```

#### Thin Wrapper Pattern Guidelines

1. **Start with native props**: Import and extend native component types
2. **Add focused enhancements**: Label, error handling, consistent styling
3. **Require accessibility**: Make accessibility props required (see [Mobile Accessibility](./mobile-accessibility.md))
4. **Support theming**: Integrate with theme context
5. **Add test IDs**: Include systematic test ID support
6. **Optimize with memo**: Use `React.memo` for performance (see [Mobile Optimization](./mobile-optimization.md))
7. **Don't over-abstract**: If you need full native API access, expose it

#### What to Include in Wrappers

Include:

- Consistent styling/theming
- Standard layout patterns (label, error, hint)
- Accessibility enhancements (see [Mobile Accessibility](./mobile-accessibility.md))
- Test ID patterns
- Common props used across the app
- Performance optimizations (memoization, style memoization)

Avoid:

- Complex business logic
- API calls or data fetching
- Heavy state management
- Props you might never use

#### Anti-Pattern: Over-Abstraction

```typescript
// ❌ BAD: Over-abstracted, loses flexibility
interface TextInputProps {
  variant: "email" | "password" | "text" | "number" | "phone";
  size: "small" | "medium" | "large";
  theme: "light" | "dark" | "primary" | "secondary";
  validationRules: ValidationRule[];
  // ... 20+ more custom props
}

// Problems:
// 1. Too opinionated - hard to use for edge cases
// 2. Loses access to native props
// 3. Maintenance burden as requirements grow
// 4. Difficult to extend without modifying wrapper
```

#### Component Wrapper Checklist

When creating a component wrapper, ensure:

- [ ] Extends native component TypeScript types
- [ ] Makes accessibility props required (see [Mobile Accessibility](./mobile-accessibility.md))
- [ ] Integrates with theme system
- [ ] Supports test IDs (with conditional child test IDs)
- [ ] Uses React.memo for optimization (see [Mobile Optimization](./mobile-optimization.md))
- [ ] Memoizes dynamic styles (see [Mobile Optimization](./mobile-optimization.md))
- [ ] Provides focused, common enhancements only
- [ ] Documents interfaces and props with JSDoc (see [TypeScript Documentation](./typescript-documentation.md))
- [ ] References design docs in component file header

#### Example: Complete Button Wrapper

```typescript
/**
 * Button component
 * 
 * @see design-docs/mobile-app-patterns.md
 */

import React, { useMemo } from "react";
import { 
  Pressable, 
  Text, 
  ActivityIndicator,
  type PressableProps 
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext/use-theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  
  // Required accessibility (see mobile-accessibility.md)
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityState: PressableProps["accessibilityState"];
}

export const Button = React.memo(({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ButtonProps) => {
  const { colors } = useTheme();
  
  const buttonStyles = useMemo(() => ({
    backgroundColor: variant === "primary" ? colors.primary : colors.secondary,
    opacity: disabled ? 0.5 : 1,
    // ... other styles
  }), [variant, disabled, colors]);
  
  const textStyles = useMemo(() => ({
    color: colors.onPrimary,
    // ... other styles
  }), [colors]);
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyles}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityRole="button" // See mobile-accessibility.md for accessibility patterns
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator 
          color={colors.onPrimary}
          testID={testID ? `${testID}-loading` : undefined}
        />
      ) : (
        <Text 
          style={textStyles}
          testID={testID ? `${testID}-text` : undefined}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
});
```

## Styling Patterns

### StyleSheet Usage

**Principle:** All component styles must be defined using `StyleSheet.create()` rather than inline style objects. Inline style objects create new objects on every render (performance impact), lack type checking, and are harder to maintain and reuse.

```typescript
// ✅ RECOMMENDED: StyleSheet.create()
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});

<View style={styles.container}>
  <Text style={[styles.text, { color: colors.text }]}>
    Content
  </Text>
</View>

// Benefits:
// 1. Styles are created once and reused
// 2. Better performance (no object creation on render)
// 3. Type checking for style properties
// 4. Easier to maintain and refactor
```

#### Dynamic Styles

For styles that depend on theme or props, combine StyleSheet with dynamic values:

```typescript
// ✅ GOOD: Static styles in StyleSheet, dynamic values in array
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});

// See mobile-optimization.md for detailed memoization patterns
const containerStyles = useMemo(
  () => [styles.container, { backgroundColor: colors.surface }],
  [colors.surface]
);

const textStyles = useMemo(
  () => [styles.text, { color: colors.text }],
  [colors.text]
);

<View style={containerStyles}>
  <Text style={textStyles}>Content</Text>
</View>
```

#### StyleSheet Guidelines

1. **Always use StyleSheet.create()**: Never use inline style objects for static styles
2. **Memoize dynamic styles**: Use `useMemo` when combining static and dynamic styles
3. **Group related styles**: Keep styles organized by component section
4. **Use descriptive names**: Style names should clearly indicate their purpose
5. **Place at bottom**: Define styles at the bottom of the file, after the component

#### When Inline Styles Are Acceptable

Acceptable inline styles:

- Animated styles from `react-native-reanimated` (use `useAnimatedStyle`)
- One-off style overrides passed as props
- Dynamic calculations that can't be memoized effectively

Never use inline styles for:

- Static style objects
- Repeated style patterns
- Component base styles

### Section Comments

**Principle:** Add descriptive comments above each major section of a component to explain its purpose and functionality. This improves code readability and maintainability.

```typescript
// ✅ RECOMMENDED: Descriptive section comments
return (
  <View style={styles.container}>
    {/* Header - displays page title and navigation */}
    <View style={styles.header}>
      <Text>Title</Text>
    </View>
    
    {/* Form content - input fields and submit button */}
    <View style={styles.content}>
      <TextInput />
      <Button />
    </View>
    
    {/* Footer - navigation link to other screens */}
    <View style={styles.footer}>
      <Link />
    </View>
  </View>
);
```

#### Section Comment Guidelines

1. **Describe purpose**: Each comment should explain what the section does, not just what it is
2. **Be concise**: Keep comments brief but informative
3. **Use consistent format**: Start with the section name, then a dash, then description
4. **Comment major sections**: Focus on logical sections, not every single element
5. **Update with code**: Keep comments in sync with code changes

#### Example: Complete Component with Section Comments

```typescript
export const BottomSheet = ({ children, targetPosition }: BottomSheetProps) => {
  // ... hooks and logic ...

  return (
    <>
      {/* Placeholder view - positioned absolutely to measure full content height */}
      <View
        style={styles.measurementPlaceholder}
        onLayout={handleLayout}
      />

      {/* Bottom sheet container - draggable gesture detector wrapping animated view */}
      <GestureDetector gesture={bottomSheetGesture}>
        <Animated.View style={[bottomSheetStyle, styles.bottomSheetContainer]}>
          {/* Bottom sheet handle - visual indicator for dragging with centered handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          {/* Bottom sheet content area - scrollable content container */}
          <View style={styles.contentContainer}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  measurementPlaceholder: {
    position: "absolute",
    height: "100%",
  },
  bottomSheetContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "black",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: "transparent",
  },
  handleBar: {
    width: 60,
    height: 8,
    borderRadius: 8,
  },
  contentContainer: {
    flex: 1,
    padding: Spacing.md,
  },
});
```

#### Section Comment Checklist

When adding section comments, ensure:

- [ ] Each major logical section has a descriptive comment
- [ ] Comments explain the purpose, not just the element type
- [ ] Comments are concise but informative
- [ ] Format is consistent: `{/* Section name - description */}`
- [ ] Comments are kept up-to-date with code changes

#### Benefits of Section Comments

- Improved readability: New developers can quickly understand component structure
- Better maintenance: Easier to locate and modify specific sections
- Documentation: Comments serve as inline documentation
- Onboarding: Helps new team members understand the codebase faster
