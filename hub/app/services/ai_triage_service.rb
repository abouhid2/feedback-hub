class AiTriageService
  class AiApiError < StandardError; end

  OPENAI_URL = AiConstants::OPENAI_CHAT_URL
  MODEL = AiConstants::TRIAGE_MODEL

  def self.call(ticket)
    new(ticket).call
  end

  def initialize(ticket)
    @ticket = ticket
    @redaction_types = []
  end

  def call
    return :already_enriched if @ticket.enrichment_status == "completed"
    return :no_api_key unless api_key_configured?
    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if rate_limited?

    response = request_openai
    parsed = parse_response(response)

    updates = {
      ai_suggested_type: parsed["suggested_type"],
      ai_suggested_priority: parsed["suggested_priority"],
      ai_summary: parsed["summary"],
      enrichment_status: "completed"
    }
    if @redaction_types.any?
      merged = (@ticket.pii_redacted_types + @redaction_types).uniq
      updates[:pii_redacted_types] = merged
    end
    @ticket.update!(updates)

    @ticket.ticket_events.create!(
      event_type: "ai_triaged",
      actor_type: "system",
      actor_id: "ai_triage",
      data: {
        ai_suggested_type: parsed["suggested_type"],
        ai_suggested_priority: parsed["suggested_priority"],
        ai_summary: parsed["summary"]
      }
    )

    if @redaction_types.any?
      @ticket.ticket_events.create!(
        event_type: "pii_redacted",
        actor_type: "system",
        actor_id: "ai_triage",
        data: { redacted_types: @redaction_types, service: "triage" }
      )
    end

    NotionSyncJob.perform_later(@ticket.id)

    @ticket
  rescue AiApiError => e
    @ticket.update!(enrichment_status: "failed")
    raise e
  end

  private

  def api_key_configured?
    key = ENV.fetch("OPENAI_API_KEY", nil)
    key.present? && key != "test-key"
  end

  def request_openai(retries: 2)
    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY', 'test-key')}"
    request.body = {
      model: MODEL,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: user_prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    }.to_json

    response = http.request(request)

    if response.code == "429"
      wait = response["Retry-After"]&.to_i || 20
      set_rate_limit_cooldown!(wait)
      if retries > 0
        sleep(wait)
        return request_openai(retries: retries - 1)
      end
    end

    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    JSON.parse(response.body)
  end

  def parse_response(response)
    content = response.dig("choices", 0, "message", "content")
    JSON.parse(content)
  end

  def system_prompt
    AiConstants::TRIAGE_SYSTEM_PROMPT
  end

  def user_prompt
    result = PiiScrubberService.scrub(ticket_text)
    @redaction_types = result[:redactions].map { |r| r[:type].to_s }.uniq
    result[:scrubbed]
  end

  def ticket_text
    parts = []
    parts << "Title: #{@ticket.title}"
    parts << "Description: #{@ticket.description}" if @ticket.description.present?
    parts << "Channel: #{@ticket.original_channel}"
    parts << "Type: #{@ticket.ticket_type}"
    parts.join("\n")
  end

  def rate_limited?
    Rails.cache.exist?("openai:rate_limited")
  end

  def set_rate_limit_cooldown!(seconds)
    Rails.cache.write("openai:rate_limited", true, expires_in: [seconds, 60].max.seconds)
  end
end
