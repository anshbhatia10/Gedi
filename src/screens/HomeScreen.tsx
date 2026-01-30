import { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    Animated,
    FlatList,
    RefreshControl,
    Image,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Location from "expo-location";
import { supabase } from "@/lib/supabase";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";
import type { Drive } from "@/types";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - spacing.xl * 2;

// Ultra dark map style
const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
    { elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp>();
    const mapRef = useRef<MapView>(null);

    const [feeds, setFeeds] = useState<Drive[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [activeTab, setActiveTab] = useState<"feed" | "friends" | "profile">("feed");

    const fabScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        getCurrentLocation();
        loadFeed();
    }, []);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;

            const location = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            });
        } catch (error) {
            console.log("Location error:", error);
        }
    };

    const loadFeed = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("drives")
                .select(`
          *,
          profiles:user_id (id, username, display_name, avatar_url),
          vehicles:vehicle_id (nickname, make, model)
        `)
                .eq("visibility", "friends")
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            setFeeds(data || []);
        } catch (error) {
            console.log("Feed load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFeed();
        setRefreshing(false);
    }, []);

    const animateFab = () => {
        Animated.sequence([
            Animated.timing(fabScale, {
                toValue: 0.92,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(fabScale, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleStartDrive = () => {
        animateFab();
        navigation.navigate("Record");
    };

    const handleDrivePress = (drive: Drive) => {
        navigation.navigate("DriveDetail", { driveId: drive.id });
    };

    const formatDuration = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const formatDistance = (meters: number) => {
        const km = meters / 1000;
        return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
    };

    const renderDriveCard = ({ item }: { item: Drive }) => {
        const profile = item.profiles as any;
        const vehicle = item.vehicles as any;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.driveCard,
                    pressed && styles.cardPressed,
                ]}
                onPress={() => handleDrivePress(item)}
            >
                <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
                    <View style={styles.cardInner}>
                        {/* User row */}
                        <View style={styles.userRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(profile?.username || "?")[0].toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.username}>@{profile?.username || "driver"}</Text>
                                <Text style={styles.timeAgo}>
                                    {vehicle?.nickname || vehicle?.make || "Just now"}
                                </Text>
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatDistance(item.distance_m ?? 0)}</Text>
                                <Text style={styles.statLabel}>Distance</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatDuration(item.duration_s ?? 0)}</Text>
                                <Text style={styles.statLabel}>Time</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{Math.round(item.top_kmh ?? 0)}</Text>
                                <Text style={styles.statLabel}>km/h</Text>
                            </View>
                        </View>

                        {item.caption && (
                            <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
                        )}
                    </View>
                </BlurView>
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            {/* Map Background */}
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_GOOGLE}
                customMapStyle={darkMapStyle}
                initialRegion={{
                    latitude: currentLocation?.lat || 28.6139,
                    longitude: currentLocation?.lng || 77.209,
                    latitudeDelta: 0.08,
                    longitudeDelta: 0.08,
                }}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
            />

            {/* Top area */}
            <View style={[styles.topArea, { paddingTop: insets.top + spacing.md }]}>
                <Image
                    source={require("../../assets/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Bottom content */}
            <View style={styles.bottomArea}>
                {/* Feed / Empty State */}
                {feeds.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <BlurView intensity={25} tint="dark" style={styles.emptyBlur}>
                            <View style={styles.emptyInner}>
                                <Text style={styles.emptyIcon}>🛣️</Text>
                                <Text style={styles.emptyTitle}>No drives yet</Text>
                                <Text style={styles.emptySubtitle}>
                                    Start your first drive or add friends to see their journeys here
                                </Text>
                            </View>
                        </BlurView>
                    </View>
                ) : (
                    <FlatList
                        data={feeds}
                        keyExtractor={(item) => item.id}
                        renderItem={renderDriveCard}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.feedList}
                        snapToInterval={CARD_WIDTH + spacing.md}
                        decelerationRate="fast"
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.textMuted}
                            />
                        }
                    />
                )}

                {/* Navigation */}
                <View style={[styles.navContainer, { paddingBottom: insets.bottom + spacing.md }]}>
                    <BlurView intensity={30} tint="dark" style={styles.navBlur}>
                        <View style={styles.navInner}>
                            {[
                                { key: "feed", icon: "🏠", label: "Feed", screen: null },
                                { key: "friends", icon: "👥", label: "Friends", screen: "Friends" as const },
                                { key: "profile", icon: "👤", label: "Profile", screen: "Profile" as const },
                            ].map((tab) => (
                                <Pressable
                                    key={tab.key}
                                    style={[
                                        styles.navItem,
                                        activeTab === tab.key && styles.navItemActive,
                                    ]}
                                    onPress={() => {
                                        setActiveTab(tab.key as any);
                                        if (tab.screen) {
                                            navigation.navigate(tab.screen);
                                        }
                                    }}
                                >
                                    <Text style={[
                                        styles.navIcon,
                                        activeTab === tab.key && styles.navIconActive,
                                    ]}>
                                        {tab.icon}
                                    </Text>
                                    <Text style={[
                                        styles.navLabel,
                                        activeTab === tab.key && styles.navLabelActive,
                                    ]}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </BlurView>
                </View>
            </View>

            {/* FAB */}
            <Animated.View
                style={[
                    styles.fab,
                    { bottom: insets.bottom + 100, transform: [{ scale: fabScale }] },
                ]}
            >
                <Pressable onPress={handleStartDrive} style={styles.fabButton}>
                    <BlurView intensity={50} tint="dark" style={styles.fabBlur}>
                        <View style={styles.fabInner}>
                            <Text style={styles.fabIcon}>▶</Text>
                        </View>
                    </BlurView>
                </Pressable>
                <Text style={styles.fabLabel}>Start</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    topArea: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        alignItems: "center",
        zIndex: 10,
    },
    logo: {
        width: 32,
        height: 32,
        tintColor: colors.textPrimary,
        opacity: 0.9,
    },
    bottomArea: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    feedList: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.lg,
    },
    driveCard: {
        width: CARD_WIDTH,
        marginRight: spacing.md,
        borderRadius: radius.xxl,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.glass,
    },
    cardPressed: {
        opacity: 0.95,
    },
    cardBlur: {
        overflow: "hidden",
    },
    cardInner: {
        padding: spacing.xl,
    },
    userRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: spacing.lg,
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
    username: {
        ...typography.caption,
        color: colors.textPrimary,
    },
    timeAgo: {
        ...typography.micro,
        color: colors.textMuted,
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: "row",
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statValue: {
        ...typography.headline,
        color: colors.textPrimary,
    },
    statLabel: {
        ...typography.micro,
        color: colors.textMuted,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    },
    caption: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    emptyContainer: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.lg,
        borderRadius: radius.xxl,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.glass,
    },
    emptyBlur: {
        overflow: "hidden",
    },
    emptyInner: {
        padding: spacing.xxxl,
        alignItems: "center",
    },
    emptyIcon: {
        fontSize: 40,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        ...typography.title,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        ...typography.body,
        color: colors.textMuted,
        textAlign: "center",
        lineHeight: 22,
    },
    navContainer: {
        marginHorizontal: spacing.xxxl,
        marginBottom: spacing.sm,
        borderRadius: radius.full,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.glass,
    },
    navBlur: {
        overflow: "hidden",
    },
    navInner: {
        flexDirection: "row",
        padding: spacing.xs,
    },
    navItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        gap: spacing.xs,
    },
    navItemActive: {
        backgroundColor: colors.glassHighlight,
    },
    navIcon: {
        fontSize: 14,
        opacity: 0.6,
    },
    navIconActive: {
        opacity: 1,
    },
    navLabel: {
        ...typography.caption,
        color: colors.textMuted,
    },
    navLabelActive: {
        color: colors.textPrimary,
    },
    fab: {
        position: "absolute",
        right: spacing.xl,
        zIndex: 20,
        alignItems: "center",
    },
    fabButton: {
        borderRadius: 32,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.glassBorder,
        ...shadows.glass,
    },
    fabBlur: {
        overflow: "hidden",
    },
    fabInner: {
        width: 64,
        height: 64,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.glassHighlight,
    },
    fabIcon: {
        fontSize: 20,
        color: colors.textPrimary,
        marginLeft: 3,
    },
    fabLabel: {
        ...typography.micro,
        color: colors.textMuted,
        marginTop: spacing.sm,
    },
});
