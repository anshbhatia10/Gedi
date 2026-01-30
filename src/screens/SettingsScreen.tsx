import { View, Text, Switch, TextInput, StyleSheet } from "react-native";
import { useSettings } from "@/hooks/useSettings";

export function SettingsScreen() {
  const { settings, update } = useSettings();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Hide start/end</Text>
        <Switch
          value={settings.hideStartEnd}
          onValueChange={(v) => update({ hideStartEnd: v })}
        />
      </View>
      <Text style={styles.label}>Trim distance (km)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={String(settings.trimKm)}
        onChangeText={(v) => update({ trimKm: Math.max(0, Number(v) || 0) })}
      />
      <Text style={styles.note}>
        If enabled, your shared route hides the first and last N km.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0B0B0C",
  },
  title: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  label: {
    color: "#FFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#222",
    color: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  note: {
    color: "#999",
    fontSize: 12,
  },
});

