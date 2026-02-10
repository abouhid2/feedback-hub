module Webhooks
  class SlackController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false

    def create
      # TODO: Signature verification (stubbed for prototype)
      ticket = Ingestion::IngestionService.ingest(
        platform: "slack",
        payload: params.to_unsafe_h
      )

      render json: { status: "ok", ticket_id: ticket.id }, status: :ok
    rescue StandardError => e
      Rails.logger.error("Slack webhook error: #{e.message}")
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end
end
