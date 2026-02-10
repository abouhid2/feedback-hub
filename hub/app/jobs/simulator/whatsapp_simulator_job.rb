require "net/http"

module Simulator
  class WhatsappSimulatorJob < ApplicationJob
    queue_as :simulator

    WHATSAPP_MESSAGES = [
      "Hola, reporto error con candidato rechazado, me arrojo error",
      "Buenas, no puedo ingresar al sistema desde hace 2 horas",
      "Me aparece pantalla en blanco al abrir el perfil del candidato",
      "El link que me enviaron para la oferta no funciona",
      "Hola! Quiero saber cómo puedo cambiar mi contraseña",
      "Error al subir documento del candidato, dice que el archivo es muy grande",
      "No me llegan las notificaciones de nuevos candidatos",
      "El sistema se quedó cargando y no avanza en la etapa de evaluación",
      "Necesito ayuda para configurar los permisos de mi equipo",
      "Hola, el reporte que descargué está vacío pero tengo candidatos activos",
    ].freeze

    NAMES = [
      "Pablo Lavin", "María González", "Carlos Mendoza", "Sofía Reyes",
      "Diego Fernández", "Valentina Rojas", "Andrés Silva", "Camila Torres",
    ].freeze

    def perform
      name = NAMES.sample
      phone = "56#{rand(9_000_000_0..9_999_999_9)}"
      message_id = "wamid.#{SecureRandom.hex(16)}"
      message = WHATSAPP_MESSAGES.sample

      payload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "BIZ_#{SecureRandom.hex(6).upcase}",
          changes: [{
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: "PHONE_#{SecureRandom.hex(4).upcase}" },
              contacts: [{ profile: { name: name }, wa_id: phone }],
              messages: [{
                id: message_id,
                from: phone,
                timestamp: Time.now.to_i.to_s,
                type: "text",
                text: { body: message }
              }]
            },
            field: "messages"
          }]
        }]
      }

      post_webhook("/webhooks/whatsapp", payload)
    end

    private

    def post_webhook(path, payload)
      uri = URI("http://localhost:3000#{path}")
      http = Net::HTTP.new(uri.host, uri.port)
      request = Net::HTTP::Post.new(uri.path, "Content-Type" => "application/json")
      request.body = payload.to_json
      response = http.request(request)
      Rails.logger.info("[WhatsappSimulator] POST #{path} => #{response.code}")
    end
  end
end
