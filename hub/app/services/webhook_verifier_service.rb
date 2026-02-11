class WebhookVerifierService
  TIMESTAMP_TOLERANCE = 300 # 5 minutes

  def self.verify_slack(body:, timestamp:, signature:, secret:)
    return false if (Time.now.to_i - timestamp.to_i).abs > TIMESTAMP_TOLERANCE

    basestring = "v0:#{timestamp}:#{body}"
    expected = "v0=" + OpenSSL::HMAC.hexdigest("SHA256", secret, basestring)

    ActiveSupport::SecurityUtils.secure_compare(expected, signature)
  end

  def self.verify_intercom(body:, signature:, secret:)
    expected = OpenSSL::HMAC.hexdigest("SHA256", secret, body)

    ActiveSupport::SecurityUtils.secure_compare(expected, signature)
  end

  def self.verify_whatsapp(body:, signature:, secret:)
    expected = "sha256=" + OpenSSL::HMAC.hexdigest("SHA256", secret, body)

    ActiveSupport::SecurityUtils.secure_compare(expected, signature)
  end
end
