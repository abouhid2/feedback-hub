class NotionPollJob < ApplicationJob
  queue_as :default

  def perform
    NotionPollService.poll
  end
end
