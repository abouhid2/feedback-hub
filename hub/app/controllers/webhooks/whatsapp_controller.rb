module Webhooks
  class WhatsappController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false
    before_action :verify_signature

    def create
      ticket = Ingestion::IngestionService.ingest(
        platform: "whatsapp",
        payload: params.to_unsafe_h
      )

      render json: { status: "ok", ticket_id: ticket.id }, status: :ok
    rescue StandardError => e
      StructuredLogger.instance.error("Webhook ingestion failed", service: "webhook", channel: "whatsapp", error: e.message, error_class: e.class.name)
      render json: { error: e.message }, status: :unprocessable_entity
    end

    private

    def verify_signature
      return unless Rails.env.production?

      body = request.raw_post
      signature = request.headers["X-Hub-Signature-256"]
      secret = ENV.fetch("WHATSAPP_WEBHOOK_SECRET", "")

      unless signature && WebhookVerifierService.verify_whatsapp(body: body, signature: signature, secret: secret)
        render json: { error: "Invalid signature" }, status: :unauthorized
      end
    end
  end
end
