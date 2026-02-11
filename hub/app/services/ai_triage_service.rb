class AiTriageService
  class AiApiError < StandardError; end

  OPENAI_URL = "https://api.openai.com/v1/chat/completions".freeze
  MODEL = "gpt-4o-mini".freeze

  def self.call(ticket)
    new(ticket).call
  end

  def initialize(ticket)
    @ticket = ticket
  end

  def call
    return :already_enriched if @ticket.enrichment_status == "completed"

    response = request_openai
    parsed = parse_response(response)

    @ticket.update!(
      ai_suggested_type: parsed["suggested_type"],
      ai_suggested_priority: parsed["suggested_priority"],
      ai_summary: parsed["summary"],
      enrichment_status: "completed"
    )

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

    NotionSyncJob.perform_later(@ticket.id)

    @ticket
  rescue AiApiError => e
    @ticket.update!(enrichment_status: "failed")
    raise e
  end

  private

  def request_openai
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
    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    JSON.parse(response.body)
  end

  def parse_response(response)
    content = response.dig("choices", 0, "message", "content")
    JSON.parse(content)
  end

  def system_prompt
    "You are an AI triage assistant. Analyze support tickets and return JSON with: suggested_type (bug/feature_request/question/incident), suggested_priority (0-5, where 0 is critical), and summary (one clean sentence). Return ONLY valid JSON."
  end

  def user_prompt
    scrubbed = PiiScrubberService.scrub(ticket_text)[:scrubbed]
    scrubbed
  end

  def ticket_text
    parts = []
    parts << "Title: #{@ticket.title}"
    parts << "Description: #{@ticket.description}" if @ticket.description.present?
    parts << "Channel: #{@ticket.original_channel}"
    parts << "Type: #{@ticket.ticket_type}"
    parts.join("\n")
  end
end
