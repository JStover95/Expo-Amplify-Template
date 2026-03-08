/* global jest */
// Mock Async Storage
// Mock Gesture Handler
import "react-native-gesture-handler/jestSetup";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock NetInfo
jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock")
);

// Mock Amplify
jest.mock("@aws-amplify/react-native", () => ({
  loadBase64: jest.fn().mockImplementation(() => ({
    encode: jest.fn(),
  })),
  loadGetRandomValues: jest.fn(),
  loadUrlPolyfill: jest.fn(),
  loadAsyncStorage: jest.fn(),
  loadAppState: jest.fn(() => ({
    addEventListener: jest.fn(),
  })),
}));

jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => {
  const turboModuleRegistry = jest.requireActual(
    "react-native/Libraries/TurboModule/TurboModuleRegistry"
  );
  return {
    ...turboModuleRegistry,
    getEnforcing: (name) => {
      // List of TurboModules libraries to mock.
      const modulesToMock = ["DevMenu", "SettingsManager"];
      if (modulesToMock.includes(name)) {
        return null;
      }
      return turboModuleRegistry.getEnforcing(name);
    },
  };
});
