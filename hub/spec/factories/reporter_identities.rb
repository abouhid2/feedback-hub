FactoryBot.define do
  factory :reporter_identity do
    reporter
    platform { %w[slack intercom whatsapp].sample }
    platform_user_id { SecureRandom.hex(8) }
    display_name { Faker::Name.name }
    metadata { {} }
  end
end
