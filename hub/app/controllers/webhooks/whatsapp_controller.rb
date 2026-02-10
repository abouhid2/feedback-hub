module Webhooks
  class WhatsappController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false

    def create
      ticket = Ingestion::IngestionService.ingest(
        platform: "whatsapp",
        payload: params.to_unsafe_h
      )

      render json: { status: "ok", ticket_id: ticket.id }, status: :ok
    rescue StandardError => e
      Rails.logger.error("WhatsApp webhook error: #{e.message}")
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
