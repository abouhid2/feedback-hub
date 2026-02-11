namespace :notion do
  desc "Start the Notion polling scheduler (self-reschedules every 2 minutes)"
  task start_polling: :environment do
    NotionPollSchedulerJob.perform_later
    puts "NotionPollSchedulerJob enqueued — polling will begin and self-reschedule every 2 minutes."
  end
end
