class ChangelogGeneratorService
  class InvalidTicketStatus < StandardError; end
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
    validate_ticket_status!

    existing = @ticket.changelog_entries.drafts.first
    return existing if existing

    response = request_openai
    content = response.dig("choices", 0, "message", "content")
    usage = response["usage"]

    entry = @ticket.changelog_entries.create!(
      content: content,
      status: "draft",
      ai_model: MODEL,
      ai_prompt_tokens: usage["prompt_tokens"],
      ai_completion_tokens: usage["completion_tokens"]
    )

    @ticket.ticket_events.create!(
      event_type: "changelog_drafted",
      actor_type: "system",
      actor_id: "changelog_generator",
      data: { changelog_entry_id: entry.id }
    )

    entry
  end

  private

  def validate_ticket_status!
    raise InvalidTicketStatus, "Ticket must be resolved (current: #{@ticket.status})" unless @ticket.status == "resolved"
  end

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
      temperature: 0.7,
      max_tokens: 300
    }.to_json

    response = http.request(request)
    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    JSON.parse(response.body)
  end

  def system_prompt
    "You are a customer communication specialist. Generate a brief, friendly changelog message for end users about a resolved support ticket. Keep it concise (2-3 sentences), professional, and focused on what was fixed and how it benefits the user. Do not include technical jargon."
  end

  def user_prompt
    parts = []
    parts << "Ticket title: #{@ticket.title}"
    parts << "Description: #{@ticket.description}" if @ticket.description.present?
    parts << "Channel: #{@ticket.original_channel}"
    parts << "Type: #{@ticket.ticket_type}"
    parts << "Reporter: #{@ticket.reporter&.name}" if @ticket.reporter
    parts.join("\n")
  end
end
