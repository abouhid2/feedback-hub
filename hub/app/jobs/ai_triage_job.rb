class AiTriageJob < ApplicationJob
  queue_as :default

  discard_on ActiveRecord::RecordNotFound

  def perform(ticket_id)
    ticket = Ticket.find(ticket_id)
    AiTriageService.call(ticket)
  end
end
