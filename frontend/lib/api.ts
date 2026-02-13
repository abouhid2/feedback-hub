import { Ticket, TicketDetail, ChangelogEntry, Notification, NotificationDetail, ChangelogEntryWithTicket, TicketGroup, GroupingSuggestionsResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function mutate<T>(path: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface MetricsSummary {
  total: number;
  by_channel: Record<string, number>;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  top_reporters: { name: string; ticket_count: number }[];
}

export function fetchMetrics(period?: string): Promise<MetricsSummary> {
  const params: Record<string, string> = {};
  if (period && period !== "all") params.period = period;
  return request<MetricsSummary>("/api/metrics/summary", Object.keys(params).length > 0 ? params : undefined);
}

export interface PaginatedTickets {
  tickets: Ticket[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function fetchTickets(filters?: { channel?: string; status?: string; priority?: string; type?: string; search?: string; page?: number; per_page?: number }): Promise<PaginatedTickets> {
  const params: Record<string, string> = {};
  if (filters?.channel && filters.channel !== "all") params.channel = filters.channel;
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.priority && filters.priority !== "all") params.priority = filters.priority;
  if (filters?.type && filters.type !== "all") params.type = filters.type;
  if (filters?.search) params.search = filters.search;
  if (filters?.page) params.page = String(filters.page);
  if (filters?.per_page) params.per_page = String(filters.per_page);
  return request<PaginatedTickets>("/api/tickets", Object.keys(params).length > 0 ? params : undefined);
}

export function fetchTicket(id: string): Promise<TicketDetail> {
  return request<TicketDetail>(`/api/tickets/${id}`);
}

export async function fetchChangelog(ticketId: string): Promise<ChangelogEntry | null> {
  try {
    return await request<ChangelogEntry>(`/api/tickets/${ticketId}/changelog`);
  } catch {
    return null;
  }
}

export interface ChangelogPreview {
  original: string;
  scrubbed: string;
  redactions: { type: string; original: string }[];
  system_prompt: string;
}

export function previewChangelog(ticketId: string): Promise<ChangelogPreview> {
  return request<ChangelogPreview>(`/api/tickets/${ticketId}/preview_changelog`);
}

export function generateChangelog(
  ticketId: string,
  options?: { prompt?: string; systemPrompt?: string; resolutionNotes?: string; model?: string; force?: boolean }
): Promise<ChangelogEntry> {
  if (!options) return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/generate_changelog`, "POST");
  const body: Record<string, unknown> = {};
  if (options.prompt) body.prompt = options.prompt;
  if (options.systemPrompt) body.system_prompt = options.systemPrompt;
  if (options.resolutionNotes) body.resolution_notes = options.resolutionNotes;
  if (options.model) body.model = options.model;
  if (options.force) body.force = true;
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/generate_changelog`, "POST", Object.keys(body).length > 0 ? body : undefined);
}

export function approveChangelog(ticketId: string, approvedBy: string): Promise<ChangelogEntry> {
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/approve_changelog`, "PATCH", { approved_by: approvedBy });
}

export function rejectChangelog(ticketId: string, rejectedBy: string, reason: string): Promise<ChangelogEntry> {
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/reject_changelog`, "PATCH", { rejected_by: rejectedBy, reason });
}

export function updateChangelogDraft(ticketId: string, content: string): Promise<ChangelogEntry> {
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/update_changelog_draft`, "PATCH", { content });
}

export function simulateTicket(channel: "slack" | "intercom" | "whatsapp", options?: { includePii?: boolean }): Promise<unknown> {
  const piiText = options?.includePii
    ? "Login broken for user maria.garcia@company.com (phone: +56 9 8765 4321). SSN: 123-45-6789. Password: hunter2. Please fix ASAP."
    : "Test ticket from frontend simulator";

  const piiName = options?.includePii ? "Maria Garcia" : "Test User";
  const piiEmail = options?.includePii ? "maria.garcia@company.com" : "test@example.com";

  const payloads: Record<string, () => Record<string, unknown>> = {
    slack: () => ({
      token: `xoxb-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      team_id: `T${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      team_domain: "feedback-hub",
      channel_id: "C_BUGS",
      channel_name: "bugs",
      user_id: `U_TEST${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      user_name: options?.includePii ? "maria.garcia" : "test_user",
      command: "/bug",
      text: piiText,
      trigger_id: `${Date.now()}.123.abc`,
      response_url: `https://hooks.slack.com/commands/${crypto.randomUUID().slice(0, 12)}`,
      payload: {
        issue_id: `SIM${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        reporter: options?.includePii ? "maria.garcia" : "test_user",
        priority: ["critica", "alta", "media", "baja"][Math.floor(Math.random() * 4)],
        incident: piiText,
        agency: "TestAgency",
        job_id: `https://love.feedback-hub.ai/es/positions/${crypto.randomUUID().slice(0, 12)}`,
        additional_details: options?.includePii
          ? "User shared credentials: pwd=secret123, contact at 555-012-3456"
          : "Created via frontend simulate button",
      },
    }),
    intercom: () => ({
      type: "notification_event",
      topic: "conversation.created",
      data: {
        item: {
          type: "conversation",
          id: `${Math.floor(20000000 + Math.random() * 10000000)}`,
          created_at: Math.floor(Date.now() / 1000),
          source: {
            type: "conversation",
            body: piiText,
            author: {
              type: "user",
              id: `user_${crypto.randomUUID().slice(0, 12)}`,
              name: piiName,
              email: piiEmail,
            },
          },
          conversation_parts: { total_count: 0 },
        },
      },
    }),
    whatsapp: () => ({
      object: "whatsapp_business_account",
      entry: [
        {
          id: `BIZ_${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: `PHONE_${crypto.randomUUID().slice(0, 8).toUpperCase()}` },
                contacts: [{ profile: { name: piiName }, wa_id: options?.includePii ? "56987654321" : "56900000000" }],
                messages: [
                  {
                    id: `wamid.${crypto.randomUUID().replace(/-/g, "")}`,
                    from: options?.includePii ? "56987654321" : "56900000000",
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "text",
                    text: { body: piiText },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    }),
  };

  return mutate(`/webhooks/${channel}`, "POST", payloads[channel]());
}

export function simulateStatus(ticketId: string, status: string): Promise<TicketDetail> {
  return mutate<TicketDetail>(`/api/tickets/${ticketId}/simulate_status`, "POST", { status });
}

export function createManualChangelog(ticketId: string, content: string): Promise<ChangelogEntry> {
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/manual_changelog`, "POST", { content });
}

// Ticket Groups
export function fetchTicketGroups(status?: string): Promise<TicketGroup[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") params.status = status;
  return request<TicketGroup[]>("/api/ticket_groups", Object.keys(params).length > 0 ? params : undefined);
}

export function fetchTicketGroup(id: string): Promise<TicketGroup> {
  return request<TicketGroup>(`/api/ticket_groups/${id}`);
}

export function createTicketGroup(name: string, ticketIds: string[], primaryTicketId: string): Promise<TicketGroup> {
  return mutate<TicketGroup>("/api/ticket_groups", "POST", {
    name,
    ticket_ids: ticketIds,
    primary_ticket_id: primaryTicketId,
  });
}

export function addTicketsToGroup(groupId: string, ticketIds: string[]): Promise<TicketGroup> {
  return mutate<TicketGroup>(`/api/ticket_groups/${groupId}/add_tickets`, "POST", { ticket_ids: ticketIds });
}

export function removeTicketFromGroup(groupId: string, ticketId: string): Promise<TicketGroup | { dissolved: boolean }> {
  return mutate<TicketGroup | { dissolved: boolean }>(`/api/ticket_groups/${groupId}/remove_ticket`, "DELETE", { ticket_id: ticketId });
}

export function resolveTicketGroup(groupId: string, channel: string, content: string, resolutionNote?: string): Promise<TicketGroup> {
  return mutate<TicketGroup>(`/api/ticket_groups/${groupId}/resolve`, "POST", {
    channel,
    content,
    resolution_note: resolutionNote,
  });
}

export function previewGroupContent(groupId: string): Promise<ChangelogPreview> {
  return request<ChangelogPreview>(`/api/ticket_groups/${groupId}/preview_content`);
}

export function suggestTicketGroups(hoursAgo: number): Promise<GroupingSuggestionsResponse> {
  return mutate<GroupingSuggestionsResponse>("/api/ticket_groups/suggest", "POST", { hours_ago: hoursAgo });
}

export function simulateIncident(): Promise<{ message: string; ticket_count: number }> {
  return mutate<{ message: string; ticket_count: number }>("/api/ticket_groups/simulate_incident", "POST");
}

export function generateGroupContent(
  groupId: string,
  options?: { prompt?: string; systemPrompt?: string; resolutionNotes?: string; model?: string }
): Promise<{ content: string }> {
  if (!options) return mutate<{ content: string }>(`/api/ticket_groups/${groupId}/generate_content`, "POST");
  const body: Record<string, unknown> = {};
  if (options.prompt) body.prompt = options.prompt;
  if (options.systemPrompt) body.system_prompt = options.systemPrompt;
  if (options.resolutionNotes) body.resolution_notes = options.resolutionNotes;
  if (options.model) body.model = options.model;
  return mutate<{ content: string }>(`/api/ticket_groups/${groupId}/generate_content`, "POST", Object.keys(body).length > 0 ? body : undefined);
}

// Notifications
export function fetchNotifications(filters?: { status?: string; channel?: string }): Promise<Notification[]> {
  const params: Record<string, string> = {};
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.channel && filters.channel !== "all") params.channel = filters.channel;
  return request<Notification[]>("/api/notifications", Object.keys(params).length > 0 ? params : undefined);
}

export function fetchNotification(id: string): Promise<NotificationDetail> {
  return request<NotificationDetail>(`/api/notifications/${id}`);
}

// Changelog Entries
export function fetchChangelogEntries(filters?: { status?: string }): Promise<ChangelogEntryWithTicket[]> {
  const params: Record<string, string> = {};
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  return request<ChangelogEntryWithTicket[]>("/api/changelog_entries", Object.keys(params).length > 0 ? params : undefined);
}

// Dead Letter Jobs
export interface DeadLetterJob {
  id: string;
  job_class: string;
  job_args: unknown[];
  error_class: string;
  error_message: string;
  queue: string | null;
  failed_at: string;
  status: string;
  created_at: string;
}

export function fetchDeadLetterJobs(status?: string): Promise<DeadLetterJob[]> {
  const params: Record<string, string> = {};
  if (status && status !== "all") params.status = status;
  return request<DeadLetterJob[]>("/api/dead_letter_jobs", Object.keys(params).length > 0 ? params : undefined);
}

export function resolveDeadLetterJob(id: string): Promise<DeadLetterJob> {
  return mutate<DeadLetterJob>(`/api/dead_letter_jobs/${id}/resolve`, "PATCH");
}

export function retryDeadLetterJob(id: string): Promise<DeadLetterJob> {
  return mutate<DeadLetterJob>(`/api/dead_letter_jobs/${id}/retry`, "POST");
}

export interface ForceFailStatus {
  job_class: string;
  armed: boolean;
}

export function fetchForceFailStatus(): Promise<ForceFailStatus[]> {
  return request<ForceFailStatus[]>("/api/dead_letter_jobs/force_fail_status");
}

export function toggleForceFail(jobClass: string): Promise<{ job_class: string; armed: boolean }> {
  return mutate<{ job_class: string; armed: boolean }>("/api/dead_letter_jobs/force_fail", "POST", { job_class: jobClass });
}
