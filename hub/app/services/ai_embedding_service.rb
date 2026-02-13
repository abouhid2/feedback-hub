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

    text = build_text
    embedding = request_embedding(text)

    @ticket.update!(ai_embedding: embedding)
    embedding
  end

  private

  def build_text
    scrubbed_title = PiiScrubberService.scrub(@ticket.title)[:scrubbed]
    parts = [scrubbed_title]
    if @ticket.description.present?
      scrubbed_desc = PiiScrubberService.scrub(@ticket.description)[:scrubbed]
      parts << scrubbed_desc
    end
    parts << "Channel: #{@ticket.original_channel}"
    parts.join(" | ")
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
