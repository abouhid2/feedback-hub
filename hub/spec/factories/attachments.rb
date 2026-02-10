FactoryBot.define do
  factory :attachment do
    ticket
    file_name { "screenshot.png" }
    file_type { "image/png" }
    file_size { 1024 }
    storage_url { "https://storage.example.com/#{SecureRandom.hex(8)}" }
    source_platform { "slack" }
  end
end
