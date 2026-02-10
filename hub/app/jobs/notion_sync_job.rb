class NotionSyncJob < ApplicationJob
  queue_as :default

  def perform(ticket_id)
    ticket = Ticket.find_by(id: ticket_id)
    return unless ticket

    NotionSyncService.push(ticket)
  end
end
