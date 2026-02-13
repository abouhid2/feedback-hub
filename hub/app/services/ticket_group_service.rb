class TicketGroupService
  class InvalidGroup < StandardError; end
  class AlreadyGrouped < StandardError; end
  class AlreadyResolved < StandardError; end

  def self.create_group(name:, ticket_ids:, primary_ticket_id:)
    raise InvalidGroup, "A group requires at least 2 tickets" if ticket_ids.size < 2
    raise InvalidGroup, "The primary ticket must be in the group" unless ticket_ids.include?(primary_ticket_id)

    tickets = Ticket.where(id: ticket_ids)
    already_grouped = tickets.where.not(ticket_group_id: nil)
    if already_grouped.any?
      raise AlreadyGrouped, "Ticket(s) #{already_grouped.pluck(:id).join(', ')} already belong to a group"
    end

    group = TicketGroup.create!(
      name: name,
      status: "open",
      primary_ticket_id: primary_ticket_id
    )

    tickets.update_all(ticket_group_id: group.id)

    tickets.each do |ticket|
      ticket.ticket_events.create!(
        event_type: "ticket_grouped",
        actor_type: "user",
        actor_id: "ticket_group_service",
        data: { group_id: group.id, group_name: name }
      )
    end

    group
  end

  def self.add_tickets(group, ticket_ids)
    tickets = Ticket.where(id: ticket_ids)
    already_grouped = tickets.where.not(ticket_group_id: nil)
    if already_grouped.any?
      raise AlreadyGrouped, "Ticket(s) #{already_grouped.pluck(:id).join(', ')} already belong to a group"
    end

    tickets.update_all(ticket_group_id: group.id)

    tickets.each do |ticket|
      ticket.ticket_events.create!(
        event_type: "ticket_grouped",
        actor_type: "user",
        actor_id: "ticket_group_service",
        data: { group_id: group.id, group_name: group.name }
      )
    end

    group
  end

  def self.remove_ticket(group, ticket_id)
    ticket = Ticket.find(ticket_id)
    group_name = group.name
    group_id = group.id
    ticket.update!(ticket_group_id: nil)

    ticket.ticket_events.create!(
      event_type: "ticket_ungrouped",
      actor_type: "user",
      actor_id: "ticket_group_service",
      data: { group_id: group_id, group_name: group_name }
    )

    remaining = group.tickets.reload
    if remaining.size < 2
      remaining.each do |t|
        t.ticket_events.create!(
          event_type: "ticket_ungrouped",
          actor_type: "system",
          actor_id: "ticket_group_service",
          data: { group_id: group_id, group_name: group_name, reason: "group_dissolved" }
        )
      end
      remaining.update_all(ticket_group_id: nil)
      group.destroy
      return :dissolved
    end

    if group.primary_ticket_id == ticket_id
      group.update!(primary_ticket: remaining.first)
    end

    group
  end

  def self.resolve_group(group:, channel:, resolution_note: nil, content: nil)
    raise AlreadyResolved, "Group is already resolved" if group.status == "resolved"

    group.tickets.each do |ticket|
      ticket.update!(status: "resolved") unless ticket.status == "resolved"
    end

    group.update!(
      status: "resolved",
      resolved_via_channel: channel,
      resolved_at: Time.current,
      resolution_note: resolution_note
    )

    # Persist group content as a changelog entry on the primary ticket
    primary = group.primary_ticket
    if primary && content.present?
      entry = primary.changelog_entries.create!(
        content: content,
        status: "approved",
        ai_model: "group",
        ai_prompt_tokens: 0,
        ai_completion_tokens: 0,
        approved_by: "group_resolution",
        approved_at: Time.current
      )

      primary.ticket_events.create!(
        event_type: "changelog_approved",
        actor_type: "system",
        actor_id: "ticket_group_service",
        data: { changelog_entry_id: entry.id, group_id: group.id }
      )
    end

    # Use provided content, or fall back to aggregated changelog entries
    notification_content = content.presence
    unless notification_content
      entries = ChangelogEntry.where(ticket_id: group.tickets.pluck(:id), status: "approved")
      notification_content = entries.map(&:content).join("\n\n---\n\n")
    end

    # Send one notification on the primary ticket
    if primary && notification_content.present?
      identity = primary.reporter&.reporter_identities&.find_by(platform: channel)
      identity ||= primary.reporter&.reporter_identities&.find_by(platform: primary.original_channel)
      recipient = identity&.platform_user_id || "unknown"

      # Link to the primary ticket's approved entry
      primary_entry = primary.changelog_entries.find_by(status: "approved")

      notification = primary.notifications.create!(
        changelog_entry: primary_entry,
        channel: channel,
        recipient: recipient,
        status: "pending",
        content: notification_content
      )

      NotificationDispatchService.retry_notification(notification)
    end

    # Create group_resolved events
    group.tickets.each do |ticket|
      ticket.ticket_events.create!(
        event_type: "group_resolved",
        actor_type: "user",
        actor_id: "ticket_group_service",
        data: { group_id: group.id, channel: channel, resolution_note: resolution_note }
      )
    end

    group
  end
end
