export interface Ticket {
  id: string;
  title: string;
  ticket_type: string;
  priority: number;
  status: string;
  original_channel: string;
  reporter: { name: string; email: string | null } | null;
  tags: string[];
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

export interface TicketDetail extends Ticket {
  description: string | null;
  metadata: Record<string, unknown> | null;
  ai_suggested_type: string | null;
  ai_suggested_priority: number | null;
  ai_summary: string | null;
  enrichment_status: string | null;
  notion_page_id: string | null;
  sources: TicketSource[];
  events: TicketEvent[];
}
