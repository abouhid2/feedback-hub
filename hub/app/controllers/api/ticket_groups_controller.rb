module Api
  class TicketGroupsController < ApplicationController
    def index
      groups = TicketGroup.includes(tickets: :reporter).recent
      groups = groups.where(status: params[:status]) if params[:status].present?

      render json: groups.map { |g| serialize_group(g) }
    end

    def show
      group = TicketGroup.includes(tickets: [:reporter, :ticket_sources]).find(params[:id])
      render json: serialize_group_detail(group)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    end

    def create
      group = TicketGroupService.create_group(
        name: params[:name],
        ticket_ids: params[:ticket_ids],
        primary_ticket_id: params[:primary_ticket_id]
      )
      render json: serialize_group_detail(group), status: :created
    rescue TicketGroupService::InvalidGroup, TicketGroupService::AlreadyGrouped => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def add_tickets
      group = TicketGroup.find(params[:id])
      TicketGroupService.add_tickets(group, params[:ticket_ids])
      render json: serialize_group_detail(group.reload)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    rescue TicketGroupService::AlreadyGrouped => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def remove_ticket
      group = TicketGroup.find(params[:id])
      result = TicketGroupService.remove_ticket(group, params[:ticket_id])
      if result == :dissolved
        render json: { dissolved: true }
      else
        render json: serialize_group_detail(result.reload)
      end
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    end

    def resolve
      group = TicketGroup.find(params[:id])
      TicketGroupService.resolve_group(
        group: group,
        channel: params[:channel],
        resolution_note: params[:resolution_note],
        content: params[:content]
      )
      render json: serialize_group_detail(group.reload)
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    rescue TicketGroupService::AlreadyResolved => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def generate_content
      group = TicketGroup.includes(tickets: :reporter).find(params[:id])
      content = ChangelogGeneratorService.generate_for_group(
        group,
        custom_prompt: params[:prompt],
        custom_system_prompt: params[:system_prompt],
        resolution_notes: params[:resolution_notes],
        model: params[:model]
      )
      render json: { content: content }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    rescue ChangelogGeneratorService::AiApiError => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def preview_content
      group = TicketGroup.includes(tickets: :reporter).find(params[:id])
      ticket_text = ChangelogGeneratorService.build_group_prompt(group.tickets)
      result = PiiScrubberService.scrub(ticket_text)

      render json: {
        original: ticket_text,
        scrubbed: result[:scrubbed],
        redactions: result[:redactions].map { |r| { type: r[:type], original: r[:original] } },
        system_prompt: ChangelogPrompts::DEFAULT_GROUP_SYSTEM_PROMPT
      }
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket group not found" }, status: :not_found
    end

    private

    def serialize_group(group)
      {
        id: group.id,
        name: group.name,
        status: group.status,
        primary_ticket_id: group.primary_ticket_id,
        resolved_via_channel: group.resolved_via_channel,
        resolved_at: group.resolved_at,
        resolution_note: group.resolution_note,
        ticket_count: group.tickets.size,
        created_at: group.created_at,
        updated_at: group.updated_at
      }
    end

    def serialize_group_detail(group)
      serialize_group(group).merge(
        tickets: group.tickets.map { |t| serialize_ticket(t) }
      )
    end

    def serialize_ticket(ticket)
      {
        id: ticket.id,
        title: ticket.title,
        ticket_type: ticket.ticket_type,
        priority: ticket.priority,
        status: ticket.status,
        original_channel: ticket.original_channel,
        reporter: ticket.reporter ? { name: ticket.reporter.name, email: ticket.reporter.email } : nil,
        created_at: ticket.created_at
      }
    end
  end
end
