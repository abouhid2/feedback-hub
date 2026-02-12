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
      notification = Notification.includes(
        ticket: [:reporter, { ticket_group: { tickets: :reporter } }],
        changelog_entry: []
      ).find(params[:id])
      render json: serialize_detail(notification)
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

    def serialize_detail(n)
      ticket = n.ticket
      entry = n.changelog_entry
      group = ticket&.ticket_group

      serialize(n).merge(
        ticket: ticket ? {
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          ticket_type: ticket.ticket_type,
          priority: ticket.priority,
          original_channel: ticket.original_channel,
          reporter: ticket.reporter ? { name: ticket.reporter.name, email: ticket.reporter.email } : nil
        } : nil,
        changelog_entry: entry ? {
          id: entry.id,
          content: entry.content,
          status: entry.status,
          ai_model: entry.ai_model,
          approved_by: entry.approved_by,
          approved_at: entry.approved_at
        } : nil,
        related_tickets: group ? group.tickets.reject { |t| t.id == ticket.id }.map { |t|
          {
            id: t.id,
            title: t.title,
            status: t.status,
            ticket_type: t.ticket_type,
            priority: t.priority,
            original_channel: t.original_channel,
            reporter: t.reporter ? { name: t.reporter.name, email: t.reporter.email } : nil
          }
        } : []
      )
    end
  end
end
