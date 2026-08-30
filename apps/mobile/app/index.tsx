import { useMemo, useState } from "react";
import { Image, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";

const providers = [
  { name: "Martín Gómez", trade: "Gasista", city: "Río Grande", rating: "4,9", jobs: 52, badge: "Matrícula verificada", skills: "Calefones · Pérdidas" },
  { name: "Laura Torres", trade: "Electricidad", city: "Ushuaia", rating: "4,8", jobs: 31, badge: "Identidad verificada", skills: "Tableros · Instalaciones" },
  { name: "Nicolás Vera", trade: "Plomería", city: "Tolhuin", rating: "Nuevo", jobs: 0, badge: "Correo verificado", skills: "Cañerías · Grifería" },
  { name: "Carla Ruiz", trade: "Limpieza", city: "Río Grande", rating: "5,0", jobs: 18, badge: "Recomendada", skills: "Hogares · Oficinas" },
  { name: "Ana Pereyra", trade: "Cuidadora de adultos mayores", city: "Río Grande", rating: "4,9", jobs: 44, badge: "Identidad verificada", skills: "Acompañamiento · Higiene · Comidas" },
  { name: "Diego Mansilla", trade: "Despachante de aduana", city: "Ushuaia", rating: "4,8", jobs: 27, badge: "Matrícula verificada", skills: "Importación · Exportación · SIM" },
  { name: "Ezequiel Quispe", trade: "Carga y descarga", city: "Río Grande", rating: "4,7", jobs: 63, badge: "Identidad verificada", skills: "Depósitos · Camiones · Bultos" },
  { name: "Tomás Roldán", trade: "Repartidor", city: "Ushuaia", rating: "4,9", jobs: 86, badge: "Recomendado", skills: "Paquetería · Cadetería · Envíos" },
  { name: "Kevin Almirón", trade: "Ayudante de obra", city: "Tolhuin", rating: "4,6", jobs: 12, badge: "Correo verificado", skills: "Mezcla · Limpieza · Materiales" },
  { name: "Julia Ferreyra", trade: "Pintura", city: "Ushuaia", rating: "4,9", jobs: 38, badge: "Recomendada", skills: "Interiores · Exteriores · Enduido" },
  { name: "Omar Villalba", trade: "Albañilería", city: "Río Grande", rating: "4,8", jobs: 71, badge: "Identidad verificada", skills: "Revoque · Contrapiso · Reparaciones" },
  { name: "Rocío Benítez", trade: "Jardinería", city: "Tolhuin", rating: "5,0", jobs: 23, badge: "Recomendada", skills: "Poda · Césped · Mantenimiento" },
  { name: "Pablo Acosta", trade: "Fletes y mudanzas", city: "Río Grande", rating: "4,7", jobs: 55, badge: "Identidad verificada", skills: "Mudanzas · Embalaje · Traslados" },
  { name: "Mariana López", trade: "Costura y arreglos", city: "Ushuaia", rating: "4,9", jobs: 34, badge: "Recomendada", skills: "Dobladillos · Cierres · Confección" },
  { name: "Sergio Sosa", trade: "Mecánica", city: "Río Grande", rating: "4,8", jobs: 92, badge: "Identidad verificada", skills: "Frenos · Tren delantero · Service" },
  { name: "Nadia Medina", trade: "Asistencia administrativa", city: "Ushuaia", rating: "4,7", jobs: 19, badge: "Correo verificado", skills: "Facturación · Agenda · Documentación" },
  { name: "Bruno Herrera", trade: "Informática y soporte técnico", city: "Tolhuin", rating: "4,9", jobs: 41, badge: "Recomendado", skills: "PC · Redes · Configuración" },
  { name: "Teresa Juárez", trade: "Cuidado de niños", city: "Río Grande", rating: "5,0", jobs: 29, badge: "Identidad verificada", skills: "Niñera · Apoyo escolar · Rutinas" },
  { name: "Ariel Navarro", trade: "Herrería", city: "Ushuaia", rating: "4,8", jobs: 47, badge: "Identidad verificada", skills: "Rejas · Portones · Soldadura" },
  { name: "Victoria Silva", trade: "Carpintería", city: "Río Grande", rating: "4,9", jobs: 36, badge: "Recomendada", skills: "Muebles · Estantes · Reparaciones" },
  { name: "Lucas Ortiz", trade: "Cerrajería", city: "Ushuaia", rating: "4,7", jobs: 68, badge: "Identidad verificada", skills: "Aperturas · Cerraduras · Copias" },
  { name: "Belén Figueroa", trade: "Refrigeración", city: "Río Grande", rating: "4,8", jobs: 32, badge: "Matrícula cargada", skills: "Heladeras · Cámaras · Mantenimiento" },
  { name: "Cristian Romero", trade: "Reparación de electrodomésticos", city: "Tolhuin", rating: "4,6", jobs: 26, badge: "Correo verificado", skills: "Lavarropas · Hornos · Secarropas" },
  { name: "Mirta Cáceres", trade: "Cocina domiciliaria", city: "Ushuaia", rating: "5,0", jobs: 51, badge: "Recomendada", skills: "Viandas · Comidas caseras · Eventos" },
  { name: "Franco Duarte", trade: "Chofer", city: "Río Grande", rating: "4,8", jobs: 73, badge: "Documentación verificada", skills: "Traslados · Repartos · Viajes" },
  { name: "Luciana Cabrera", trade: "Cuidado de mascotas", city: "Ushuaia", rating: "4,9", jobs: 39, badge: "Recomendada", skills: "Paseos · Visitas · Alimentación" },
  { name: "Raúl Giménez", trade: "Mantenimiento de edificios", city: "Río Grande", rating: "4,7", jobs: 84, badge: "Identidad verificada", skills: "Consorcios · Reparaciones · Guardias" },
  { name: "Agustina Molina", trade: "Fotografía", city: "Ushuaia", rating: "4,9", jobs: 22, badge: "Recomendada", skills: "Eventos · Productos · Retratos" },
  { name: "Matías Leiva", trade: "Soldadura", city: "Tolhuin", rating: "4,8", jobs: 43, badge: "Identidad verificada", skills: "Eléctrica · MIG · Reparaciones" },
  { name: "Patricia Vargas", trade: "Acompañante terapéutica", city: "Río Grande", rating: "5,0", jobs: 31, badge: "Matrícula verificada", skills: "Acompañamiento · Rutinas · Inclusión" },
  { name: "Gonzalo Castro", trade: "Gestor de trámites", city: "Ushuaia", rating: "4,7", jobs: 48, badge: "Identidad verificada", skills: "Automotor · Formularios · Turnos" },
  { name: "Daniela Ibáñez", trade: "Manicuría", city: "Río Grande", rating: "4,9", jobs: 66, badge: "Recomendada", skills: "Semipermanente · Kapping · Esculpidas" },
  { name: "Javier Ferreyra", trade: "Seguridad e higiene", city: "Ushuaia", rating: "4,8", jobs: 25, badge: "Matrícula verificada", skills: "Obras · Capacitaciones · Informes" },
  { name: "Micaela Arias", trade: "Community manager", city: "Tolhuin", rating: "4,8", jobs: 17, badge: "Correo verificado", skills: "Redes · Contenido · Respuestas" },
  { name: "Andrés Godoy", trade: "Vidriería", city: "Río Grande", rating: "4,7", jobs: 37, badge: "Identidad verificada", skills: "Ventanas · Espejos · DVH" },
  { name: "Paola Núñez", trade: "Lavandería y planchado", city: "Ushuaia", rating: "4,9", jobs: 58, badge: "Recomendada", skills: "Lavado · Planchado · Retiro" },
  { name: "Héctor Ojeda", trade: "Techista", city: "Río Grande", rating: "4,8", jobs: 46, badge: "Identidad verificada", skills: "Filtraciones · Chapa · Aislación" },
  { name: "Noelia Ríos", trade: "Peluquería", city: "Tolhuin", rating: "4,9", jobs: 61, badge: "Recomendada", skills: "Corte · Color · Peinados" },
  { name: "Emanuel Peralta", trade: "Instalador de durlock", city: "Ushuaia", rating: "4,7", jobs: 33, badge: "Identidad verificada", skills: "Cielorrasos · Tabiques · Revestimientos" },
  { name: "Silvina Campos", trade: "Masajista", city: "Río Grande", rating: "4,9", jobs: 28, badge: "Matrícula cargada", skills: "Descontracturante · Relajación · Drenaje" },
  { name: "Ignacio Luna", trade: "Tapicería", city: "Ushuaia", rating: "4,8", jobs: 24, badge: "Identidad verificada", skills: "Sillones · Sillas · Retapizado" },
  { name: "Carolina Bravo", trade: "Decoración de eventos", city: "Río Grande", rating: "5,0", jobs: 35, badge: "Recomendada", skills: "Cumpleaños · Ambientación · Mesas" },
  { name: "Walter Maidana", trade: "Operador de autoelevador", city: "Ushuaia", rating: "4,7", jobs: 76, badge: "Documentación verificada", skills: "Depósitos · Movimiento · Carga" },
  { name: "Florencia Vega", trade: "Traducción", city: "Tolhuin", rating: "4,9", jobs: 21, badge: "Identidad verificada", skills: "Inglés · Documentos · Turismo" },
  { name: "Gabriel Díaz", trade: "Logística de depósito", city: "Río Grande", rating: "4,8", jobs: 69, badge: "Identidad verificada", skills: "Inventario · Picking · Expedición" },
  { name: "Lorena Suárez", trade: "Limpieza industrial", city: "Ushuaia", rating: "4,7", jobs: 54, badge: "Recomendada", skills: "Galpones · Final de obra · Oficinas" },
  { name: "Federico Paredes", trade: "Cadetería", city: "Río Grande", rating: "4,9", jobs: 88, badge: "Identidad verificada", skills: "Trámites · Encomiendas · Compras" },
  { name: "Cecilia Torres", trade: "Enfermería domiciliaria", city: "Ushuaia", rating: "5,0", jobs: 42, badge: "Matrícula verificada", skills: "Curaciones · Controles · Medicación" },
  { name: "Pedro Ledesma", trade: "Armado de muebles", city: "Tolhuin", rating: "4,8", jobs: 30, badge: "Recomendado", skills: "Placares · Mesas · Estanterías" },
  { name: "Soledad Quiroga", trade: "Servicios de hotelería", city: "Ushuaia", rating: "4,7", jobs: 49, badge: "Identidad verificada", skills: "Habitaciones · Desayuno · Recepción" },
  { name: "Sebastián Ferreyra", trade: "Mantenimiento de embarcaciones", city: "Río Grande", rating: "4,8", jobs: 20, badge: "Identidad verificada", skills: "Motores · Cubierta · Reparaciones" }
];

const quickSearches = ["Gasista", "Plomería", "Electricidad", "Limpieza", "Adultos mayores", "Aduana", "Carga y descarga", "Repartidor", "Ayudante de obra", "Pintura", "Fletes", "Jardinería", "Mecánica", "Costura", "Informática"];
type Provider = typeof providers[number];

const colors = { navy: "#063C78", blue: "#078EE9", cyan: "#39BCEB", snow: "#F4FAFD", stone: "#5E7183", orange: "#FF7800", green: "#16825B", line: "#D6E8F2" };
const officialLogo = require("../assets/brand/laburapp-logo.jpg");
const officialWordmark = require("../assets/brand/laburapp-wordmark-clean.png");

export default function Home() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("Inicio");
  const [requested, setRequested] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [signedInName, setSignedInName] = useState<string | null>(null);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<"client" | "provider">("client");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [authError, setAuthError] = useState("");
  const [quoteProvider, setQuoteProvider] = useState<Provider | null>(null);
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteZone, setQuoteZone] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const compactHeader = width < 720;
  const authButtonLabel = signedInName ? `Hola, ${signedInName.split(" ")[0]}` : "Ingresar";

  function submitAuth() {
    setAuthError("");
    if (!authEmail.includes("@")) return setAuthError("Ingresá un correo válido.");
    if (authPassword.length < 6) return setAuthError("La contraseña debe tener al menos 6 caracteres.");
    if (authMode === "register" && authName.trim().length < 2) return setAuthError("Ingresá tu nombre y apellido.");
    if (authMode === "register" && !acceptedTerms) return setAuthError("Aceptá los términos y la política de privacidad para continuar.");
    setSignedInName(authMode === "register" ? authName.trim() : authEmail.split("@")[0]);
    setAuthMode(null); setAuthPassword("");
  }

  function submitQuote() {
    if (!quoteProvider) return;
    if (quoteDescription.trim().length < 10) return setRequested("Contanos un poco más (mínimo 10 caracteres)");
    setRequested(`Solicitud demo creada para ${quoteProvider.name}`);
    setQuoteProvider(null); setQuoteDescription(""); setQuoteZone(""); setQuoteDate("");
  }
  const filtered = useMemo(() => providers.filter((p) => `${p.name} ${p.trade} ${p.city} ${p.skills}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return <SafeAreaView style={styles.safe}>
    <View style={[styles.header, compactHeader && styles.headerCompact]}>
      <View style={styles.brandRow}>
        {compactHeader ? <Image source={officialWordmark} accessibilityLabel="LaburApp" resizeMode="contain" style={styles.wordmarkLogo} /> : <Image source={officialLogo} accessibilityLabel="Logo oficial de LaburApp con Tito, el gato laburante" resizeMode="contain" style={styles.officialLogo} />}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ingresar a LaburApp" style={styles.loginButton} onPress={() => signedInName ? setTab("Perfil") : setAuthMode("login")}>
        <Text style={styles.loginButtonText}>{authButtonLabel}</Text>
      </TouchableOpacity>
    </View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {tab === "Inicio" ? <>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Encontrá a quien sabe hacerlo.</Text>
          <Text style={styles.heroCopy}>Prestadores locales, pagos protegidos y reseñas de trabajos reales.</Text>
          <TextInput accessibilityLabel="Buscar servicio" value={query} onChangeText={setQuery} placeholder="¿Qué necesitás resolver?" placeholderTextColor="#71818B" style={styles.search} />
          <View style={styles.quickSearches} accessibilityLabel="Búsquedas frecuentes">
            {quickSearches.map((term) => <TouchableOpacity key={term} accessibilityRole="button" accessibilityLabel={`Buscar ${term}`} onPress={() => setQuery(term)} style={[styles.quickSearch, query === term && styles.quickSearchActive]}>
              <Text style={[styles.quickSearchText, query === term && styles.quickSearchTextActive]}>{term}</Text>
            </TouchableOpacity>)}
          </View>
        </View>
        <Text style={styles.sectionTitle}>{query ? `Resultados · ${filtered.length}` : `Profesionales cerca tuyo · ${providers.length}`}</Text>
        {filtered.map((provider) => <View key={provider.name} style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{provider.name.split(" ").map((part) => part[0]).join("")}</Text></View>
          <View style={styles.cardBody}>
            <View style={styles.row}><Text style={styles.name}>{provider.name}</Text><Text style={styles.rating}>★ {provider.rating}</Text></View>
            <Text style={styles.trade}>{provider.trade} · {provider.city}</Text>
            <Text style={styles.skills}>{provider.skills}</Text>
            <Text style={styles.badge}>✓ {provider.badge} · {provider.jobs} trabajos</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setQuoteProvider(provider)}><Text style={styles.buttonText}>Solicitar presupuesto</Text></TouchableOpacity>
          </View>
        </View>)}
        {filtered.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>Tito no encontró coincidencias</Text><Text style={styles.heroCopy}>Probá con “gasista”, “plomería” o una ciudad.</Text></View>}
      </> : <View style={styles.empty}>
        <Text style={styles.catLarge}>{tab === "Trabajos" ? "🧰" : "👤"}</Text>
        <Text style={styles.emptyTitle}>{tab}</Text>
        <Text style={styles.heroCopy}>{tab === "Trabajos" ? "Acá vas a seguir solicitudes, presupuestos y trabajos activos." : signedInName ? `Sesión iniciada como ${signedInName}. Tu perfil puede funcionar como cliente y prestador.` : "Tu perfil puede funcionar como cliente y prestador con una sola cuenta."}</Text>
        <TouchableOpacity style={styles.secondaryButton}><Text style={styles.secondaryText}>Explorar modo demo</Text></TouchableOpacity>
      </View>}
    </ScrollView>
    {requested && <View style={styles.toast}><Text style={styles.toastText}>{requested}</Text><TouchableOpacity onPress={() => setRequested(null)}><Text style={styles.toastClose}>Cerrar</Text></TouchableOpacity></View>}
    <Modal visible={authMode !== null} transparent animationType="slide" onRequestClose={() => setAuthMode(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity style={styles.modalClose} onPress={() => setAuthMode(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>{authMode === "login" ? "Ingresá a LaburApp" : "Creá tu cuenta"}</Text>
        <Text style={styles.modalCopy}>{authMode === "login" ? "Continuá con tu cuenta demo para probar el flujo." : "Una cuenta sirve para contratar y ofrecer servicios."}</Text>
        {authMode === "register" && <TextInput value={authName} onChangeText={setAuthName} placeholder="Nombre y apellido" placeholderTextColor="#71818B" style={styles.modalInput} />}
        <TextInput value={authEmail} onChangeText={setAuthEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor="#71818B" style={styles.modalInput} />
        <TextInput value={authPassword} onChangeText={setAuthPassword} secureTextEntry placeholder="Contraseña (6 caracteres mínimo)" placeholderTextColor="#71818B" style={styles.modalInput} />
        {authMode === "register" && <>
          <Text style={styles.modalLabel}>¿Cómo vas a usar LaburApp?</Text>
          <View style={styles.roleRow}>{[["client", "Quiero contratar"], ["provider", "Quiero ofrecer"]].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setAuthRole(value as "client" | "provider")} style={[styles.roleChoice, authRole === value && styles.roleChoiceActive]}><Text style={[styles.roleChoiceText, authRole === value && styles.roleChoiceTextActive]}>{label}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms(!acceptedTerms)} style={styles.termsRow}><Text style={styles.checkbox}>{acceptedTerms ? "☑" : "☐"}</Text><Text style={styles.termsText}>Acepto los términos y la política de privacidad.</Text></TouchableOpacity>
        </>}
        {!!authError && <Text style={styles.modalError}>{authError}</Text>}
        <TouchableOpacity style={styles.modalPrimary} onPress={submitAuth}><Text style={styles.modalPrimaryText}>{authMode === "login" ? "Ingresar" : "Crear cuenta demo"}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { setAuthError(""); setAuthMode(authMode === "login" ? "register" : "login"); }}><Text style={styles.modalSwitch}>{authMode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Ingresá"}</Text></TouchableOpacity>
      </View></View>
    </Modal>
    <Modal visible={quoteProvider !== null} transparent animationType="slide" onRequestClose={() => setQuoteProvider(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity style={styles.modalClose} onPress={() => setQuoteProvider(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>Solicitar presupuesto</Text>
        <Text style={styles.modalCopy}>{quoteProvider ? `${quoteProvider.name} · ${quoteProvider.trade}` : ""}</Text>
        <TextInput multiline value={quoteDescription} onChangeText={setQuoteDescription} placeholder="¿Qué necesitás resolver?" placeholderTextColor="#71818B" style={[styles.modalInput, styles.multiline]} />
        <TextInput value={quoteZone} onChangeText={setQuoteZone} placeholder="Zona aproximada (sin dirección exacta)" placeholderTextColor="#71818B" style={styles.modalInput} />
        <TextInput value={quoteDate} onChangeText={setQuoteDate} placeholder="Fecha o franja horaria (opcional)" placeholderTextColor="#71818B" style={styles.modalInput} />
        <Text style={styles.privacyHint}>No compartas teléfono, correo ni dirección exacta antes de contratar.</Text>
        <TouchableOpacity style={styles.modalPrimary} onPress={submitQuote}><Text style={styles.modalPrimaryText}>Enviar solicitud</Text></TouchableOpacity>
      </View></View>
    </Modal>
    <View style={styles.nav}>{["Inicio", "Trabajos", "Perfil"].map((item) => <TouchableOpacity key={item} onPress={() => setTab(item)} style={styles.navItem}><Text style={[styles.navText, tab === item && styles.navActive]}>{item}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.snow }, header: { minHeight: 88, paddingHorizontal: 16, paddingVertical: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#000000", borderBottomWidth: 3, borderBottomColor: colors.blue }, headerCompact: { minHeight: 64, paddingVertical: 6, backgroundColor: "#000000" },
  brandRow: { flexDirection: "row", alignItems: "center" }, officialLogo: { width: 126, height: 78 }, wordmarkLogo: { width: 176, height: 48 },
  loginButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.cyan, backgroundColor: "#063C78" }, loginButtonText: { color: "white", fontWeight: "800", fontSize: 14 },
  content: { padding: 18, paddingBottom: 110 }, hero: { backgroundColor: colors.navy, borderRadius: 24, padding: 22, marginBottom: 24 }, heroTitle: { color: "white", fontSize: 30, lineHeight: 34, fontWeight: "900" }, heroCopy: { color: "#D6E6EE", fontSize: 15, lineHeight: 21, marginTop: 8 }, search: { backgroundColor: "white", color: colors.navy, borderRadius: 14, minHeight: 52, marginTop: 18, paddingHorizontal: 16, fontSize: 16 }, quickSearches: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }, quickSearch: { minHeight: 26, justifyContent: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.08)" }, quickSearchActive: { backgroundColor: colors.orange, borderColor: colors.orange }, quickSearchText: { color: "#D8EEFA", fontSize: 11, lineHeight: 14, fontWeight: "700" }, quickSearchTextActive: { color: "white" },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.navy, marginBottom: 12 }, card: { backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 12, flexDirection: "row" }, avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#DDF0F7", alignItems: "center", justifyContent: "center", marginRight: 13 }, avatarText: { color: colors.navy, fontWeight: "900" }, cardBody: { flex: 1 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, name: { color: colors.navy, fontSize: 17, fontWeight: "800", flex: 1 }, rating: { color: colors.navy, fontWeight: "700" }, trade: { color: colors.blue, fontWeight: "700", marginTop: 2 }, skills: { color: colors.stone, marginTop: 6 }, badge: { color: colors.green, fontSize: 12, fontWeight: "700", marginTop: 7 }, button: { backgroundColor: colors.orange, borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 12 }, buttonText: { color: "white", fontWeight: "800" },
  empty: { minHeight: 360, justifyContent: "center", alignItems: "center", padding: 28 }, emptyTitle: { color: colors.navy, fontSize: 22, fontWeight: "900", textAlign: "center" }, catLarge: { fontSize: 58, marginBottom: 14 }, secondaryButton: { marginTop: 20, borderWidth: 1, borderColor: colors.blue, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 }, secondaryText: { color: colors.blue, fontWeight: "800" },
  toast: { position: "absolute", bottom: 72, left: 18, right: 18, backgroundColor: colors.green, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, toastText: { color: "white", fontWeight: "700", flex: 1 }, toastClose: { color: "white", textDecorationLine: "underline", marginLeft: 12 }, nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 66, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row" }, navItem: { flex: 1, alignItems: "center", justifyContent: "center" }, navText: { color: colors.stone, fontWeight: "700" }, navActive: { color: colors.orange },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,19,40,0.62)", justifyContent: "flex-end" }, modalCard: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30, maxHeight: "92%" }, modalClose: { position: "absolute", right: 18, top: 12, zIndex: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF5F8", alignItems: "center", justifyContent: "center" }, modalCloseText: { color: colors.navy, fontSize: 27, lineHeight: 29 }, modalTitle: { color: colors.navy, fontSize: 24, fontWeight: "900", marginTop: 4, paddingRight: 36 }, modalCopy: { color: colors.stone, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 14 }, modalInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, color: colors.navy, fontSize: 15, marginBottom: 10, backgroundColor: "#FBFDFE" }, multiline: { minHeight: 88, paddingTop: 13, textAlignVertical: "top" }, modalLabel: { color: colors.navy, fontSize: 13, fontWeight: "800", marginTop: 2, marginBottom: 8 }, roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 }, roleChoice: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, roleChoiceActive: { borderColor: colors.blue, backgroundColor: "#E8F6FD" }, roleChoiceText: { color: colors.stone, fontSize: 12, fontWeight: "800" }, roleChoiceTextActive: { color: colors.navy }, termsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, checkbox: { color: colors.orange, fontSize: 22, marginRight: 7 }, termsText: { color: colors.stone, fontSize: 12, flex: 1 }, modalError: { color: "#BF4525", fontSize: 13, fontWeight: "700", marginBottom: 10 }, modalPrimary: { minHeight: 50, borderRadius: 12, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", marginTop: 4 }, modalPrimaryText: { color: "white", fontSize: 15, fontWeight: "900" }, modalSwitch: { color: colors.blue, fontWeight: "800", textAlign: "center", marginTop: 15 }, privacyHint: { color: colors.stone, fontSize: 12, lineHeight: 17, marginBottom: 10 },
});
