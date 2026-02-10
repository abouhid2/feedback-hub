class NotificationDispatchService
  class NotApproved < StandardError; end
  class NoIdentityFound < StandardError; end

  PLATFORM_ENDPOINTS = {
    "slack" => "https://slack.com/api/chat.postMessage",
    "intercom" => "https://api.intercom.io/messages",
    "whatsapp" => "https://graph.facebook.com/v17.0/messages",
    "email" => nil,
    "in_app" => nil
  }.freeze

  def self.call(entry)
    new(entry).call
  end

  def self.retry_notification(notification)
    new(notification.changelog_entry).retry_send(notification)
  end

  def initialize(entry)
    @entry = entry
    @ticket = entry.ticket
  end

  def call
    validate_approved!
    recipient = find_recipient!

    notification = @ticket.notifications.create!(
      changelog_entry: @entry,
      channel: @ticket.original_channel,
      recipient: recipient,
      status: "pending",
      content: @entry.content
    )

    deliver(notification)
    notification
  end

  def retry_send(notification)
    deliver(notification)
    notification
  end

  private

  def validate_approved!
    raise NotApproved, "Changelog entry must be approved (current: #{@entry.status})" unless @entry.status == "approved"
  end

  def find_recipient!
    identity = @ticket.reporter&.reporter_identities&.find_by(platform: @ticket.original_channel)
    raise NoIdentityFound, "No identity found for reporter on #{@ticket.original_channel}" unless identity

    identity.platform_user_id
  end

  def deliver(notification)
    response = send_to_platform(notification)

    if response&.code == "200"
      notification.update!(status: "sent", delivered_at: Time.current)
      @ticket.ticket_events.create!(
        event_type: "notification_sent",
        actor_type: "system",
        actor_id: "notification_dispatch",
        data: { notification_id: notification.id, channel: notification.channel }
      )
    else
      error_msg = response ? "#{response.code}: #{response.body}" : "No response"
      notification.update!(
        status: "failed",
        retry_count: notification.retry_count + 1,
        last_error: error_msg
      )
      @ticket.ticket_events.create!(
        event_type: "notification_failed",
        actor_type: "system",
        actor_id: "notification_dispatch",
        data: { notification_id: notification.id, error: error_msg }
      )
      NotificationRetryJob.perform_later(notification.id)
    end
  end

  def send_to_platform(notification)
    endpoint = PLATFORM_ENDPOINTS[notification.channel]
    return mock_success_response unless endpoint

    uri = URI(endpoint)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request.body = platform_payload(notification).to_json

    http.request(request)
  end

  def mock_success_response
    Net::HTTPSuccess.new("1.1", "200", "OK")
  end

  def platform_payload(notification)
    case notification.channel
    when "slack"
      { channel: notification.recipient, text: notification.content }
    when "intercom"
      { message_type: "inapp", body: notification.content, from: { type: "admin", id: "system" }, to: { type: "user", id: notification.recipient } }
    when "whatsapp"
      { messaging_product: "whatsapp", to: notification.recipient, type: "text", text: { body: notification.content } }
    else
      { recipient: notification.recipient, content: notification.content }
    end
  end
end
