class BatchReviewService
  BATCH_THRESHOLD = 5
  BATCH_WINDOW = 5.minutes

  def self.should_batch?(entries)
    return false if entries.size <= BATCH_THRESHOLD

    timestamps = entries.map(&:created_at)
    time_span = timestamps.max - timestamps.min
    time_span <= BATCH_WINDOW
  end

  def self.approve_all(notifications)
    notifications.each do |notification|
      notification.update!(status: "pending")
      NotificationDispatchService.retry_notification(notification)
    end
  end

  def self.approve_selected(notification_ids)
    notifications = Notification.where(id: notification_ids, status: "pending_batch_review")
    notifications.each do |notification|
      notification.update!(status: "pending")
      NotificationDispatchService.retry_notification(notification)
    end
  end

  def self.reject_all(notifications)
    notifications.each do |notification|
      notification.update!(status: "failed", last_error: "batch_rejected")
    end
  end
end
