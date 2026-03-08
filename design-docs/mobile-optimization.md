# Mobile Optimization Patterns

This document outlines optimization patterns and best practices for React Native mobile applications, focusing on performance, memory efficiency, and maintainable code structure.

## Table of Contents

1. [State Management Optimization](#state-management-optimization)
2. [Derived State](#derived-state)
3. [Effect Dependencies](#effect-dependencies)
4. [Ref-Based State](#ref-based-state)
5. [Cleanup and Memory Management](#cleanup-and-memory-management)
6. [Component Memoization](#component-memoization)

## State Management Optimization

### Eliminate Redundant State

**Principle:** Never store the same data in multiple forms. Derive one form from the other using `useMemo`.

When state exists in multiple structures (e.g., both a Map and an Array), every update requires synchronizing both, creating opportunities for bugs and consuming extra memory.

```typescript
// ❌ BAD: Redundant state storage
interface State {
  itemsMap: Map<string, Item>;
  itemsArray: Item[];  // Duplicate data
}

// Every update must sync both
setState((prev) => {
  const newMap = new Map(prev.itemsMap);
  newMap.set(item.id, item);
  return {
    ...prev,
    itemsMap: newMap,
    itemsArray: [...prev.itemsArray, item],  // Manual sync
  };
});

// ✅ GOOD: Single source of truth with derived state
interface State {
  itemsMap: Map<string, Item>;
}

// Derive array only when needed
const itemsArray = useMemo(() => {
  return Array.from(state.itemsMap.values()).sort(
    (a, b) => a.order - b.order
  );
}, [state.itemsMap]);

// Updates only touch the Map
setState((prev) => {
  const newMap = new Map(prev.itemsMap);
  newMap.set(item.id, item);
  return { ...prev, itemsMap: newMap };
});
```

**Benefits:**

- ~50% memory reduction (no duplicate storage)
- Eliminates desync bugs
- Simpler update logic
- Single source of truth

### Extract Helper Functions for Complex Logic

**Principle:** When state updates involve complex calculations, extract helper functions to simplify code and improve testability.

```typescript
// ❌ BAD: Complex logic embedded in setState
setState((prev) => {
  // 30 lines of complex logic inline...
  let matchedIndex: number | null = null;
  for (const idx of prev.items) {
    const range = findRange(text, item.text, idx);
    if (range) {
      matchedIndex = idx;
      break;
    }
  }
  // More complex logic...
});

// ✅ GOOD: Extract helper functions
function findMatchingIndex(
  text: string,
  item: Item,
  candidates: Set<number>
): number | null {
  for (const idx of candidates) {
    const range = findRange(text, item.text, idx);
    if (range) return idx;
  }
  return null;
}

setState((prev) => {
  const matchedIndex = findMatchingIndex(prev.text, item, prev.candidates);
  if (!matchedIndex) return prev;
  // Simple, readable update logic
  return { ...prev, processedItems: new Set([...prev.processedItems, matchedIndex]) };
});
```

**Benefits:**

- Testable helper functions
- Clearer update logic
- Easier to optimize individual functions
- Better code organization

## Derived State

### Use useMemo for Computed Values

**Principle:** Derive computed values from state using `useMemo` rather than storing them in state.

```typescript
// ❌ BAD: Storing derived state
const [items, setItems] = useState<Item[]>([]);
const [sortedItems, setSortedItems] = useState<Item[]>([]);

// Must manually sync
useEffect(() => {
  setSortedItems([...items].sort((a, b) => a.order - b.order));
}, [items]);

// ✅ GOOD: Derive with useMemo
const [items, setItems] = useState<Item[]>([]);

const sortedItems = useMemo(() => {
  return [...items].sort((a, b) => a.order - b.order);
}, [items]);
```

**When to use `useMemo`:**

- Sorting or filtering arrays
- Converting between data structures (Map ↔ Array)
- Complex calculations based on state
- Creating derived props for child components

**When NOT to use `useMemo`:**

- Simple property access (`user.name`)
- Primitive calculations (`count * 2`)
- Values used once per render

### Sort Maintenance Strategy

**Principle:** When dealing with sorted lists, maintain sort order through updates rather than re-sorting every time.

For small lists (<100 items), re-sorting with `useMemo` is acceptable. For larger lists or frequent updates, maintain sorted order:

```typescript
// Small lists: Re-sort with useMemo is fine
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.order - b.order);
}, [items]);

// Large lists: Maintain sorted order during insertion
function insertSorted(array: Item[], item: Item): Item[] {
  const index = array.findIndex(x => x.order > item.order);
  if (index === -1) {
    return [...array, item];
  }
  return [...array.slice(0, index), item, ...array.slice(index)];
}
```

## Effect Dependencies

### Minimize Effect Dependencies

**Principle:** Split large effects with many dependencies into focused effects with minimal dependencies.

```typescript
// ❌ BAD: Large effect with many dependencies
useEffect(() => {
  // 50+ lines handling multiple concerns
  if (condition1) {
    // Uses stateA, stateB
  }
  if (condition2) {
    // Uses stateC, stateD
  }
  // More logic...
}, [stateA, stateB, stateC, stateD, prop1, prop2]);

// ✅ GOOD: Split into focused effects
useEffect(() => {
  if (!condition1) return;
  // Focused logic using stateA, stateB
}, [condition1, stateA, stateB]);

useEffect(() => {
  if (!condition2) return;
  // Focused logic using stateC, stateD
}, [condition2, stateC, stateD]);
```

**Benefits:**

- Easier to reason about when effects run
- Reduced unnecessary re-executions
- Better testability
- Clearer code organization

### Extract Shared Logic

**Principle:** When multiple locations need the same conditional logic, extract it into a helper function.

```typescript
// ❌ BAD: Duplicated conditional logic
setState((prev) => {
  const isOpen = prev.sheetPosition !== "closed";
  return {
    ...prev,
    scrollTarget: isOpen ? targetId : null,
    pendingScrollTarget: isOpen ? null : targetId,
  };
});

// Same logic repeated 4 times in different handlers...

// ✅ GOOD: Extract helper function
function getScrollTargets(
  isSheetOpen: boolean,
  targetId: string
): { scrollTarget: string | null; pendingTarget: string | null } {
  return isSheetOpen
    ? { scrollTarget: targetId, pendingTarget: null }
    : { scrollTarget: null, pendingTarget: targetId };
}

// Use consistently across handlers
setState((prev) => ({
  ...prev,
  ...getScrollTargets(prev.sheetPosition !== "closed", targetId),
}));
```

## Ref-Based State

### Use Refs for Non-Rendering State

**Principle:** When state doesn't affect rendering, use refs instead of state to avoid unnecessary re-renders.

```typescript
// ❌ BAD: State that triggers re-renders unnecessarily
const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);
const [scrollTarget, setScrollTarget] = useState<string | null>(null);

// Every update triggers a re-render even though UI doesn't change

// ✅ GOOD: Use ref for intermediate values
const pendingScrollTargetRef = useRef<string | null>(null);
const [scrollTarget, setScrollTarget] = useState<string | null>(null);

// Store pending value without re-rendering
pendingScrollTargetRef.current = targetId;

// Later, promote to state when needed
setScrollTarget(pendingScrollTargetRef.current);
```

**Use refs when:**

- Tracking values that don't affect rendering
- Storing intermediate state between events
- Holding references to timers/intervals
- Caching calculations between renders

**Use state when:**

- Value affects what's rendered
- Components need to react to changes
- Value is part of the component's public API

## Cleanup and Memory Management

### Always Clean Up Side Effects

**Principle:** Every side effect that creates resources must clean them up to prevent memory leaks.

```typescript
// ❌ BAD: No cleanup for timeout
useEffect(() => {
  if (shouldScroll) {
    setTimeout(() => {
      scrollTo(target);
    }, 150);
  }
}, [shouldScroll, target]);
// Timeout continues if component unmounts

// ✅ GOOD: Cleanup timeout
useEffect(() => {
  if (shouldScroll) {
    const timeoutId = setTimeout(() => {
      scrollTo(target);
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }
}, [shouldScroll, target]);
```

### Cleanup Patterns

**Timeouts:**

```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    doSomething();
  }, delay);
  
  return () => clearTimeout(timeoutId);
}, [dependencies]);
```

**Intervals:**

```typescript
useEffect(() => {
  const intervalId = setInterval(() => {
    doSomething();
  }, interval);
  
  return () => clearInterval(intervalId);
}, [dependencies]);
```

**Event Listeners:**

```typescript
useEffect(() => {
  const handler = (event) => handleEvent(event);
  element.addEventListener('event', handler);
  
  return () => element.removeEventListener('event', handler);
}, [dependencies]);
```

**Ref-Based Cleanup:**

For callbacks that can't directly return cleanup (like `onScrollToIndexFailed`), use refs:

```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

// In callback
const onFailure = (info) => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  timeoutRef.current = setTimeout(() => {
    handleFailure(info);
    timeoutRef.current = null;
  }, 500);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);
```

## Component Memoization

### React.memo for Pure Components

**Principle:** Wrap components in `React.memo` when they receive the same props frequently but render expensive content.

```typescript
// ✅ GOOD: Memoize components with expensive renders
export const ExpensiveComponent = React.memo(({ data, onPress }) => {
  // Expensive rendering logic
  return (
    <View>
      {data.map(item => <HeavyItem key={item.id} item={item} />)}
    </View>
  );
});

// ✅ GOOD: Memoize sub-components
const LoadingSkeleton = React.memo(() => {
  const { colors } = useTheme();
  return (
    <View>
      {/* Skeleton UI */}
    </View>
  );
});
```

**When to use `React.memo`:**

- Components that render frequently with same props
- List items in FlatList/SectionList
- Components with expensive render logic
- Leaf components in deep trees

**When NOT to use `React.memo`:**

- Components that always receive different props
- Tiny components with trivial render cost
- Props contain new objects/functions on every render

### useMemo for Expensive Calculations

**Principle:** Memoize expensive calculations or object creation, especially for styles and derived data.

```typescript
// ✅ GOOD: Memoize style objects
const containerStyles = useMemo(
  () => [styles.container, { backgroundColor: colors.surface }],
  [colors.surface]
);

const textStyles = useMemo(
  () => [styles.text, { color: colors.text }],
  [colors.text]
);

// ✅ GOOD: Memoize computed data
const sortedFilteredData = useMemo(() => {
  return data
    .filter(item => item.visible)
    .sort((a, b) => a.order - b.order);
}, [data]);
```

### useCallback for Stable Callbacks

**Principle:** Use `useCallback` for callbacks passed to memoized child components or as effect dependencies.

```typescript
// ✅ GOOD: Stable callback for memoized child
const handlePress = useCallback((id: string) => {
  const item = itemsMap.get(id);
  if (item) {
    processItem(item);
  }
}, [itemsMap]);

// Child component won't re-render unnecessarily
<MemoizedChild onPress={handlePress} />
```

**When to use `useCallback`:**

- Callbacks passed to `React.memo` components
- Callbacks used in effect dependencies
- Callbacks passed to native modules or refs
- Creating event handlers for child components

**When NOT to use `useCallback`:**

- Callbacks used directly in JSX (no memoized children)
- Callbacks that change every render anyway
- Over-optimizing trivial functions

## Optimization Checklist

When optimizing components, consider:

- [ ] Eliminate redundant state (use derived state)
- [ ] Extract complex helper functions
- [ ] Use `useMemo` for expensive computations
- [ ] Use refs for non-rendering state
- [ ] Add cleanup for all side effects (timeouts, intervals, listeners)
- [ ] Wrap expensive components in `React.memo`
- [ ] Memoize dynamic styles with `useMemo`
- [ ] Use `useCallback` for stable event handlers
- [ ] Split large effects into focused effects
- [ ] Extract and reuse helper functions

## Common Anti-Patterns

### Premature Optimization

Don't optimize until you have evidence of a performance issue. Profile first, then optimize the actual bottlenecks.

### Over-Memoization

Not everything needs `useMemo` or `useCallback`. Simple calculations and callbacks are often faster than the memoization overhead.

### Memoizing with Unstable Dependencies

```typescript
// ❌ BAD: Dependency changes every render
const value = useMemo(() => {
  return expensiveCalculation(data);
}, [data.filter(x => x.active)]);  // New array every render

// ✅ GOOD: Stable dependency
const activeData = useMemo(() => data.filter(x => x.active), [data]);
const value = useMemo(() => {
  return expensiveCalculation(activeData);
}, [activeData]);
```

### Missing Cleanup

Always clean up timeouts, intervals, subscriptions, and event listeners. Memory leaks are harder to debug than adding cleanup.

## Performance Debugging

When investigating performance issues:

1. **Profile first**: Use React DevTools Profiler to identify slow components
2. **Measure impact**: Add timing logs around suspected slow operations
3. **Test on devices**: Performance on simulators differs from real devices
4. **Check list rendering**: FlatList issues are common in React Native
5. **Monitor memory**: Use Xcode Instruments or Android Studio Profiler
6. **Verify cleanup**: Check that components properly clean up on unmount

## Summary

Optimization in React Native requires balancing performance with maintainability:

- **Simplify state**: Single source of truth, derived values
- **Clean up resources**: Prevent memory leaks
- **Memoize strategically**: Only when it helps
- **Extract helpers**: Readable, testable code
- **Profile and measure**: Optimize real bottlenecks
