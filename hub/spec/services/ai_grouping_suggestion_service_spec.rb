require "rails_helper"

RSpec.describe AiGroupingSuggestionService do
  let(:reporter) { create(:reporter) }
  let!(:ticket1) { create(:ticket, reporter: reporter, original_channel: "whatsapp", title: "App is down", created_at: 1.hour.ago) }
  let!(:ticket2) { create(:ticket, reporter: reporter, original_channel: "slack", title: "Login broken after deploy", created_at: 2.hours.ago) }
  let!(:ticket3) { create(:ticket, reporter: reporter, original_channel: "intercom", title: "Cannot access platform", created_at: 3.hours.ago) }

  let(:openai_response) do
    {
      choices: [{
        message: {
          content: {
            groups: [{
              name: "Platform Access Outage",
              reason: "All tickets report inability to access the platform after a deploy",
              ticket_ids: [ticket1.id, ticket2.id, ticket3.id]
            }]
          }.to_json
        }
      }]
    }.to_json
  end

  before do
    stub_request(:post, "https://api.openai.com/v1/chat/completions")
      .to_return(status: 200, body: openai_response, headers: { "Content-Type" => "application/json" })
  end

  describe ".call" do
    it "returns suggestions from OpenAI" do
      result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(result[:suggestions].length).to eq(1)
      expect(result[:suggestions].first[:name]).to eq("Platform Access Outage")
      expect(result[:suggestions].first[:ticket_ids]).to contain_exactly(ticket1.id, ticket2.id, ticket3.id)
      expect(result[:ticket_count]).to eq(3)
    end

    it "includes ticket summaries in the response" do
      result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(result[:tickets].length).to eq(3)
      expect(result[:tickets].first[:title]).to be_present
      expect(result[:tickets].first[:original_channel]).to be_present
    end

    it "applies PII scrubbing before sending to OpenAI" do
      ticket1.update!(title: "Login broken for user john@example.com")

      described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/chat/completions").with { |req|
        body = JSON.parse(req.body)
        user_content = body["messages"].last["content"]
        expect(user_content).to include("[EMAIL]")
        expect(user_content).not_to include("john@example.com")
      }
    end

    it "returns per-ticket redaction types in the response" do
      ticket1.update!(title: "Login broken for user john@example.com")
      ticket2.update!(description: "Call me at +1-555-123-4567 for details")

      result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(result[:redactions][ticket1.id]).to eq(["email"])
      expect(result[:redactions][ticket2.id]).to eq(["phone"])
      expect(result[:redactions]).not_to have_key(ticket3.id)
    end

    it "includes both grouped and ungrouped tickets" do
      group = TicketGroupService.create_group(
        name: "Existing group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )

      result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(result[:ticket_count]).to eq(3)
      grouped_ticket = result[:tickets].find { |t| t[:id] == ticket1.id }
      expect(grouped_ticket[:ticket_group_id]).to eq(group.id)
      expect(grouped_ticket[:ticket_group_name]).to eq("Existing group")
    end

    it "sends group info to OpenAI for already-grouped tickets" do
      TicketGroupService.create_group(
        name: "Existing group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )

      described_class.call(start_time: 4.hours.ago, end_time: Time.current)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/chat/completions").with { |req|
        body = JSON.parse(req.body)
        user_content = body["messages"].last["content"]
        expect(user_content).to include("[GROUP: Existing group]")
      }
    end

    context "with order: 'first'" do
      it "returns tickets in ascending order (oldest first)" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current, order: "first")

        created_ats = result[:tickets].map { |t| t[:created_at] }
        expect(created_ats).to eq(created_ats.sort)
      end
    end

    context "with order: 'last'" do
      it "returns tickets in descending order (newest first)" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current, order: "last")

        created_ats = result[:tickets].map { |t| t[:created_at] }
        expect(created_ats).to eq(created_ats.sort.reverse)
      end
    end

    context "with limit" do
      it "caps the number of tickets returned" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current, limit: 2)

        expect(result[:ticket_count]).to eq(2)
        expect(result[:tickets].length).to eq(2)
      end
    end

    context "when fewer than 2 tickets in time frame" do
      it "returns empty suggestions without calling OpenAI" do
        result = described_class.call(start_time: 1.second.ago, end_time: Time.current)

        expect(result[:suggestions]).to eq([])
        expect(result[:ticket_count]).to eq(0)
        expect(WebMock).not_to have_requested(:post, "https://api.openai.com/v1/chat/completions")
      end
    end

    context "when rate limited" do
      it "raises AiApiError" do
        allow(Rails.cache).to receive(:exist?).with("openai:rate_limited").and_return(true)

        expect { described_class.call(start_time: 4.hours.ago, end_time: Time.current) }
          .to raise_error(AiGroupingSuggestionService::AiApiError, /rate limit/i)
      end
    end

    context "when OpenAI returns index-based ticket IDs instead of UUIDs" do
      let(:openai_response) do
        {
          choices: [{
            message: {
              content: {
                groups: [{
                  name: "Platform Outage",
                  reason: "All report access issues",
                  ticket_ids: ["1", "2", "3"]
                }]
              }.to_json
            }
          }]
        }.to_json
      end

      it "resolves index numbers to actual ticket UUIDs" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)

        expect(result[:suggestions].length).to eq(1)
        suggestion_ids = result[:suggestions].first[:ticket_ids]
        expect(suggestion_ids).to all(match(/\A[0-9a-f-]{36}\z/))
        expect(suggestion_ids.length).to eq(3)
      end
    end

    context "when OpenAI returns unresolvable ticket IDs" do
      let(:openai_response) do
        {
          choices: [{
            message: {
              content: {
                groups: [{
                  name: "Bad Group",
                  reason: "Invalid IDs",
                  ticket_ids: ["nonexistent-1", "nonexistent-2"]
                }]
              }.to_json
            }
          }]
        }.to_json
      end

      it "filters out suggestions with fewer than 2 valid tickets" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)
        expect(result[:suggestions]).to eq([])
      end
    end

    context "when OpenAI returns invalid JSON" do
      let(:openai_response) do
        {
          choices: [{
            message: { content: "Sorry, I cannot process that request." }
          }]
        }.to_json
      end

      it "returns empty suggestions" do
        result = described_class.call(start_time: 4.hours.ago, end_time: Time.current)
        expect(result[:suggestions]).to eq([])
      end
    end

    context "when OpenAI returns an error" do
      before do
        stub_request(:post, "https://api.openai.com/v1/chat/completions")
          .to_return(status: 500, body: '{"error":"Internal Server Error"}')
      end

      it "raises AiApiError" do
        expect { described_class.call(start_time: 4.hours.ago, end_time: Time.current) }
          .to raise_error(AiGroupingSuggestionService::AiApiError, /500/)
      end
    end
  end
end
