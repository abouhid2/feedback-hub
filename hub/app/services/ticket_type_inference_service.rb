class TicketTypeInferenceService
  OPENAI_URL = AiConstants::OPENAI_CHAT_URL
  MODEL = AiConstants::TRIAGE_MODEL

  def self.infer(text)
    new(text).infer
  end

  def initialize(text)
    @text = text.to_s
  end

  def infer
    return regex_fallback unless use_ai?

    ai_infer
  rescue StandardError
    regex_fallback
  end

  private

  def use_ai?
    Rails.env.production? && api_key_configured? && !rate_limited?
  end

  def api_key_configured?
    key = ENV.fetch("OPENAI_API_KEY", nil)
    key.present? && key != "test-key"
  end

  def rate_limited?
    Rails.cache.exist?("openai:rate_limited")
  end

  def regex_fallback
    TicketTypePatterns.infer(@text)
  end

  def ai_infer
    scrubbed = PiiScrubberService.scrub(@text)[:scrubbed]

    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = 5
    http.read_timeout = 10

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY')}"
    request.body = {
      model: MODEL,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: scrubbed }
      ],
      temperature: 0.1,
      max_tokens: 20
    }.to_json

    response = http.request(request)

    if response.code == "429"
      wait = response["Retry-After"]&.to_i || 20
      Rails.cache.write("openai:rate_limited", true, expires_in: [wait, 60].max.seconds)
      return regex_fallback
    end

    return regex_fallback unless response.code == "200"

    content = JSON.parse(response.body).dig("choices", 0, "message", "content").to_s.strip.downcase
    TicketTypePatterns::VALID_TYPES.include?(content) ? content : regex_fallback
  end

  def system_prompt
    "Classify this support ticket into exactly one category. " \
      "Reply with ONLY one word: bug, feature_request, question, or incident. " \
      "No explanation, no punctuation."
  end
end
