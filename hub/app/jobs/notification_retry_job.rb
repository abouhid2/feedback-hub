class NotificationRetryJob < ApplicationJob
  queue_as :default

  def perform(notification_id)
    notification = Notification.find_by(id: notification_id)
    return unless notification

    NotificationDispatchService.retry_notification(notification)
  end
end
