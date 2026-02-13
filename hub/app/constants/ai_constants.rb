module AiConstants
  # ── OpenAI endpoints ──────────────────────────────────────────────────
  OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions".freeze
  OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings".freeze

  # ── Models ────────────────────────────────────────────────────────────
  DEFAULT_CHAT_MODEL = "gpt-5.1".freeze
  AVAILABLE_CHAT_MODELS = %w[gpt-5.1 gpt-4.1 gpt-4o-mini o3-mini].freeze
  EMBEDDING_MODEL = "text-embedding-3-small".freeze
  GROUPING_MODEL = "gpt-4o-mini".freeze
  TRIAGE_MODEL = "gpt-4o-mini".freeze

  # ── Auto-grouping thresholds ──────────────────────────────────────────
  SIMILARITY_THRESHOLD = 0.82
  GROUPING_LOOKBACK_HOURS = 24
  GROUPING_MAX_CANDIDATES = 200
  GROUPING_MAX_TICKETS_FOR_AI = 50

  # ── Simulator PII test data ───────────────────────────────────────────
  PII_TEXT = "Login broken for user maria.garcia@company.com (phone: +56 9 8765 4321). SSN: 123-45-6789. Password: hunter2. Please fix ASAP.".freeze
  PII_ADDITIONAL_DETAILS = "User shared credentials: pwd=secret123, contact at 555-012-3456".freeze

  # ── Prompts: Changelog ────────────────────────────────────────────────
  CHANGELOG_SYSTEM_PROMPT = <<~PROMPT.freeze
    You are a customer communication specialist. Based on a resolved support ticket
    and the developer's resolution notes, generate a clear, friendly message for end users.

    You MUST use exactly these three markdown section headers in your response:

    **What happened:**
    (Describe the problem in simple, non-technical terms — 1-2 sentences)

    **How we fixed it:**
    (Explain the resolution focusing on the outcome, not technical details — 1-2 sentences)

    **Going forward:**
    (Brief reassurance that this has been resolved and what to expect — 1 sentence)

    Keep it concise, professional, and jargon-free.
    Do not mention internal tools, code, pull requests, or branch names.
    Always include all three sections with their exact headers.
  PROMPT

  CHANGELOG_GROUP_SYSTEM_PROMPT = <<~PROMPT.freeze
    You are a customer communication specialist. Based on a group of related resolved
    support tickets and the developer's resolution notes, generate a single clear, friendly
    resolution message for end users.
    As you might see, we have multiple tickets that were tagged as being for the same issue.
    So the idea is addressing all of them with only one notification.

    You MUST use exactly these three markdown section headers in your response:

    **What happened:**
    (Describe the problem in simple, non-technical terms — 1-2 sentences)

    **How we fixed it:**
    (Explain the resolution focusing on the outcome, not technical details — 1-2 sentences)

    **Going forward:**
    (Brief reassurance that this has been resolved and what to expect — 1 sentence)

    Keep it concise, professional, and jargon-free.
    Do not mention internal tools, code, pull requests, or branch names.
    Always include all three sections with their exact headers.
  PROMPT

  # ── Prompts: AI Grouping Suggestions ──────────────────────────────────
  GROUPING_SYSTEM_PROMPT = <<~PROMPT.freeze
    Analyze these support tickets and identify groups of tickets that describe the same underlying issue. Some tickets may already belong to a group (marked with [GROUP: name]). You can suggest adding ungrouped tickets to existing groups. Return ONLY valid JSON: { "groups": [...] } where each group has: name (short label), reason (why grouped), ticket_ids (array of ticket id strings). Only include groups with 2+ tickets. Omit tickets that don't match any group.
  PROMPT

  # ── Prompts: AI Triage ────────────────────────────────────────────────
  TRIAGE_SYSTEM_PROMPT = "You are an AI triage assistant. Analyze support tickets and return JSON with: suggested_type (bug/feature_request/question/incident), suggested_priority (0-5, where 0 is critical), and summary (one clean sentence). Return ONLY valid JSON.".freeze
end
