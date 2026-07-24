import { apiGet, apiPost } from "@/lib/api/client";
import type { NotificationEventItem, ReminderItem, StartupBriefing } from "@/types/orion";
export type RemindersResponse = { reminders: ReminderItem[] }; export type NotificationEventsResponse = { events: NotificationEventItem[] };
export const getReminders = () => apiGet<RemindersResponse>("/api/notifications/reminders");
export const createReminder = (payload: { title: string; description?: string; due_at: string; priority?: string }) => apiPost<ReminderItem>("/api/notifications/reminders", payload);
export const updateReminderStatus = (id: number, status: string) => apiPost<ReminderItem>(`/api/notifications/reminders/${id}/status`, { status });
export const getNotificationEvents = () => apiGet<NotificationEventsResponse>("/api/notifications/events");
export const getStartupBriefing = () => apiGet<StartupBriefing>("/api/notifications/startup-briefing");
