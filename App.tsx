import "react-native-gesture-handler";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { RecordScreen } from "@/screens/RecordScreen";
import { FriendsScreen } from "@/screens/FriendsScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { DriveDetailScreen } from "@/screens/DriveDetailScreen";
import { SaveDriveScreen } from "@/screens/SaveDriveScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { useSession } from "@/hooks/useSession";
import { colors } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

// Stack screen options for modal-style presentations
const modalOptions = {
  presentation: "modal" as const,
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: "600" as const },
};

// Full-screen options (no header)
const fullScreenOptions = {
  headerShown: false,
};

export default function App() {
  const { session, loading } = useSession();

  if (loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!session ? (
              <Stack.Screen name="Auth" component={AuthScreen} />
            ) : (
              <>
                {/* Main Home with Map */}
                <Stack.Screen name="Home" component={HomeScreen} />

                {/* Recording flow */}
                <Stack.Screen
                  name="Record"
                  component={RecordScreen}
                  options={fullScreenOptions}
                />
                <Stack.Screen
                  name="SaveDrive"
                  component={SaveDriveScreen}
                  options={{
                    ...modalOptions,
                    title: "Save Drive",
                  }}
                />

                {/* Detail screens */}
                <Stack.Screen
                  name="DriveDetail"
                  component={DriveDetailScreen}
                  options={{
                    ...modalOptions,
                    title: "Drive",
                  }}
                />

                {/* Other screens */}
                <Stack.Screen
                  name="Friends"
                  component={FriendsScreen}
                  options={{
                    ...modalOptions,
                    title: "Friends",
                  }}
                />
                <Stack.Screen
                  name="Profile"
                  component={ProfileScreen}
                  options={{
                    ...modalOptions,
                    title: "Profile",
                  }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    ...modalOptions,
                    title: "Settings",
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
