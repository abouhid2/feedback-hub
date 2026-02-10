module Ingestion
  class IntercomNormalizer < BaseNormalizer
    def normalize
      item = payload.dig(:data, :item) || {}
      source = item[:source] || {}
      author = source.dig(:author) || {}
      external_id = item[:id]&.to_s || SecureRandom.hex(8)

      reporter = find_or_create_reporter(
        name: author[:name] || "Unknown Intercom User",
        email: author[:email],
        platform: "intercom",
        platform_user_id: author[:id]&.to_s || "unknown",
        display_name: author[:name]
      )

      body = source[:body] || ""

      ticket = create_ticket(
        title: body.truncate(255),
        description: body,
        ticket_type: infer_ticket_type(body),
        priority: infer_priority(body),
        status: "open",
        reporter: reporter,
        original_channel: "intercom",
        metadata: {
          conversation_id: item[:id],
          topic: payload[:topic],
          parts_count: item.dig(:conversation_parts, :total_count)
        }
      )

      ticket.ticket_sources.create!(
        platform: "intercom",
        external_id: external_id,
        raw_payload: payload
      )

      ticket
    end
  end
end
