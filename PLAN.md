# Mainder Feedback - Changelog Hub: Execution Plan

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
  - [ ] HMAC signature verification (stubbed — requires real API secrets)
- [x] `POST /webhooks/intercom` — new conversation webhook
  - [x] Extract conversation_id, user metadata, message body
  - [x] Idempotency via conversation_id
  - [ ] HMAC signature verification (stubbed)
- [x] `POST /webhooks/whatsapp` — incoming message via WhatsApp Business API
  - [x] Handle text messages
  - [x] Idempotency via message_id
  - [ ] Signature verification (stubbed)
- [ ] `POST /api/tickets` — In-App "Report a Bug" + Internal Backoffice manual entry
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
- [x] **Expand `notifications`** — added `changelog_entry_id` (FK), `retry_count`, `last_error`, `delivered_at`; channels now include intercom/whatsapp; statuses include `pending_batch_review`
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

### Batch Review (7 specs)
- [x] `BatchReviewService` — `.should_batch?` (>5 in 5min), `.approve_all`, `.approve_selected`, `.reject_all`

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

## Phase 6: Changelog Generation & Resolution

> When a ticket hits "Done", generate a changelog and close the loop.

- [ ] Detect resolution: Notion poll detects status → Done, or manual action in dashboard
- [ ] `ChangelogGeneratorJob`:
  - Gather context: original report + resolution notes from Notion page
  - Call OpenAI to draft non-technical changelog entry
  - Store as `changelog_entries` with `status: :draft`
- [ ] Human review required before sending (the "Release Valve"):
  - Support agent sees AI draft in dashboard
  - Can edit the text
  - Clicks "Approve & Send" → status changes to `:approved`
  - Only then are notifications triggered

---

## Phase 7: Closing the Loop (Notifications)

> Notify the original reporter back through their source channel.

- [ ] `NotificationDispatchJob` — triggered after changelog approval
  - Slack: Reply to original thread via `chat.postMessage` with `thread_ts`
  - Intercom: Post reply in conversation via Intercom API
  - WhatsApp: Send template message (pre-approved) via WhatsApp Business API
  - In-App: Store notification for display in Mainder platform
- [ ] WhatsApp 24h window handling:
  - If < 24h since last user message → send session message
  - If > 24h → send pre-approved Template Message (e.g., "Your reported issue has been resolved: {summary}")
  - If template not available → mark notification as `channel_restricted`, log for manual follow-up
- [ ] Mass-resolution spam prevention:
  - If a single Notion task resolves N > 5 tickets, enter **"Review before Send" mode**
  - Queue all notifications with `status: :pending_batch_review`
  - Support agent sees batch in dashboard, can approve all or selectively
  - When approved: throttled dispatch via Sidekiq rate-limited queue (e.g., 10 msgs/sec for Slack, 1/sec for WhatsApp)
- [ ] Retry with exponential backoff:
  - Failed notifications: retry 3 times (1min, 5min, 30min)
  - After 3 failures: mark as `failed`, surface in dashboard for manual retry
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
- [x] `GET /api/notifications/:id` — Detail with retry history
- [x] `GET /api/batch_reviews/pending` — Pending batch review notifications
- [x] `POST /api/batch_reviews/approve_all` — Approve all held notifications
- [x] `POST /api/batch_reviews/approve_selected` — Approve selected notifications
- [x] `POST /api/batch_reviews/reject_all` — Reject all held notifications
- [x] `GET /api/metrics/summary` — Volume by source/type, top reporters, total count
- [x] `POST /api/tickets` — Manual ticket creation (Backoffice) + created event
- [x] `PATCH /api/tickets/:id` — Update ticket (status, priority, type) + status_changed event

---

## Phase 9: Frontend Dashboard (Next.js) — Partially Done

> Simple internal tool mock.

- [x] **Ticket List View** — Table with filters (Channel) + stats row + auto-refresh (5s polling)
  - [x] Priority color-coding (P0=red to P5=gray)
  - [x] Channel badges (Slack/Intercom/WhatsApp)
  - [x] Stats: total tickets, per-channel counts, critical count (P0-P1)
  - [x] Live refresh indicator (green pulse dot)
- [ ] **Ticket Detail View** — Shows:
  - Normalized data vs raw source data
  - Timeline/event log (Reported → Triaged → Synced to Notion → Fixed → Notified)
  - Notion page link
  - Attachments
- [ ] **AI Review Component** ("Release Valve") — Critical:
  - Shows AI-generated changelog draft
  - Editable text area
  - "Approve & Send" button to trigger notifications
  - Warning banner about AI-generated content
- [ ] **Batch Review View** — For mass-resolution scenarios
  - List of pending notifications grouped by resolution
  - "Approve All" / selective approval
