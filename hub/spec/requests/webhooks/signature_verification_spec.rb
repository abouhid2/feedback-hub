require "rails_helper"

RSpec.describe "Webhook Signature Verification", type: :request do
  let(:secret) { "test_webhook_secret" }

  before do
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("SLACK_SIGNING_SECRET", anything).and_return(secret)
    allow(ENV).to receive(:fetch).with("INTERCOM_WEBHOOK_SECRET", anything).and_return(secret)
    allow(ENV).to receive(:fetch).with("WHATSAPP_WEBHOOK_SECRET", anything).and_return(secret)
    # Force production-like verification
    allow(Rails.env).to receive(:production?).and_return(true)
  end

  describe "POST /webhooks/slack" do
    let(:payload) do
      {
        user_name: "testuser",
        user_id: "U123",
        text: "Bug report",
        trigger_id: "T-#{SecureRandom.hex(4)}",
        payload: { issue_id: "SLACK-#{SecureRandom.hex(4)}", incident: "Login broken", priority: "alta" }
      }
    end

    it "rejects requests without a valid signature" do
      post "/webhooks/slack",
        params: payload.to_json,
        headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "accepts requests with a valid signature" do
      body = payload.to_json
      timestamp = Time.now.to_i.to_s
      basestring = "v0:#{timestamp}:#{body}"
      signature = "v0=" + OpenSSL::HMAC.hexdigest("SHA256", secret, basestring)

      post "/webhooks/slack",
        params: body,
        headers: {
          "Content-Type" => "application/json",
          "X-Slack-Request-Timestamp" => timestamp,
          "X-Slack-Signature" => signature
        }

      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /webhooks/intercom" do
    let(:payload) do
      {
        type: "conversation.user.created",
        data: {
          item: {
            id: "INTERCOM-#{SecureRandom.hex(4)}",
            type: "conversation",
            user: { email: "user@test.com", name: "Test User" },
            conversation_message: { body: "Need help with login" }
          }
        }
      }
    end

    it "rejects requests without a valid signature" do
      post "/webhooks/intercom",
        params: payload.to_json,
        headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "accepts requests with a valid signature" do
      body = payload.to_json
      signature = OpenSSL::HMAC.hexdigest("SHA256", secret, body)

      post "/webhooks/intercom",
        params: body,
        headers: {
          "Content-Type" => "application/json",
          "X-Hub-Signature" => signature
        }

      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /webhooks/whatsapp" do
    let(:payload) do
      {
        entry: [{
          changes: [{
            value: {
              metadata: { phone_number_id: "123" },
              contacts: [{ wa_id: "+5511999990000", profile: { name: "Maria" } }],
              messages: [{ id: "wamid.#{SecureRandom.hex(8)}", from: "+5511999990000", type: "text", text: { body: "App crashed" } }]
            }
          }]
        }]
      }
    end

    it "rejects requests without a valid signature" do
      post "/webhooks/whatsapp",
        params: payload.to_json,
        headers: { "Content-Type" => "application/json" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "accepts requests with a valid signature" do
      body = payload.to_json
      signature = "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", secret, body)

      post "/webhooks/whatsapp",
        params: body,
        headers: {
          "Content-Type" => "application/json",
          "X-Hub-Signature-256" => signature
        }

      expect(response).to have_http_status(:ok)
    end
  end
end
