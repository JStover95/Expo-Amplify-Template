# Native Module Development Guide

This document provides patterns and best practices for building Expo native modules.

## Table of Contents

1. [Module Structure](#module-structure)
2. [iOS Implementation](#ios-implementation)
3. [Android Implementation](#android-implementation)
4. [Auto-Sizing Views](#auto-sizing-views)
5. [TypeScript Integration](#typescript-integration)
6. [Threading and Main Queue](#threading-and-main-queue)
7. [Ref Forwarding](#ref-forwarding)
8. [Testing Native Modules](#testing-native-modules)

## Module Structure

### Directory Layout

Native modules should follow this structure:

```plaintext
modules/
  {module-name}/
    ├── ios/
    │   ├── {ModuleName}Module.swift
    │   └── {ModuleName}View.swift
    ├── android/
    │   └── src/main/java/expo/modules/{modulename}/
    │       ├── {ModuleName}Module.kt
    │       └── {ModuleName}View.kt
    ├── src/
    │   ├── {ModuleName}.types.ts
    │   ├── {ModuleName}View.tsx
    │   └── index.ts
    └── expo-module.config.json
```

### Naming Conventions

- **iOS files**: PascalCase (e.g., `TappableTextModule.swift`)
- **Android files**: PascalCase for classes, lowercase for package names
- **TypeScript files**: PascalCase for components, camelCase for types
- **Module name**: Use consistent naming across all platforms

## iOS Implementation

### iOS Module Definition

```swift
import ExpoModulesCore

public class YourModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YourModule")
    
    // Define view component
    View(YourView.self) {
      Prop("propName") { (view: YourView, value: Type) in
        view.propName = value
      }
      
      Events("onEventName")
    }
    
    // Module-level functions (if needed)
    AsyncFunction("functionName") { (arg1: Type1, arg2: Type2) -> ReturnType in
      // Implementation
    }
    .runOnQueue(.main)  // Only if accessing UI
  }
}
```

### iOS View Component Pattern

```swift
class YourView: ExpoView {
  // Native subviews
  let nativeView = UIView()
  
  // Event dispatchers
  let onEventName = EventDispatcher()
  
  // Properties with didSet observers
  var propName: Type = defaultValue {
    didSet {
      updateView()
    }
  }
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    // Setup view
    addSubview(nativeView)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    nativeView.frame = bounds
  }
  
  private func updateView() {
    // Update native view based on props
  }
}
```

### View Commands vs Module Functions

**Important:** iOS Expo modules do **not** support view commands in the traditional React Native sense. Use one of these patterns instead:

#### Pattern 1: Module-level AsyncFunction (Recommended for imperative operations)

```swift
// In module definition
AsyncFunction("commandName") { (viewTag: Int, arg: Type) -> Void in
  guard let appContext = self.appContext else { return }
  guard let view = appContext.findView(withTag: viewTag, ofType: YourView.self) else {
    return
  }
  DispatchQueue.main.async {
    view.performAction(arg)
  }
}
.runOnQueue(.main)
```

#### Pattern 2: Props (Recommended for simple operations)

Use props with `didSet` observers for simpler operations that can be represented as state changes.

## Android Implementation

### Android Module Definition

```kotlin
package expo.modules.yourmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YourModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("YourModule")
    
    View(YourView::class) {
      Prop("propName") { view: YourView, value: Type ->
        view.setPropName(value)
      }
      
      Events("onEventName")
      
      // Commands work on Android
      Command("commandName") { view: YourView, args: List<Type> ->
        val arg = args.firstOrNull() ?: return@Command
        view.performAction(arg)
      }
    }
  }
}
```

### Android View Component Pattern

```kotlin
class YourView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  // Event emitter
  private val onEventName by EventDispatcher()
  
  // Native view
  internal val nativeView = NativeViewClass(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }
  
  init {
    addView(nativeView)
  }
  
  fun setPropName(value: Type) {
    // Update view
  }
  
  fun performAction(arg: Type) {
    // Perform action
  }
}
```

## Auto-Sizing Views

Native views that should size to their content (like text that wraps) require explicit measurement coordination between native code and JavaScript.

### Pattern: Content Size Events

Use an event-driven approach where the native view measures itself and emits size updates to JavaScript, which then applies the measured height.

#### Auto-Sizing Views iOS Implementation

```swift
class YourView: ExpoView {
  let textView = UITextView()
  let onContentSizeChange = EventDispatcher()
  private var lastReportedSize: CGSize = .zero
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    textView.isScrollEnabled = false  // Required for content-based sizing
    addSubview(textView)
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    textView.frame = bounds
    updateContentSizeIfNeeded()
  }
  
  func updateContentSizeIfNeeded() {
    guard bounds.width > 0 else { return }
    
    let contentSize = textView.sizeThatFits(
      CGSize(width: bounds.width, height: .greatestFiniteMagnitude)
    )
    
    if contentSize != lastReportedSize {
      lastReportedSize = contentSize
      onContentSizeChange([
        "width": contentSize.width,
        "height": contentSize.height
      ])
    }
  }
  
  override func sizeThatFits(_ size: CGSize) -> CGSize {
    let textSize = textView.sizeThatFits(
      CGSize(width: size.width, height: .greatestFiniteMagnitude)
    )
    return CGSize(width: size.width, height: textSize.height)
  }
  
  override var intrinsicContentSize: CGSize {
    let textSize = textView.sizeThatFits(
      CGSize(width: bounds.width > 0 ? bounds.width : .greatestFiniteMagnitude,
             height: .greatestFiniteMagnitude)
    )
    return CGSize(width: UIView.noIntrinsicMetric, height: textSize.height)
  }
}
```

In the module definition:

```swift
View(YourView.self) {
  Events("onContentSizeChange")
  
  Prop("text") { (view: YourView, text: String) in
    view.textView.text = text
    view.invalidateIntrinsicContentSize()
    view.setNeedsLayout()
    DispatchQueue.main.async {
      view.updateContentSizeIfNeeded()
    }
  }
}
```

#### Auto-Sizing Views Android Implementation

```kotlin
class YourView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onContentSizeChange by EventDispatcher()
  private var lastReportedHeight = 0
  
  internal val textView = TextView(context).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
  }
  
  init {
    addView(textView)
    
    textView.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
      updateContentSizeIfNeeded()
    }
  }
  
  private fun updateContentSizeIfNeeded() {
    textView.measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
    )
    
    val measuredHeight = textView.measuredHeight
    
    if (measuredHeight != lastReportedHeight && measuredHeight > 0) {
      lastReportedHeight = measuredHeight
      onContentSizeChange(mapOf(
        "width" to width,
        "height" to measuredHeight
      ))
    }
  }
  
  fun requestContentSizeUpdate() {
    post {
      updateContentSizeIfNeeded()
    }
  }
}
```

In the module definition:

```kotlin
View(YourView::class) {
  Events("onContentSizeChange")
  
  Prop("text") { view: YourView, text: String ->
    view.textView.text = text
    view.requestContentSizeUpdate()
  }
}
```

#### TypeScript Wrapper

```typescript
// YourModule.types.ts
export interface YourViewProps {
  text: string;
  style?: StyleProp<ViewStyle>;
}

export interface ContentSizeChangeEvent {
  width: number;
  height: number;
}

// YourView.tsx
const NativeView: React.ComponentType<YourViewProps & {
  onContentSizeChange?: (event: { nativeEvent: ContentSizeChangeEvent }) => void;
}> = requireNativeView("YourModule");

export default function YourView(props: YourViewProps) {
  const [measuredHeight, setMeasuredHeight] = React.useState<number | undefined>(undefined);
  
  const handleContentSizeChange = React.useCallback(
    (event: { nativeEvent: ContentSizeChangeEvent }) => {
      const { height } = event.nativeEvent;
      setMeasuredHeight(height);
    },
    []
  );
  
  return (
    <NativeView
      {...props}
      onContentSizeChange={handleContentSizeChange}
      style={[
        props.style,
        measuredHeight !== undefined ? { height: measuredHeight } : undefined,
      ]}
    />
  );
}
```

### Key Points

- **Disable scrolling** on text views that should size to content (`isScrollEnabled = false` on iOS, `WRAP_CONTENT` on Android)
- **Call measurement on prop changes** - trigger size updates whenever text, fontSize, padding, or other layout-affecting props change
- **Debounce updates** - track last reported size to avoid redundant events
- **Async dispatch** - use `DispatchQueue.main.async` (iOS) or `post` (Android) to ensure layout has settled before measuring

## TypeScript Integration

### Type Definitions

```typescript
// YourModule.types.ts
export interface YourViewProps {
  propName?: Type;
  onEventName?: (event: { nativeEvent: EventType }) => void;
  style?: StyleProp<ViewStyle>;
}

export interface YourViewRef {
  commandName: (arg: Type) => void;
}

export interface EventType {
  field1: Type1;
  field2: Type2;
}
```

### View Component with Ref Forwarding

```typescript
// YourView.tsx
import { requireNativeView } from "expo";
import * as React from "react";
import { findNodeHandle, UIManager, Platform } from "react-native";
import { YourViewProps, YourViewRef } from "./YourModule.types";

// Don't explicitly type requireNativeView - let TypeScript infer ref support
const NativeView = requireNativeView("YourModule");

export const YourView = React.forwardRef<YourViewRef, YourViewProps>(
  (props, ref) => {
    const nativeRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      commandName: (arg: Type) => {
        const nodeHandle = findNodeHandle(nativeRef.current);
        if (nodeHandle == null) return;

        if (Platform.OS === "android") {
          // Android: Use UIManager command
          const viewManagerConfig = UIManager.getViewManagerConfig("YourModule");
          if (viewManagerConfig?.Commands?.commandName != null) {
            UIManager.dispatchViewManagerCommand(
              nodeHandle,
              viewManagerConfig.Commands.commandName,
              [arg]
            );
          }
        } else {
          // iOS: Use module function
          const nativeModule = require("expo").requireNativeModule("YourModule");
          if (nativeModule?.commandName) {
            nativeModule.commandName(nodeHandle, arg);
          }
        }
      },
    }));

    return <NativeView ref={nativeRef} {...props} />;
  }
);

YourView.displayName = "YourView";
```

### Barrel Export

```typescript
// index.ts
export { YourView } from "./YourView";
export type {
  YourViewProps,
  YourViewRef,
  EventType,
} from "./YourModule.types";
```

## Threading and Main Queue

### Critical Rule: Main Thread for UI Operations

**All UI-related operations MUST run on the main thread.** This includes:

- Accessing view hierarchy
- Modifying view properties
- Scrolling operations
- Layout changes
- Gesture handling

### iOS Main Queue Pattern

```swift
AsyncFunction("uiOperation") { (viewTag: Int, arg: Type) -> Void in
  guard let appContext = self.appContext else { return }
  guard let view = appContext.findView(withTag: viewTag, ofType: YourView.self) else {
    return
  }
  // Ensure UI operation runs on main queue
  DispatchQueue.main.async {
    view.performUIOperation(arg)
  }
}
.runOnQueue(.main)  // Ensures function lookup happens on main queue
```

**Why both `.runOnQueue(.main)` and `DispatchQueue.main.async`?**

- `.runOnQueue(.main)`: Ensures `findView` (which accesses the view registry) runs on the main queue
- `DispatchQueue.main.async`: Ensures the actual UI operation runs on the main queue (defense in depth)

### Android Main Thread Pattern

```kotlin
Command("uiOperation") { view: YourView, args: List<Type> ->
  val arg = args.firstOrNull() ?: return@Command
  // Post to main thread if not already on it
  view.post {
    view.performUIOperation(arg)
  }
}
```

### When to Use Main Queue

| Operation | Main Queue Required? | Pattern |
| ----------- | --------------------- | --------- |
| Reading view properties | ✅ Yes | `.runOnQueue(.main)` |
| Modifying view properties | ✅ Yes | `.runOnQueue(.main)` + `DispatchQueue.main.async` |
| Accessing view hierarchy | ✅ Yes | `.runOnQueue(.main)` |
| Pure computation | ❌ No | Default background queue |
| Network requests | ❌ No | Default background queue |
| File I/O | ❌ No | Default background queue |

## Ref Forwarding

### Pattern for Components with Native Commands

```typescript
const NativeView = requireNativeView("ModuleName");
// ❌ DON'T: const NativeView: React.ComponentType<Props> = requireNativeView("ModuleName");
// ✅ DO: Let TypeScript infer the type to preserve ref support

export const YourView = React.forwardRef<RefType, PropsType>(
  (props, ref) => {
    const nativeRef = React.useRef<any>(null);

    React.useImperativeHandle(ref, () => ({
      method1: (arg: Type) => {
        // Call native method
      },
      method2: (arg: Type) => {
        // Call native method
      },
    }));

    return <NativeView ref={nativeRef} {...props} />;
  }
);
```

### Using Refs in Parent Components

```typescript
function ParentComponent() {
  const viewRef = useRef<YourViewRef>(null);

  const handleAction = useCallback(() => {
    viewRef.current?.methodName(arg);
  }, [arg]);

  return <YourView ref={viewRef} {...props} />;
}
```

## Testing Native Modules

### Unit Testing Native Code

#### iOS (Swift)

Use XCTest for unit testing:

```swift
import XCTest
@testable import YourModule

class YourViewTests: XCTestCase {
  func testPropertyUpdate() {
    let view = YourView()
    view.propName = newValue
    // Assert expected behavior
  }
}
```

#### Android (Kotlin)

Use JUnit for unit testing:

```kotlin
import org.junit.Test
import org.junit.Assert.*

class YourViewTest {
  @Test
  fun testPropertyUpdate() {
    val view = YourView(context, appContext)
    view.setPropName(newValue)
    // Assert expected behavior
  }
}
```

### Integration Testing

Test the JavaScript-Native bridge:

```typescript
import { render } from "@testing-library/react-native";
import { YourView } from "./YourView";

describe("YourView", () => {
  it("should call native method through ref", () => {
    const ref = createRef<YourViewRef>();
    render(<YourView ref={ref} />);
    
    // Call method through ref
    ref.current?.methodName(arg);
    
    // Assert expected behavior
  });
});
```

### Manual Testing Checklist

- [ ] iOS simulator - Debug build
- [ ] iOS simulator - Release build
- [ ] iOS device - Debug build
- [ ] iOS device - Release build
- [ ] Android emulator - Debug build
- [ ] Android emulator - Release build
- [ ] Android device - Debug build
- [ ] Android device - Release build

## Common Pitfalls

### 1. Type Annotation Prevents Ref Support

❌ **Wrong:**

```typescript
const NativeView: React.ComponentType<Props> = requireNativeView("Module");
```

✅ **Correct:**

```typescript
const NativeView = requireNativeView("Module");
```

### 2. iOS View Commands

❌ **Wrong (iOS doesn't support this):**

```swift
View(YourView.self) {
  Commands {
    Command("commandName") { view, args in
      // This doesn't work on iOS
    }
  }
}
```

✅ **Correct:**

```swift
// Use module-level AsyncFunction instead
AsyncFunction("commandName") { (viewTag: Int, arg: Type) -> Void in
  // Implementation
}
.runOnQueue(.main)
```

### 3. Forgetting Main Queue for UI Operations

❌ **Wrong:**

```swift
AsyncFunction("scroll") { (viewTag: Int, position: Int) -> Void in
  let view = appContext.findView(...)  // Crashes: not on main queue
  view.scroll(to: position)
}
```

✅ **Correct:**

```swift
AsyncFunction("scroll") { (viewTag: Int, position: Int) -> Void in
  guard let view = appContext.findView(...) else { return }
  DispatchQueue.main.async {
    view.scroll(to: position)
  }
}
.runOnQueue(.main)
```

### 4. Android vs iOS Command Differences

Remember that Android supports view-level commands but iOS requires module-level functions. Handle both in TypeScript:

```typescript
if (Platform.OS === "android") {
  // Use UIManager.dispatchViewManagerCommand
} else {
  // Use module function
}
```

## Best Practices Summary

1. **Always use `.runOnQueue(.main)` for UI operations** on iOS
2. **Let TypeScript infer types** from `requireNativeView` to preserve ref support
3. **Use module-level AsyncFunctions** for iOS commands, view-level Commands for Android
4. **Wrap UI operations in DispatchQueue.main.async** (iOS) or `view.post` (Android)
5. **Test on both platforms** and both debug/release builds
6. **Document threading requirements** in code comments
7. **Use TypeScript for type safety** at the JavaScript-Native boundary
8. **Follow the module structure** for consistency
9. **Export types from barrel files** for clean imports
10. **Handle platform differences** gracefully in TypeScript

## Resources

- [Expo Modules API Reference](https://docs.expo.dev/modules/module-api/)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-intro)
- [Swift Concurrency and Main Thread](https://developer.apple.com/documentation/dispatch/dispatchqueue)
- [Android View and Threading](https://developer.android.com/guide/components/processes-and-threads)
