import { apiGet, apiPost } from "@/lib/api/client";
import type { MemoryItem } from "@/components/aurora/aurora-types";

export const getMemory = () =>
  apiGet<{ items: MemoryItem[] }>("/api/memory");
export const previewContext = (message: string) =>
  apiPost<{ context: string }>("/api/context/preview", { message });
