import type { Drive, Profile } from "@/types";

type DriveRow = Omit<Drive, "profiles"> & {
  profiles?: Profile | Profile[] | null;
};

export function normalizeDrive(row: DriveRow): Drive {
  const profilesRaw = row?.profiles;
  const profiles = Array.isArray(profilesRaw)
    ? profilesRaw[0] ?? null
    : profilesRaw ?? null;
  return { ...row, profiles } as Drive;
}
