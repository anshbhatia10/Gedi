import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import type { Profile } from "@/types";
import { useNavigation } from "@react-navigation/native";

const { height } = Dimensions.get("window");

type FriendRequest = {
  id: string;
  requester: Profile;
};

type Friend = Profile & { status: string };

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from("friendships")
      .select(`
        id, status,
        requester:profiles!friendships_requester_id_fkey(id, display_name, username, avatar_url),
        addressee:profiles!friendships_addressee_id_fkey(id, display_name, username, avatar_url)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq("status", "accepted");

    if (data) {
      const friendList = data.map((row: any) => {
        const friend = row.requester.id === userId ? row.addressee : row.requester;
        return { ...friend, status: row.status };
      });
      setFriends(friendList);
    }
  };

  const loadRequests = async () => {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from("friendships")
      .select(
        "id, requester:profiles!friendships_requester_id_fkey(id, display_name, username, avatar_url)"
      )
      .eq("addressee_id", userId)
      .eq("status", "pending");

    const items =
      data?.map((row: any) => ({
        id: row.id,
        requester: row.requester as Profile,
      })) ?? [];
    setRequests(items);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setMessage("");

    try {
      const query = searchQuery.trim().toLowerCase();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .ilike("username", `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);

      if (data?.length === 0) {
        setMessage("No users found");
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setSearching(false);
    }
  };

  const addFriend = async (profile: Profile) => {
    const { data: user } = await supabase.auth.getUser();
    const userId = user.user?.id;
    if (!userId) return;

    await supabase
      .from("friendships")
      .insert({ requester_id: userId, addressee_id: profile.id, status: "pending" });

    setMessage(`Request sent to @${profile.username}`);
    setSearchResults((prev) => prev.filter((p) => p.id !== profile.id));
  };

  const accept = async (requestId: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", requestId);
    await loadRequests();
    await loadFriends();
  };

  const decline = async (requestId: string) => {
    await supabase.from("friendships").delete().eq("id", requestId);
    await loadRequests();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Friends</Text>

        {/* Search */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>Find by username</Text>

              <View style={styles.searchRow}>
                <View style={styles.searchInput}>
                  <Text style={styles.atSymbol}>@</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="username"
                    placeholderTextColor={colors.textDim}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={searchUsers}
                    returnKeyType="search"
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.searchButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={searchUsers}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color={colors.textPrimary} size="small" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search</Text>
                  )}
                </Pressable>
              </View>

              {/* Results */}
              {searchResults.length > 0 && (
                <View style={styles.resultsList}>
                  {searchResults.map((profile) => (
                    <View key={profile.id} style={styles.userRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(profile.username || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>@{profile.username}</Text>
                      </View>
                      <Pressable
                        style={styles.addButton}
                        onPress={() => addFriend(profile)}
                      >
                        <Text style={styles.addButtonText}>Add</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          </BlurView>
        </View>

        {/* Requests */}
        {requests.length > 0 && (
          <View style={styles.glassCard}>
            <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
              <View style={styles.cardInner}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Requests</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{requests.length}</Text>
                  </View>
                </View>

                {requests.map((req) => (
                  <View key={req.id} style={styles.userRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(req.requester.username || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>@{req.requester.username}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <Pressable style={styles.acceptButton} onPress={() => accept(req.id)}>
                        <Text style={styles.actionText}>✓</Text>
                      </Pressable>
                      <Pressable style={styles.declineButton} onPress={() => decline(req.id)}>
                        <Text style={styles.actionText}>✕</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </BlurView>
          </View>
        )}

        {/* Friends List */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>Your crew</Text>

              {friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No friends yet</Text>
                  <Text style={styles.emptySubtext}>Search for friends above</Text>
                </View>
              ) : (
                friends.map((friend) => (
                  <View key={friend.id} style={styles.userRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(friend.username || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>@{friend.username}</Text>
                    </View>
                    <View style={styles.statusDot} />
                  </View>
                ))
              )}
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
    marginBottom: spacing.lg,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    letterSpacing: -0.5,
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
    marginBottom: spacing.lg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000",
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  atSymbol: {
    color: colors.textMuted,
    fontSize: 15,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  searchButton: {
    backgroundColor: colors.glassHighlight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  searchButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  resultsList: {
    marginTop: spacing.lg,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: colors.glassHighlight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  addButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  declineButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  message: {
    color: colors.accent,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
