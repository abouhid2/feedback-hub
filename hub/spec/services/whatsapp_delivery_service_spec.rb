require "rails_helper"

RSpec.describe WhatsappDeliveryService, type: :service do
  let(:reporter) { create(:reporter) }
  let!(:identity) { create(:reporter_identity, reporter: reporter, platform: "whatsapp", platform_user_id: "+5511999990000", last_message_at: last_message_at) }
  let(:ticket) { create(:ticket, :resolved, reporter: reporter, original_channel: "whatsapp") }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }

  before do
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with("WHATSAPP_API_TOKEN").and_return("test-token")
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("WHATSAPP_API_TOKEN", anything).and_return("test-token")

    stub_request(:post, "https://graph.facebook.com/v17.0/messages")
      .to_return(status: 200, body: '{"messages":[{"id":"wamid.abc123"}]}', headers: { "Content-Type" => "application/json" })
  end

  describe ".deliver" do
    context "when last message was within 24 hours" do
      let(:last_message_at) { 2.hours.ago }

      it "sends a session message (free-form text)" do
        described_class.deliver(entry, identity)

        expect(WebMock).to have_requested(:post, "https://graph.facebook.com/v17.0/messages")
          .with { |req|
            body = JSON.parse(req.body)
            body["type"] == "text"
          }
      end

      it "returns :session as the delivery method" do
        result = described_class.deliver(entry, identity)
        expect(result[:method]).to eq(:session)
      end
    end

    context "when last message was over 24 hours ago" do
      let(:last_message_at) { 36.hours.ago }

      it "sends a pre-approved template message" do
        described_class.deliver(entry, identity)

        expect(WebMock).to have_requested(:post, "https://graph.facebook.com/v17.0/messages")
          .with { |req|
            body = JSON.parse(req.body)
            body["type"] == "template"
          }
      end

      it "returns :template as the delivery method" do
        result = described_class.deliver(entry, identity)
        expect(result[:method]).to eq(:template)
      end
    end

    context "when last_message_at is nil (never messaged)" do
      let(:last_message_at) { nil }

      it "sends a template message as fallback" do
        result = described_class.deliver(entry, identity)
        expect(result[:method]).to eq(:template)
      end
    end

    context "when template sending fails" do
      let(:last_message_at) { 36.hours.ago }

      before do
        stub_request(:post, "https://graph.facebook.com/v17.0/messages")
          .to_return(status: 470, body: '{"error":{"message":"Template not found"}}')
      end

      it "marks as channel_restricted" do
        result = described_class.deliver(entry, identity)
        expect(result[:status]).to eq(:channel_restricted)
      end

      it "returns the error reason" do
        result = described_class.deliver(entry, identity)
        expect(result[:error]).to include("Template")
      end
    end
  end
end
