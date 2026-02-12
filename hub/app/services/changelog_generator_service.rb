class ChangelogGeneratorService
  class InvalidTicketStatus < StandardError; end
  class AiApiError < StandardError; end

  OPENAI_URL = "https://api.openai.com/v1/chat/completions".freeze
  DEFAULT_MODEL = "gpt-5.1".freeze
  AVAILABLE_MODELS = %w[gpt-5.1 gpt-4.1 gpt-4o-mini o3-mini].freeze

  def self.call(ticket, custom_prompt: nil, custom_system_prompt: nil, resolution_notes: nil, force: false, model: nil)
    new(ticket, custom_prompt: custom_prompt, custom_system_prompt: custom_system_prompt, resolution_notes: resolution_notes, force: force, model: model).call
  end

  def self.generate_for_group(group, custom_prompt: nil, custom_system_prompt: nil, resolution_notes: nil, model: nil)
    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if Rails.cache.exist?("openai:rate_limited")

    selected_model = model.presence || DEFAULT_MODEL

    tickets = group.tickets.includes(:reporter)
    prompt_text = build_group_prompt(tickets)
    scrubbed = PiiScrubberService.scrub(prompt_text)[:scrubbed]

    user_message = custom_prompt || scrubbed
    user_message = "#{user_message}\n\nDeveloper resolution notes:\n#{resolution_notes}" if resolution_notes.present? && custom_prompt.blank?
    system_message = custom_system_prompt.presence || ChangelogPrompts::DEFAULT_GROUP_SYSTEM_PROMPT

    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY', 'test-key')}"
    request.body = {
      model: selected_model,
      messages: [
        { role: "system", content: system_message },
        { role: "user", content: user_message }
      ],
      temperature: 0.7,
      max_tokens: 400
    }.to_json

    response = http.request(request)

    if response.code == "429"
      wait = response["Retry-After"]&.to_i || 20
      Rails.cache.write("openai:rate_limited", true, expires_in: [wait, 60].max.seconds)
    end

    raise AiApiError, "OpenAI returned #{response.code}: #{response.body}" unless response.code == "200"

    parsed = JSON.parse(response.body)
    parsed.dig("choices", 0, "message", "content")
  end

  def self.build_group_prompt(tickets)
    parts = ["Group of #{tickets.size} related tickets:"]
    tickets.each_with_index do |ticket, i|
      parts << "Ticket #{i + 1}: #{ticket.title}"
      parts << "  Description: #{ticket.description}" if ticket.description.present?
      parts << "  Channel: #{ticket.original_channel}"
      parts << "  Type: #{ticket.ticket_type}"
    end
    parts.join("\n")
  end

  def initialize(ticket, custom_prompt: nil, custom_system_prompt: nil, resolution_notes: nil, force: false, model: nil)
    @ticket = ticket
    @custom_prompt = custom_prompt
    @custom_system_prompt = custom_system_prompt
    @resolution_notes = resolution_notes
    @force = force
    @model = model.presence || DEFAULT_MODEL
  end

  def call
    validate_ticket_status!

    if @force
      @ticket.changelog_entries.drafts.destroy_all
    else
      existing = @ticket.changelog_entries.drafts.first
      return existing if existing
    end

    raise AiApiError, "OpenAI rate limit cooldown active — try again later" if rate_limited?

    response = request_openai
    content = response.dig("choices", 0, "message", "content")
    usage = response["usage"]

    entry = @ticket.changelog_entries.create!(
      content: content,
      status: "draft",
      ai_model: @model,
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

  def request_openai(retries: 2)
    uri = URI(OPENAI_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('OPENAI_API_KEY', 'test-key')}"
    request.body = {
      model: @model,
      messages: [
        { role: "system", content: system_prompt },
        { role: "user", content: @custom_prompt || user_prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
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

  def system_prompt
    @custom_system_prompt.presence || ChangelogPrompts::DEFAULT_SYSTEM_PROMPT
  end

  def user_prompt
    scrubbed = PiiScrubberService.scrub(ticket_text)[:scrubbed]
    return scrubbed if @resolution_notes.blank?

    "#{scrubbed}\n\nDeveloper resolution notes:\n#{@resolution_notes}"
  end

  def ticket_text
    parts = []
    parts << "Ticket title: #{@ticket.title}"
    parts << "Description: #{@ticket.description}" if @ticket.description.present?
    parts << "Channel: #{@ticket.original_channel}"
    parts << "Type: #{@ticket.ticket_type}"
    parts << "Reporter: #{@ticket.reporter&.name}" if @ticket.reporter
    parts.join("\n")
  end

  def rate_limited?
    Rails.cache.exist?("openai:rate_limited")
  end

  def set_rate_limit_cooldown!(seconds)
    Rails.cache.write("openai:rate_limited", true, expires_in: [seconds, 60].max.seconds)
  end
end
