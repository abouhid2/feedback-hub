class NotionPollJob < ApplicationJob
  queue_as :default

  retry_on NotionPollService::RateLimitError, wait: :polynomially_longer, attempts: 3

  def perform
    NotionPollService.poll
  end
end
