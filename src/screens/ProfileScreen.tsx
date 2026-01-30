import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import type { Profile } from "@/types";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

const { height } = Dimensions.get("window");
const STORED_USERNAME_KEY = "@gedi_username";

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;

    const { data: p } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .eq("id", userId)
      .single();

    if (p) {
      setProfile(p);
      setDisplayName(p.display_name ?? "");
      setUsername(p.username ?? "");
    }
  };

  const save = async () => {
    if (!profile) return;
    setMessage("");
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username })
      .eq("id", profile.id);

    setSaving(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved");
      // Update stored username
      await AsyncStorage.setItem(STORED_USERNAME_KEY, username);
    }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORED_USERNAME_KEY);
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {(username || "?")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.usernameDisplay}>@{username || "username"}</Text>
        </View>

        {/* Edit Card */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>PROFILE</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Display name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textDim}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.usernameInput}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    style={[styles.input, styles.usernameField]}
                    placeholder="username"
                    placeholderTextColor={colors.textDim}
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                  saving && styles.buttonDisabled,
                ]}
                onPress={save}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </Pressable>

              {message && (
                <Text style={[
                  styles.message,
                  message === "Saved" && styles.messageSuccess,
                ]}>
                  {message}
                </Text>
              )}
            </View>
          </BlurView>
        </View>

        {/* Settings Card */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>ACCOUNT</Text>

              <Pressable
                style={styles.menuItem}
                onPress={() => navigation.navigate("Settings")}
              >
                <Text style={styles.menuIcon}>⚙️</Text>
                <Text style={styles.menuText}>Settings</Text>
                <Text style={styles.menuArrow}>→</Text>
              </Pressable>

              <View style={styles.divider} />

              <Pressable style={styles.menuItem} onPress={signOut}>
                <Text style={styles.menuIcon}>🚪</Text>
                <Text style={[styles.menuText, styles.signOutText]}>Sign out</Text>
                <Text style={styles.menuArrow}>→</Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: spacing.xxl,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xxxl,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  usernameDisplay: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  glassCard: {
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
    ...shadows.glass,
  },
  cardBlur: {
    overflow: "hidden",
  },
  cardInner: {
    padding: spacing.xl,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usernameInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
  },
  atSymbol: {
    color: colors.textMuted,
    fontSize: 15,
  },
  usernameField: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingLeft: spacing.xs,
  },
  primaryButton: {
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "600",
  },
  message: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.md,
  },
  messageSuccess: {
    color: colors.success,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  signOutText: {
    color: colors.error,
  },
  menuArrow: {
    color: colors.textMuted,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
});
