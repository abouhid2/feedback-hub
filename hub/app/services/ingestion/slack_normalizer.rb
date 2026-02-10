module Ingestion
  class SlackNormalizer < BaseNormalizer
    def normalize
      slack_payload = payload[:payload] || {}
      external_id = slack_payload[:issue_id] || payload[:trigger_id] || SecureRandom.hex(8)

      reporter = find_or_create_reporter(
        name: payload[:user_name] || "Unknown Slack User",
        platform: "slack",
        platform_user_id: payload[:user_id] || "unknown",
        display_name: payload[:user_name]
      )

      text = slack_payload[:incident] || payload[:text] || ""
      priority_text = slack_payload[:priority] || text

      ticket = create_ticket(
        title: text.truncate(255),
        description: build_description(slack_payload),
        ticket_type: infer_ticket_type(text),
        priority: map_slack_priority(priority_text),
        status: "open",
        reporter: reporter,
        original_channel: "slack",
        tags: [slack_payload[:agency]].compact,
        metadata: { channel: payload[:channel_name], team: payload[:team_domain] }
      )

      ticket.ticket_sources.create!(
        platform: "slack",
        external_id: external_id,
        raw_payload: payload
      )

      ticket
    end

    private

    def build_description(slack_payload)
      parts = []
      parts << slack_payload[:incident] if slack_payload[:incident].present?
      parts << "Agency: #{slack_payload[:agency]}" if slack_payload[:agency].present?
      parts << "Job: #{slack_payload[:job_id]}" if slack_payload[:job_id].present?
      parts << "Details: #{slack_payload[:additional_details]}" if slack_payload[:additional_details].present?
      parts.join("\n\n")
    end

    def map_slack_priority(text)
      case text.to_s.downcase
      when /critica|critical|p0/ then 0
      when /alta|high|p1/ then 1
      when /media|medium|p2/ then 2
      when /baja|low|p4/ then 4
      else infer_priority(text)
      end
    end
  end
end
