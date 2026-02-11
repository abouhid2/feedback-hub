module Webhooks
  class IntercomController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false
    before_action :verify_signature

    def create
      ticket = Ingestion::IngestionService.ingest(
        platform: "intercom",
        payload: params.to_unsafe_h
      )

      render json: { status: "ok", ticket_id: ticket.id }, status: :ok
    rescue StandardError => e
      StructuredLogger.instance.error("Webhook ingestion failed", service: "webhook", channel: "intercom", error: e.message, error_class: e.class.name)
      render json: { error: e.message }, status: :unprocessable_entity
    end

    private

    def verify_signature
      return unless Rails.env.production?

      body = request.raw_post
      signature = request.headers["X-Hub-Signature"]
      secret = ENV.fetch("INTERCOM_WEBHOOK_SECRET", "")

      unless signature && WebhookVerifierService.verify_intercom(body: body, signature: signature, secret: secret)
        render json: { error: "Invalid signature" }, status: :unauthorized
      end
    end
  end
end
