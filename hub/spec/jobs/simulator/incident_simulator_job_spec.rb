require "rails_helper"

RSpec.describe Simulator::IncidentSimulatorJob, type: :job do
  before do
    stub_request(:post, "http://localhost:3000/webhooks/whatsapp")
      .to_return(status: 200, body: '{"status":"ok"}')
    stub_request(:post, "http://localhost:3000/webhooks/slack")
      .to_return(status: 200, body: '{"status":"ok"}')
  end

  describe "#perform" do
    it "posts 5 WhatsApp messages" do
      described_class.new.perform

      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/whatsapp").times(5)
    end

    it "posts 3 Slack messages (2 incidents + 1 clients)" do
      described_class.new.perform

      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/slack").times(3)
    end

    it "makes 8 total HTTP posts" do
      described_class.new.perform

      expect(WebMock).to have_requested(:post, /localhost:3000\/webhooks/).times(8)
    end

    it "sends valid WhatsApp payloads" do
      described_class.new.perform

      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/whatsapp").with { |req|
        body = JSON.parse(req.body)
        body["object"] == "whatsapp_business_account" &&
          body["entry"].first["changes"].first["value"]["messages"].present?
      }.at_least_times(1)
    end

    it "sends valid Slack payloads" do
      described_class.new.perform

      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/slack").with { |req|
        body = JSON.parse(req.body)
        body["command"] == "/bug" && body["payload"]["priority"] == "critica"
      }.at_least_times(1)
    end
  end
end
