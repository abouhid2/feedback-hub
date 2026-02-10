module Ingestion
  class WhatsappNormalizer < BaseNormalizer
    def normalize
      entry = payload[:entry]&.first || {}
      change = entry[:changes]&.first || {}
      value = change[:value] || {}
      contact = value[:contacts]&.first || {}
      message = value[:messages]&.first || {}

      wa_id = contact[:wa_id] || message[:from] || "unknown"
      external_id = message[:id] || SecureRandom.hex(8)

      reporter = find_or_create_reporter(
        name: contact.dig(:profile, :name) || "WhatsApp User",
        platform: "whatsapp",
        platform_user_id: wa_id,
        display_name: contact.dig(:profile, :name)
      )

      body = message.dig(:text, :body) || ""

      ticket = create_ticket(
        title: body.truncate(255),
        description: body,
        ticket_type: infer_ticket_type(body),
        priority: infer_priority(body),
        status: "open",
        reporter: reporter,
        original_channel: "whatsapp",
        metadata: {
          phone_number_id: value.dig(:metadata, :phone_number_id),
          wa_id: wa_id,
          message_type: message[:type]
        }
      )

      ticket.ticket_sources.create!(
        platform: "whatsapp",
        external_id: external_id,
        raw_payload: payload
      )

      ticket
    end
  end
end
