require "rails_helper"

RSpec.describe AiTriageService, type: :service do
  let(:ticket) { create(:ticket, title: "Login broken", description: "Users can't log in on mobile") }

  let(:openai_response) do
    {
      "id" => "chatcmpl-triage123",
      "choices" => [
        {
          "message" => {
            "content" => {
              "suggested_type" => "bug",
              "suggested_priority" => 2,
              "summary" => "Mobile login button is unresponsive for users"
            }.to_json
          }
        }
      ],
      "usage" => {
        "prompt_tokens" => 120,
        "completion_tokens" => 40
      }
    }
  end

  before do
    stub_request(:post, "https://api.openai.com/v1/chat/completions")
      .to_return(
        status: 200,
        body: openai_response.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end

  describe ".call" do
    it "stores AI suggestions in ai_suggested fields" do
      described_class.call(ticket)
      ticket.reload
      expect(ticket.ai_suggested_type).to eq("bug")
      expect(ticket.ai_suggested_priority).to eq(2)
      expect(ticket.ai_summary).to eq("Mobile login button is unresponsive for users")
    end

    it "sets enrichment_status to completed" do
      described_class.call(ticket)
      ticket.reload
      expect(ticket.enrichment_status).to eq("completed")
    end

    it "creates an ai_triaged ticket event" do
      expect { described_class.call(ticket) }
        .to change { ticket.ticket_events.where(event_type: "ai_triaged").count }.by(1)
    end

    it "scrubs PII before sending to OpenAI" do
      ticket.update!(description: "Contact john@test.com about the bug")
      described_class.call(ticket)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/chat/completions")
        .with { |req|
          body = JSON.parse(req.body)
          content = body["messages"].last["content"]
          !content.include?("john@test.com")
        }
    end

    it "sets enrichment_status to failed on OpenAI error" do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(status: 500, body: '{"error":"Internal Server Error"}')

      expect { described_class.call(ticket) }.to raise_error(AiTriageService::AiApiError)
      ticket.reload
      expect(ticket.enrichment_status).to eq("failed")
    end

    it "skips if ticket already enriched" do
      ticket.update!(enrichment_status: "completed")
      result = described_class.call(ticket)
      expect(result).to eq(:already_enriched)
      expect(WebMock).not_to have_requested(:post, "https://api.openai.com/v1/chat/completions")
    end
  end
end
