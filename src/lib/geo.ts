import type { TrackPoint } from "@/types";

const R = 6371000;

export function haversineMeters(a: TrackPoint, b: TrackPoint): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function kmhFromMps(mps: number): number {
  return mps * 3.6;
}

export function computeStats(points: TrackPoint[]) {
  if (points.length < 2) {
    return {
      distanceM: 0,
      durationS: 0,
      avgKmh: 0,
      topKmh: 0,
    };
  }

  let distanceM = 0;
  let topMps = 0;

  for (let i = 1; i < points.length; i += 1) {
    distanceM += haversineMeters(points[i - 1], points[i]);
    const speed = points[i].speedMps ?? 0;
    if (speed > topMps) topMps = speed;
  }

  const durationS =
    Math.max(points[points.length - 1].timestamp - points[0].timestamp, 0) /
    1000;
  const avgKmh = durationS > 0 ? (distanceM / durationS) * 3.6 : 0;

  return {
    distanceM,
    durationS,
    avgKmh,
    topKmh: kmhFromMps(topMps),
  };
}

export function trimRoute(
  points: TrackPoint[],
  trimMeters: number,
): TrackPoint[] {
  if (trimMeters <= 0 || points.length < 2) return points;

  let startIndex = 0;
  let accStart = 0;
  for (let i = 1; i < points.length; i += 1) {
    accStart += haversineMeters(points[i - 1], points[i]);
    if (accStart >= trimMeters) {
      startIndex = i;
      break;
    }
  }

  let endIndex = points.length - 1;
  let accEnd = 0;
  for (let i = points.length - 1; i > 0; i -= 1) {
    accEnd += haversineMeters(points[i], points[i - 1]);
    if (accEnd >= trimMeters) {
      endIndex = i - 1;
      break;
    }
  }

  if (endIndex <= startIndex) return points;
  return points.slice(startIndex, endIndex + 1);
}

export function regionForPoints(points: Array<{ latitude: number; longitude: number }>) {
  if (points.length === 0) {
    return {
      latitude: 28.6139,
      longitude: 77.209,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  points.forEach((p) => {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  });

  const latitude = (minLat + maxLat) / 2;
  const longitude = (minLng + maxLng) / 2;
  const latitudeDelta = Math.max(0.01, maxLat - minLat + 0.01);
  const longitudeDelta = Math.max(0.01, maxLng - minLng + 0.01);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}
