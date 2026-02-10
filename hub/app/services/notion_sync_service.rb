class NotionSyncService
  class ApiError < StandardError; end

  NOTION_API_URL = "https://api.notion.com/v1/pages".freeze
  NOTION_VERSION = "2022-06-28".freeze

  def self.push(ticket)
    new(ticket).push
  end

  def initialize(ticket)
    @ticket = ticket
  end

  def push
    if @ticket.notion_page_id.present?
      update_page
    else
      create_page
    end
  end

  private

  def create_page
    uri = URI(NOTION_API_URL)
    response = make_request(:post, uri, create_payload)

    raise ApiError, "Notion API error: #{response.code} - #{response.body}" unless response.code == "200"

    page = JSON.parse(response.body)
    @ticket.update!(notion_page_id: page["id"])

    create_sync_event

    @ticket
  end

  def update_page
    uri = URI("#{NOTION_API_URL}/#{@ticket.notion_page_id}")
    response = make_request(:patch, uri, update_payload)

    raise ApiError, "Notion API error: #{response.code} - #{response.body}" unless response.code == "200"

    create_sync_event

    @ticket
  end

  def make_request(method, uri, body)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = method == :post ? Net::HTTP::Post.new(uri) : Net::HTTP::Patch.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('NOTION_API_KEY', 'test-key')}"
    request["Notion-Version"] = NOTION_VERSION
    request.body = body.to_json

    http.request(request)
  end

  def create_sync_event
    @ticket.ticket_events.create!(
      event_type: "synced_to_notion",
      actor_type: "system",
      actor_id: "notion_sync",
      data: { notion_page_id: @ticket.notion_page_id }
    )
  end

  def notion_properties
    {
      "Title" => { "title" => [{ "text" => { "content" => @ticket.title } }] },
      "Priority" => { "select" => { "name" => priority_label } },
      "Type" => { "select" => { "name" => @ticket.ticket_type } },
      "Status" => { "select" => { "name" => @ticket.status.capitalize } },
      "Channel" => { "select" => { "name" => @ticket.original_channel } }
    }
  end

  def create_payload
    {
      parent: { database_id: ENV.fetch("NOTION_DATABASE_ID", "default-db-id") },
      properties: notion_properties
    }
  end

  def update_payload
    { properties: notion_properties }
  end

  def priority_label
    case @ticket.priority
    when 0 then "Critical"
    when 1 then "High"
    when 2 then "Medium"
    when 3 then "Normal"
    when 4 then "Low"
    when 5 then "Minimal"
    else "Normal"
    end
  end
end
