import { Ticket, TicketDetail, ChangelogEntry } from "./types";

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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

export function fetchMetrics(): Promise<MetricsSummary> {
  return request<MetricsSummary>("/api/metrics/summary");
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

export function fetchTickets(filters?: { channel?: string; status?: string; priority?: string; page?: number; per_page?: number }): Promise<PaginatedTickets> {
  const params: Record<string, string> = {};
  if (filters?.channel && filters.channel !== "all") params.channel = filters.channel;
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.priority && filters.priority !== "all") params.priority = filters.priority;
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

export function generateChangelog(ticketId: string): Promise<ChangelogEntry> {
  return mutate<ChangelogEntry>(`/api/tickets/${ticketId}/generate_changelog`, "POST");
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

export function simulateTicket(channel: "slack" | "intercom" | "whatsapp"): Promise<unknown> {
  const payloads: Record<string, () => Record<string, unknown>> = {
    slack: () => ({
      token: `xoxb-${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`,
      team_id: `T${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      team_domain: "mainder",
      channel_id: "C_BUGS",
      channel_name: "bugs",
      user_id: `U_TEST${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      user_name: "test_user",
      command: "/bug",
      text: "Test ticket from frontend simulator",
      trigger_id: `${Date.now()}.123.abc`,
      response_url: `https://hooks.slack.com/commands/${crypto.randomUUID().slice(0, 12)}`,
      payload: {
        issue_id: `SIM${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        reporter: "test_user",
        priority: ["critica", "alta", "media", "baja"][Math.floor(Math.random() * 4)],
        incident: "Test ticket from frontend simulator",
        agency: "TestAgency",
        job_id: `https://love.mainder.ai/es/positions/${crypto.randomUUID().slice(0, 12)}`,
        additional_details: "Created via frontend simulate button",
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
            body: "Test ticket from frontend simulator",
            author: {
              type: "user",
              id: `user_${crypto.randomUUID().slice(0, 12)}`,
              name: "Test User",
              email: "test@example.com",
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
                contacts: [{ profile: { name: "Test User" }, wa_id: "56900000000" }],
                messages: [
                  {
                    id: `wamid.${crypto.randomUUID().replace(/-/g, "")}`,
                    from: "56900000000",
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    type: "text",
                    text: { body: "Test ticket from frontend simulator" },
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
