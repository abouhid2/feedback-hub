require "rails_helper"

RSpec.describe TicketTypeInferenceService do
  describe ".infer" do
    context "in non-production environments" do
      it "uses regex-based inference for bug" do
        expect(described_class.infer("Error al cargar la lista")).to eq("bug")
      end

      it "uses regex-based inference for question" do
        expect(described_class.infer("Cómo puedo cambiar mi contraseña?")).to eq("question")
      end

      it "uses regex-based inference for feature_request" do
        expect(described_class.infer("Sugerencia: agregar filtros avanzados")).to eq("feature_request")
      end

      it "uses regex-based inference for incident" do
        expect(described_class.infer("El sistema está fuera de servicio")).to eq("incident")
      end

      it "does not call OpenAI" do
        expect(Net::HTTP).not_to receive(:new)
        described_class.infer("Some text")
      end
    end

    context "in production environment" do
      before do
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new("production"))
        allow(Rails.cache).to receive(:exist?).with("openai:rate_limited").and_return(false)
      end

      context "with API key configured" do
        before do
          allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", nil).and_return("sk-real-key")
          allow(ENV).to receive(:fetch).with("OPENAI_API_KEY").and_return("sk-real-key")
        end

        it "calls OpenAI and returns the classified type" do
          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_return(
              status: 200,
              body: {
                choices: [{ message: { content: "feature_request" } }]
              }.to_json,
              headers: { "Content-Type" => "application/json" }
            )

          expect(described_class.infer("Sería genial poder exportar a PDF")).to eq("feature_request")
        end

        it "falls back to regex when OpenAI returns an invalid type" do
          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_return(
              status: 200,
              body: {
                choices: [{ message: { content: "unknown_type" } }]
              }.to_json,
              headers: { "Content-Type" => "application/json" }
            )

          expect(described_class.infer("Error al cargar")).to eq("bug")
        end

        it "falls back to regex when OpenAI returns 500" do
          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_return(status: 500, body: "Internal Server Error")

          expect(described_class.infer("Error al cargar")).to eq("bug")
        end

        it "falls back to regex when OpenAI times out" do
          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_timeout

          expect(described_class.infer("Error al cargar")).to eq("bug")
        end

        it "falls back to regex on 429 and sets rate limit cooldown" do
          cache_store = ActiveSupport::Cache::MemoryStore.new
          allow(Rails).to receive(:cache).and_return(cache_store)

          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_return(
              status: 429,
              body: "Rate limited",
              headers: { "Retry-After" => "30" }
            )

          result = described_class.infer("Error al cargar")
          expect(result).to eq("bug")
          expect(cache_store.exist?("openai:rate_limited")).to be true
        end

        it "scrubs PII before sending to OpenAI" do
          stub_request(:post, TicketTypeInferenceService::OPENAI_URL)
            .to_return(
              status: 200,
              body: {
                choices: [{ message: { content: "bug" } }]
              }.to_json,
              headers: { "Content-Type" => "application/json" }
            )

          described_class.infer("Error reportado por user@example.com, llamar al +56 912 345 6789")

          expect(WebMock).to have_requested(:post, TicketTypeInferenceService::OPENAI_URL)
            .with { |req|
              body = JSON.parse(req.body)
              user_content = body["messages"].last["content"]
              !user_content.include?("user@example.com")
            }
        end
      end

      context "without API key" do
        before do
          allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", nil).and_return(nil)
        end

        it "falls back to regex" do
          expect(Net::HTTP).not_to receive(:new)
          expect(described_class.infer("Cómo puedo cambiar mi contraseña?")).to eq("question")
        end
      end

      context "with rate limit active" do
        before do
          allow(ENV).to receive(:fetch).with("OPENAI_API_KEY", nil).and_return("sk-real-key")
          allow(Rails.cache).to receive(:exist?).with("openai:rate_limited").and_return(true)
        end

        it "falls back to regex without calling OpenAI" do
          expect(Net::HTTP).not_to receive(:new)
          expect(described_class.infer("Error al cargar")).to eq("bug")
        end
      end
    end
  end
end
