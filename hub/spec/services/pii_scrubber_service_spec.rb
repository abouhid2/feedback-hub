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

    it "redacts international phone numbers with spaces" do
      text = "Contact at +56 9 8765 4321 for support"
      result = described_class.scrub(text)
      expect(result[:scrubbed]).not_to include("+56 9 8765 4321")
      expect(result[:scrubbed]).to include("[PHONE]")
      expect(result[:redactions].any? { |r| r[:type] == :phone }).to be true
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

    context "password patterns" do
      it "redacts password: 'xxx' format" do
        result = described_class.scrub("my password: \"secret123\"")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).not_to include("secret123")
      end

      it "redacts password=xxx format" do
        result = described_class.scrub("set password=hunter2 in config")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).not_to include("hunter2")
      end

      it "redacts pwd: xxx format" do
        result = described_class.scrub("login with pwd: abc123")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).not_to include("abc123")
      end

      it "redacts pass: xxx format" do
        result = described_class.scrub("use pass: mypass")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).not_to include("mypass")
      end

      it "is case-insensitive" do
        result = described_class.scrub("PASSWORD: SuperSecret")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).not_to include("SuperSecret")
      end

      it "records :password type in redactions" do
        result = described_class.scrub("password: test123")
        expect(result[:redactions].any? { |r| r[:type] == :password }).to be true
      end
    end

    context "SSN patterns" do
      it "redacts XXX-XX-XXXX format" do
        result = described_class.scrub("SSN is 123-45-6789")
        expect(result[:scrubbed]).to include("[SSN]")
        expect(result[:scrubbed]).not_to include("123-45-6789")
      end

      it "redacts XXX XX XXXX format" do
        result = described_class.scrub("SSN is 123 45 6789")
        expect(result[:scrubbed]).to include("[SSN]")
        expect(result[:scrubbed]).not_to include("123 45 6789")
      end

      it "redacts 9 consecutive digits" do
        result = described_class.scrub("SSN is 123456789")
        expect(result[:scrubbed]).to include("[SSN]")
        expect(result[:scrubbed]).not_to include("123456789")
      end

      it "does not match 8-digit numbers" do
        result = described_class.scrub("code is 12345678")
        expect(result[:scrubbed]).not_to include("[SSN]")
      end

      it "does not match 10-digit numbers" do
        result = described_class.scrub("code is 1234567890")
        expect(result[:scrubbed]).not_to include("[SSN]")
      end

      it "records :ssn type in redactions" do
        result = described_class.scrub("SSN: 123-45-6789")
        expect(result[:redactions].any? { |r| r[:type] == :ssn }).to be true
      end
    end

    context "combined PII types" do
      it "scrubs all 4 PII types simultaneously" do
        text = "Email john@test.com, call 555-123-4567, password: secret, SSN 123-45-6789"
        result = described_class.scrub(text)
        expect(result[:scrubbed]).to include("[EMAIL]")
        expect(result[:scrubbed]).to include("[PHONE]")
        expect(result[:scrubbed]).to include("[PASSWORD]")
        expect(result[:scrubbed]).to include("[SSN]")
        expect(result[:scrubbed]).not_to include("john@test.com")
        expect(result[:scrubbed]).not_to include("secret")
        expect(result[:scrubbed]).not_to include("123-45-6789")
        types = result[:redactions].map { |r| r[:type] }
        expect(types).to include(:email, :phone, :password, :ssn)
      end
    end
  end
end
