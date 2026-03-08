import { View } from "react-native";
import { Text } from "@react-native-ama/react-native";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
      testID="index-screen"
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>
    </View>
  );
}
