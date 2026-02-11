module Api
  class ChangelogsController < ApplicationController
    before_action :find_ticket

    def show
      entry = @ticket.changelog_entries.order(created_at: :desc).first
      return render json: { error: "No changelog entry found" }, status: :not_found unless entry

      render json: serialize_entry(entry)
    end

    def create
      entry = ChangelogGeneratorService.call(@ticket)
      render json: serialize_entry(entry), status: :created
    rescue ChangelogGeneratorService::InvalidTicketStatus => e
      render json: { error: e.message }, status: :unprocessable_entity
    rescue ChangelogGeneratorService::AiApiError => e
      Rails.logger.error("Changelog AI error: #{e.message}")
      message = if e.message.include?("rate_limit") || e.message.include?("429") || e.message.include?("cooldown")
                  "OpenAI rate limit reached. Please wait a minute and try again."
                else
                  "AI service temporarily unavailable. Please try again in a few seconds."
                end
      render json: { error: message }, status: :service_unavailable
    end

    def approve
      entry = @ticket.changelog_entries.order(created_at: :desc).first
      return render json: { error: "No changelog entry found" }, status: :not_found unless entry

      result = ChangelogReviewService.approve(entry, approved_by: params[:approved_by])
      render json: serialize_entry(result)
    rescue ChangelogReviewService::InvalidTransition => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def reject
      entry = @ticket.changelog_entries.order(created_at: :desc).first
      return render json: { error: "No changelog entry found" }, status: :not_found unless entry

      result = ChangelogReviewService.reject(entry, rejected_by: params[:rejected_by], reason: params[:reason])
      render json: serialize_entry(result)
    rescue ChangelogReviewService::InvalidTransition => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    def update_draft
      entry = @ticket.changelog_entries.order(created_at: :desc).first
      return render json: { error: "No changelog entry found" }, status: :not_found unless entry

      result = ChangelogReviewService.update_draft(entry, new_content: params[:content])
      render json: serialize_entry(result)
    rescue ChangelogReviewService::InvalidTransition => e
      render json: { error: e.message }, status: :unprocessable_entity
    end

    private

    def find_ticket
      @ticket = Ticket.find(params[:id])
    rescue ActiveRecord::RecordNotFound
      render json: { error: "Ticket not found" }, status: :not_found
    end

    def serialize_entry(entry)
      {
        id: entry.id,
        ticket_id: entry.ticket_id,
        content: entry.content,
        status: entry.status,
        ai_model: entry.ai_model,
        approved_by: entry.approved_by,
        approved_at: entry.approved_at,
        created_at: entry.created_at,
        updated_at: entry.updated_at
      }
    end
  end
end
