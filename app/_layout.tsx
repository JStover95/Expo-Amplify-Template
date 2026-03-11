import { Stack } from "expo-router";
import { AMAProvider } from "@react-native-ama/core";

export default function RootLayout() {
  return (
    <AMAProvider>
      <Stack />
    </AMAProvider>
  );
}
