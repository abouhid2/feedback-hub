class AiGroupingSuggestionService
  class AiApiError < StandardError; end

  OPENAI_URL = AiConstants::OPENAI_CHAT_URL
  MODEL = AiConstants::GROUPING_MODEL
  SYSTEM_PROMPT = AiConstants::GROUPING_SYSTEM_PROMPT
  MAX_TICKETS_FOR_AI = AiConstants::GROUPING_MAX_TICKETS_FOR_AI

  def self.call(hours_ago: 4)
    new(hours_ago: hours_ago).call
  end

  def initialize(hours_ago:)
    @hours_ago = hours_ago
  end

  def call
    all_tickets = Ticket.includes(:reporter, :ticket_group)
                        .where("tickets.created_at >= ?", @hours_ago.hours.ago)
                        .order(created_at: :desc)

    if all_tickets.size < 2
      return { suggestions: [], tickets: serialize_tickets(all_tickets), ticket_count: all_tickets.size }
    end

    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if Rails.cache.exist?("openai:rate_limited")

    # Send only the most recent tickets to OpenAI to stay within token limits.
    # Prioritize ungrouped tickets, then include grouped ones for context.
    ungrouped = all_tickets.select { |t| t.ticket_group_id.nil? }
    grouped = all_tickets.select { |t| t.ticket_group_id.present? }
    ai_tickets = (ungrouped + grouped).first(MAX_TICKETS_FOR_AI)

    ai_response = request_openai(build_user_prompt(ai_tickets))
    groups = parse_response(ai_response)

    {
      suggestions: groups,
      tickets: serialize_tickets(all_tickets),
      ticket_count: all_tickets.size
    }
  end

  private

  def build_user_prompt(tickets)
    lines = ["#{tickets.size} support tickets to analyze:\n"]

    tickets.each_with_index do |ticket, i|
      group_tag = ticket.ticket_group ? " [GROUP: #{ticket.ticket_group.name}]" : ""
      scrubbed_title = PiiScrubberService.scrub(ticket.title)[:scrubbed]
      scrubbed_desc = ticket.description.present? ? PiiScrubberService.scrub(ticket.description)[:scrubbed] : nil

      lines << "Ticket #{i + 1} (id: #{ticket.id})#{group_tag}:"
      lines << "  Title: #{scrubbed_title}"
      lines << "  Description: #{scrubbed_desc}" if scrubbed_desc
      lines << "  Channel: #{ticket.original_channel}"
      lines << "  Priority: P#{ticket.priority}"
      lines << ""
    end

    lines.join("\n")
  end

  def request_openai(user_message, retries: 2)
    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY', 'test-key')}"
    request.body = {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user_message }
      ],
      temperature: 0.3,
      max_tokens: 2000
    }.to_json

    response = http.request(request)

    if response.code == "429"
      wait = response["Retry-After"]&.to_i || 20
      Rails.cache.write("openai:rate_limited", true, expires_in: [wait, 60].max.seconds)
      if retries > 0
        sleep(wait)
        return request_openai(user_message, retries: retries - 1)
      end
    end

    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    JSON.parse(response.body)
  end

  def parse_response(response)
    content = response.dig("choices", 0, "message", "content")
    return [] if content.blank?

    # Strip markdown code fences (```json ... ```) that OpenAI often wraps responses in
    cleaned = content.gsub(/```(?:json)?\s*/i, "").strip
    json_str = cleaned[/\{.*\}/m]
    return [] if json_str.blank?

    parsed = JSON.parse(json_str)
    groups = parsed["groups"] || []

    groups.map do |g|
      {
        name: g["name"],
        reason: g["reason"],
        ticket_ids: Array(g["ticket_ids"]).map(&:to_s)
      }
    end
  rescue JSON::ParserError
    []
  end

  def serialize_tickets(tickets)
    tickets.map do |t|
      {
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        original_channel: t.original_channel,
        ticket_group_id: t.ticket_group_id,
        ticket_group_name: t.ticket_group&.name,
        created_at: t.created_at
      }
    end
  end
end
