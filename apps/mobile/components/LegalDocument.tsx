import { Link } from "expo-router";
import * as Linking from "expo-linking";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type LegalDocumentKey = "terms" | "privacy" | "about";

type LegalSection = { title: string; paragraphs: string[] };

const documents: Record<LegalDocumentKey, { title: string; intro: string; sections: LegalSection[] }> = {
  terms: {
    title: "Términos y condiciones",
    intro: "Estas condiciones explican cómo funciona LaburApp y qué responsabilidades asumís al usarla. Al crear una cuenta o continuar usando la plataforma, aceptás estas reglas y la Política de privacidad.",
    sections: [
      { title: "1. La plataforma", paragraphs: ["LaburApp, marca de ALSEMA, ofrece herramientas digitales para que personas usuarias encuentren profesionales independientes, publiquen perfiles, intercambien solicitudes y presupuestos, coordinen trabajos y compartan reseñas. LaburApp facilita el contacto: no realiza por sí misma los trabajos ofrecidos por los profesionales ni reemplaza el acuerdo que cliente y profesional deben alcanzar.", "La plataforma no garantiza la disponibilidad, identidad, habilitación, calidad, resultado, precio ni cumplimiento de cada profesional o cliente. Las verificaciones o insignias que se muestren tienen únicamente el alcance indicado en el perfil y no sustituyen las comprobaciones que correspondan al usuario."] },
      { title: "2. Cuenta y uso responsable", paragraphs: ["Debés brindar información veraz, mantener actualizados tus datos y proteger tus credenciales. Cada cuenta es personal. No uses la plataforma para suplantar identidades, acosar, discriminar, engañar, enviar spam, vulnerar derechos de terceros ni publicar contenido ilegal.", "La cuenta puede utilizarse para contratar y, si completás los requisitos del producto, para ofrecer servicios. Sos responsable de las actividades realizadas desde tu cuenta y de avisar a soporte si detectás un acceso no autorizado."] },
      { title: "3. Solicitudes, presupuestos y trabajos", paragraphs: ["Las solicitudes, conversaciones y presupuestos permiten organizar la contratación. Antes de aceptar, cliente y profesional deben revisar alcance, materiales, precio, tiempos, forma de pago, garantías y cualquier condición relevante. El presupuesto aceptado refleja el acuerdo entre esas partes.", "El profesional es responsable de contar con las habilitaciones, matrículas, seguros y autorizaciones exigibles para el servicio que ofrece, y de cumplir las normas aplicables. El cliente debe describir el trabajo con claridad y facilitar condiciones seguras de acceso."] },
      { title: "4. Suscripciones y comprobantes", paragraphs: ["Las suscripciones Premium de LaburApp se abonan por transferencia bancaria. La carga de un comprobante inicia una revisión humana; no implica aprobación automática ni acredita por sí sola el pago. La activación se realiza una vez verificada la transferencia y puede demorar hasta 72 horas.", "El plan y su precio son los que se informan en la app al momento de solicitarlo. No ingreses claves bancarias, códigos de seguridad ni credenciales en un comprobante. Para consultas sobre una solicitud, escribí a soporte@laburapp.work."] },
      { title: "5. Reseñas y contenido", paragraphs: ["Las reseñas deben referirse a una experiencia real y expresarse de buena fe. No publiques datos personales, imágenes ni material de terceros sin contar con autorización. LaburApp puede moderar, ocultar o retirar contenido que infrinja estas condiciones o la ley, sin perjuicio de los mecanismos de revisión disponibles en la app.", "Conservás tus derechos sobre el contenido que subís y autorizás a LaburApp a alojarlo y mostrarlo dentro de las funciones que elegís usar. Podés solicitar su retiro o la eliminación de tu cuenta, sujeto a los registros que deban conservarse por obligaciones legales o para resolver reclamos."] },
      { title: "6. Disponibilidad y medidas de seguridad", paragraphs: ["Trabajamos para mantener la plataforma disponible y segura, pero pueden ocurrir interrupciones, mantenimiento o errores. Podemos limitar temporalmente funciones o suspender cuentas cuando sea necesario para investigar un uso abusivo, proteger a las personas o cumplir una obligación legal. Procuraremos informar las medidas relevantes por los canales disponibles.", "Nada de estos términos limita derechos irrenunciables de consumidores ni excluye responsabilidades que la legislación argentina no permita excluir."] },
      { title: "7. Cambios y contacto", paragraphs: ["Podemos actualizar estas condiciones para reflejar cambios legales o funcionales. Publicaremos la versión vigente en esta página e indicaremos su fecha de actualización. Si el cambio requiere consentimiento adicional, lo solicitaremos antes de aplicarlo.", "Consultas sobre la plataforma: soporte@laburapp.work. Los reclamos de consumo conservan los canales y derechos previstos por la Ley 24.240 y demás normas aplicables."] },
    ],
  },
  privacy: {
    title: "Política de privacidad",
    intro: "En LaburApp usamos los datos necesarios para operar la plataforma, coordinar trabajos y proteger las cuentas. Esta política describe qué información tratamos, para qué y cómo podés ejercer tus derechos conforme a la Ley 25.326 de Protección de los Datos Personales.",
    sections: [
      { title: "1. Responsable y contacto", paragraphs: ["LaburApp es una marca de ALSEMA. Para consultas sobre privacidad o para ejercer derechos sobre tus datos, escribí a soporte@laburapp.work e indicá el correo de tu cuenta y el pedido que querés realizar. No envíes contraseñas, códigos de acceso ni datos bancarios secretos."] },
      { title: "2. Datos que podemos tratar", paragraphs: ["Datos de cuenta: correo electrónico, nombre, rol e identificador de cuenta; la contraseña es administrada por el proveedor de autenticación y no se muestra en la app. Datos de perfil: ciudad, foto, oficio, descripción, zonas de atención, disponibilidad, servicios, tarifas y, cuando corresponda, información de matrícula o certificación.", "Datos de uso del servicio: solicitudes, presupuestos, mensajes, estados del trabajo, reseñas, reportes y datos necesarios para confirmar su finalización. También podemos tratar imágenes que elijas cargar, como fotos de perfil, trabajos, solicitudes, comprobantes de transferencia y documentación profesional.", "Datos técnicos mínimos necesarios para que la app funcione, proteger las cuentas y diagnosticar errores. La app no incorpora SDK de publicidad ni seguimiento analítico en esta versión."] },
      { title: "3. Para qué los usamos", paragraphs: ["Usamos la información para crear y proteger cuentas; mostrar los perfiles que decidís publicar; conectar solicitudes con profesionales; facilitar presupuestos, mensajes, confirmaciones y reseñas; verificar manualmente comprobantes de suscripción; enviar avisos operativos; atender consultas y reclamos; prevenir abusos; cumplir obligaciones legales y defender derechos.", "Los datos de perfil público se muestran en la medida necesaria para las funciones que elegís publicar. Los mensajes, solicitudes, comprobantes y documentos privados se limitan a las personas autorizadas por la función y a quienes administran la plataforma cuando resulta necesario."] },
      { title: "4. Proveedores y comunicación de datos", paragraphs: ["La operación puede requerir proveedores tecnológicos que alojan la app, la autenticación, la base de datos, los archivos y los correos transaccionales. Actualmente usamos servicios como Supabase, Vercel y Resend. Ciertos archivos o registros operativos pueden copiarse a Google Drive o Google Sheets cuando esos flujos se encuentren habilitados.", "Estos proveedores tratan información para prestar sus servicios y pueden procesarla en infraestructura ubicada fuera de Argentina. No vendemos datos personales ni compartimos listas para publicidad de terceros. Podemos comunicar datos cuando una obligación legal, una orden válida o la protección de derechos así lo requiera."] },
      { title: "5. Conservación y eliminación", paragraphs: ["Conservamos la información mientras sea necesaria para prestar el servicio, mantener la seguridad, gestionar reclamos y cumplir obligaciones legales. Los comprobantes, mensajes, solicitudes y reseñas pueden conservarse por el tiempo necesario para resolver cuestiones operativas o contractuales; los registros financieros mínimos pueden mantenerse aun después de eliminar una cuenta cuando corresponda.", "La documentación profesional original tiene un plazo operativo de eliminación de hasta 5 días y el texto de lectura automática hasta 48 horas, sujeto a que los procesos automáticos de limpieza estén habilitados y se ejecuten correctamente. Podés iniciar la eliminación de tu cuenta desde Perfil. La eliminación no alcanza datos que debamos conservar legalmente o que deban mantenerse de forma anonimizada para seguridad y rendición de cuentas."] },
      { title: "6. Tus derechos", paragraphs: ["Podés solicitar acceso, actualización, rectificación o supresión de tus datos escribiendo a soporte@laburapp.work. La Ley 25.326 reconoce el derecho de acceso gratuito con la periodicidad prevista por la norma; el responsable debe responder dentro de 10 días corridos. Para rectificación, actualización o supresión, el plazo legal previsto es de 5 días hábiles desde la recepción del reclamo.", "Si considerás que tu pedido no fue atendido, podés presentar una denuncia ante la Agencia de Acceso a la Información Pública (AAIP), autoridad de control de la Ley 25.326."] },
      { title: "7. Seguridad y actualizaciones", paragraphs: ["Aplicamos medidas técnicas y organizativas razonables para proteger la información. Ningún sistema conectado a Internet puede garantizar seguridad absoluta; mantené tu contraseña bajo resguardo y avisá a soporte si advertís un problema.", "Podemos actualizar esta política para reflejar cambios en la app, proveedores o normativa. La versión vigente y su fecha estarán publicadas en esta página."] },
    ],
  },
  about: {
    title: "Nosotros",
    intro: "LaburApp conecta a personas que necesitan resolver un trabajo con profesionales locales que saben hacerlo.",
    sections: [
      { title: "Servicios locales, acuerdos claros", paragraphs: ["Nacimos para hacer más simple encontrar oficios y servicios cerca, comparar perfiles y trabajos realizados, pedir presupuestos y mantener la coordinación en un mismo lugar.", "LaburApp es una marca de ALSEMA. La plataforma facilita el encuentro y la comunicación; cada cliente y profesional acuerda directamente el alcance, el precio y las condiciones del trabajo."] },
      { title: "Una comunidad basada en confianza", paragraphs: ["Promovemos perfiles claros, reseñas vinculadas a trabajos y herramientas de seguridad. Las verificaciones visibles indican su alcance: siempre recomendamos confirmar habilitaciones y condiciones directamente con el profesional.", "¿Necesitás ayuda o querés hacernos una consulta? Escribinos a soporte@laburapp.work."] },
    ],
  },
};

