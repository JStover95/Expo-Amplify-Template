# Mobile Accessibility Guidelines

**Accessibility is absolutely mandatory.** All interactive components must follow these patterns. These guidelines are not optional and must be implemented for all components.

This document outlines the required accessibility patterns for the React Native/Expo mobile app. These patterns ensure the app is usable by people with disabilities and follows platform accessibility standards.

## Table of Contents

1. [Required Accessibility Props](#required-accessibility-props)
2. [Animation and Motion](#animation-and-motion)
3. [Accessibility Roles](#accessibility-roles)
4. [Accessibility Labels and Hints](#accessibility-labels-and-hints)
5. [Accessibility State](#accessibility-state)
6. [Component Integration](#component-integration)

## Required Accessibility Props

**Principle:** All interactive components must require accessibility props to ensure screen reader compatibility and proper semantic meaning.

### Required Pattern

All interactive components must require these accessibility props in their TypeScript interfaces:

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  
  // Required accessibility props
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityState: PressableProps["accessibilityState"];
}

export const Button = ({ 
  title, 
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      accessibilityRole="button"
    >
      <Text>{title}</Text>
    </Pressable>
  );
};
```

### Requirements

1. **Make props required**: Use TypeScript to enforce accessibility props at compile time
2. **Extend native types**: Import accessibility prop types from React Native component types
3. **Document accessibility behavior**: Include accessibility information in component JSDoc

### Example: TextInput with Required Accessibility

```typescript
import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from "react-native";

interface TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChangeText: (text: string) => void;
  
  // Required accessibility props
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityState: RNTextInputProps["accessibilityState"];
}

export const TextInput = ({ 
  label,
  error,
  hint,
  value,
  onChangeText,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: TextInputProps) => {
  return (
    <View>
      {label && <Text>{label}</Text>}
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={accessibilityState}
      />
      {error && <Text>{error}</Text>}
      {hint && !error && <Text>{hint}</Text>}
    </View>
  );
};
```

## Animation and Motion

**Principle:** All animations must respect the user's Reduce Motion preference to prevent motion sickness and accommodate users with vestibular disorders.

### AnimatedContainer Pattern

Use `AnimatedContainer` from `@react-native-ama/animations` for entry and exit animations. This component automatically respects the Reduce Motion preference by setting `duration={0}` for motion properties when Reduce Motion is enabled.

#### AnimatedContainer Implementation Pattern

```typescript
import { AnimatedContainer } from "@react-native-ama/animations";

<AnimatedContainer
  from={{ transform: [{ translateY: "targetHeight" }] }}
  to={{ transform: [{ translateY: 0 }] }}
  exitFrom={{ transform: [{ translateY: "currentHeight" }] }}
  duration={300}
>
  {/* Content */}
</AnimatedContainer>
```

#### AnimatedContainer Requirements

1. **Use AnimatedContainer for mount/unmount animations**: Entry and exit animations must use `AnimatedContainer`
2. **Specify from and to**: Always provide initial and final states
3. **Use special values when needed**: Leverage `targetHeight`, `currentHeight`, etc. for dynamic animations
4. **Set appropriate duration**: Default is 300ms, adjust based on animation type
5. **Combine with other animations**: `AnimatedContainer` can wrap components that use `useAnimatedStyle` for position-based animations

#### Example: BottomSheet with AnimatedContainer

```typescript
import { AnimatedContainer } from "@react-native-ama/animations";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

export const BottomSheet = ({ children, targetPosition }: BottomSheetProps) => {
  // Position-based animation (while mounted)
  const bottomSheetStyle = useAnimatedStyle(() => {
    // ... position calculations
  });

  return (
    <GestureDetector gesture={bottomSheetGesture}>
      {/* Entry/exit animation - respects Reduce Motion */}
      <AnimatedContainer
        from={{ transform: [{ translateY: "targetHeight" }] }}
        to={{ transform: [{ translateY: 0 }] }}
        exitFrom={{ transform: [{ translateY: "currentHeight" }] }}
        duration={300}
      >
        {/* Position-based animation (while mounted) */}
        <Animated.View style={[bottomSheetStyle, styles.container]}>
          {children}
        </Animated.View>
      </AnimatedContainer>
    </GestureDetector>
  );
};
```

#### Benefits

- **Automatic Reduce Motion support**: No need to manually check accessibility settings
- **Consistent animation behavior**: All animations follow the same pattern
- **Better UX**: Users with motion sensitivity can use the app comfortably
- **Platform compliance**: Follows iOS and Android accessibility guidelines

### When to Use AnimatedContainer

Use `AnimatedContainer` for:

- Component mount/unmount animations
- Modal entry/exit animations
- Bottom sheet slide animations
- Drawer open/close animations
- Any animation that should respect Reduce Motion

Continue using `useAnimatedStyle` and `withSpring`/`withTiming` for:

- Position-based animations while component is mounted
- Gesture-driven animations
- Complex multi-step animations
- Animations that don't need Reduce Motion support

## Accessibility Roles

**Principle:** Use appropriate accessibility roles to provide semantic meaning to screen readers.

### Accessibility Roles Required Pattern

Always set `accessibilityRole` for interactive elements:

```typescript
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Sign in"
  accessibilityHint="Tap to sign in to your account"
>
  <Text>Sign In</Text>
</Pressable>
```

### Common Roles

- `button`: For buttons and pressable elements that trigger actions
- `link`: For navigation links
- `text`: For static text (default for Text components)
- `header`: For section headers
- `searchbox`: For search input fields
- `switch`: For toggle switches
- `checkbox`: For checkboxes
- `radio`: For radio buttons

### Accessibility Roles Requirements

1. **Use semantic roles**: Choose the role that best describes the element's purpose
2. **Be consistent**: Use the same role for similar elements across the app
3. **Don't override native roles**: Native components (TextInput, Switch, etc.) have appropriate default roles

## Accessibility Labels and Hints

**Principle:** Provide clear, concise labels and helpful hints that describe the element's purpose and action.

### Accessibility Label

The `accessibilityLabel` must:

- Be concise (ideally 1-3 words)
- Describe what the element is or does
- Be unique when possible
- Not include redundant information (e.g., "Button" suffix)

Examples:

- `accessibilityLabel="Sign in"`
- `accessibilityLabel="Open menu"`
- `accessibilityLabel="Vocabulary item hello"`

### Accessibility Hint

The `accessibilityHint` must:

- Describe what happens when the element is activated
- Be helpful but not redundant with the label
- Use action-oriented language
- Be concise (ideally one sentence)

Examples:

- `accessibilityHint="Tap to sign in to your account"`
- `accessibilityHint="Tap to open the menu drawer"`
- `accessibilityHint="Tap to view more information about the vocabulary item"`

### Accessibility Hint Requirements

1. **Always provide both**: Use both `accessibilityLabel` and `accessibilityHint` for all interactive elements
2. **Test with screen readers**: Verify labels and hints make sense when read aloud
3. **Update dynamically**: Update labels/hints when element state changes
4. **Localize**: Ensure labels and hints are translatable

## Accessibility State

**Principle:** Communicate the current state of interactive elements to screen readers.

### Common States

- `disabled`: Element is disabled
- `selected`: Element is selected
- `checked`: Element is checked (for checkboxes, switches)
- `expanded`: Element is expanded (for collapsible content)
- `busy`: Element is loading or processing

### Accessibility Hint Required Pattern

Always set `accessibilityState` to reflect the current component state:

```typescript
// Button with disabled state
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Submit"
  accessibilityState={{ disabled: isLoading, busy: isLoading }}
  disabled={isLoading}
>
  <Text>Submit</Text>
</Pressable>

// Expandable item
<Pressable
  accessibilityRole="button"
  accessibilityLabel={`Vocabulary item ${word}`}
  accessibilityState={{ expanded: isExpanded }}
  onPress={handleToggle}
>
  {/* Content */}
</Pressable>
```

### Accessibility Hint Common States

- `disabled`: Element is disabled
- `selected`: Element is selected
- `checked`: Element is checked (for checkboxes, switches)
- `expanded`: Element is expanded (for collapsible content)
- `busy`: Element is loading or processing

## Component Integration

**Principle:** Integrate accessibility requirements into component architecture from the start.

### Thin Wrapper Pattern with Accessibility

When creating component wrappers, accessibility should be a first-class concern:

```typescript
/**
 * Button component
 * 
 * @see design-docs/mobile-accessibility.md
 */

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  
  // Required accessibility
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        ...accessibilityState,
        disabled: disabled || loading,
        busy: loading,
      }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text>{title}</Text>
      )}
    </Pressable>
  );
});
```

### Component Accessibility Checklist

When creating or updating components, ensure:

- [ ] Required accessibility props are defined in the interface
- [ ] `accessibilityRole` is set appropriately
- [ ] `accessibilityLabel` is clear and concise
- [ ] `accessibilityHint` describes the action
- [ ] `accessibilityState` reflects component state
- [ ] Animations use `AnimatedContainer` when appropriate
- [ ] Component is tested with screen readers
- [ ] Accessibility props are documented in JSDoc

### Integration with Design Patterns

Accessibility requirements integrate with other design patterns:

- **Thin Wrapper Pattern**: Accessibility props are required in wrapper interfaces
- **State Management**: Accessibility state should be included in state objects when relevant
- **Testing Strategy**: Test IDs work alongside accessibility labels for testing

## Related Guidelines

- [Mobile App Patterns](./mobile-app-patterns.md) - Component architecture and design patterns
- [TypeScript Documentation](./typescript-documentation.md) - Interface and type documentation
