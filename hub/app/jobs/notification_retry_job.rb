class NotificationRetryJob < ApplicationJob
  queue_as :default

  MAX_RETRIES = 5

  def perform(notification_id)
    notification = Notification.find_by(id: notification_id)
    return unless notification

    if notification.retry_count >= MAX_RETRIES
      notification.update!(status: "permanently_failed", last_error: "Max retries (#{MAX_RETRIES}) exceeded")
      notification.ticket&.ticket_events&.create!(
        event_type: "notification_failed",
        actor_type: "system",
        actor_id: "notification_retry",
        data: { notification_id: notification.id, error: "Max retries exceeded", retry_count: notification.retry_count }
      )
      return
    end

    NotificationDispatchService.retry_notification(notification)
  end
end
