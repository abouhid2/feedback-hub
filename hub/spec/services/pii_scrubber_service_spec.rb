require "rails_helper"

RSpec.describe PiiScrubberService, type: :service do
  describe ".scrub" do
    it "redacts email addresses" do
      text = "Contact me at john@example.com for details"
      result = described_class.scrub(text)
      expect(result[:scrubbed]).not_to include("john@example.com")
      expect(result[:scrubbed]).to include("[EMAIL]")
    end

    it "redacts phone numbers" do
      text = "Call me at +1-555-123-4567 or 5551234567"
      result = described_class.scrub(text)
      expect(result[:scrubbed]).not_to include("555-123-4567")
      expect(result[:scrubbed]).not_to include("5551234567")
    end

    it "preserves text meaning after redaction" do
      text = "User john@test.com reported a login bug from IP 192.168.1.1"
      result = described_class.scrub(text)
      expect(result[:scrubbed]).to include("reported a login bug")
    end

    it "returns a list of redactions made" do
      text = "Email john@test.com or call +1-555-000-1234"
      result = described_class.scrub(text)
      expect(result[:redactions]).to be_an(Array)
      expect(result[:redactions].length).to be >= 2
    end

    it "handles text with no PII" do
      text = "The login button is broken on the homepage"
      result = described_class.scrub(text)
      expect(result[:scrubbed]).to eq(text)
      expect(result[:redactions]).to be_empty
    end
  end
end
