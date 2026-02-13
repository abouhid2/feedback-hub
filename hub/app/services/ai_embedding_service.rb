class AiEmbeddingService
  class AiApiError < StandardError; end

  OPENAI_URL = AiConstants::OPENAI_EMBEDDINGS_URL
  MODEL = AiConstants::EMBEDDING_MODEL

  def self.call(ticket)
    new(ticket).call
  end

  def initialize(ticket)
    @ticket = ticket
  end

  def call
    return @ticket.ai_embedding if @ticket.ai_embedding.present?
    return nil unless api_key_configured?
    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if rate_limited?

    text, redaction_types = build_text
    embedding = request_embedding(text)

    updates = { ai_embedding: embedding }
    if redaction_types.any?
      merged = (@ticket.pii_redacted_types + redaction_types).uniq
      updates[:pii_redacted_types] = merged
    end
    @ticket.update!(updates)

    record_pii_event(redaction_types) if redaction_types.any?

    embedding
  end

  private

  def build_text
    title_result = PiiScrubberService.scrub(@ticket.title)
    all_redactions = title_result[:redactions].dup
    parts = [title_result[:scrubbed]]

    if @ticket.description.present?
      desc_result = PiiScrubberService.scrub(@ticket.description)
      all_redactions.concat(desc_result[:redactions])
      parts << desc_result[:scrubbed]
    end

    parts << "Channel: #{@ticket.original_channel}"
    redaction_types = all_redactions.map { |r| r[:type].to_s }.uniq

    [parts.join(" | "), redaction_types]
  end

  def record_pii_event(types)
    @ticket.ticket_events.create!(
      event_type: "pii_redacted",
      actor_type: "system",
      actor_id: "ai_embedding",
      data: { redacted_types: types, service: "embedding" }
    )
  end

  def request_embedding(text, retries: 2)
    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY', 'test-key')}"
    request.body = { model: MODEL, input: text }.to_json

    response = http.request(request)

    if response.code == "429"
      wait = response["Retry-After"]&.to_i || 20
      Rails.cache.write("openai:rate_limited", true, expires_in: [wait, 60].max.seconds)
      if retries > 0
        sleep(wait)
        return request_embedding(text, retries: retries - 1)
      end
    end

    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    parsed = JSON.parse(response.body)
    parsed.dig("data", 0, "embedding")
  end

  def api_key_configured?
    key = ENV.fetch("OPENAI_API_KEY", nil)
    key.present? && key != "test-key"
  end

  def rate_limited?
    Rails.cache.exist?("openai:rate_limited")
  end
end
