import { apiGet, apiPost } from "@/lib/api/client";
import type { UserSettingsProfile } from "@/types/orion";
export const getUserSettingsProfile = () => apiGet<UserSettingsProfile>("/api/settings/profile");
export const updateUserSetting = (key: string, value: string) => apiPost<{ status: string; message: string; setting?: { value: string } }>(`/api/settings/profile/${key}`, { value });
export const resetUserSettings = () => apiPost<{ status: string; message: string }>("/api/settings/profile/reset");
