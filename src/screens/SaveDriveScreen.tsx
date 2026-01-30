import { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import MapView, { Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { encodePolyline } from "@/lib/polyline";
import { uploadFromUri } from "@/lib/storage";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "DriveDetail">;
type Route = RouteProp<RootStackParamList, "SaveDrive">;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
];

export function SaveDriveScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { duration, distance, topSpeed, avgSpeed, route: driveRoute } = route.params;

  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"friends" | "private">("friends");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const mapRegion = useMemo(() => {
    if (driveRoute.length === 0) {
      return { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    const lats = driveRoute.map((p) => p.lat);
    const lngs = driveRoute.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 + 0.01,
      longitudeDelta: (maxLng - minLng) * 1.5 + 0.01,
    };
  }, [driveRoute]);

  const routeCoords = driveRoute.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

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

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (!userId) {
        setMessage("Not signed in");
        return;
      }

      const trackPoints = driveRoute.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
        timestamp: p.ts,
        speedMps: p.speed_mps ?? null,
        accuracy: null,
      }));

      const polylineRaw = encodePolyline(trackPoints);
      const startedAt = new Date(driveRoute[0]?.ts ?? Date.now());
      const endedAt = new Date(driveRoute[driveRoute.length - 1]?.ts ?? Date.now());

      const { data: drive, error } = await supabase
        .from("drives")
        .insert({
          user_id: userId,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_s: Math.round(duration),
          distance_m: Math.round(distance),
          avg_kmh: Number(avgSpeed.toFixed(2)),
          top_kmh: Number(topSpeed.toFixed(2)),
          polyline_raw: polylineRaw,
          polyline_shared: polylineRaw,
          hide_start_end: false,
          visibility,
          caption,
        })
        .select()
        .single();

      if (error || !drive) {
        setMessage(error?.message ?? "Could not save drive");
        return;
      }

      if (photoUri) {
        try {
          const filename = photoUri.split("/").pop() || `photo-${Date.now()}.jpg`;
          const path = `${userId}/${drive.id}/${filename}`;
          await uploadFromUri("drive-media", path, photoUri, "image/jpeg");
          await supabase.from("drive_media").insert({
            drive_id: drive.id,
            user_id: userId,
            storage_path: path,
          });
        } catch {
          setMessage("Drive saved, but photo upload failed");
        }
      }

      navigation.navigate("Home");
    } finally {
      setSaving(false);
    }
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
          <Text style={styles.backText}>← Cancel</Text>
        </Pressable>

        <Text style={styles.title}>Save Drive</Text>

        {/* Map Preview */}
        <View style={styles.mapCard}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={darkMapStyle}
            region={mapRegion}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor={colors.accent}
                strokeWidth={4}
              />
            )}
          </MapView>
        </View>

        {/* Stats */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDistance(distance)}</Text>
                <Text style={styles.statLabel}>DISTANCE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(duration)}</Text>
                <Text style={styles.statLabel}>TIME</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(topSpeed)}</Text>
                <Text style={styles.statLabel}>KM/H</Text>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Caption */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>CAPTION</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What's the story?"
                placeholderTextColor={colors.textDim}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={280}
              />
            </View>
          </BlurView>
        </View>

        {/* Photo */}
        {photoUri ? (
          <View style={styles.photoPreview}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <Pressable style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
              <Text style={styles.removePhotoText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addPhotoButton, pressed && styles.buttonPressed]}
            onPress={pickPhoto}
          >
            <Text style={styles.addPhotoText}>+ Add photo</Text>
          </Pressable>
        )}

        {/* Visibility */}
        <View style={styles.glassCard}>
          <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionLabel}>VISIBILITY</Text>
              <View style={styles.visibilityRow}>
                <Pressable
                  style={[
                    styles.visibilityOption,
                    visibility === "friends" && styles.visibilityActive,
                  ]}
                  onPress={() => setVisibility("friends")}
                >
                  <Text style={styles.visibilityText}>Friends</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.visibilityOption,
                    visibility === "private" && styles.visibilityActive,
                  ]}
                  onPress={() => setVisibility("private")}
                >
                  <Text style={styles.visibilityText}>Private</Text>
                </Pressable>
              </View>
            </View>
          </BlurView>
        </View>

        {/* Save Button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
            saving && styles.buttonDisabled,
          ]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>Post</Text>
          )}
        </Pressable>

        {message && <Text style={styles.errorMessage}>{message}</Text>}
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
  mapCard: {
    height: 180,
    borderRadius: radius.xxl,
    overflow: "hidden",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  map: {
    flex: 1,
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
  statsRow: {
    flexDirection: "row",
    padding: spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
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
  },
  sectionLabel: {
    ...typography.micro,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  captionInput: {
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoPreview: {
    marginBottom: spacing.lg,
    borderRadius: radius.xxl,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: radius.xxl,
  },
  removePhoto: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  removePhotoText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  addPhotoButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  addPhotoText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  visibilityRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  visibilityOption: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  visibilityActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.glassHighlight,
  },
  visibilityText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#FFF",
    paddingVertical: 16,
    borderRadius: radius.full,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  errorMessage: {
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
