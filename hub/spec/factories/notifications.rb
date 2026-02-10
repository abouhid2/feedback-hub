FactoryBot.define do
  factory :notification do
    ticket
    channel { "slack" }
    recipient { Faker::Internet.email }
    status { "pending" }
    content { Faker::Lorem.paragraph }

    trait :sent do
      status { "sent" }
      delivered_at { Time.current }
    end

    trait :failed do
      status { "failed" }
      last_error { "Connection timeout" }
      retry_count { 1 }
    end

    trait :pending_batch_review do
      status { "pending_batch_review" }
    end
  end
end
