class ChangelogGeneratorJob < ApplicationJob
  queue_as :default

  retry_on ChangelogGeneratorService::AiApiError, wait: 30.seconds, attempts: 3

  def perform(ticket_id)
    ticket = Ticket.find_by(id: ticket_id)
    return unless ticket

    ChangelogGeneratorService.call(ticket)
  end
end
