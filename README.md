# Feedback Hub

**Unified feedback intake, AI-powered triage, and automated resolution notifications — across Slack, Intercom, and WhatsApp.**

| Layer | Stack |
|-------|-------|
| Backend | Ruby 3.3.6 · Rails 8.1 (API-only) · PostgreSQL 14 · Sidekiq 7 · Redis |
| Frontend | Next.js 16 · React 19 · Tailwind 4 · Recharts |
| AI | OpenAI gpt-4o-mini (triage + changelog generation) |
| Integrations | Notion API · Slack API · Intercom API · WhatsApp Business API |

**Test coverage:** 310 backend specs (RSpec) + 42 frontend tests (Jest/React Testing Library)

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model & ERD](#3-data-model--erd)
4. [Ingestion Layer](#4-ingestion-layer)
5. [AI Enrichment Pipeline](#5-ai-enrichment-pipeline)
6. [Notion Two-Way Sync](#6-notion-two-way-sync)
7. [Changelog Generation & Resolution](#7-changelog-generation--resolution)
8. [Notifications & Closing the Loop](#8-notifications--closing-the-loop)
9. [Spam Prevention & Batch Review](#9-spam-prevention--batch-review)
10. [Cross-Channel Ticket Grouping](#10-cross-channel-ticket-grouping)
11. [Observability](#11-observability)
12. [Security](#12-security)
13. [Sequence Diagrams](#13-sequence-diagrams)
14. [Edge Cases & Risk Analysis](#14-edge-cases--risk-analysis)
15. [API Reference](#15-api-reference)
16. [Frontend Pages](#16-frontend-pages)
17. [Testing](#17-testing)
18. [Trade-offs & Alternatives](#18-trade-offs--alternatives)

---

## 1. Quick Start

### Prerequisites

- Ruby 3.3.6 (via rbenv)
- PostgreSQL 14
- Redis
- Node.js 22+

### Setup

```bash
# 1. Start Redis
brew services start redis

# 2. Backend — install, create DB, migrate
cd hub
bundle install
bin/rails db:create db:migrate
bin/rails server -p 3000

# 3. Sidekiq (new terminal)
cd hub
bundle exec sidekiq -C config/sidekiq.yml

# 4. Simulator — generates realistic payloads every 10-30s (optional)
cd hub
bin/rails simulator:start

# 5. Frontend (new terminal)
cd frontend
npm install
npm run dev   # → http://localhost:3001
```

| Service | Port |
|---------|------|
| Rails API | 3000 |
| Next.js Dashboard | 3001 |
| Redis | 6379 |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | AI triage + changelog generation |
| `NOTION_API_KEY` | Notion two-way sync |
| `NOTION_DATABASE_ID` | Target Notion database |
| `SLACK_SIGNING_SECRET` | HMAC verification for Slack webhooks |
| `INTERCOM_WEBHOOK_SECRET` | HMAC verification for Intercom webhooks |
| `WHATSAPP_WEBHOOK_SECRET` | HMAC verification for WhatsApp webhooks |
| `SLACK_BOT_TOKEN` | Notification delivery to Slack |
| `INTERCOM_API_TOKEN` | Notification delivery to Intercom |
| `WHATSAPP_API_TOKEN` | Notification delivery to WhatsApp |

---

## 2. Architecture Overview

```mermaid
graph TB
    subgraph External Channels
        SL[Slack]
        IC[Intercom]
        WA[WhatsApp]
    end

    subgraph Rails API
        WH[Webhook Controllers<br/>+ HMAC Verification]
        IS[IngestionService<br/>+ Platform Normalizers]
        AI[AiTriageService<br/>+ PiiScrubberService]
        NS[NotionSyncService]
        NP[NotionPollService]
        CG[ChangelogGeneratorService]
        CR[ChangelogReviewService]
        ND[NotificationDispatchService]
        BR[BatchReviewService]
        TG[TicketGroupService]
        DLQ[DeadLetterQueue]
    end

    subgraph Background Jobs
        SK[Sidekiq 7<br/>4 queues]
    end

    subgraph Data
        PG[(PostgreSQL 14<br/>10 tables · UUID PKs)]
        RD[(Redis<br/>Queues + Cache)]
    end

    subgraph External Services
        OAI[OpenAI<br/>gpt-4o-mini]
        NOT[Notion API]
    end

    subgraph Frontend
        NX[Next.js 16<br/>7 pages]
    end

    SL --> WH
    IC --> WH
    WA --> WH
    WH --> IS
    IS --> PG
    IS -.->|enqueue| SK
    SK --> AI
    AI --> OAI
    AI --> NS
    NS --> NOT
    NP --> NOT
    NP -.->|status change| PG
    CG --> OAI
    CR --> ND
    ND --> SL
    ND --> IC
    ND --> WA
    BR --> ND
    SK --> DLQ
    NX --> |REST API| WH
```

**Flow summary:** Feedback enters via platform webhooks → normalized into canonical Tickets → AI triages (type, priority, summary) → synced to Notion for dev tracking → Notion poll detects "Done" → human triggers changelog generation → human approves → notification sent back to original reporter on their channel.

---

## 3. Data Model & ERD

### 3.1 Entity-Relationship Diagram

```mermaid
erDiagram
    reporters {
        uuid id PK
        string name
        string email "UNIQUE partial (WHERE NOT NULL)"
        string company
        string role
        jsonb metadata
    }

    reporter_identities {
        uuid id PK
        uuid reporter_id FK
        string platform
        string platform_user_id
        string display_name
        datetime last_message_at "WhatsApp 24h window tracking"
        jsonb metadata
    }

    tickets {
        uuid id PK
        uuid reporter_id FK
        uuid ticket_group_id FK "nullable — cross-channel grouping"
        string title
        text description
        string ticket_type "bug | feature_request | question | incident"
        integer priority "0=Critical to 5=Minimal"
        string status "open | in_progress | resolved"
        string original_channel "slack | intercom | whatsapp"
        string enrichment_status "pending | completed | failed"
        string ai_suggested_type
        integer ai_suggested_priority
        text ai_summary
        string notion_page_id "UNIQUE partial (WHERE NOT NULL)"
        jsonb metadata
        jsonb tags
    }

    ticket_sources {
        uuid id PK
        uuid ticket_id FK
        string platform
        string external_id
        string external_url
        jsonb raw_payload "Original webhook body"
    }

    ticket_events {
        uuid id PK
        uuid ticket_id FK
        string event_type
        string actor_type "user | system | notion_sync"
        string actor_id
        jsonb data
    }

    changelog_entries {
        uuid id PK
        uuid ticket_id FK
        text content
        string status "draft | approved | rejected"
        string ai_model "gpt-4o-mini"
        integer ai_prompt_tokens
        integer ai_completion_tokens
        string approved_by
        datetime approved_at
    }

    notifications {
        uuid id PK
        uuid ticket_id FK
        uuid changelog_entry_id FK
        string channel "slack | intercom | whatsapp | email | in_app"
        string recipient
        text content
        string status "pending | sent | failed | pending_batch_review"
        integer retry_count "default 0"
        text last_error
        datetime delivered_at
    }

    attachments {
        uuid id PK
        uuid ticket_id FK
        string file_name
        string file_type
        integer file_size
        string storage_url
        string source_platform
    }

    ticket_groups {
        uuid id PK
        string name
        string status "open | resolved"
        uuid primary_ticket_id FK "Main ticket for notifications"
        string resolved_via_channel
        datetime resolved_at
        text resolution_note
    }

    dead_letter_jobs {
        uuid id PK
        string job_class
        jsonb job_args
        string error_class
        text error_message
        string queue
        jsonb backtrace
        string status "unresolved | resolved"
        datetime failed_at
    }

    reporters ||--o{ reporter_identities : "has many"
    reporters ||--o{ tickets : "has many"
    ticket_groups ||--o{ tickets : "has many"
    ticket_groups ||--o| tickets : "primary_ticket"
    tickets ||--o{ ticket_sources : "has many"
    tickets ||--o{ ticket_events : "has many"
    tickets ||--o{ changelog_entries : "has many"
    tickets ||--o{ notifications : "has many"
    tickets ||--o{ attachments : "has many"
    changelog_entries ||--o{ notifications : "has many"
```

### 3.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID primary keys** | Avoids sequential ID leakage in a multi-tenant/webhook context. Uses PostgreSQL's `pgcrypto` extension (`gen_random_uuid()`). |
| **`UNIQUE(platform, external_id)` on `ticket_sources`** | Core idempotency mechanism — duplicate webhooks are safely ignored at the DB level. |
| **`UNIQUE` partial index on `notion_page_id`** | Only enforced `WHERE notion_page_id IS NOT NULL` — tickets that haven't synced yet don't conflict. |
| **`UNIQUE` partial index on `reporters.email`** | Cross-channel reporter resolution uses email as the identity bridge (where available). |
| **JSONB for `raw_payload`** | Stores the complete original webhook body for debugging without prescribing a schema. |
| **JSONB for `metadata`** | Extensible key-value store on reporters, identities, and tickets for platform-specific data. |
| **Separate `ticket_events` table** | Append-only audit log. Every state change is recorded (created, ai_triaged, synced_to_notion, status_changed, changelog_drafted/approved/rejected, notification_sent/failed). |
| **`enrichment_status` on tickets** | Tracks AI pipeline state independently — `pending` → `completed` / `failed`. Allows retry without losing the ticket. |
| **`last_message_at` on `reporter_identities`** | Enables WhatsApp 24h session window calculation. |

### 3.3 Index Strategy

```
tickets         → status, priority, original_channel, ticket_type, enrichment_status,
                  created_at, reporter_id, ticket_group_id, notion_page_id (unique partial)
ticket_groups   → status, primary_ticket_id
ticket_sources  → (platform, external_id) unique composite
ticket_events   → ticket_id, event_type, created_at
changelog_entries → ticket_id, status
notifications   → ticket_id, changelog_entry_id, status
reporter_identities → (platform, platform_user_id) unique composite, reporter_id
reporters       → email (unique partial)
dead_letter_jobs → status, job_class, failed_at
attachments     → ticket_id
```

All tables have UUID primary keys with `gen_random_uuid()` defaults. Foreign keys are enforced at the database level for referential integrity.

---

## 4. Ingestion Layer

### 4.1 Webhook Endpoints

Three platform-specific webhook endpoints receive external payloads:

| Endpoint | Platform | External ID Source | HMAC Header |
|----------|----------|--------------------|-------------|
| `POST /webhooks/slack` | Slack | `payload.issue_id` or `trigger_id` | `X-Slack-Signature` (`v0:timestamp:body` + SHA256) |
| `POST /webhooks/intercom` | Intercom | `data.item.id` | `X-Hub-Signature` (SHA256) |
| `POST /webhooks/whatsapp` | WhatsApp | `entry[0].changes[0].value.messages[0].id` | `X-Hub-Signature-256` (SHA256) |

Additionally, `POST /api/tickets` supports manual creation from the backoffice.

### 4.2 Normalization Pipeline

```
Webhook → Controller (HMAC verify) → IngestionService.ingest
                                          │
                                          ├─ Extract external_id
                                          ├─ Idempotency check (TicketSource lookup)
                                          ├─ Select normalizer (Slack/Intercom/WhatsApp)
                                          ├─ Resolve reporter identity (email-first, fallback to platform ID)
                                          ├─ Create Ticket + TicketSource + TicketEvent
                                          └─ Return ticket
```

Each platform normalizer (`SlackNormalizer`, `IntercomNormalizer`, `WhatsappNormalizer`) handles:
- Extracting title/description from platform-specific payload structure
- Priority inference from text (English + Spanish keywords)
- Ticket type inference from context
- Reporter identity resolution (see below)
- Storing the complete raw payload as JSONB for debugging

### 4.4 Cross-Channel Reporter Resolution

The `reporters.email` field (unique partial index) is the cross-channel identity bridge. Resolution in `BaseNormalizer.find_or_create_reporter`:

1. **If email is available** (e.g., Intercom provides user email) → `Reporter.find_or_initialize_by(email:)` — links the new platform identity to the existing reporter record
2. **If no email** (Slack user ID only, WhatsApp phone only) → falls back to `ReporterIdentity.find_by(platform, platform_user_id)` — matches within the same platform only
3. A `ReporterIdentity` is always created/found for the `(platform, platform_user_id)` pair and associated with the reporter

**Limitation:** If the same person reports via two channels that don't provide email (e.g., Slack + WhatsApp), they'll get two separate `Reporter` records. The `display_name` on `reporter_identities` is informational only — name matching is too unreliable for automatic deduplication. Cross-channel merge would require either AI-based similarity matching on recent tickets (designed but not implemented) or a manual merge UI.

### 4.3 Idempotency

The system guarantees exactly-once processing per webhook:

1. **Extract** the platform-specific external ID from the payload
2. **Query** `ticket_sources` for `(platform, external_id)`
3. **If found** → return the existing ticket (no-op)
4. **If not found** → normalize and create ticket
5. **DB constraint** → `UNIQUE(platform, external_id)` on `ticket_sources` provides a safety net even under race conditions

---

## 5. AI Enrichment Pipeline

### 5.1 AiTriageService

When triggered (user-initiated via the dashboard), the triage pipeline:

1. **PII Scrubbing** — `PiiScrubberService` strips emails and phone numbers via regex before any data reaches OpenAI
2. **OpenAI Request** — Sends the scrubbed ticket text to `gpt-4o-mini` with a structured prompt requesting JSON: `{ suggested_type, suggested_priority, summary }`
3. **Store Suggestions** — Saves AI output to `ai_suggested_type`, `ai_suggested_priority`, `ai_summary` fields
4. **Human-in-the-Loop** — AI fields are stored separately from confirmed fields (`ticket_type`, `priority`, `title`). A support agent reviews and can accept, modify, or reject AI suggestions before they affect the ticket
5. **Notion Sync** — On successful triage, `NotionSyncJob` is enqueued to push the ticket to Notion

### 5.2 PiiScrubberService

Detects and redacts 4 categories of sensitive data before any OpenAI API call:

| Type | Pattern | Replacement |
|------|---------|-------------|
| Email | `user@domain.com` | `[EMAIL]` |
| Phone | `+56 9 8765 4321`, `555-123-4567` | `[PHONE]` |
| Password | `password: secret`, `pwd=hunter2` | `[PASSWORD]` |
| SSN | `123-45-6789`, `123 45 6789` | `[SSN]` |

- Returns both the scrubbed text and a redaction log (type + original value)
- Applied in `AiTriageService`, `ChangelogGeneratorService`, and `TicketTypeInferenceService`
- Original data is preserved in the database; only the AI sees scrubbed versions

### 5.3 AI Prompt Preview

Before generating a changelog, the agent can preview what will be sent to OpenAI:

1. Click **"Generate with AI"** on a resolved ticket
2. The system fetches `GET /api/tickets/:id/preview_changelog` — returns the original text, scrubbed text, and a list of redactions
3. The agent sees an **AI Prompt Preview** panel:
   - Amber box listing each redacted item with the original value (e.g., `[EMAIL]` ~~maria.garcia@company.com~~)
   - The exact scrubbed text that will be sent to OpenAI
4. Click **"Confirm & Generate"** to proceed, or **"Cancel"** to back out

This gives full transparency into what data reaches external AI services.

### 5.3 Rate Limit Handling

- OpenAI `429` responses trigger a cooldown stored in Redis cache (`openai:rate_limited`)
- Cooldown duration respects the `Retry-After` header (minimum 60 seconds)
- Requests during cooldown raise `AiApiError` immediately (no wasted API calls)
- Up to 2 automatic retries per request

### 5.4 Fallback Behavior

If OpenAI is unavailable or the API key is not configured:
- The ticket is saved with `enrichment_status: pending`
- No data is lost — the ticket exists and is visible in the dashboard
- Triage can be retried later via the dashboard

---

## 6. Notion Two-Way Sync

### 6.1 Push: Hub → Notion (`NotionSyncService`)

When a ticket is triaged, `NotionSyncJob` pushes it to a Notion database:

| Ticket Field | Notion Property | Type |
|-------------|----------------|------|
| `title` | Title | title |
| `priority` (0-5) | Priority | select (Critical/High/Medium/Normal/Low/Minimal) |
| `ticket_type` | Type | select |
| `status` | Status | select |
| `original_channel` | Channel | select |

- **Create vs Update**: If `notion_page_id` is null → create page. If present → update existing page.
- Stores `notion_page_id` on the ticket for bidirectional linking.
- Records a `synced_to_notion` event in `ticket_events`.

### 6.2 Pull: Notion → Hub (`NotionPollService`)

A `NotionPollSchedulerJob` self-reschedules every 2 minutes:

1. Query Notion database with `last_edited_time > last_poll_timestamp` filter
2. For each modified page, look up the ticket by `notion_page_id`
3. Map Notion status → Hub status: `Done → resolved`, `In Progress → in_progress`, `Open → open`
4. If status changed, update ticket and record a `status_changed` event
5. Store `last_poll_timestamp` in Redis cache for incremental polling

### 6.3 Why Polling (Not Webhooks)

| Factor | Assessment |
|--------|-----------|
| **Notion webhook support** | Notion's webhook support is limited — no granular page-level change events, only database-level triggers with limited filtering |
| **Rate limits** | Notion allows 3 requests/second. Polling every 2 minutes uses ~3 requests/poll — well within limits |
| **Incremental cursor** | `last_edited_time` filter ensures we only process changes since last poll — no full-scan needed |
| **Simplicity** | No webhook registration, no public endpoint exposure, no retry infrastructure for incoming webhooks |
| **Conflict resolution** | Notion status is the source of truth for execution state (developers work in Notion). Polling naturally respects this — Hub reads from Notion, never overwrites Notion status |

### 6.4 Rate Limit Handling

Both `NotionSyncService` and `NotionPollService` handle `429` responses:
- Parse `Retry-After` header
- Raise `RateLimitError` with `retry_after` value
- Sidekiq retries the job after the specified delay

---

## 7. Changelog Generation & Resolution

### 7.1 The "Release Valve" Concept

When a ticket is resolved (detected via Notion poll or manual action), the system does **not** automatically generate and send notifications. Instead:

1. **Human triggers** — A support agent clicks "Generate Changelog" in the dashboard
2. **AI drafts** — `ChangelogGeneratorService` calls OpenAI to produce a customer-friendly message (2-3 sentences, no jargon)
3. **Human reviews** — The agent reads the draft, can edit the text
4. **Human approves** — Only "Approve & Send" triggers notification dispatch
5. **Or rejects** — "Reject" records a `changelog_rejected` event with a reason; agent can regenerate

This mandatory human step is the primary defense against AI hallucinations reaching customers.

### 7.2 ChangelogGeneratorService

- Validates ticket is in `resolved` status
- Idempotent: returns existing draft if one exists (no duplicate generation)
- Scrubs PII before sending to OpenAI
- Tracks token usage (`ai_prompt_tokens`, `ai_completion_tokens`) per entry
- Records `changelog_drafted` event

### 7.3 ChangelogReviewService

| Action | Guard | Side Effect |
|--------|-------|-------------|
| `approve(entry, approved_by:)` | Must be `draft` | Sets `approved_at`, enqueues `NotificationDispatchJob` |
| `reject(entry, rejected_by:, reason:)` | Must be `draft` | Records `changelog_rejected` event with reason |
| `update_draft(entry, new_content:)` | Must be `draft` | Updates content (human editing) |

All three actions enforce a status guard — only `draft` entries can be acted on. This prevents double-dispatch or editing already-approved changelogs.

---

## 8. Notifications & Closing the Loop

### 8.1 NotificationDispatchService

After a changelog entry is approved, `NotificationDispatchJob` triggers `NotificationDispatchService`:

1. **Validate** — Entry must be in `approved` status
2. **Find recipient** — Look up the reporter's identity for the ticket's original channel
3. **Batch check** — If ≥5 changelogs were approved in the last 5 minutes, route to `pending_batch_review` instead (see [Section 9](#9-spam-prevention--batch-review))
4. **Deliver** — Send via the platform API (Slack, Intercom, WhatsApp, or mock for dev)
5. **Record** — Create `notification_sent` or `notification_failed` event

### 8.2 Platform Delivery

| Channel | API | Payload |
|---------|-----|---------|
| Slack | `chat.postMessage` | `{ channel, text }` |
| Intercom | Messages API | `{ message_type: "inapp", body, from, to }` |
| WhatsApp | Graph API v17.0 | Session or template message (see below) |
| Email / In-App | Mock (no external call) | Logged for manual follow-up |

### 8.3 WhatsApp 24h Session Window

WhatsApp Business API restricts free-form messaging to a 24-hour window after the user's last message. `WhatsappDeliveryService` handles this:

```
┌─────────────────────────────────────────────────┐
│         WhatsApp Delivery Decision Tree          │
├─────────────────────────────────────────────────┤
│                                                  │
│  reporter_identity.last_message_at              │
│       │                                          │
│       ├─ < 24h ago → SESSION MESSAGE             │
│       │   (free-form text, full content)         │
│       │                                          │
│       ├─ > 24h ago → TEMPLATE MESSAGE            │
│       │   (pre-approved "issue_resolved"          │
│       │    template, truncated to 200 chars)     │
│       │                                          │
│       └─ Template fails → channel_restricted     │
│           (surfaced in dashboard for             │
│            manual follow-up)                     │
│                                                  │
└─────────────────────────────────────────────────┘
```

- `last_message_at` is tracked on `reporter_identities` and updated when WhatsApp webhooks arrive
- Session messages use `type: "text"` (free-form)
- Template messages use `type: "template"` with the pre-approved `issue_resolved` template
- If the template call fails (e.g., template not configured), the notification gets `channel_restricted` status

### 8.4 Retry with Backoff

Failed notifications are retried via `NotificationRetryJob`:
- Each failure increments `retry_count` and stores the error in `last_error`
- After 3 failures, the notification remains in `failed` status and is surfaced in the dashboard for manual retry
- Sidekiq handles the actual backoff timing

---

## 9. Spam Prevention & Batch Review

### 9.1 The Problem

A single Notion task being marked "Done" could resolve many linked tickets. If each generates a changelog and gets approved in quick succession, the system would blast hundreds of Slack/WhatsApp messages in seconds.

### 9.2 BatchReviewService

**Threshold:** If ≥5 changelog entries are approved within a 5-minute window, all resulting notifications enter `pending_batch_review` status instead of dispatching immediately.

```ruby
BATCH_THRESHOLD = 5
BATCH_WINDOW = 5.minutes

def self.should_batch?(entries)
  return false if entries.size <= BATCH_THRESHOLD
  timestamps = entries.map(&:created_at)
  time_span = timestamps.max - timestamps.min
  time_span <= BATCH_WINDOW
end
```

### 9.3 Review Workflow

A support agent sees the pending batch in the dashboard and chooses:

| Action | Effect |
|--------|--------|
| **Approve All** | All pending notifications move to `pending` → dispatched |
| **Approve Selected** | Only chosen notifications dispatch; rest remain held |
| **Reject All** | All notifications marked `failed` with `batch_rejected` reason |

This prevents mass notification floods while keeping a human in control.

---

## 10. Cross-Channel Ticket Grouping

### 10.1 The Problem

The same bug is often reported through multiple channels — a user complains on Slack, another opens an Intercom chat, a third sends a WhatsApp message. Without grouping, each becomes a separate ticket with a separate Notion page, separate changelog, and separate notification. Resolution is fragmented.

### 10.2 TicketGroupService

`TicketGroupService` manages the lifecycle of ticket groups:

| Action | Method | Rules |
|--------|--------|-------|
| **Create group** | `create_group(name:, ticket_ids:, primary_ticket_id:)` | Minimum 2 tickets. Primary must be in the group. Tickets can't already belong to another group. |
| **Add tickets** | `add_tickets(group, ticket_ids)` | Same uniqueness guard — no ticket in two groups. |
| **Remove ticket** | `remove_ticket(group, ticket_id)` | If fewer than 2 remain, the group dissolves automatically. If the primary ticket is removed, a new primary is assigned. |
| **Resolve group** | `resolve_group(group:, channel:, resolution_note:, content:)` | Resolves all tickets, sends one notification on the primary ticket's channel, creates `group_resolved` events. |

### 10.3 Group Resolution Flow

When a group is resolved:

1. All tickets in the group are marked `resolved`
2. Approved changelog entries from all tickets are aggregated into one notification
3. The notification is sent only on the **primary ticket's** channel (avoids duplicate messages)
4. `group_resolved` events are created for every ticket in the group
5. The group status is set to `resolved` with a timestamp and resolution note

### 10.4 Dashboard Integration

- **Ticket Dashboard (`/`)** — Multi-select tickets with checkboxes → floating "Group Selected" bar → modal to name the group and pick a primary ticket
- **Ticket Groups Page (`/ticket-groups`)** — Lists all groups with status filter (open/resolved), expandable ticket cards, resolve button with content generation
- **Ticket Detail (`/tickets/[id]`)** — Shows group membership, "Add to Group" picker, "Remove from group" button

### 10.5 AI Content for Groups

When resolving a group, the agent can:
- **Generate with AI** — `ChangelogGeneratorService.generate_for_group(group)` sends all ticket titles/descriptions to OpenAI in one prompt, producing a unified resolution message
- **Write manually** — Skip AI entirely and type the resolution content

---

## 11. Observability

### 11.1 StructuredLogger

JSON-structured logging with context propagation:

```json
{
  "timestamp": "2026-02-11T14:30:00.123-03:00",
  "level": "info",
  "message": "Ticket ingested",
  "service": "ingestion",
  "channel": "slack",
  "ticket_id": "abc-123",
  "duration_ms": 45
}
```

- **`with_context`** — Creates a scoped logger that automatically includes context fields (service name, channel, job ID) in every log entry
- **`measure`** — Times a block and logs duration; automatically logs errors with timing on exception
- **Singleton** — `StructuredLogger.instance` provides a shared instance

### 11.2 JobLogging Concern

Included in `ApplicationJob` — every Sidekiq job automatically gets:

- **Start log** — Job name, ID, queue, arguments
- **Complete log** — Duration in milliseconds
- **Error log** — Error class, message, duration
- **Force-fail check** — Reads from `ForceFailStore` (Redis) to intentionally fail jobs for DLQ testing

### 11.3 Dead Letter Queue

When a Sidekiq job exhausts all retries:

1. **Sidekiq death handler** → enqueues `DeadLetterHandlerJob`
2. **`DeadLetterHandlerJob`** → creates a `DeadLetterJob` record with full context (class, args, error, backtrace)
3. **Dashboard** → `/dead-letters` page shows unresolved failures
4. **Actions** — Resolve (acknowledge), Retry (re-enqueue the original job)

### 11.4 ForceFailStore

Redis-backed toggle for testing the dead letter queue in development:

- `POST /api/dead_letter_jobs/force_fail` — Sets a key to force-fail the next execution of a specified job class
- The `JobLogging` concern checks the key before `yield` and raises `ForceFailError` if set
- The key is single-use (deleted after one failure)

---

## 12. Security

### 12.1 HMAC Webhook Verification

All three webhook endpoints verify payload authenticity using `WebhookVerifierService`:

| Platform | Algorithm | Signature Format |
|----------|-----------|-----------------|
| Slack | SHA256 | `v0=` + HMAC(`v0:timestamp:body`) with 5-minute timestamp tolerance |
| Intercom | SHA256 | HMAC of raw body |
| WhatsApp | SHA256 | `sha256=` + HMAC of raw body |

All comparisons use `ActiveSupport::SecurityUtils.secure_compare` (timing-safe) to prevent timing attacks.

### 12.2 PII Scrubbing

- 4 PII types detected: emails, phone numbers, passwords, and SSNs
- All are stripped before any OpenAI API call via `PiiScrubberService`
- Applied in `AiTriageService`, `ChangelogGeneratorService`, and `TicketTypeInferenceService`
- Original data is preserved in the database; only the AI sees scrubbed versions
- A **preview endpoint** (`GET /api/tickets/:id/preview_changelog`) lets agents inspect the scrubbed prompt before generation

### 12.3 CORS

Configured for `localhost:3001` only (the Next.js dashboard).

---

## 13. Sequence Diagrams

### 13.1 Main Flow: WhatsApp Report → Resolution → Notification

```mermaid
sequenceDiagram
    participant User as WhatsApp User
    participant WA as WhatsApp API
    participant WH as Webhook Controller
    participant IS as IngestionService
    participant DB as PostgreSQL
    participant AI as AiTriageService
    participant OAI as OpenAI
    participant NS as NotionSyncService
    participant NOT as Notion
    participant NP as NotionPollService
    participant Agent as Support Agent
    participant CG as ChangelogGeneratorService
    participant CR as ChangelogReviewService
    participant ND as NotificationDispatchService
    participant WDS as WhatsappDeliveryService

    User->>WA: Reports bug via WhatsApp
    WA->>WH: POST /webhooks/whatsapp (+ HMAC signature)
    WH->>WH: Verify HMAC (WebhookVerifierService)
    WH->>IS: ingest(platform: "whatsapp", payload)
    IS->>IS: Extract external_id, check idempotency
    IS->>DB: Create Ticket + TicketSource + TicketEvent
    IS-->>WH: ticket

    Note over Agent,AI: Agent clicks "Run AI Triage" in dashboard

    Agent->>AI: AiTriageService.call(ticket)
    AI->>AI: PiiScrubberService.scrub(text)
    AI->>OAI: POST /v1/chat/completions (scrubbed text)
    OAI-->>AI: { suggested_type, suggested_priority, summary }
    AI->>DB: Update ticket (ai_suggested_* fields)
    AI->>NS: NotionSyncJob.perform_later

    NS->>NOT: POST /v1/pages (create page)
    NOT-->>NS: { id: notion_page_id }
    NS->>DB: Update ticket.notion_page_id

    Note over NOT: Developer fixes the issue in Notion, marks "Done"

    NP->>NOT: POST /v1/databases/{id}/query (last_edited_time filter)
    NOT-->>NP: Pages with status changes
    NP->>DB: Update ticket.status = "resolved"

    Note over Agent,CG: Agent clicks "Generate Changelog"

    Agent->>CG: ChangelogGeneratorService.call(ticket)
    CG->>OAI: POST /v1/chat/completions (scrubbed context)
    OAI-->>CG: Customer-friendly changelog text
    CG->>DB: Create changelog_entry (status: draft)

    Note over Agent,CR: Agent reviews and approves

    Agent->>CR: ChangelogReviewService.approve(entry)
    CR->>DB: Update entry (status: approved, approved_at)
    CR->>ND: NotificationDispatchJob.perform_later

    ND->>ND: Find reporter identity for WhatsApp
    ND->>WDS: WhatsappDeliveryService.deliver(entry, identity)
    WDS->>WDS: Check last_message_at (24h window)
    WDS->>WA: POST /v17.0/messages (session or template)
    WA-->>User: "Your reported issue has been resolved..."
    ND->>DB: Create notification (status: sent)
```

### 13.2 Batch Resolution Flow

```mermaid
sequenceDiagram
    participant NP as NotionPollService
    participant DB as PostgreSQL
    participant Agent as Support Agent
    participant CG as ChangelogGeneratorService
    participant CR as ChangelogReviewService
    participant ND as NotificationDispatchService
    participant BR as BatchReviewService
    participant Dash as Dashboard

    NP->>DB: Detect 20 tickets resolved in Notion

    Note over Agent: Agent generates & approves changelogs in quick succession

    loop For each of 20 tickets
        Agent->>CG: Generate changelog
        Agent->>CR: Approve changelog entry
        CR->>ND: NotificationDispatchJob
    end

    ND->>BR: should_batch? (20 approved in < 5 min)
    BR-->>ND: true (exceeds threshold of 5)
    ND->>DB: Create notifications with status: pending_batch_review

    Dash->>Agent: Shows 20 pending notifications in batch review page

    alt Approve All
        Agent->>BR: approve_all(notifications)
        BR->>ND: Dispatch each notification (throttled)
    else Approve Selected
        Agent->>BR: approve_selected([ids])
        BR->>ND: Dispatch only selected
    else Reject All
        Agent->>BR: reject_all(notifications)
        BR->>DB: Mark all as failed (batch_rejected)
    end
```

---

## 14. Edge Cases & Risk Analysis

### 14.1 Spam & Batching (Challenge Section 10.1)

**Problem:** A mass-resolution event (e.g., sprint close resolving 50 tickets) could flood reporter channels with hundreds of notifications simultaneously.

**Solution:** `BatchReviewService` detects when ≥5 changelog entries are approved within a 5-minute window. All resulting notifications enter `pending_batch_review` status instead of auto-dispatching. A support agent reviews the batch in the dashboard and can approve all, approve selected, or reject all. This prevents 500 Slack/WhatsApp messages from firing in 1 second.

### 14.2 WhatsApp 24h Window (Challenge Section 10.2)

**Problem:** WhatsApp Business API only allows free-form messages within 24 hours of the user's last message. Notifications sent after this window require pre-approved templates.

**Solution:** `WhatsappDeliveryService` checks `reporter_identity.last_message_at`. If < 24h ago → session message (free-form text). If > 24h → pre-approved template message (`issue_resolved`). If no template is available or the call fails → `channel_restricted` status, surfaced in the dashboard for manual follow-up via another channel.

### 14.3 AI Hallucinations (Challenge Section 10.3)

**Problem:** AI-generated text could contain incorrect, misleading, or inappropriate content that reaches customers.

**Solution:** No AI-generated text ever reaches a customer without human approval. The `ChangelogReviewService` enforces: draft → human reviews/edits → approve → only then do notifications dispatch. Rejection creates a `changelog_rejected` event with reason. The agent can edit the draft text before approving, or reject and regenerate entirely. This is the "Release Valve" — AI accelerates drafting, but a human always holds the send button.

### 14.4 Consistency & External Dependency Failures (Challenge Section 10.4)

**Problem:** External services (Notion, OpenAI, Slack, WhatsApp) can be temporarily unavailable. The system must not lose data.

**Solution:**
- **Idempotency** — Every webhook is idempotent via `UNIQUE(platform, external_id)` on `ticket_sources`. Replayed webhooks are safely ignored.
- **Retry with backoff** — Notifications retry 3 times via `NotificationRetryJob`. Failed jobs are retried by Sidekiq with exponential backoff.
- **Dead letter queue** — Jobs that exhaust all retries land in the `dead_letter_jobs` table for manual inspection and retry from the dashboard.
- **Graceful degradation** — If OpenAI is down, tickets are saved with `enrichment_status: pending` (no data loss, retry later). If Notion is down, sync jobs are retried via Sidekiq. If a notification platform is down, the notification stays in `failed` status with the error recorded.

### 14.5 PII & AI Privacy

**Problem:** Support tickets contain personal information (emails, phone numbers, passwords, SSNs) that should not be sent to external AI providers.

**Solution:** `PiiScrubberService` strips all 4 PII types via regex before any OpenAI API call. Original data is preserved in the Hub database; OpenAI only sees `[EMAIL]`, `[PHONE]`, `[PASSWORD]`, and `[SSN]` placeholders. This is applied in triage, changelog generation, and ticket type inference. Additionally, a preview endpoint lets agents inspect the exact scrubbed text before triggering AI generation.

---

## 15. API Reference

### Webhooks (External Intake)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks/slack` | Receive Slack slash command / workflow payload |
| POST | `/webhooks/intercom` | Receive Intercom new conversation webhook |
| POST | `/webhooks/whatsapp` | Receive WhatsApp incoming message |

### Tickets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets (filters: status, channel, priority, type) |
| GET | `/api/tickets/:id` | Ticket detail with sources, events timeline |
| POST | `/api/tickets` | Create ticket manually (backoffice) |
| PATCH | `/api/tickets/:id` | Update ticket (status, priority, type) |
| POST | `/api/tickets/:id/simulate_status` | Simulate status change (dev/testing) |

### Changelogs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets/:id/changelog` | View current changelog entry |
| POST | `/api/tickets/:id/generate_changelog` | Generate AI changelog draft |
| GET | `/api/tickets/:id/preview_changelog` | Preview scrubbed AI prompt before generation |
| POST | `/api/tickets/:id/manual_changelog` | Create manual changelog (no AI) |
| PATCH | `/api/tickets/:id/approve_changelog` | Approve draft → dispatch notifications |
| PATCH | `/api/tickets/:id/reject_changelog` | Reject draft with reason |
| PATCH | `/api/tickets/:id/update_changelog_draft` | Edit draft content |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications (filters: status, channel) |
| GET | `/api/notifications/:id` | Notification detail with retry history |

### Ticket Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ticket_groups` | List groups (filter: `status=open\|resolved`) |
| GET | `/api/ticket_groups/:id` | Group detail with tickets |
| POST | `/api/ticket_groups` | Create group (`name`, `ticket_ids`, `primary_ticket_id`) |
| POST | `/api/ticket_groups/:id/add_tickets` | Add tickets to group |
| DELETE | `/api/ticket_groups/:id/remove_ticket` | Remove ticket from group (dissolves if < 2 remain) |
| POST | `/api/ticket_groups/:id/resolve` | Resolve group and notify on primary ticket's channel |
| POST | `/api/ticket_groups/:id/generate_content` | AI-generate resolution content for the group |

### Batch Reviews

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/batch_reviews/pending` | List pending batch review notifications |
| POST | `/api/batch_reviews/approve_all` | Approve all pending notifications |
| POST | `/api/batch_reviews/approve_selected` | Approve selected notification IDs |
| POST | `/api/batch_reviews/reject_all` | Reject all pending notifications |
| POST | `/api/batch_reviews/simulate` | Simulate batch scenario (dev/testing) |

### Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics/summary` | Volume by channel/type/priority/status, top reporters (query: `period=24h\|7d\|30d`) |

### Dead Letter Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dead_letter_jobs` | List dead letter entries |
| PATCH | `/api/dead_letter_jobs/:id/resolve` | Mark entry as resolved |
| POST | `/api/dead_letter_jobs/:id/retry` | Re-enqueue the failed job |
| POST | `/api/dead_letter_jobs/force_fail` | Toggle force-fail for a job class (testing) |
| GET | `/api/dead_letter_jobs/force_fail_status` | Check force-fail status |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/up` | Rails health check |

---

## 16. Frontend Pages

The Next.js 16 dashboard at `localhost:3001` provides 7 pages:

### 16.1 Ticket Dashboard (`/`)

The main landing page showing all tickets in a filterable table:
- **Filters** — Channel (Slack/Intercom/WhatsApp), status, priority, ticket type
- **Stats cards** — Total tickets, per-channel counts, critical count (P0-P1)
- **Auto-refresh** — 5-second polling with a green pulse indicator
- **Priority color-coding** — P0 (red) → P5 (gray)
- **Pagination** — Server-side with page navigation
- **Clickable rows** → Navigate to ticket detail
- **Multi-select + grouping** — Checkbox selection → floating "Group Selected" bar → create group modal
- **Simulate buttons** — Generate test tickets via Slack/Intercom/WhatsApp with optional **PII checkbox** (injects emails, phones, SSNs, passwords for testing scrubbing)

### 16.2 Ticket Detail (`/tickets/[id]`)

Deep view of a single ticket:
- **Data comparison** — Original (raw) vs normalized data side by side
- **AI triage card** — Shows AI suggestions (type, priority, summary) with accept/reject
- **Timeline** — Chronological event log (created → triaged → synced → resolved → notified)
- **Sources list** — All linked ticket sources with platform badges
- **Status actions** — Buttons to change ticket status
- **Ticket group** — Shows group membership with link, or "Add to Group" picker
- **Changelog review** — Generate, edit, approve/reject changelog drafts with **AI prompt preview** (shows scrubbed text + redactions before sending to OpenAI)
- **Simulate buttons** — Testing tools for status changes

### 16.3 Ticket Groups (`/ticket-groups`)

Cross-channel duplicate management:
- **Group cards** — Each group shows name, status, ticket count, and expandable ticket list
- **Status filter** — Toggle between All / Open / Resolved groups
- **Resolve flow** — Click "Resolve" → modal with AI-generated or manual resolution content → sends one notification on the primary ticket's channel
- **Auto-refresh** — 10-second polling

### 16.4 Batch Reviews (`/batch-reviews`)

For managing mass-resolution notification batches:
- **Pending notifications** grouped by changelog entry
- **Approve All** / **Approve Selected** / **Reject All** buttons
- **Confirmation dialogs** before destructive actions
- **Simulate batch** button for testing

### 16.5 Notifications (`/notifications`)

Notification delivery history:
- **Filters** — Status (pending/sent/failed/pending_batch_review), channel
- **Delivery details** — Recipient, content, timestamps, retry count, last error

### 16.6 Metrics (`/metrics`)

Analytics dashboard with recharts visualizations:
- **Pie chart** — Tickets by channel
- **Bar charts** — By type, priority, status
- **Period toggle** — 24h / 7d / 30d
- **Top reporters** table
- **5 summary stat cards**
- **Clickable charts** → Navigate to filtered ticket dashboard
- **30-second auto-refresh**

### 16.7 Dead Letters (`/dead-letters`)

Dead letter queue viewer:
- **Failed job list** — Job class, error, queue, timestamp
- **Actions** — Resolve (acknowledge) or Retry (re-enqueue)
- **Force-fail panel** — Toggle force-fail for any job class (DLQ testing tool)

---

## 17. Testing

### 17.1 Backend: 310 RSpec Specs

All specs follow strict RED → GREEN TDD discipline:

| Category | Count | Scope |
|----------|-------|-------|
| Model specs | 49 | Validations, associations, scopes, enums |
| Service specs | 144 | IngestionService, AiTriageService, PiiScrubberService, ChangelogGeneratorService, ChangelogReviewService, NotificationDispatchService, BatchReviewService, NotionSyncService, NotionPollService, WhatsappDeliveryService, WebhookVerifierService, TicketGroupService, StructuredLogger |
| Job specs | 28 | All 9 jobs (including dead letter handler, force-fail) |
| Request specs | 70 | All API endpoints (webhooks + REST + ticket groups) |
| Constants | 23 | TicketTypePatterns (regex classification) |

**Stack:** RSpec 7, FactoryBot 6.4, Shoulda Matchers 6, WebMock 3.23

**Key patterns:**
- `ActiveJob::Base.queue_adapter = :test` for enqueue assertions
- `ActiveSupport::Testing::TimeHelpers` for `freeze_time` / `travel_to`
- `WebMock` stubs for all external APIs (OpenAI, Notion, Slack, WhatsApp)
- Test cache is `NullStore`; specs that test caching stub `Rails.cache` with `MemoryStore`
- 8 factories covering all domain models

### 17.2 Frontend: 42 Tests

**Stack:** Jest, React Testing Library

Covers component rendering, user interactions, API integration, and error states across all 6 pages.

---

## 18. Trade-offs & Alternatives

### 18.1 Sidekiq over Kafka

**Chose Sidekiq** because:
- The system has ~10 job types with modest throughput (support tickets, not real-time events)
- Sidekiq 7 provides reliable retries, dead letter handling, and concurrency out of the box
- Redis was already required for caching
- Kafka would add operational complexity (ZooKeeper, partitions, consumer groups) for no benefit at this scale

### 18.2 Polling over Webhooks for Notion

**Chose polling** because:
- Notion lacks granular page-level webhook events
- Polling every 2 minutes with `last_edited_time` cursor is incremental and efficient
- ~3 requests per poll vs Notion's 3 requests/second limit — negligible load
- No public endpoint exposure or webhook registration required
- Simpler error handling (just retry the poll) vs managing incoming webhook failures

### 18.3 User-Initiated AI (Not Auto-Trigger)

**Chose explicit trigger** because:
- The simulator generates tickets every 10-30 seconds — auto-triage would burn OpenAI quota immediately
- Human-initiated triage gives the agent control over when to spend AI credits
- Changelog generation is deliberately separate from resolution detection — the "Release Valve" ensures no auto-notification
- In production, this could be switched to auto-trigger with rate limiting, but the explicit model is safer for a prototype

### 18.4 Separate AI Fields vs Overwriting

**Chose `ai_suggested_*` fields** alongside confirmed fields because:
- Support agents can compare AI suggestions with their own judgment
- If AI is wrong, the original ticket data is preserved
- Audit trail is clear: what did the AI suggest vs what the human confirmed
- Enables future analysis of AI accuracy (compare suggested vs confirmed)

### 18.5 Append-Only Events vs Mutable Status History

**Chose `ticket_events` as append-only log** because:
- Every state change is preserved forever (no history loss from updates)
- Timeline UI can render the full lifecycle of a ticket
- Debugging is straightforward — read the event log chronologically
- No need for change-data-capture infrastructure