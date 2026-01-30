import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { Drive } from "@/types";
import { supabase } from "@/lib/supabase";
import { DriveCard } from "@/components/DriveCard";
import { createSignedUrl, uploadFromUri } from "@/lib/storage";
import { normalizeDrive } from "@/lib/normalize";
import type { RootStackParamList } from "@/navigation/types";

type Route = RouteProp<RootStackParamList, "DriveDetail">;

export function DriveDetailScreen() {
  const route = useRoute<Route>();
  const [drive, setDrive] = useState<Drive | null>(route.params.drive);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const shotRef = useRef<ViewShot>(null);

  const load = async (isCancelled?: () => boolean) => {
    if (!route.params.drive?.id) {
      if (!isCancelled?.()) setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("drives")
        .select(
          "id, user_id, started_at, ended_at, duration_s, distance_m, avg_kmh, top_kmh, polyline_raw, polyline_shared, hide_start_end, caption, card_path, profiles:profiles(id, display_name, username, avatar_url), drive_media(id, storage_path)",
        )
        .eq("id", route.params.drive.id)
        .single();
      if (isCancelled?.()) return;
      if (error) {
        setMessage(error.message);
      } else if (data) {
        setDrive(normalizeDrive(data as any));
      }
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await load(() => cancelled);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadMedia = async () => {
      const media = drive?.drive_media?.[0];
      if (!media) return;
      try {
        const url = await createSignedUrl("drive-media", media.storage_path);
        setPhotoUrl(url);
      } catch {
        setPhotoUrl(null);
      }
    };
    loadMedia();
  }, [drive]);

  const shareCard = async () => {
    if (!shotRef.current || !drive) return;
    const uri = await shotRef.current.capture?.();
    if (!uri) return;

    try {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id;
      if (userId) {
        const filename = `card-${drive.id}.jpg`;
        const path = `${userId}/${drive.id}/${filename}`;
        await uploadFromUri("drive-cards", path, uri, "image/jpeg");
        await supabase.from("drives").update({ card_path: path }).eq("id", drive.id);
      }
    } catch {
      setMessage("Could not upload card");
    }

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      setMessage("Sharing not available on this device");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  if (!drive) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Drive not found</Text>
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{drive.caption || "Drive"}</Text>
      <ViewShot ref={shotRef} options={{ format: "jpg", quality: 0.9 }}>
        <DriveCard drive={drive} />
      </ViewShot>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
      <Pressable style={styles.button} onPress={shareCard}>
        <Text style={styles.buttonText}>Share drive card</Text>
      </Pressable>
      {message ? <Text style={styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0B0B0C",
  },
  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  photo: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 12,
  },
  button: {
    backgroundColor: "#F97316",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#111",
    fontWeight: "700",
  },
  error: {
    color: "#EF4444",
    marginTop: 8,
  },
});
