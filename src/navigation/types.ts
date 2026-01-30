import type { Drive, DriveLocation } from "@/types";

export type RootStackParamList = {
  // Auth
  Auth: undefined;

  // Main screens
  Home: undefined;

  // Recording flow
  Record: undefined;
  SaveDrive: {
    duration: number;
    distance: number;
    topSpeed: number;
    avgSpeed: number;
    route: DriveLocation[];
  };

  // Detail views
  DriveDetail: { driveId: string };

  // Other screens
  Friends: undefined;
  Profile: undefined;
  Settings: undefined;
};

// For backwards compatibility
export type MainTabParamList = {
  Feed: undefined;
  Record: undefined;
  Friends: undefined;
  Profile: undefined;
};

// Type helper for navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList { }
  }
}