export function LegalDocument({ document }: { document: LegalDocumentKey }) {
  const content = documents[document];

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brand}>LaburApp</Text>
        <Link href="/" style={styles.backLink}>Volver a LaburApp</Link>
      </View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{document === "about" ? "QUIÉNES SOMOS" : "INFORMACIÓN LEGAL"}</Text>
        <Text accessibilityRole="header" style={styles.title}>{content.title}</Text>
        <Text style={styles.intro}>{content.intro}</Text>
        <Text style={styles.updated}>Última actualización: 6 de octubre de 2026</Text>
      </View>
      {content.sections.map((section, index) => (
        <View key={section.title} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((paragraph, paragraphIndex) => (
            <Text key={`${section.title}-${paragraphIndex}`} style={styles.paragraph}>{paragraph}</Text>
          ))}
          {document === "privacy" && index === 5 && (
            <View style={styles.references}>
              <Text style={styles.referenceLabel}>Normativa y autoridad</Text>
              <Text accessibilityRole="link" onPress={() => void Linking.openURL("https://www.argentina.gob.ar/normativa/nacional/64790/actualizacion")} style={styles.referenceLink}>Ley 25.326 de Protección de los Datos Personales ↗</Text>
              <Text accessibilityRole="link" onPress={() => void Linking.openURL("https://www.argentina.gob.ar/aaip/datospersonales/derechos")} style={styles.referenceLink}>Derechos de las personas titulares · AAIP ↗</Text>
            </View>
          )}
          {document === "terms" && index === 5 && (
            <View style={styles.references}>
              <Text style={styles.referenceLabel}>Normativa de consumo</Text>
              <Text accessibilityRole="link" onPress={() => void Linking.openURL("https://www.argentina.gob.ar/normativa/nacional/638/actualizacion")} style={styles.referenceLink}>Ley 24.240 de Defensa del Consumidor ↗</Text>
            </View>
          )}
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerText}>LaburApp · Servicios locales, acuerdos claros.</Text>
        <Text style={styles.footerText}>Consultas: soporte@laburapp.work</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#07121D" },
  content: { width: "100%", maxWidth: 920, alignSelf: "center", paddingHorizontal: 22, paddingTop: 20, paddingBottom: 64 },
  header: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#29465B", marginBottom: 42 },
  brand: { color: "#F4FAFD", fontSize: 21, fontWeight: "900" },
  backLink: { color: "#49B2F5", fontSize: 14, fontWeight: "800" },
  hero: { padding: 26, borderRadius: 22, backgroundColor: "#0D3C73", marginBottom: 18 },
  eyebrow: { color: "#7BD5FF", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: "#F4FAFD", fontSize: 34, fontWeight: "900", lineHeight: 40, marginTop: 9 },
  intro: { color: "#E2F1FC", fontSize: 17, lineHeight: 27, marginTop: 12 },
  updated: { color: "#B9D7EC", fontSize: 12, marginTop: 18 },
  section: { backgroundColor: "#10202F", borderColor: "#29465B", borderWidth: 1, borderRadius: 17, padding: 22, marginBottom: 13 },
  sectionTitle: { color: "#F4FAFD", fontSize: 18, fontWeight: "900", marginBottom: 9 },
  paragraph: { color: "#C0D0DD", fontSize: 15, lineHeight: 24, marginTop: 8 },
  references: { borderTopWidth: 1, borderTopColor: "#29465B", marginTop: 18, paddingTop: 14, gap: 9 },
  referenceLabel: { color: "#F4FAFD", fontWeight: "800", fontSize: 13 },
  referenceLink: { color: "#49B2F5", fontSize: 14, lineHeight: 21, textDecorationLine: "underline" },
  footer: { paddingVertical: 22, gap: 6, alignItems: "center" },
  footerText: { color: "#92A9B9", textAlign: "center", fontSize: 12 },
});
