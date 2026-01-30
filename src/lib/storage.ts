import * as FileSystem from "expo-file-system";
import { supabase } from "@/lib/supabase";

export async function uploadFromUri(
  bucket: string,
  path: string,
  uri: string,
  contentType?: string,
) {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) throw new Error("File not found");

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: true,
  });

  if (error) throw error;
}

export async function createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
