import axios from "axios";

// Single source of truth for the backend base URL.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// ---- Types (loose, backend is source of truth) ----
export interface Platform {
  id: string;
  name: string;
  description?: string;
  thresholds?: Record<string, { review: number; reject: number }>;
  enabled_categories?: string[];
}

export interface Explanation {
  offending_segment?: string;
  primary_category?: string;
  reasoning?: string;
  severity?: string;
}

export interface ModerateResponse {
  decision_id: string;
  action: string;
  raw_scores: Record<string, number>;
  adjusted_scores: Record<string, number>;
  context_notes?: string;
  explanation?: Explanation;
  queued?: boolean;
  platform_id: string;
  content_preview?: string;
}

export interface QueueItem {
  id: string;
  decision_id: string;
  content: string;
  content_preview?: string;
  platform_id: string;
  platform_name?: string;
  top_category?: string;
  top_score?: number;
  action?: string;
  adjusted_scores?: Record<string, number>;
  raw_scores?: Record<string, number>;
  explanation?: Explanation;
  status?: string;
  assigned_to?: string;
  moderator_id?: string;
  moderator_action?: string;
  notes?: string;
  user_id?: string;
  created_at?: string;
  context_notes?: string;
}

export interface AuditLogItem {
  id: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor?: string;
  diff?: Record<string, unknown>;
  created_at?: string;
}

export interface AuditDecisionContext {
  decision_id: string;
  content: string;
  platform_id: string;
  platform_name?: string;
  user_id: string;
  action: string;
  top_category?: string;
  severity?: string;
  explanation_reasoning?: string;
  context_notes?: string;
  raw_scores?: Record<string, number>;
  adjusted_scores?: Record<string, number>;
  created_at?: string;
}

export interface AuditLogDetail extends AuditLogItem {
  decision?: AuditDecisionContext | null;
}

// ---- API calls ----
export const getPlatforms = () =>
  api.get<Platform[]>("/api/platforms").then((r) => r.data);

export const getPlatform = (id: string) =>
  api.get<Platform>(`/api/platforms/${id}`).then((r) => r.data);

export const createPlatform = (body: Partial<Platform>) =>
  api.post("/api/platforms", body).then((r) => r.data);

export const updatePlatform = (
  id: string,
  body: { thresholds: Record<string, unknown>; enabled_categories: string[] },
) => api.put(`/api/platforms/${id}`, body).then((r) => r.data);

export interface ModerateBody {
  content: string;
  platform_id: string;
  user_id: string;
  context: { prior_violations: number; thread_id: string };
}

export const moderate = (body: ModerateBody) =>
  api.post<ModerateResponse>("/api/moderate", body).then((r) => r.data);

export const getDecision = (id: string) =>
  api.get(`/api/decisions/${id}`).then((r) => r.data);

export interface QueueResponse {
  items: QueueItem[];
  total: number;
  page: number;
  limit?: number;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit?: number;
}

export const getQueue = (params: {
  status?: string;
  platform_id?: string;
  page?: number;
  limit?: number;
}) =>
  api
    .get("/api/queue", { params })
    .then((r) => {
      const d = r.data;
      // Normalise: backend may return an array or an object wrapper.
      if (Array.isArray(d)) {
        return { items: d, total: d.length, page: params.page ?? 1 } as QueueResponse;
      }
      return {
        items: d.items ?? d.queue ?? [],
        total: d.total ?? (d.items ? d.items.length : 0),
        page: d.page ?? params.page ?? 1,
        limit: d.limit,
      } as QueueResponse;
    });

export const getQueueItem = (id: string) =>
 api.get<QueueItem>(`/api/queue/${id}`).then((r) => r.data);

export const resolveQueueItem = (
  id: string,
  body: { action: string; moderator_id: string; notes: string },
) => api.post(`/api/queue/${id}/resolve`, body).then((r) => r.data);

export const getAuditLogs = (params: {
  entity_type?: string;
  page?: number;
  limit?: number;
}) =>
  api.get<AuditLogResponse>("/api/audit", { params }).then((r) => r.data);

export const getAuditLog = (id: number) =>
  api.get<AuditLogDetail>(`/api/audit/${id}`).then((r) => r.data);

export const getStats = (days: number) =>
  api.get("/api/stats", { params: { days } }).then((r) => r.data);

export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "Request failed"
    );
  }
  return err instanceof Error ? err.message : "Unexpected error";
}
