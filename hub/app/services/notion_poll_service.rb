class NotionPollService
  class RateLimitError < StandardError
    attr_reader :retry_after

    def initialize(retry_after: nil, message: "Rate limited by Notion API")
      @retry_after = retry_after
      super(message)
    end
  end

  NOTION_VERSION = "2022-06-28".freeze
  STATUS_MAP = { "Done" => "resolved", "In Progress" => "in_progress", "Open" => "open" }.freeze

  def self.poll
    new.poll
  end

  def poll
    database_id = ENV.fetch("NOTION_DATABASE_ID", "default-db-id")
    response = query_notion(database_id)
    check_rate_limit!(response)
    return unless response.code == "200"

    data = JSON.parse(response.body)
    pages = data["results"]
    return if pages.empty?

    pages.each { |page| process_page(page) }

    Rails.cache.write("notion_poll:last_timestamp", Time.current.iso8601)
  end

  private

  def check_rate_limit!(response)
    return unless response.code == "429"

    retry_after = response["Retry-After"]&.to_i
    raise RateLimitError.new(retry_after: retry_after)
  end

  def query_notion(database_id)
    uri = URI("https://api.notion.com/v1/databases/#{database_id}/query")
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('NOTION_API_KEY', 'test-key')}"
    request["Notion-Version"] = NOTION_VERSION

    last_timestamp = Rails.cache.read("notion_poll:last_timestamp")
    filter = if last_timestamp
      { filter: { timestamp: "last_edited_time", last_edited_time: { after: last_timestamp } } }
    else
      {}
    end

    request.body = filter.to_json
    http.request(request)
  end

  def process_page(page)
    notion_page_id = page["id"]
    ticket = Ticket.find_by(notion_page_id: notion_page_id)
    return unless ticket

    notion_status = page.dig("properties", "Status", "select", "name")
    new_status = STATUS_MAP[notion_status]
    return unless new_status
    return if ticket.status == new_status

    old_status = ticket.status
    ticket.update!(status: new_status)

    ticket.ticket_events.create!(
      event_type: "status_changed",
      actor_type: "notion_sync",
      actor_id: "notion_poll",
      data: { old_status: old_status, new_status: new_status, notion_page_id: notion_page_id }
    )

    ChangelogGeneratorJob.perform_later(ticket.id) if new_status == "resolved"
  end
end
