class AiTriageJob < ApplicationJob
  queue_as :default

  discard_on ActiveRecord::RecordNotFound
  retry_on AiTriageService::AiApiError, wait: 30.seconds, attempts: 3
  retry_on AiEmbeddingService::AiApiError, wait: 30.seconds, attempts: 3

  def perform(ticket_id)
    ticket = Ticket.find(ticket_id)
    AiTriageService.call(ticket)
    AiEmbeddingService.call(ticket)
    AutoGroupingService.call(ticket)
  end
end
