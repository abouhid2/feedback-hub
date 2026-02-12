export interface Ticket {
  id: string;
  title: string;
  ticket_type: string;
  priority: number;
  status: string;
  original_channel: string;
  reporter: { name: string; email: string | null } | null;
  tags: string[];
  ticket_group_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketSource {
  platform: string;
  external_id: string;
  external_url: string | null;
  raw_payload: Record<string, unknown>;
}

export interface TicketEvent {
  event_type: string;
  actor_type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface ChangelogEntry {
  id: string;
  ticket_id: string;
  content: string;
  status: string;
  ai_model: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  ticket_id: string;
  changelog_entry_id: string | null;
  channel: string;
  recipient: string;
  status: string;
  content: string;
  retry_count: number;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface TicketDetail extends Ticket {
  description: string | null;
  metadata: Record<string, unknown> | null;
  ai_suggested_type: string | null;
  ai_suggested_priority: number | null;
  ai_summary: string | null;
  enrichment_status: string | null;
  notion_page_id: string | null;
  ticket_group: { id: string; name: string; status: string } | null;
  sources: TicketSource[];
  events: TicketEvent[];
}

export interface NotificationDetail extends Notification {
  ticket: {
    id: string;
    title: string;
    status: string;
    ticket_type: string;
    priority: number;
    original_channel: string;
    reporter: { name: string; email: string | null } | null;
  } | null;
  changelog_entry: {
    id: string;
    content: string;
    status: string;
    ai_model: string;
    approved_by: string | null;
    approved_at: string | null;
  } | null;
  related_tickets: {
    id: string;
    title: string;
    status: string;
    ticket_type: string;
    priority: number;
    original_channel: string;
    reporter: { name: string; email: string | null } | null;
  }[];
}

export interface ChangelogEntryWithTicket extends ChangelogEntry {
  ai_prompt_tokens: number;
  ai_completion_tokens: number;
  ticket: {
    id: string;
    title: string;
    status: string;
    reporter: { name: string } | null;
  } | null;
  related_tickets: {
    id: string;
    title: string;
    status: string;
    reporter: { name: string } | null;
  }[];
}

export interface TicketGroupTicket {
  id: string;
  title: string;
  ticket_type: string;
  priority: number;
  status: string;
  original_channel: string;
  reporter: { name: string; email: string | null } | null;
  created_at: string;
}

export interface TicketGroup {
  id: string;
  name: string;
  status: string;
  primary_ticket_id: string | null;
  resolved_via_channel: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  ticket_count: number;
  tickets?: TicketGroupTicket[];
  created_at: string;
  updated_at: string;
}
