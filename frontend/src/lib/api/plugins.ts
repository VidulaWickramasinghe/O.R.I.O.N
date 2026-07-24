import { apiGet, apiPost } from "@/lib/api/client";
import type { PluginItem } from "@/types/orion";
export type PluginsResponse = { plugins: PluginItem[]; metrics: Record<string, unknown>; report: string };
export const getPlugins = () => apiGet<PluginsResponse>("/api/plugins");
export const updatePluginStatus = (pluginKey: string, enabled: boolean) => apiPost<{ status: string; plugin?: PluginItem; message: string }>(`/api/plugins/${pluginKey}/status`, { enabled });
