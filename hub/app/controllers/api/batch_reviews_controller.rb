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
