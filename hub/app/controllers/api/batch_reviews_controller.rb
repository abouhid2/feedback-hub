module Api
  class BatchReviewsController < ApplicationController
    def pending
      notifications = Notification.where(status: "pending_batch_review").order(created_at: :desc)
      render json: notifications.map { |n| serialize(n) }
    end

    def approve_all
      notifications = Notification.where(id: params[:notification_ids], status: "pending_batch_review")
      BatchReviewService.approve_all(notifications)
      render json: { approved: notifications.size }
    end

    def approve_selected
      BatchReviewService.approve_selected(params[:notification_ids])
      render json: { approved: params[:notification_ids].size }
    end

    def reject_all
      notifications = Notification.where(id: params[:notification_ids], status: "pending_batch_review")
      BatchReviewService.reject_all(notifications)
      render json: { rejected: notifications.size }
    end

    def simulate
      count = (params[:count] || 6).to_i
      tickets = Ticket.where(status: "resolved").limit(count)
      tickets = Ticket.limit(count) if tickets.empty?

      created_ids = []
      tickets.each do |ticket|
        entry = ticket.changelog_entries.find_by(status: "approved")
        unless entry
          entry = ticket.changelog_entries.create!(
            content: "Auto-generated changelog for #{ticket.title}",
            status: "approved",
            ai_model: "simulated",
            ai_prompt_tokens: 0,
            ai_completion_tokens: 0,
            approved_by: "simulator",
            approved_at: Time.current
          )
        end

        notification = ticket.notifications.create!(
          changelog_entry: entry,
          channel: ticket.original_channel,
          recipient: "simulated_recipient",
          status: "pending_batch_review",
          content: entry.content
        )
        created_ids << notification.id
      end

      render json: { simulated: created_ids.size, notification_ids: created_ids }
    end

    private

    def serialize(n)
      {
        id: n.id,
        ticket_id: n.ticket_id,
        changelog_entry_id: n.changelog_entry_id,
        channel: n.channel,
        recipient: n.recipient,
        status: n.status,
        content: n.content,
        created_at: n.created_at
      }
    end
  end
end
