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

export function fetchTickets(filters?: { channel?: string; status?: string; priority?: string }): Promise<Ticket[]> {
  const params: Record<string, string> = {};
  if (filters?.channel && filters.channel !== "all") params.channel = filters.channel;
  if (filters?.status && filters.status !== "all") params.status = filters.status;
  if (filters?.priority && filters.priority !== "all") params.priority = filters.priority;
  return request<Ticket[]>("/api/tickets", Object.keys(params).length > 0 ? params : undefined);
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
