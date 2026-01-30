import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "gedi_settings_v1";

export type Settings = {
  hideStartEnd: boolean;
  trimKm: number;
};

const defaultSettings: Settings = {
  hideStartEnd: false,
  trimKm: 1,
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (!value) return;
        const parsed = JSON.parse(value) as Settings;
        if (mounted) setSettings({ ...defaultSettings, ...parsed });
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const update = useCallback(async (next: Partial<Settings>) => {
    const updated = { ...settings, ...next };
    setSettings(updated);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }, [settings]);

  return { settings, update, loading };
}

