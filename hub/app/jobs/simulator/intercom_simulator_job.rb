require "net/http"

module Simulator
  class IntercomSimulatorJob < ApplicationJob
    queue_as :simulator

    INTERCOM_MESSAGES = [
      "Buenos días, llevamos varios días sin poder usar el botón de descarga del CV",
      "Hola, el sistema nos muestra error al intentar mover candidatos entre etapas",
      "Necesitamos ayuda urgente, no podemos acceder al dashboard de métricas",
      "El filtro de búsqueda por skills no funciona correctamente",
      "Hola! Quería preguntar si es posible integrar con nuestro ATS actual",
      "Reporto que los emails de notificación llegan con retraso de horas",
      "No podemos exportar el reporte de candidatos a Excel",
      "El calendario de entrevistas no sincroniza con Google Calendar",
      "Sugerencia: sería genial poder agregar campos personalizados al perfil",
      "Error al intentar programar entrevista grupal con múltiples evaluadores",
    ].freeze

    COMPANIES = [
      "SP Berner", "TechCorp Chile", "Globant", "MercadoLibre",
      "Rappi", "Cornershop", "Falabella Tech", "Banco Estado",
    ].freeze

    PII_TEXT = AiConstants::PII_TEXT

    def perform(include_pii: false)
      name = include_pii ? "Maria Garcia" : Faker::Name.first_name
      company = COMPANIES.sample
      email = include_pii ? "maria.garcia@company.com" : "#{name.downcase}@#{company.downcase.gsub(' ', '-')}.com"
      message = include_pii ? PII_TEXT : INTERCOM_MESSAGES.sample

      payload = {
        type: "notification_event",
        topic: "conversation.created",
        data: {
          item: {
            type: "conversation",
            id: rand(20_000_000..29_999_999).to_s,
            created_at: Time.now.to_i,
            source: {
              type: "conversation",
              body: message,
              author: {
                type: "user",
                id: "user_#{SecureRandom.hex(6)}",
                name: name,
                email: email
              }
            },
            conversation_parts: { total_count: 0 }
          }
        }
      }

      post_webhook("/webhooks/intercom", payload)
    end

    private

    def post_webhook(path, payload)
      uri = URI("http://localhost:3000#{path}")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, "Content-Type" => "application/json")
      request.body = payload.to_json
      response = http.request(request)
      Rails.logger.info("[IntercomSimulator] POST #{path} => #{response.code}")
    end
  end
end
