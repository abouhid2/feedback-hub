# Feedback Hub: Execution Plan

## Deliverables

- [x] **Technical Design Document** (Markdown + .docx) — PRIMARY (in progress)
- [x] **Working Code Repository** (Rails API + Next.js dashboard + Simulator)

---

## Phase 1: Data Model & ERD ✅ DONE

> Foundation for everything. Design the PostgreSQL schema first.
> **Output:** `docs/data-model.md`, `hub/db/migrate/`

- [x] Design the `reporters` table (unified identity across Slack/Intercom/WhatsApp/Email)
- [x] Design the `reporter_identities` table (links Slack User ID, Intercom email, WhatsApp phone to one Reporter)
- [x] Design the `tickets` table (canonical normalized entity)
  - Core: title, description, type (bug/feature/question), priority (P0-P5), status, ai_summary
  - Map to Notion fields: Status, Priority, Type, Reporter, Sprint, Source
- [x] Design the `ticket_sources` table (links ticket to external source IDs — Slack ts, Intercom conversation_id, WhatsApp message_id)
- [x] Design the `ticket_events` table (append-only audit log / timeline)
- [x] Design the `changelog_entries` table (AI-generated draft, approval status, linked to ticket)
- [x] Design the `notifications` table (track sent notifications, retries, delivery status per channel)
- [x] Design the `attachments` table (S3 blob references)
- [x] Define uniqueness constraints for idempotency
- [x] Define index plan (query by source, status, priority, date, reporter)
- [x] Decide JSONB vs structured columns (raw webhook payloads, channel-specific metadata)
- [x] Produce ERD diagram (Mermaid)

---

## Phase 2: System Architecture Overview ✅ DONE

> High-level component diagram showing how everything connects.
> **Output:** `docs/architecture.md`, Section 3 of .docx deliverable

- [x] Draw high-level architecture diagram (Rails API, Sidekiq workers, Redis, PostgreSQL, S3, OpenAI, Notion API, external channels)
- [x] Define the ingestion pipeline flow (webhook → normalize → enrich → store)
- [x] Define the sync pipeline flow (Hub ↔ Notion) — push on triage + poll every 2-3 min
- [x] Define the resolution pipeline flow (Done → AI changelog → human review → notify)
- [x] Identify Sidekiq job types and queues (8 jobs across 4 queues: critical, default, low, notifications)

---

## Phase 3: Ingestion Layer (Webhook Endpoints) ✅ DONE (prototype)

> How feedback enters the system from each channel.
> **Built:** Controllers, IngestionService, 3 Normalizers, idempotency, simulator

- [x] `POST /webhooks/slack` — slash command + Slack workflow form
  - [x] Parse structured form fields (Reporter, Priority, Description, etc.)
  - [x] Idempotency via Slack event_id / message ts
  - [x] HMAC signature verification (WebhookVerifierService — `v0:timestamp:body` + SHA256)
- [x] `POST /webhooks/intercom` — new conversation webhook
  - [x] Extract conversation_id, user metadata, message body
  - [x] Idempotency via conversation_id
  - [x] HMAC signature verification (WebhookVerifierService — `X-Hub-Signature` + SHA256)
- [x] `POST /webhooks/whatsapp` — incoming message via WhatsApp Business API
  - [x] Handle text messages
  - [x] Idempotency via message_id
  - [x] Signature verification (WebhookVerifierService — `X-Hub-Signature-256` + SHA256)
- [x] `POST /api/tickets` — In-App "Report a Bug" + Internal Backoffice manual entry
- [x] Design the `IngestionService` — normalizes any source into a canonical Ticket
- [x] Design deduplication strategy:
  - [x] Same-channel: unique constraint on (source_channel, external_id)
  - [ ] Cross-channel: AI similarity check via OpenAI embeddings on recent tickets (within time window)
- [x] Store raw webhook payload as JSONB for debugging
- [x] Priority inference from text (English + Spanish keywords)
- [x] Ticket type inference from text (bug, feature_request, question, incident)
- [x] Cross-channel reporter resolution (email-first, fallback to platform identity)

---

## Phase 3.5: TDD — Core Feature Services ✅ DONE

