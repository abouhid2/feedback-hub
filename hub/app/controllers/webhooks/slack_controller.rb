module Webhooks
  class SlackController < ApplicationController
    skip_before_action :verify_authenticity_token, raise: false
    before_action :verify_signature

    def create
      ticket = Ingestion::IngestionService.ingest(
        platform: "slack",
        payload: params.to_unsafe_h
      )

      render json: { status: "ok", ticket_id: ticket.id }, status: :ok
    rescue StandardError => e
      StructuredLogger.instance.error("Webhook ingestion failed", service: "webhook", channel: "slack", error: e.message, error_class: e.class.name)
      render json: { error: e.message }, status: :unprocessable_entity
    end

    private

    def verify_signature
      return unless Rails.env.production?

      body = request.raw_post
      timestamp = request.headers["X-Slack-Request-Timestamp"]
      signature = request.headers["X-Slack-Signature"]
      secret = ENV.fetch("SLACK_SIGNING_SECRET", "")

      unless timestamp && signature && WebhookVerifierService.verify_slack(body: body, timestamp: timestamp, signature: signature, secret: secret)
        render json: { error: "Invalid signature" }, status: :unauthorized
      end
    end
  end
end
