require "rails_helper"

RSpec.describe ChangelogGeneratorService, type: :service do
  let(:reporter) { create(:reporter) }
  let(:ticket) { create(:ticket, :resolved, reporter: reporter, title: "Login button broken", description: "Users cannot click the login button on mobile") }

  let(:openai_response) do
    {
      "id" => "chatcmpl-abc123",
      "choices" => [
        {
          "message" => {
            "content" => "We fixed an issue where the login button was unresponsive on mobile devices. You should now be able to log in without any problems."
          }
        }
      ],
      "usage" => {
        "prompt_tokens" => 150,
        "completion_tokens" => 35
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
    it "creates a ChangelogEntry with status draft" do
      entry = described_class.call(ticket)
      expect(entry).to be_a(ChangelogEntry)
      expect(entry.status).to eq("draft")
      expect(entry.ticket).to eq(ticket)
    end

    it "stores AI-generated content from OpenAI response" do
      entry = described_class.call(ticket)
      expect(entry.content).to eq("We fixed an issue where the login button was unresponsive on mobile devices. You should now be able to log in without any problems.")
    end

    it "records ai_model and token usage" do
      entry = described_class.call(ticket)
      expect(entry.ai_model).to eq("gpt-5.1")
      expect(entry.ai_prompt_tokens).to eq(150)
      expect(entry.ai_completion_tokens).to eq(35)
    end

    it "creates a changelog_drafted ticket event" do
      expect { described_class.call(ticket) }
        .to change { ticket.ticket_events.where(event_type: "changelog_drafted").count }.by(1)
    end

    it "sends ticket context to OpenAI" do
      described_class.call(ticket)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/chat/completions")
        .with { |req|
          body = JSON.parse(req.body)
          content = body["messages"].last["content"]
          content.include?(ticket.title) && content.include?(ticket.original_channel)
        }
    end

    it "raises InvalidTicketStatus if ticket is not resolved" do
      open_ticket = create(:ticket, status: "open")
      expect { described_class.call(open_ticket) }
        .to raise_error(ChangelogGeneratorService::InvalidTicketStatus)
    end

    it "raises AiApiError if OpenAI returns non-200" do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(status: 500, body: '{"error":"Internal Server Error"}')

      expect { described_class.call(ticket) }
        .to raise_error(ChangelogGeneratorService::AiApiError)
    end

    it "returns existing draft if one already exists (idempotent)" do
      first_entry = described_class.call(ticket)
      second_entry = described_class.call(ticket)
      expect(second_entry.id).to eq(first_entry.id)
    end
  end
end
