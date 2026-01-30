import { View, Text, StyleSheet } from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { decodePolyline } from "@/lib/polyline";
import { regionForPoints } from "@/lib/geo";
import type { Drive } from "@/types";

type Props = {
  drive: Drive;
};

export function DriveCard({ drive }: Props) {
  const line = drive.polyline_shared || drive.polyline_raw || "";
  const points = line ? decodePolyline(line) : [];
  const region = regionForPoints(points);

  return (
    <View style={styles.card}>
      <MapView style={styles.map} initialRegion={region} scrollEnabled={false} rotateEnabled={false}>
        {points.length > 1 && (
          <Polyline
            coordinates={points}
            strokeColor="#F97316"
            strokeWidth={4}
          />
        )}
      </MapView>
      <View style={styles.overlay}>
        <Text style={styles.title}>Gedi</Text>
        <View style={styles.row}>
          <Stat label="Distance" value={`${Math.round((drive.distance_m ?? 0) / 100) / 10} km`} />
          <Stat label="Avg" value={`${Math.round(drive.avg_kmh ?? 0)} km/h`} />
          <Stat label="Top" value={`${Math.round(drive.top_kmh ?? 0)} km/h`} />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#0B0B0C",
  },
  map: {
    height: 420,
    width: "100%",
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statLabel: {
    color: "#C7C7C7",
    fontSize: 12,
  },
  statValue: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

