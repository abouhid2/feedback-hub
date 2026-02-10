class ChangelogReviewService
  class InvalidTransition < StandardError; end

  def self.approve(entry, approved_by:)
    validate_draft!(entry)

    entry.update!(
      status: "approved",
      approved_by: approved_by,
      approved_at: Time.current
    )

    entry.ticket.ticket_events.create!(
      event_type: "changelog_approved",
      actor_type: "user",
      actor_id: approved_by,
      data: { changelog_entry_id: entry.id }
    )

    NotificationDispatchJob.perform_later(entry.id)

    entry
  end

  def self.reject(entry, rejected_by:, reason:)
    validate_draft!(entry)

    entry.update!(status: "rejected")

    entry.ticket.ticket_events.create!(
      event_type: "changelog_rejected",
      actor_type: "user",
      actor_id: rejected_by,
      data: { changelog_entry_id: entry.id, rejected_by: rejected_by, reason: reason }
    )

    entry
  end

  def self.update_draft(entry, new_content:)
    validate_draft!(entry)

    entry.update!(content: new_content)
    entry
  end

  def self.validate_draft!(entry)
    raise InvalidTransition, "Entry must be in draft status (current: #{entry.status})" unless entry.status == "draft"
  end
  private_class_method :validate_draft!
end
