require "rails_helper"

RSpec.describe Ingestion::IngestionService, type: :service do
  let(:slack_payload) do
    {
      trigger_id: "T-#{SecureRandom.hex(4)}",
      payload: {
        issue_id: "SLACK-#{SecureRandom.hex(4)}",
        reporter_name: "Ana García",
        reporter_email: "ana@example.com",
        description: "El botón de login no funciona en móvil",
        priority: "alta"
      }
    }
  end

  describe ".ingest" do
    it "enqueues AiTriageJob after creating a ticket" do
      ticket = described_class.ingest(platform: "slack", payload: slack_payload)

      expect(AiTriageJob).to have_been_enqueued.with(ticket.id)
    end

    it "does not enqueue AiTriageJob for duplicate payloads" do
      described_class.ingest(platform: "slack", payload: slack_payload)

      expect {
        described_class.ingest(platform: "slack", payload: slack_payload)
      }.not_to have_enqueued_job(AiTriageJob)
    end
  end
end
