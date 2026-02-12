class PiiScrubberService
  EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
  PHONE_REGEX = /\+\d{1,3}[-.\s]?\d(?:[-.\s]?\d){6,12}(?!\d)|(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
  PASSWORD_REGEX = /(?:password|passwd|pwd|pass)\s*[:=]\s*(?:"[^"]*"|'[^']*'|\S+)/i
  SSN_REGEX = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/

  PATTERNS = {
    email: { regex: EMAIL_REGEX, replacement: "[EMAIL]" },
    phone: { regex: PHONE_REGEX, replacement: "[PHONE]" },
    password: { regex: PASSWORD_REGEX, replacement: "[PASSWORD]" },
    ssn: { regex: SSN_REGEX, replacement: "[SSN]" }
  }.freeze

  def self.scrub(text)
    new(text).scrub
  end

  def initialize(text)
    @text = text.dup
    @redactions = []
  end

  def scrub
    PATTERNS.each do |type, config|
      @text.gsub!(config[:regex]) do |match|
        @redactions << { type: type, original: match }
        config[:replacement]
      end
    end

    { scrubbed: @text, redactions: @redactions }
  end
end