> Before building out features, define contracts with tests first.
> **Output:** 122 specs (all green), 6 services, 5 jobs, 3 migrations, 8 factories

### Test Framework Setup
- [x] Add rspec-rails 7, factory_bot_rails 6.4, shoulda-matchers 6, webmock 3.23
- [x] Configure `rails_helper.rb` (FactoryBot, Shoulda, WebMock, Sidekiq::Testing, ActiveJob test adapter, TimeHelpers)
- [x] Create 8 factories: reporters, reporter_identities, tickets, ticket_sources, ticket_events, changelog_entries, notifications, attachments

### Schema Migrations
- [x] **Redesign `changelog_entries`** — removed field_name/old_value/new_value/changed_by; added `content` (text), `status` (draft/approved/rejected), `approved_by`, `approved_at`, `ai_model`, `ai_prompt_tokens`, `ai_completion_tokens`
- [x] **Expand `notifications`** — added `changelog_entry_id` (FK), `retry_count`, `last_error`, `delivered_at`; channels now include intercom/whatsapp; statuses: pending/sent/failed/permanently_failed
- [x] **Add `notion_page_id` to tickets** — unique partial index where not null

### Model Updates + Specs (63 specs)
- [x] `ChangelogEntry` — rewritten: content/status validations, scopes (.drafts, .approved), has_many :notifications
- [x] `Notification` — expanded channels (5), statuses (4), retry_count validation, optional changelog_entry association
- [x] `TicketEvent` — 6 new event types: changelog_drafted/approved/rejected, notification_sent/failed, synced_to_notion
- [x] `Ticket` — notion_page_id attribute with uniqueness enforcement

### AI Changelog Generation (10 specs)
- [x] `ChangelogGeneratorService` — calls OpenAI (stubbed), creates draft + event, idempotent, validates ticket status
- [x] `ChangelogGeneratorJob` — enqueue wrapper with graceful discard

### Human Review / Approval (10 specs)
- [x] `ChangelogReviewService` — `.approve` (sets status, records who/when, enqueues dispatch), `.reject` (with reason), `.update_draft`; all guard against non-draft status

### Notification Dispatch (15 specs)
- [x] `NotificationDispatchService` — creates notification, delivers via platform API, handles success/failure, retry with backoff
- [x] `NotificationDispatchJob` + `NotificationRetryJob`

### Notion Two-Way Sync (17 specs)
- [x] `NotionSyncService` — push to Notion (create/update pages), maps ticket fields to Notion properties
- [x] `NotionPollService` — poll Notion DB, detect "Done" → resolve ticket → enqueue changelog generation
- [x] `NotionSyncJob` + `NotionPollJob`

---

## Phase 4: AI Enrichment Pipeline ✅ DONE

> OpenAI-powered triage before human intervention.

- [x] Design the `AiTriageJob` (Sidekiq) — runs after ticket creation
  - Auto-categorize: Type (Bug, Feature, Question) + Severity (P0-P5)
  - Summarize: Generate clean one-sentence title
  - Store AI suggestions as `ai_suggested_*` fields (separate from human-confirmed fields)
- [x] PII Handling Strategy:
  - Strip/redact emails, phone numbers, names before sending to OpenAI
  - Use a `PiiScrubber` service with regex + allow-list approach
  - Log only redacted versions; store originals encrypted at rest
- [x] Human-in-the-loop:
  - AI suggestions are **drafts** — support team reviews/edits in dashboard before syncing to Notion
  - Fields: `ai_suggested_type`, `ai_suggested_priority`, `ai_summary` vs `confirmed_type`, `confirmed_priority`, `title`
- [x] Fallback: If OpenAI is down, ticket is saved with `enrichment_status: :pending`, retried via Sidekiq

---

## Phase 5: Notion Two-Way Sync ✅ DONE

> Push tickets to Notion, pull status changes back.

- [x] **Push (Hub → Notion):** `NotionSyncJob` creates Notion page when ticket is triaged/confirmed
  - Map fields: Title → Name, Priority → P0-P5 select, Type → Bug/Task/User Story, Status, Reporter, Source
  - Store `notion_page_id` on ticket for linking
