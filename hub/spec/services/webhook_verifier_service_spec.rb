require "rails_helper"

RSpec.describe WebhookVerifierService, type: :service do
  let(:body) { '{"event":"test"}' }
  let(:secret) { "test_signing_secret_123" }

  describe ".verify_slack" do
    it "returns true for a valid Slack signature" do
      timestamp = Time.now.to_i.to_s
      basestring = "v0:#{timestamp}:#{body}"
      signature = "v0=" + OpenSSL::HMAC.hexdigest("SHA256", secret, basestring)

      result = described_class.verify_slack(
        body: body,
        timestamp: timestamp,
        signature: signature,
        secret: secret
      )
      expect(result).to be true
    end

    it "returns false for an invalid signature" do
      result = described_class.verify_slack(
        body: body,
        timestamp: Time.now.to_i.to_s,
        signature: "v0=invalidsignature",
        secret: secret
      )
      expect(result).to be false
    end

    it "returns false if timestamp is older than 5 minutes" do
      timestamp = (Time.now.to_i - 600).to_s
      basestring = "v0:#{timestamp}:#{body}"
      signature = "v0=" + OpenSSL::HMAC.hexdigest("SHA256", secret, basestring)

      result = described_class.verify_slack(
        body: body,
        timestamp: timestamp,
        signature: signature,
        secret: secret
      )
      expect(result).to be false
    end
  end

  describe ".verify_intercom" do
    it "returns true for a valid Intercom signature" do
      signature = OpenSSL::HMAC.hexdigest("SHA256", secret, body)

      result = described_class.verify_intercom(
        body: body,
        signature: signature,
        secret: secret
      )
      expect(result).to be true
    end

    it "returns false for an invalid signature" do
      result = described_class.verify_intercom(
        body: body,
        signature: "invalidsignature",
        secret: secret
      )
      expect(result).to be false
    end
  end

  describe ".verify_whatsapp" do
    it "returns true for a valid WhatsApp signature" do
      signature = "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", secret, body)

      result = described_class.verify_whatsapp(
        body: body,
        signature: signature,
        secret: secret
      )
      expect(result).to be true
    end

    it "returns false for an invalid signature" do
      result = described_class.verify_whatsapp(
        body: body,
        signature: "sha256=invalidsignature",
        secret: secret
      )
      expect(result).to be false
    end
  end
end
