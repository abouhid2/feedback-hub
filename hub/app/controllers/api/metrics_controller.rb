module Api
  class MetricsController < ApplicationController
    def summary
      scope = filtered_scope

      render json: {
        total: scope.count,
        by_channel: scope.group(:original_channel).count,
        by_type: scope.group(:ticket_type).count,
        by_status: scope.group(:status).count,
        by_priority: scope.group(:priority).count,
        top_reporters: top_reporters(scope)
      }
    end

    private

    PERIOD_DURATIONS = {
      "24h" => 24.hours,
      "7d" => 7.days,
      "30d" => 30.days
    }.freeze

    def filtered_scope
      duration = PERIOD_DURATIONS[params[:period]]
      duration ? Ticket.where(created_at: duration.ago..) : Ticket.all
    end

    def top_reporters(scope)
      Reporter.joins(:tickets)
        .where(tickets: { id: scope.select(:id) })
        .group("reporters.id", "reporters.name")
        .order("count(tickets.id) DESC")
        .limit(10)
        .pluck("reporters.name", Arel.sql("count(tickets.id)"))
        .map { |name, count| { name: name, ticket_count: count } }
    end
  end
end
