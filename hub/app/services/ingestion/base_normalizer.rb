module Ingestion
  class BaseNormalizer
    attr_reader :payload

    def initialize(payload)
      @payload = payload.deep_symbolize_keys
    end

    def normalize
      raise NotImplementedError, "#{self.class}#normalize must be implemented"
    end

    private

    def find_or_create_reporter(name:, email: nil, company: nil, platform:, platform_user_id:, display_name: nil)
      reporter = if email.present?
        Reporter.find_or_initialize_by(email: email)
      else
        identity = ReporterIdentity.find_by(platform: platform, platform_user_id: platform_user_id)
        identity&.reporter || Reporter.new
      end

      reporter.assign_attributes(name: name, company: company)
      reporter.email = email if email.present?
      reporter.save!

      ReporterIdentity.find_or_create_by!(platform: platform, platform_user_id: platform_user_id) do |identity|
        identity.reporter = reporter
        identity.display_name = display_name || name
      end

      reporter
    end

    def create_ticket(attrs)
      ticket = Ticket.create!(attrs)

      ticket.ticket_events.create!(
        event_type: "created",
        actor_type: "system",
        data: { source: attrs[:original_channel] }
      )

      ticket
    end

    def infer_priority(text)
      text_lower = text.to_s.downcase
      return 0 if text_lower.match?(/urgent|critical|p0|blocker|producti[oó]n/)
      return 1 if text_lower.match?(/alta|high|p1|important/)
      return 2 if text_lower.match?(/media|medium|p2/)
      return 4 if text_lower.match?(/baja|low|p4|minor/)
      return 5 if text_lower.match?(/trivial|p5/)
      3 # default
    end

    def infer_ticket_type(text)
      text_lower = text.to_s.downcase
      return "incident" if text_lower.match?(/incident|outage|down|caida/)
      return "feature_request" if text_lower.match?(/feature|request|mejora|suggest/)
      return "question" if text_lower.match?(/\?|pregunta|question|how to|c[oó]mo/)
      "bug"
    end
  end
end
