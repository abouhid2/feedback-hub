require "rails_helper"

RSpec.describe TicketTypePatterns do
  describe ".infer" do
    context "incident detection" do
      %w[
        incident incidente outage down caída
      ].each do |keyword|
        it "classifies '#{keyword}' as incident" do
          expect(described_class.infer("Hay un #{keyword} en el sistema")).to eq("incident")
        end
      end

      it "detects 'fuera de servicio'" do
        expect(described_class.infer("El sistema está fuera de servicio")).to eq("incident")
      end

      it "detects 'sistema caido'" do
        expect(described_class.infer("El sistema caido desde hace 2 horas")).to eq("incident")
      end
    end

    context "feature_request detection" do
      it "detects 'sugerencia'" do
        expect(described_class.infer("Sugerencia: agregar campos personalizados")).to eq("feature_request")
      end

      it "detects 'sería genial'" do
        expect(described_class.infer("sería genial poder agregar campos personalizados al perfil")).to eq("feature_request")
      end

      it "detects 'mejora'" do
        expect(described_class.infer("Propongo una mejora al dashboard")).to eq("feature_request")
      end

      it "detects 'integrar con'" do
        expect(described_class.infer("Quería preguntar si es posible integrar con nuestro ATS actual")).to eq("feature_request")
      end

      it "detects 'agregar funcionalidad'" do
        expect(described_class.infer("Necesitamos agregar funcionalidad de reportes")).to eq("feature_request")
      end

      it "detects 'podría'" do
        expect(described_class.infer("Se podría añadir un filtro de búsqueda?")).to eq("feature_request")
      end
    end

    context "question detection" do
      it "detects '?'" do
        expect(described_class.infer("Cómo puedo cambiar mi contraseña?")).to eq("question")
      end

      it "detects 'cómo puedo'" do
        expect(described_class.infer("Hola, cómo puedo exportar datos")).to eq("question")
      end

      it "detects 'necesito ayuda'" do
        expect(described_class.infer("Necesito ayuda para configurar los permisos de mi equipo")).to eq("question")
      end

      it "detects 'quiero saber'" do
        expect(described_class.infer("Quiero saber si hay forma de cambiar los roles")).to eq("question")
      end
    end

    context "bug detection (default)" do
      it "defaults to bug for error reports" do
        expect(described_class.infer("Error al mover candidato desde etapa a descartado")).to eq("bug")
      end

      it "defaults to bug for generic issues" do
        expect(described_class.infer("Botón de guardar no responde en formulario")).to eq("bug")
      end

      it "defaults to bug for empty text" do
        expect(described_class.infer("")).to eq("bug")
      end

      it "defaults to bug for nil" do
        expect(described_class.infer(nil)).to eq("bug")
      end
    end

    context "priority — incident beats feature_request beats question" do
      it "classifies as incident even if it also looks like a question" do
        expect(described_class.infer("Hay un outage en producción?")).to eq("incident")
      end

      it "classifies as feature_request over question when both match" do
        expect(described_class.infer("Sería genial poder ver los reportes?")).to eq("feature_request")
      end
    end
  end
end
