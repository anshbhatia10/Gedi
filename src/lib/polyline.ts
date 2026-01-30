import polyline from "@mapbox/polyline";
import type { TrackPoint } from "@/types";

export function encodePolyline(points: TrackPoint[]): string {
  const coords: Array<[number, number]> = points.map((p) => [
    p.latitude,
    p.longitude,
  ]);
  return polyline.encode(coords);
}

export function decodePolyline(line: string): Array<{ latitude: number; longitude: number }> {
  if (!line) return [];
  try {
    const coords = polyline.decode(line);
    return coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return [];
  }
}
