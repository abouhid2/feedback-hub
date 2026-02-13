require "rails_helper"

RSpec.describe AiEmbeddingService do
  let(:reporter) { create(:reporter) }
  let(:ticket) { create(:ticket, reporter: reporter, title: "Login is broken after deploy") }

  let(:embedding_vector) { Array.new(1536) { rand(-1.0..1.0) } }
  let(:openai_response) do
    { data: [{ embedding: embedding_vector }] }.to_json
  end

  before do
    stub_request(:post, "https://api.openai.com/v1/embeddings")
      .to_return(status: 200, body: openai_response, headers: { "Content-Type" => "application/json" })
    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", nil).and_return("sk-real-key")
    allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", "test-key").and_return("sk-real-key")
  end

  describe ".call" do
    it "generates and stores an embedding on the ticket" do
      result = described_class.call(ticket)

      expect(result).to be_an(Array)
      expect(result.length).to eq(1536)
      expect(ticket.reload.ai_embedding).to eq(embedding_vector)
    end

    it "sends PII-scrubbed text to OpenAI" do
      ticket.update!(title: "Login broken for john@example.com")

      described_class.call(ticket)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/embeddings").with { |req|
        body = JSON.parse(req.body)
        body["input"].include?("[EMAIL]") && !body["input"].include?("john@example.com")
      }
    end

    it "uses text-embedding-3-small model" do
      described_class.call(ticket)

      expect(WebMock).to have_requested(:post, "https://api.openai.com/v1/embeddings").with { |req|
        body = JSON.parse(req.body)
        body["model"] == "text-embedding-3-small"
      }
    end

    it "returns existing embedding without calling API" do
      existing = Array.new(1536) { 0.5 }
      ticket.update!(ai_embedding: existing)

      result = described_class.call(ticket)

      expect(result).to eq(existing)
      expect(WebMock).not_to have_requested(:post, "https://api.openai.com/v1/embeddings")
    end

    it "returns nil when API key is not configured" do
      allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", nil).and_return(nil)

      result = described_class.call(ticket)

      expect(result).to be_nil
      expect(WebMock).not_to have_requested(:post, "https://api.openai.com/v1/embeddings")
    end

    context "when rate limited" do
      it "raises AiApiError" do
        allow(Rails.cache).to receive(:exist?).with("openai:rate_limited").and_return(true)

        expect { described_class.call(ticket) }
          .to raise_error(AiEmbeddingService::AiApiError, /rate limit/i)
      end
    end

    context "when OpenAI returns an error" do
      before do
        stub_request(:post, "https://api.openai.com/v1/embeddings")
          .to_return(status: 500, body: '{"error":"fail"}')
      end

      it "raises AiApiError" do
        expect { described_class.call(ticket) }
          .to raise_error(AiEmbeddingService::AiApiError, /500/)
      end
    end
  end
end
