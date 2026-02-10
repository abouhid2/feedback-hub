module Api
  class NotificationsController < ApplicationController
    def index
      notifications = Notification.all
      notifications = notifications.where(status: params[:status]) if params[:status].present?
      notifications = notifications.where(channel: params[:channel]) if params[:channel].present?
      notifications = notifications.where(ticket_id: params[:ticket_id]) if params[:ticket_id].present?
      notifications = notifications.order(created_at: :desc)

      render json: notifications.map { |n| serialize(n) }
    end

    def show
      notification = Notification.find(params[:id])
      render json: serialize(notification)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Notification not found" }, status: :not_found
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
        retry_count: n.retry_count,
        last_error: n.last_error,
        delivered_at: n.delivered_at,
        created_at: n.created_at
      }
    end
  end
end
