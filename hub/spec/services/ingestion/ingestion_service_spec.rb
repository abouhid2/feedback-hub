require "rails_helper"

RSpec.describe Ingestion::IngestionService, type: :service do
  let(:slack_payload) do
    {
      trigger_id: "T-#{SecureRandom.hex(4)}",
      user_name: "Ana García",
      user_id: "U12345",
      text: "El botón de login no funciona en móvil",
      payload: {
        issue_id: "SLACK-#{SecureRandom.hex(4)}",
        incident: "El botón de login no funciona en móvil",
        priority: "alta"
      }
    }
  end

  describe ".ingest" do
    it "creates a ticket from a valid payload" do
      ticket = described_class.ingest(platform: "slack", payload: slack_payload)
      expect(ticket).to be_persisted
    end

    it "enqueues AiTriageJob for triage, embedding, and auto-grouping" do
      expect {
        described_class.ingest(platform: "slack", payload: slack_payload)
      }.to have_enqueued_job(AiTriageJob)
    end

    it "returns existing ticket for duplicate payloads" do
      ticket1 = described_class.ingest(platform: "slack", payload: slack_payload)
      ticket2 = described_class.ingest(platform: "slack", payload: slack_payload)
      expect(ticket2.id).to eq(ticket1.id)
    end
  end
end
