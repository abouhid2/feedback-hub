class NotionPollSchedulerJob < ApplicationJob
  queue_as :default

  def perform
    NotionPollService.poll
  ensure
    self.class.set(wait: 2.minutes).perform_later
  end
end
