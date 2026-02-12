class NotionSyncJob < ApplicationJob
  queue_as :default

  retry_on NotionSyncService::RateLimitError, wait: :polynomially_longer, attempts: 3
  retry_on NotionSyncService::ApiError, wait: 30.seconds, attempts: 3

  def perform(ticket_id)
    ticket = Ticket.find_by(id: ticket_id)
    return unless ticket

    NotionSyncService.push(ticket)
  end
end
