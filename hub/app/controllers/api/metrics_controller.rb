module Api
  class MetricsController < ApplicationController
    def summary
      render json: {
        total: Ticket.count,
        by_channel: Ticket.group(:original_channel).count,
        by_type: Ticket.group(:ticket_type).count,
        by_status: Ticket.group(:status).count,
        top_reporters: top_reporters
      }
    end

    private

    def top_reporters
      Reporter.joins(:tickets)
        .group("reporters.id", "reporters.name")
        .order("count(tickets.id) DESC")
        .limit(10)
        .pluck("reporters.name", Arel.sql("count(tickets.id)"))
        .map { |name, count| { name: name, ticket_count: count } }
    end
  end
end
