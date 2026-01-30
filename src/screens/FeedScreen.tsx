import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import MapView, { Polyline } from "react-native-maps";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "@/lib/supabase";
import { decodePolyline } from "@/lib/polyline";
import { regionForPoints } from "@/lib/geo";
import { normalizeDrive } from "@/lib/normalize";
import type { Drive } from "@/types";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList, "DriveDetail">;

export function FeedScreen() {
  const [drives, setDrives] = useState<Drive[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const navigation = useNavigation<Nav>();

  const load = useCallback(async () => {
    setRefreshing(true);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("drives")
        .select(
          "id, user_id, started_at, ended_at, duration_s, distance_m, avg_kmh, top_kmh, polyline_raw, polyline_shared, hide_start_end, caption, card_path, profiles:profiles(id, display_name, username, avatar_url), drive_media(id, storage_path)",
        )
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) {
        setMessage(error.message);
        return;
      }
      const items = (data ?? []).map((row: any) => normalizeDrive(row));
      setDrives(items);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={styles.container}
      data={drives}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate("DriveDetail", { drive: item })}
        >
          <Text style={styles.name}>
            {item.profiles?.display_name || item.profiles?.username || "Friend"}
          </Text>
          <Text style={styles.caption}>
            {item.caption || "Drive"}
          </Text>
          <MapPreview drive={item} />
          <View style={styles.row}>
            <Text style={styles.stat}>
              {((item.distance_m ?? 0) / 1000).toFixed(1)} km
            </Text>
            <Text style={styles.stat}>
              {Math.round(item.avg_kmh ?? 0)} km/h avg
            </Text>
            <Text style={styles.stat}>
              {Math.round(item.top_kmh ?? 0)} km/h top
            </Text>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No drives yet</Text>
        </View>
      }
      ListHeaderComponent={
        message ? (
          <View style={styles.messageWrap}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null
      }
    />
  );
}

function MapPreview({ drive }: { drive: Drive }) {
  const line = drive.polyline_shared || drive.polyline_raw || "";
  const points = line ? decodePolyline(line) : [];
  const region = regionForPoints(points);
  return (
    <MapView
      style={styles.map}
      initialRegion={region}
      scrollEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      liteMode={Platform.OS === "android"}
    >
      {points.length > 1 && (
        <Polyline coordinates={points} strokeColor="#F97316" strokeWidth={3} />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0C",
  },
  card: {
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 12,
  },
  name: {
    color: "#FFF",
    fontWeight: "700",
    marginBottom: 2,
  },
  caption: {
    color: "#A1A1AA",
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  stat: {
    color: "#FFF",
    fontSize: 12,
  },
  empty: {
    padding: 24,
  },
  emptyText: {
    color: "#777",
  },
  messageWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageText: {
    color: "#EF4444",
  },
});
