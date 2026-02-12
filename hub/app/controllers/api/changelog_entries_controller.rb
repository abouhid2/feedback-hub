module Api
  class ChangelogEntriesController < ApplicationController
    def index
      entries = ChangelogEntry.includes(ticket: [:reporter, { ticket_group: { tickets: :reporter } }])
      entries = entries.where(status: params[:status]) if params[:status].present?
      entries = entries.order(created_at: :desc)

      render json: entries.map { |e| serialize(e) }
    end

    private

    def serialize(entry)
      ticket = entry.ticket
      group = ticket&.ticket_group

      {
        id: entry.id,
        ticket_id: entry.ticket_id,
        content: entry.content,
        status: entry.status,
        ai_model: entry.ai_model,
        ai_prompt_tokens: entry.ai_prompt_tokens,
        ai_completion_tokens: entry.ai_completion_tokens,
        approved_by: entry.approved_by,
        approved_at: entry.approved_at,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        ticket: ticket ? {
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          reporter: ticket.reporter ? { name: ticket.reporter.name } : nil
        } : nil,
        related_tickets: group ? group.tickets.reject { |t| t.id == ticket.id }.map { |t|
          {
            id: t.id,
            title: t.title,
            status: t.status,
            reporter: t.reporter ? { name: t.reporter.name } : nil
          }
        } : []
      }
    end
  end
end
