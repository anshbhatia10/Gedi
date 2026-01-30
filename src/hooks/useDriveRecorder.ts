import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { TrackPoint, DriveLocation } from "@/types";
import { computeStats, haversineMeters } from "@/lib/geo";

export function useDriveRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [topKmh, setTopKmh] = useState(0);
  const [currentKmh, setCurrentKmh] = useState(0);
  const [durationS, setDurationS] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<TrackPoint | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Convert points to route format
  const route: DriveLocation[] = points.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
    ts: p.timestamp,
    speed_mps: p.speedMps ?? undefined,
  }));

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDurationS(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const addPoint = useCallback((point: TrackPoint) => {
    setPoints((prev) => {
      const next = [...prev, point];
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const delta = haversineMeters(last, point);
        setDistanceM((d) => d + delta);
      }
      const speedKmh = point.speedMps ? point.speedMps * 3.6 : 0;
      setCurrentKmh(speedKmh);
      if (speedKmh > 0) {
        setTopKmh((prevTop) => Math.max(prevTop, speedKmh));
      }
      return next;
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Location permission denied");
      return false;
    }

    setIsRecording(true);
    setPoints([]);
    setDistanceM(0);
    setTopKmh(0);
    setCurrentKmh(0);
    setDurationS(0);
    lastPointRef.current = null;

    subscriptionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 5,
        mayShowUserSettingsDialog: true,
      },
      (loc) => {
        const point: TrackPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          speedMps: loc.coords.speed ?? null,
          accuracy: loc.coords.accuracy ?? null,
        };
        lastPointRef.current = point;
        addPoint(point);
      }
    );
    return true;
  }, [addPoint]);

  const stop = useCallback(async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    setIsRecording(false);
    setCurrentKmh(0);

    const stats = computeStats(points);
    const finalDuration = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : durationS;

    return {
      points,
      route,
      durationS: finalDuration,
      distanceM,
      topKmh,
      avgKmh: finalDuration > 0 ? (distanceM / 1000) / (finalDuration / 3600) : 0,
      stats,
    };
  }, [points, route, durationS, distanceM, topKmh]);

  const reset = useCallback(() => {
    setIsRecording(false);
    setPoints([]);
    setDistanceM(0);
    setTopKmh(0);
    setCurrentKmh(0);
    setDurationS(0);
    lastPointRef.current = null;
    startTimeRef.current = null;
  }, []);

  return {
    isRecording,
    points,
    route,
    distanceM,
    topKmh,
    currentKmh,
    durationS,
    error,
    start,
    stop,
    reset,
  };
}
