/**
 * TypeScript type definitions for Expo Router Jest matchers
 *
 * This file extends Jest's Matchers interface to include custom matchers
 * provided by expo-router/testing-library. These matchers allow testing
 * navigation state using the `screen` object from expo-router/testing-library.
 *
 * The matchers are registered at runtime via the import in tests/setup.ts,
 * but TypeScript needs these type declarations to recognize them.
 *
 * @see design-docs/testing/integration-testing.md#jest-matchers-for-navigation
 */
import type { Screen } from "expo-router/testing-library";

declare global {
  namespace jest {
    interface Matchers<R, T = Screen> {
      toHavePathname(pathname: string): R;
      toHavePathnameWithParams(url: string): R;
      toHaveSegments(segments: string[]): R;
      toHaveSearchParams(params: Record<string, string>): R;
    }
  }
}
