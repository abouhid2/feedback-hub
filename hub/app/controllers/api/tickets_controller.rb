module Api
  class TicketsController < ApplicationController
    def index
      tickets = Ticket.includes(:reporter, :ticket_sources)
        .by_status(params[:status])
        .by_channel(params[:channel])
        .by_priority(params[:priority])
        .recent
        .limit(params[:limit] || 50)

      render json: tickets.map { |t| serialize_ticket(t) }
    end

    def show
      ticket = Ticket.includes(:reporter, :ticket_sources, :ticket_events)
        .find(params[:id])

      render json: serialize_ticket_detail(ticket)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket not found" }, status: :not_found
    end

    private

    def serialize_ticket(ticket)
      {
        id: ticket.id,
        title: ticket.title,
        ticket_type: ticket.ticket_type,
        priority: ticket.priority,
        status: ticket.status,
        original_channel: ticket.original_channel,
        reporter: ticket.reporter ? { name: ticket.reporter.name, email: ticket.reporter.email } : nil,
        tags: ticket.tags,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at
      }
    end

    def serialize_ticket_detail(ticket)
      serialize_ticket(ticket).merge(
        description: ticket.description,
        metadata: ticket.metadata,
        sources: ticket.ticket_sources.map { |s|
          { platform: s.platform, external_id: s.external_id, external_url: s.external_url }
        },
        events: ticket.ticket_events.order(created_at: :desc).map { |e|
          { event_type: e.event_type, actor_type: e.actor_type, data: e.data, created_at: e.created_at }
        }
      )
    end
  end
end
