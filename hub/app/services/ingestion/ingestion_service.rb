module Ingestion
  class IngestionService
    NORMALIZERS = {
      "slack" => SlackNormalizer,
      "intercom" => IntercomNormalizer,
      "whatsapp" => WhatsappNormalizer
    }.freeze

    def self.ingest(platform:, payload:)
      normalizer_class = NORMALIZERS[platform]
      raise ArgumentError, "Unknown platform: #{platform}" unless normalizer_class

      # Idempotency: check if we already processed this external_id
      external_id = extract_external_id(platform, payload)
      if external_id.present?
        existing = TicketSource.find_by(platform: platform, external_id: external_id)
        return existing.ticket if existing
      end

      normalizer = normalizer_class.new(payload)
      ticket = normalizer.normalize
      AiTriageJob.perform_later(ticket.id)
      ticket
    end

    def self.extract_external_id(platform, payload)
      payload = payload.deep_symbolize_keys
      case platform
      when "slack"
        payload.dig(:payload, :issue_id) || payload[:trigger_id]
      when "intercom"
        payload.dig(:data, :item, :id)&.to_s
      when "whatsapp"
        payload.dig(:entry, 0, :changes, 0, :value, :messages, 0, :id)
      end
    end
  end
end
