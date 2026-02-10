class ChangelogGeneratorJob < ApplicationJob
  queue_as :default

  def perform(ticket_id)
    ticket = Ticket.find_by(id: ticket_id)
    return unless ticket

    ChangelogGeneratorService.call(ticket)
  end
end