- [ ] **Metrics Dashboard** — Simple cards/charts:
  - Ticket volume by source and type
  - Average time to triage / time to resolution
  - Top reporters

---

## Phase 10: Sequence Diagrams

> End-to-end flows for the design document.

- [ ] **Main Flow:** User reports on WhatsApp → Webhook intake → Normalize → AI Triage → Human Review → Notion Sync → Dev Fixes → Notion Poll detects Done → Changelog generated → Human approves → Notification sent back via WhatsApp
- [ ] **Cross-channel duplicate flow:** Same bug reported on Intercom + Backoffice → AI similarity detection → Link/merge tickets
- [ ] **Mass-resolution flow:** Notion task Done → 50 linked tickets → Batch review queue → Throttled notifications

---

## Phase 11: Edge Cases & Risk Analysis

> Must be explicitly addressed in the document.

- [ ] **Idempotency:** Unique constraints on (source, external_id), idempotency keys on all webhook handlers
- [ ] **Deduplication:** Same-channel (external_id) + cross-channel (AI similarity within time window)
- [ ] **WhatsApp 24h Window:** Template messages for late notifications, fallback to manual
- [ ] **AI Hallucinations:** Human-in-the-loop mandatory before any customer-facing message
- [ ] **PII & AI Privacy:** PiiScrubber before OpenAI calls, data minimization, encrypted storage
- [ ] **Spam & Rate Limits:** Batch review queue for mass-resolutions, throttled Sidekiq queues per channel
- [ ] **External dependency failures:** Sidekiq retry with exponential backoff, no data loss if Notion/OpenAI/Slack is down
- [ ] **Observability:** Structured logging, Sidekiq dashboard, dead letter queue for failed jobs, error tracking (Sentry/similar)

---

## Phase 12: Compile Technical Design Document — In Progress

> Assemble everything into the final deliverable.
> **Output:** `Mainder Feedback Hub - Technical Design.docx`

- [x] Title page + table of contents
- [ ] Executive summary / problem statement
- [x] ERD diagram (Section 2 of .docx)
- [x] System architecture diagram (Section 3 of .docx)
- [x] Data model documentation with justifications (Section 2 of .docx)
- [ ] Ingestion layer design
- [ ] AI enrichment pipeline design
- [ ] Notion sync strategy with justification
- [ ] Changelog & notification flow design
- [ ] API specification
- [ ] Frontend component descriptions
- [ ] Sequence diagrams
- [ ] Edge cases & risk analysis
- [ ] Trade-offs and alternatives considered

---

## Priority Order

| Priority | Phase | Status |
|----------|-------|--------|
| 1 | Data Model (Phase 1) | ✅ Done |
| 2 | Architecture Overview (Phase 2) | ✅ Done |
| 3 | Ingestion (Phase 3) | ✅ Done (prototype) |
| 3.5 | TDD Core Services (Phase 3.5) | ✅ Done (94 specs, 6 services, 5 jobs) |
| 3.6 | Changelog API Endpoints (Phase 3.6) | ✅ Done (generate, approve, view — strict RED→GREEN TDD) |
| 3.7 | Notifications + Batch Review API (Phase 3.7) | ✅ Done (list, detail, batch approve/reject — RED→GREEN TDD) |
| 3.8 | Ticket CRUD API (Phase 3.8) | ✅ Done (create + update with audit events — RED→GREEN TDD) |
| 3.9 | Metrics API (Phase 3.9) | ✅ Done (summary endpoint — RED→GREEN TDD, 116 total specs) |
| 4 | AI Enrichment (Phase 4) | ✅ Done (AiTriageService + PiiScrubber + AiTriageJob — RED→GREEN TDD, 129 total specs) |
| 5 | Notion Sync (Phase 5) | ✅ Done (rate limit handling + poll scheduler — RED→GREEN TDD, 137 total specs) |
| 6 | Changelog + Notifications (Phases 6-7) | Services built via TDD (Phase 3.5), approve endpoint done |
| 7 | API + Frontend (Phases 8-9) | ✅ Done (Phase 8 complete — all 13 API endpoints) |
| 8 | Diagrams + Edge Cases (Phases 10-11) | Not started |
| 9 | Final Document (Phase 12) | In progress |

---

## Working Prototype (Bonus)

In addition to the design document, a fully working prototype exists demonstrating:

- **3 webhook endpoints** receiving realistic simulated payloads
- **3 normalizers** converting platform-specific formats to canonical Tickets
- **Idempotent ingestion** — duplicate webhooks are safely ignored
- **Cross-channel reporter resolution** — same person recognized across platforms
- **Simulator** — Sidekiq jobs generating realistic Spanish-language payloads every 10-30s
- **Live dashboard** — Next.js frontend with auto-refresh, filters, stats, priority colors

See `PROTOTYPE.md` for full details.
