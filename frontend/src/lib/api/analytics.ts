import { apiGet } from "@/lib/api/client";

export type AnalyticsRange = "24h" | "7d" | "30d";

export type OperationalTelemetry = {
  source: "live_events";
  generated_at: string;
  range: AnalyticsRange;
  window_start: string;
  window_end: string;
  has_data: boolean;
  metric_definition: string;
  agent_runs: { completed: number; success_rate: number | null };
  summary: {
    total_executions: number;
    success_rate: number | null;
    average_latency_ms: number | null;
    p95_latency_ms: number | null;
    token_usage: number;
  };
  series: Array<{ label: string; executions: number; latency_ms: number | null; success_rate: number | null }>;
  agents: Array<{ name: string; tasks: number; success_rate: number | null; utilisation: number | null }>;
  outcomes: Array<{ label: string; count: number }>;
  heatmap: number[][];
};

export const getOperationalTelemetry = (range: AnalyticsRange) =>
  apiGet<OperationalTelemetry>(`/api/analytics/operational?range=${range}`);
