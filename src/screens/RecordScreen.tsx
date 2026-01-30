import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import MapView, { Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useDriveRecorder } from "@/hooks/useDriveRecorder";
import { colors, radius, spacing, typography, shadows } from "@/theme";
import type { RootStackParamList } from "@/navigation/types";

const { width, height } = Dimensions.get("window");

// Ultra dark map
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function RecordScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<MapView>(null);

  const {
    isRecording,
    route,
    distanceM,
    topKmh,
    currentKmh,
    durationS,
    start,
    stop,
  } = useDriveRecorder();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Follow user location
  useEffect(() => {
    if (route.length > 0 && mapRef.current) {
      const lastPoint = route[route.length - 1];
      mapRef.current.animateCamera({
        center: { latitude: lastPoint.lat, longitude: lastPoint.lng },
        zoom: 16,
      });
    }
  }, [route]);

  const handleStart = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    await start();
  };

  const handleStop = async () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    const result = await stop();
    if (result && result.route.length > 0) {
      navigation.navigate("SaveDrive", {
        duration: result.durationS,
        distance: result.distanceM,
        topSpeed: result.topKmh,
        avgSpeed: result.avgKmh,
        route: result.route,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return km >= 10 ? `${Math.round(km)}` : km.toFixed(1);
  };

  const routeCoords = route.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={isRecording}
      >
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={colors.accent}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        {isRecording && (
          <View style={styles.liveIndicator}>
            <Animated.View
              style={[
                styles.liveDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={styles.liveText}>RECORDING</Text>
          </View>
        )}
      </View>

      {/* Speed display */}
      {isRecording && (
        <View style={styles.speedContainer}>
          <Text style={styles.speedValue}>{Math.round(currentKmh)}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Stats */}
        {isRecording && (
          <View style={styles.statsCard}>
            <BlurView intensity={25} tint="dark" style={styles.statsBlur}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatDistance(distanceM)}</Text>
                  <Text style={styles.statLabel}>KM</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatTime(durationS)}</Text>
                  <Text style={styles.statLabel}>TIME</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{Math.round(topKmh)}</Text>
                  <Text style={styles.statLabel}>TOP</Text>
                </View>
              </View>
            </BlurView>
          </View>
        )}

        {/* Main button */}
        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonScale }] }]}>
          <Pressable
            onPress={isRecording ? handleStop : handleStart}
            style={styles.mainButton}
          >
            <BlurView intensity={40} tint="dark" style={styles.buttonBlur}>
              <View style={[
                styles.buttonInner,
                isRecording && styles.buttonInnerStop,
              ]}>
                {isRecording ? (
                  <View style={styles.stopIcon} />
                ) : (
                  <Text style={styles.playIcon}>▶</Text>
                )}
              </View>
            </BlurView>
          </Pressable>
          <Text style={styles.buttonLabel}>
            {isRecording ? "End Drive" : "Start Drive"}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    zIndex: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  closeText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glass,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  liveText: {
    ...typography.micro,
    color: colors.textPrimary,
  },
  speedContainer: {
    position: "absolute",
    top: height * 0.25,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  speedValue: {
    fontSize: 96,
    fontWeight: "200",
    color: colors.textPrimary,
    letterSpacing: -4,
  },
  speedUnit: {
    fontSize: 17,
    fontWeight: "500",
    color: colors.textMuted,
    marginTop: -spacing.md,
  },
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  statsCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignSelf: "stretch",
    ...shadows.glass,
  },
  statsBlur: {
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
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
    marginVertical: 4,
  },
  buttonContainer: {
    alignItems: "center",
  },
  mainButton: {
    borderRadius: 44,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadows.glass,
  },
  buttonBlur: {
    overflow: "hidden",
  },
  buttonInner: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.glassHighlight,
  },
  buttonInnerStop: {
    backgroundColor: "rgba(255, 69, 58, 0.2)",
  },
  playIcon: {
    fontSize: 28,
    color: colors.textPrimary,
    marginLeft: 4,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  buttonLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
