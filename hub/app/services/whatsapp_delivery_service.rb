class WhatsappDeliveryService
  WHATSAPP_API_URL = "https://graph.facebook.com/v17.0/messages".freeze
  SESSION_WINDOW = 24.hours

  def self.deliver(entry, identity)
    new(entry, identity).deliver
  end

  def initialize(entry, identity)
    @entry = entry
    @identity = identity
  end

  def deliver
    if within_session_window?
      send_session_message
    else
      send_template_message
    end
  end

  private

  def within_session_window?
    @identity.last_message_at.present? &&
      @identity.last_message_at > SESSION_WINDOW.ago
  end

  def send_session_message
    response = post_to_whatsapp(session_payload)

    if response.code == "200"
      { method: :session, status: :sent }
    else
      { method: :session, status: :failed, error: response.body }
    end
  end

  def send_template_message
    response = post_to_whatsapp(template_payload)

    if response.code == "200"
      { method: :template, status: :sent }
    else
      { method: :template, status: :channel_restricted, error: response.body }
    end
  end

  def post_to_whatsapp(payload)
    uri = URI(WHATSAPP_API_URL)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    request["Authorization"] = "Bearer #{ENV.fetch('WHATSAPP_API_TOKEN', 'test-token')}"
    request.body = payload.to_json

    http.request(request)
  end

  def session_payload
    {
      messaging_product: "whatsapp",
      to: @identity.platform_user_id,
      type: "text",
      text: { body: @entry.content }
    }
  end

  def template_payload
    {
      messaging_product: "whatsapp",
      to: @identity.platform_user_id,
      type: "template",
      template: {
        name: "issue_resolved",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: @entry.content.truncate(200) }
            ]
          }
        ]
      }
    }
  end
end
