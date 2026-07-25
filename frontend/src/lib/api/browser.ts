import { apiPost } from "@/lib/api/client";
import type { BrowserResearchResult } from "@/components/aurora/aurora-types";

export const researchBrowserPage = (url: string) =>
  apiPost<BrowserResearchResult>("/api/browser/research", { url });
