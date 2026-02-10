class NotificationDispatchJob < ApplicationJob
  queue_as :default

  def perform(changelog_entry_id)
    entry = ChangelogEntry.find_by(id: changelog_entry_id)
    return unless entry

    NotificationDispatchService.call(entry)
  end
end
