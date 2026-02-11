class FailingTestJob < ApplicationJob
  queue_as :default

  # Skip Sidekiq retries — fail once and go straight to dead set
  sidekiq_options retry: 0

  def perform(ticket_id = nil)
    raise RuntimeError, "Deliberate failure to test dead letter queue (ticket: #{ticket_id || 'none'})"
  end
end
