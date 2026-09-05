import { apiGet, apiPost } from "@/lib/api/client";
import type { UserSettingsProfile } from "@/types/orion";
export const getUserSettingsProfile = () => apiGet<UserSettingsProfile>("/api/settings/profile");
export const updateUserSetting = (key: string, value: string) => apiPost<{ status: string; message: string; setting?: { value: string } }>(`/api/settings/profile/${key}`, { value }).then((response) => {
  if (response.status !== "updated") throw new Error(response.message || "The setting was not updated.");
  return response;
});
export const resetUserSettings = () => apiPost<UserSettingsProfile>("/api/settings/profile/reset");