- [x] **Pull (Notion → Hub):** Incremental polling strategy
  - `NotionPollSchedulerJob` self-reschedules every 2 minutes
  - Query Notion API: `filter: last_edited_time > last_poll_timestamp`
  - Detect status changes (especially → Done), processes multiple pages per poll
  - Use `last_edited_time` cursor to avoid re-processing
  - Justification: Notion lacks granular webhooks; polling with cursor is pragmatic, stays well within rate limits (~3 req/min vs 3 req/sec limit)
- [x] Conflict resolution: Notion status wins (it's the source of truth for execution)
- [x] Rate limit handling: `RateLimitError` with `retry_after` on both sync + poll, respects Retry-After headers
- [x] If Notion API is down: queue syncs in Sidekiq with retry, no data loss

---

## Phase 6: Changelog Generation & Resolution ✅ DONE

> When a ticket hits "Done", generate a changelog and close the loop.

- [x] Detect resolution: Notion poll detects status → Done, or manual action in dashboard
- [x] `ChangelogGeneratorJob`:
  - Gather context: original report + resolution notes from Notion page
  - Call OpenAI to draft non-technical changelog entry
  - Store as `changelog_entries` with `status: :draft`
- [x] Human review required before sending (the "Release Valve"):
  - Support agent sees AI draft in dashboard
  - Can edit the text
  - Clicks "Approve & Send" → status changes to `:approved`
  - Only then are notifications triggered

---

## Phase 7: Closing the Loop (Notifications) ✅ DONE

> Notify the original reporter back through their source channel.

- [x] `NotificationDispatchJob` — triggered after changelog approval
  - Slack: Reply to original thread via `chat.postMessage` with `thread_ts`
  - Intercom: Post reply in conversation via Intercom API
  - WhatsApp: Send template message (pre-approved) via WhatsApp Business API
  - In-App: Store notification for display in platform
- [x] WhatsApp 24h window handling:
  - If < 24h since last user message → send session message (free-form text)
  - If > 24h → send pre-approved Template Message (e.g., "Your reported issue has been resolved: {summary}")
  - If template not available → mark notification as `channel_restricted`, log for manual follow-up
  - `last_message_at` tracked on `reporter_identities` table
  - `WhatsappDeliveryService` handles all 3 scenarios
- [x] Mass-resolution spam prevention:
  - Ticket grouping sends ONE notification on primary ticket's channel (not one per ticket)
  - Human-in-the-loop changelog approval acts as a natural throttle
- [x] Retry with limits:
  - Failed notifications: retry up to 5 times via `NotificationRetryJob` (`MAX_RETRIES = 5`)
  - After 5 failures: mark as `permanently_failed`, surface in dashboard for investigation
  - Notion jobs use `retry_on` with polynomial backoff (3 attempts)
  - Store attempt count + last error on `notifications` table

---

## Phase 8: Internal API (Rails) ✅ DONE

> Endpoints for the Next.js dashboard.

- [x] `GET /api/tickets` — List with filters (status, channel, priority) + eager loading
- [x] `GET /api/tickets/:id` — Detail with sources, events timeline
- [x] `POST /api/tickets/:id/generate_changelog` — Manually trigger AI changelog draft
- [x] `PATCH /api/tickets/:id/approve_changelog` — Approve AI message for sending
- [x] `GET /api/tickets/:id/changelog` — View current changelog entry with status
- [x] `GET /api/notifications` — List with filters (status, channel, ticket_id)
- [x] `GET /api/notifications/:id` — Detail with nested ticket, changelog_entry, related_tickets
- [x] `GET /api/changelog_entries` — List with status filter, nested ticket, related_tickets
- [x] `GET /api/metrics/summary` — Volume by source/type/priority/status, top reporters, period filtering (24h/7d/30d)
- [x] `POST /api/tickets` — Manual ticket creation (Backoffice) + created event
- [x] `PATCH /api/tickets/:id` — Update ticket (status, priority, type) + status_changed event

---

## Phase 9: Frontend Dashboard (Next.js) ✅ DONE

> Simple internal tool mock.

- [x] **Ticket List View** — Table with filters (Channel) + stats row + auto-refresh (5s polling)
  - [x] Priority color-coding (P0=red to P5=gray)
  - [x] Channel badges (Slack/Intercom/WhatsApp)
  - [x] Stats: total tickets, per-channel counts, critical count (P0-P1)
  - [x] Live refresh indicator (green pulse dot)
- [x] **Ticket Detail View** — Shows:
  - Normalized data vs raw source data
  - Timeline/event log (Reported → Triaged → Synced to Notion → Fixed → Notified)
  - AI triage card, sources list
  - Data comparison (original vs normalized)
- [x] **AI Review Component** ("Release Valve") — Critical:
  - Shows AI-generated changelog draft
  - Editable text area
  - "Approve & Send" / "Reject" buttons to trigger notifications
  - StatusActions component for ticket lifecycle
  - SimulateButtons + Toast notifications
- [x] **Changelog Entries View** — `/changelog-entries` page with status filter, auto-refresh, related tickets
- [x] **Notification History** — Delivery status tracking
  - `/notifications` page with status/channel filters + "View" links to detail page
  - `/notifications/[id]` detail page with nested ticket, changelog entry, related tickets, error card
  - Sidebar navigation
- [x] **Metrics Dashboard** — recharts (PieChart, BarChart):
  - Ticket volume by channel, type, priority, status
  - Period filtering (24h / 7d / 30d)
  - Top reporters table
  - Clickable charts → filtered dashboard
  - TicketTypeInferenceService (OpenAI in prod, regex fallback)
  - Type filter added to dashboard

---

## Phase 10: Sequence Diagrams ✅ DONE

> End-to-end flows for the design document.

- [x] **Main Flow:** User reports on WhatsApp → Webhook intake → Normalize → AI Triage → Human Review → Notion Sync → Dev Fixes → Notion Poll detects Done → Changelog generated → Human approves → Notification sent back via WhatsApp
- [x] **Cross-channel duplicate flow:** Same bug reported on Intercom + Backoffice → AI similarity detection → Link/merge tickets
- [x] **Mass-resolution flow:** Notion task Done → ticket groups → single notification on primary ticket's channel

---

## Phase 11: Edge Cases & Risk Analysis ✅ DONE

> Must be explicitly addressed in the document.

- [x] **Idempotency:** Unique constraints on (source, external_id), idempotency keys on all webhook handlers
- [x] **Deduplication:** Same-channel (external_id) + cross-channel (AI similarity within time window)
- [x] **WhatsApp 24h Window:** Template messages for late notifications, fallback to manual
- [x] **AI Hallucinations:** Human-in-the-loop mandatory before any customer-facing message
- [x] **PII & AI Privacy:** PiiScrubber before OpenAI calls, data minimization, encrypted storage
- [x] **Spam & Rate Limits:** Ticket grouping for mass-resolutions, bounded retry limits (MAX_RETRIES=5), Notion job retry_on with polynomial backoff
- [x] **External dependency failures:** Sidekiq retry with exponential backoff, no data loss if Notion/OpenAI/Slack is down
- [x] **Observability:** StructuredLogger (JSON output), JobLogging concern, DeadLetterHandlerJob, Sidekiq death handler, dead letter queue API + frontend page

---

## Phase 12: Compile Technical Design Document ✅ DONE

> Assemble everything into the final deliverable.
> **Output:** `README.md` (comprehensive technical design document)

- [x] Title page + table of contents
- [x] Executive summary / problem statement
- [x] ERD diagram (Mermaid)
- [x] System architecture diagram (Mermaid)
- [x] Data model documentation with justifications
- [x] Ingestion layer design
- [x] AI enrichment pipeline design
- [x] Notion sync strategy with justification
- [x] Changelog & notification flow design
- [x] API specification
- [x] Frontend component descriptions
- [x] Sequence diagrams
- [x] Edge cases & risk analysis
- [x] Trade-offs and alternatives considered

---

## Priority Order

| Priority | Phase | Status |
|----------|-------|--------|
| 1 | Data Model (Phase 1) | ✅ Done |
| 2 | Architecture Overview (Phase 2) | ✅ Done |
| 3 | Ingestion (Phase 3) | ✅ Done (prototype) |
| 3.5 | TDD Core Services (Phase 3.5) | ✅ Done (122 specs, 6 services, 5 jobs) |
| 3.6 | Changelog API Endpoints (Phase 3.6) | ✅ Done (generate, approve, view — strict RED→GREEN TDD) |
| 3.7 | Notifications + Changelog Entries API (Phase 3.7) | ✅ Done (list, detail, changelog entries index — RED→GREEN TDD) |
| 3.8 | Ticket CRUD API (Phase 3.8) | ✅ Done (create + update with audit events — RED→GREEN TDD) |
| 3.9 | Metrics API (Phase 3.9) | ✅ Done (summary endpoint — RED→GREEN TDD, 116 total specs) |
| 4 | AI Enrichment (Phase 4) | ✅ Done (AiTriageService + PiiScrubber + AiTriageJob — RED→GREEN TDD, 129 total specs) |
| 5 | Notion Sync (Phase 5) | ✅ Done (rate limit handling + poll scheduler — RED→GREEN TDD, 137 total specs) |
| 5.1 | WhatsApp 24h Window (Phase 7) | ✅ Done (WhatsappDeliveryService + session/template logic, 144 total specs) |
| 5.2 | Lifecycle Hooks (Phase 7.5) | ✅ Done (wired ingestion→triage→sync→poll chain, 149 total specs) |
| 5.4 | Webhook Security (Phase 8) | ✅ Done (HMAC verification on all 3 webhooks — RED→GREEN TDD, 162 total specs) |
| 6 | Changelog + Notifications (Phases 6-7) | Services built via TDD (Phase 3.5), approve endpoint done |
| 7 | API + Frontend (Phases 8-9) | ✅ Done (13 API endpoints + full dashboard with 6 pages) |
| 7.1 | Frontend — Ticket Detail + AI Review | ✅ Done (timeline, data comparison, changelog review, status actions) |
| 7.2 | Frontend — Changelog Entries + Notifications | ✅ Done (changelog entries index, notification history + detail, filters) |
| 7.3 | Frontend — Metrics Dashboard | ✅ Done (recharts, period filter, clickable charts, type inference) |
| 7.4 | Observability (Phase 11 partial) | ✅ Done (structured logging, dead letter queue, force-fail, 259 specs) |
| 8 | Diagrams + Edge Cases (Phases 10-11) | ✅ Done (README.md) |
| 9 | Final Document (Phase 12) | ✅ Done (README.md — comprehensive technical design document) |

---

## Working Prototype (Bonus)

In addition to the design document, a fully working prototype exists demonstrating:

- **3 webhook endpoints** with HMAC signature verification receiving realistic simulated payloads
- **3 normalizers** converting platform-specific formats to canonical Tickets
- **Idempotent ingestion** — duplicate webhooks are safely ignored
- **Cross-channel reporter resolution** — same person recognized across platforms
- **AI triage pipeline** — OpenAI gpt-5.1 (default, user-selectable) for type/priority/summary with PII scrubbing
- **Ticket type inference** — OpenAI in production, regex fallback with Spanish keyword support
- **Notion two-way sync** — push on triage + poll every 2 min with rate limit handling
- **WhatsApp 24h window** — session/template message logic
- **Changelog generation & review** — AI draft → human approve/reject → notification dispatch
- **Retry limits** — bounded retries on all jobs (notifications: 5 max, Notion: 3 max with polynomial backoff)
- **Simulator** — Sidekiq jobs generating realistic Spanish-language payloads every ~3 minutes (~20/hour)
- **Full dashboard** — 8 pages: ticket list, ticket detail, ticket groups, changelog entries, notifications, notification detail, metrics, dead letters
- **Metrics dashboard** — recharts with clickable charts, period filtering, top reporters
- **Observability** — StructuredLogger (JSON), JobLogging concern, ForceFailStore (Redis), dead letter queue + API + frontend
- **313 backend specs + 42 frontend tests** — all passing

See `PROTOTYPE.md` for full details.
