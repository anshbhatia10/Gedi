export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type Drive = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_kmh: number | null;
  top_kmh: number | null;
  polyline_raw: string | null;
  polyline_shared: string | null;
  hide_start_end: boolean;
  caption: string | null;
  card_path: string | null;
  profiles?: Profile | null;
  vehicles?: { id: string; nickname: string | null; make: string | null; model: string | null } | null;
  drive_media?: Array<{ id: string; storage_path: string }> | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
};

export type DriveLocation = {
  lat: number;
  lng: number;
  ts: number;
  speed_mps?: number;
};

export type TrackPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedMps: number | null;
  accuracy: number | null;
};

export type RecordingResult = {
  points: TrackPoint[];
  stats: {
    distanceM: number;
    durationS: number;
    avgKmh: number;
    topKmh: number;
  };
};
