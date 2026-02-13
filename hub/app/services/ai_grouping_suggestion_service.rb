class AiGroupingSuggestionService
  class AiApiError < StandardError; end

  OPENAI_URL = AiConstants::OPENAI_CHAT_URL
  MODEL = AiConstants::GROUPING_MODEL
  SYSTEM_PROMPT = AiConstants::GROUPING_SYSTEM_PROMPT
  MAX_TICKETS_FOR_AI = AiConstants::GROUPING_MAX_TICKETS_FOR_AI

  def self.call(limit: 50, order: "last", start_time: nil, end_time: nil)
    new(limit: limit, order: order, start_time: start_time, end_time: end_time).call
  end

  def initialize(limit:, order:, start_time:, end_time:)
    @limit = [limit, MAX_TICKETS_FOR_AI].min
    @order = order
    @start_time = start_time || 30.minutes.ago
    @end_time = end_time || Time.current
  end

  def call
    direction = @order == "first" ? :asc : :desc
    all_tickets = Ticket.includes(:reporter, :ticket_group)
                        .where(created_at: @start_time..@end_time)
                        .order(created_at: direction)
                        .limit(@limit)

    if all_tickets.size < 2
      return { suggestions: [], tickets: serialize_tickets(all_tickets), ticket_count: all_tickets.size }
    end

    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if Rails.cache.exist?("openai:rate_limited")

    # Send only the most recent tickets to OpenAI to stay within token limits.
    # Prioritize ungrouped tickets, then include grouped ones for context.
    ungrouped = all_tickets.select { |t| t.ticket_group_id.nil? }
    grouped = all_tickets.select { |t| t.ticket_group_id.present? }
    ai_tickets = (ungrouped + grouped).first(MAX_TICKETS_FOR_AI)

    # Build index→UUID map so we can resolve IDs regardless of what OpenAI returns
    @index_to_id = {}
    ai_tickets.each_with_index { |t, i| @index_to_id[(i + 1).to_s] = t.id }
    @valid_ids = Set.new(ai_tickets.map(&:id))

    prompt, redactions_by_ticket = build_user_prompt(ai_tickets)
    ai_response = request_openai(prompt)
    groups = parse_response(ai_response)

    {
      suggestions: groups,
      tickets: serialize_tickets(all_tickets),
      redactions: redactions_by_ticket,
      ticket_count: all_tickets.size
    }
  end

  private

  def build_user_prompt(tickets)
    lines = ["#{tickets.size} support tickets to analyze:\n"]
    redactions_by_ticket = {}

    tickets.each_with_index do |ticket, i|
      group_tag = ticket.ticket_group ? " [GROUP: #{ticket.ticket_group.name}]" : ""
      title_result = PiiScrubberService.scrub(ticket.title)
      desc_result = ticket.description.present? ? PiiScrubberService.scrub(ticket.description) : nil

      all_redactions = title_result[:redactions] + (desc_result ? desc_result[:redactions] : [])
      if all_redactions.any?
        redactions_by_ticket[ticket.id] = all_redactions.map { |r| r[:type].to_s }.uniq
      end

      lines << "Ticket #{i + 1} (id: #{ticket.id})#{group_tag}:"
      lines << "  Title: #{title_result[:scrubbed]}"
      lines << "  Description: #{desc_result[:scrubbed]}" if desc_result
      lines << "  Channel: #{ticket.original_channel}"
      lines << "  Priority: P#{ticket.priority}"
      lines << ""
    end

    [lines.join("\n"), redactions_by_ticket]
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
      max_completion_tokens: 2000
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

    groups.filter_map do |g|
      resolved_ids = Array(g["ticket_ids"]).map { |raw_id| resolve_ticket_id(raw_id.to_s) }.compact.uniq
      next if resolved_ids.size < 2

      {
        name: g["name"],
        reason: g["reason"],
        ticket_ids: resolved_ids
      }
    end
  rescue JSON::ParserError
    []
  end

  # Resolve ticket ID from either UUID or index number (e.g. "1", "2")
  def resolve_ticket_id(raw_id)
    return raw_id if @valid_ids.include?(raw_id)
    @index_to_id[raw_id]
  end

  def serialize_tickets(tickets)
    tickets.map do |t|
      {
        id: t.id,
        title: t.title,
        description: t.description&.truncate(200),
        ai_summary: t.ai_summary,
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
