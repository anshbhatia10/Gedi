import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography } from "@/theme";

const { width, height } = Dimensions.get("window");
const STORED_USERNAME_KEY = "@gedi_username";

export function AuthScreen() {
  const [mode, setMode] = useState<"welcome" | "username">("welcome");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Check if user was previously logged in
  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem(STORED_USERNAME_KEY);
      if (storedUsername) {
        // Auto-login with stored username
        setUsername(storedUsername);
        await handleContinue(storedUsername);
      }
    } catch (error) {
      console.log("No stored session");
    }
  };

  const handleContinue = async (usernameToUse?: string) => {
    setMessage("");
    const usernameTrimmed = (usernameToUse || username).trim().toLowerCase();

    if (!usernameTrimmed) {
      setMessage("Enter a username");
      return;
    }

    if (usernameTrimmed.length < 2) {
      setMessage("Username too short");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(usernameTrimmed)) {
      setMessage("Letters, numbers, underscores only");
      return;
    }

    setLoading(true);

    try {
      // Check if username exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", usernameTrimmed)
        .maybeSingle();

      if (existingProfile) {
        // Username exists - check if we have stored session for this user
        const storedUsername = await AsyncStorage.getItem(STORED_USERNAME_KEY);

        if (storedUsername === usernameTrimmed) {
          // This is our user, try to restore session
          const { data: session } = await supabase.auth.getSession();

          if (session?.session) {
            // Already have a valid session
            return;
          }

          // No session but username matches - sign in anonymously and update profile
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

          if (authError) {
            setMessage("Could not sign in");
            return;
          }

          // Link this new session to the existing profile isn't possible with anonymous auth
          // So we'll just update our stored session
          await AsyncStorage.setItem(STORED_USERNAME_KEY, usernameTrimmed);
          return;
        } else {
          // Username taken by someone else
          setMessage("Username taken. Try another!");
          return;
        }
      }

      // Username doesn't exist - create new account
      const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

      if (authError) {
        setMessage(authError.message);
        return;
      }

      if (!authData.user) {
        setMessage("Failed to create account");
        return;
      }

      // Update profile with username
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: usernameTrimmed,
          display_name: usernameTrimmed,
        })
        .eq("id", authData.user.id);

      if (profileError) {
        if (profileError.message.includes("unique") || profileError.message.includes("duplicate")) {
          setMessage("Username just taken. Try another!");
          await supabase.auth.signOut();
        } else {
          setMessage(profileError.message);
        }
        return;
      }

      // Store username for future logins
      await AsyncStorage.setItem(STORED_USERNAME_KEY, usernameTrimmed);

    } catch (err: any) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "welcome") {
    return (
      <View style={styles.container}>
        {/* Logo at top */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Hello text */}
        <View style={styles.centerContent}>
          <Text style={styles.helloText}>Hello.</Text>
        </View>

        {/* Buttons at bottom */}
        <View style={styles.bottomContent}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setMode("username")}
          >
            <Text style={styles.primaryButtonText}>Continue with Username</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    );
  }

  // Username input mode
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Logo at top */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Username input */}
      <View style={styles.centerContent}>
        <Text style={styles.promptText}>What's your handle?</Text>

        <View style={styles.inputWrapper}>
          <Text style={styles.atSymbol}>@</Text>
          <TextInput
            style={styles.usernameInput}
            placeholder="username"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            maxLength={20}
            returnKeyType="go"
            onSubmitEditing={() => handleContinue()}
          />
        </View>

        {message ? <Text style={styles.errorText}>{message}</Text> : null}
      </View>

      {/* Continue button */}
      <View style={styles.bottomContent}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={() => handleContinue()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={() => {
            setMode("welcome");
            setMessage("");
          }}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: "center",
    paddingTop: height * 0.08,
  },
  logo: {
    width: 40,
    height: 40,
    tintColor: "#FFF",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  helloText: {
    fontSize: 48,
    fontWeight: "300",
    color: "#FFF",
    letterSpacing: -1,
  },
  promptText: {
    fontSize: 28,
    fontWeight: "300",
    color: "#FFF",
    marginBottom: spacing.xl,
    letterSpacing: -0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  atSymbol: {
    fontSize: 28,
    fontWeight: "300",
    color: "#666",
    marginRight: 4,
  },
  usernameInput: {
    fontSize: 28,
    fontWeight: "300",
    color: "#FFF",
    minWidth: 150,
    textAlign: "center",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  bottomContent: {
    paddingBottom: height * 0.06,
    gap: spacing.md,
  },
  primaryButton: {
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
  },
  termsText: {
    color: "#666",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
  },
});
