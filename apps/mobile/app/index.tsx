import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { containsContactAttempt, reviewIsEligible } from "@laburapp/shared";
import { ProviderProfileForm } from "../components/ProviderProfileForm";
import { QuoteBuilderForm } from "../components/QuoteBuilderForm";
import { applyDemoAction, createDemoScenarios, DemoAction, primaryActionFor, statusPresentation, submitCustomQuote } from "../lib/demo-flow";
import { loadLocalState, saveLocalState, SavedMessage, SavedProviderProfile, SavedQuote, SavedRequest, SavedSession } from "../lib/local-store";
import { enqueueMirrorEvent, flushMirrorEvents } from "../lib/mirror-events";
import { backendMode, supabase } from "../lib/supabase";

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
type ProviderSort = "recent" | "jobs" | "rating";

const demoAccounts: Array<SavedSession & { label: string }> = [
  { label: "Entrar como cliente", name: "Cliente Demo", email: "cliente@laburapp.demo", role: "client" },
  { label: "Entrar como profesional", name: "Profesional Demo", email: "profesional@laburapp.demo", role: "provider" },
  { label: "Entrar como administrador", name: "Administrador", email: "admin@laburapp.demo", role: "admin" },
];

const colors = { navy: "#063C78", blue: "#078EE9", cyan: "#39BCEB", snow: "#F4FAFD", stone: "#5E7183", orange: "#FF7800", green: "#16825B", line: "#D6E8F2" };
const officialWordmark = require("../assets/brand/laburapp-wordmark-clean.png");
const demoAccessEnabled = process.env.EXPO_PUBLIC_DEMO_ACCESS !== "false";

function AppModal({ visible, onRequestClose, children }: { visible: boolean; onRequestClose: () => void; children: ReactNode }) {
  if (!visible) return null;
  if (Platform.OS === "web") return <>{children}</>;
  return <Modal visible transparent animationType="slide" onRequestClose={onRequestClose}>{children}</Modal>;
}

export default function Home() {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [providerSort, setProviderSort] = useState<ProviderSort>("recent");
  const [cityFilter, setCityFilter] = useState("Todas");
  const [openFilter, setOpenFilter] = useState<"sort" | "city" | null>(null);
  const [tab, setTab] = useState("Inicio");
  const [requested, setRequested] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | "recovery" | null>(null);
  const [signedInName, setSignedInName] = useState<string | null>(null);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [providerProfile, setProviderProfile] = useState<SavedProviderProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authRole, setAuthRole] = useState<"client" | "provider">("client");
  const [authCity, setAuthCity] = useState("Río Grande");
  const [authBusy, setAuthBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [authError, setAuthError] = useState("");
  const [quoteProvider, setQuoteProvider] = useState<Provider | null>(null);
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteZone, setQuoteZone] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [profileModal, setProfileModal] = useState(false);
  const [profileDraft, setProfileDraft] = useState<SavedProviderProfile>({ displayName: "", city: "", trade: "", bio: "", skills: "", zones: "", availability: "", published: false });
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [followersVisible, setFollowersVisible] = useState(false);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [quoteBuilderRequestId, setQuoteBuilderRequestId] = useState<string | null>(null);
  const compactHeader = width < 720;
  const authButtonLabel = signedInName ? `Hola, ${signedInName.split(" ")[0]}` : "Ingresar";
  const navigationItems = session?.role === "admin" ? ["Inicio", "Panel", "Perfil"] : ["Inicio", "Trabajos", "Perfil"];
  const isDemoSession = session?.email.endsWith("@laburapp.demo") ?? false;

  useEffect(() => {
    void flushMirrorEvents();
    loadLocalState().then((saved) => {
      setSession(saved.session);
      setSignedInName(saved.session?.name ?? null);
      setRequests(saved.requests);
      setProviderProfile(saved.providerProfile);
      if (saved.providerProfile) setProfileDraft(saved.providerProfile);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLocalState({ session, requests, providerProfile }).catch(() => setRequested("No pudimos guardar los cambios en este dispositivo."));
  }, [hydrated, session, requests, providerProfile]);

  async function submitAuth() {
    setAuthError("");
    if (!authEmail.includes("@")) return setAuthError("Ingresá un correo válido.");
    if (authMode === "recovery") {
      setAuthBusy(true);
      const { error } = supabase ? await supabase.auth.resetPasswordForEmail(authEmail.trim().toLowerCase(), { redirectTo: process.env.EXPO_PUBLIC_APP_URL ?? "https://laburapp-iota.vercel.app" }) : { error: null };
      setAuthBusy(false);
      if (error) return setAuthError(error.message);
      setAuthMode(null); setRequested(supabase ? "Revisá tu correo para recuperar la cuenta." : "Modo demostración: no se envió un correo real.");
      return;
    }
    if (authPassword.length < 6) return setAuthError("La contraseña debe tener al menos 6 caracteres.");
    if (authMode === "register" && authName.trim().length < 2) return setAuthError("Ingresá tu nombre y apellido.");
    if (authMode === "register" && !acceptedTerms) return setAuthError("Aceptá los términos y la política de privacidad para continuar.");
    setAuthBusy(true);
    let name = authMode === "register" ? authName.trim() : authEmail.split("@")[0];
    let resolvedRole: SavedSession["role"] = authMode === "register" ? authRole : "client";
    if (supabase) {
      const result = authMode === "register"
        ? await supabase.auth.signUp({ email: authEmail.trim().toLowerCase(), password: authPassword, options: { data: { full_name: name, role: authRole, city: authCity } } })
        : await supabase.auth.signInWithPassword({ email: authEmail.trim().toLowerCase(), password: authPassword });
      if (result.error) { setAuthBusy(false); return setAuthError(result.error.message); }
      if (authMode === "register" && !result.data.session) {
        setAuthBusy(false); setAuthMode(null); setAuthPassword(""); setRequested("Cuenta creada. Revisá tu correo para confirmarla y después ingresá."); return;
      }
      name = String(result.data.user?.user_metadata?.full_name || name);
      if (authMode === "login" && result.data.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", result.data.user.id);
        resolvedRole = roles?.some((item) => item.role === "admin") ? "admin" : roles?.some((item) => item.role === "provider") ? "provider" : "client";
      }
    } else if (authMode === "login") {
      const demo = demoAccounts.find((account) => account.email === authEmail.trim().toLowerCase());
      if (demo) { name = demo.name; resolvedRole = demo.role; }
    }
    const nextSession: SavedSession = { name, email: authEmail.trim().toLowerCase(), role: resolvedRole };
    setSession(nextSession); setSignedInName(name);
    if (authMode === "register") void enqueueMirrorEvent("Usuarios", { user_name: name, email: nextSession.email, role: nextSession.role, city: authCity, source: supabase ? "supabase" : "mobile_demo" });
    setAuthBusy(false);
    setAuthMode(null); setAuthPassword("");
    if (authMode === "register" && authRole === "provider") {
      setProfileDraft((current) => ({ ...current, displayName: name, city: authCity }));
      setProfileModal(true);
    }
  }

  function loginDemoAccount(account: SavedSession) {
    setSession(account); setSignedInName(account.name); setAuthMode(null); setAuthError(""); setAuthPassword("");
    if (account.role === "admin") setTab("Panel");
    if (account.role === "provider" && !providerProfile) {
      const services = [{ id: "demo-diagnostico", service: "Diagnóstico / visita técnica", price: 35000, startTime: "09:00", endTime: "18:00" }];
      const baseProfile: SavedProviderProfile = {
        displayName: account.name,
        city: "Río Grande",
        trade: "Gasista matriculado",
        bio: "Mantenimiento, diagnóstico y reparaciones domiciliarias con atención clara y ordenada.",
        training: "Formación técnica en instalaciones domiciliarias. Más de seis años de experiencia en mantenimiento y detección de pérdidas.",
        certifications: ["Matrícula vigente", "Instalaciones domiciliarias"],
        verified: true,
        followersCount: 128,
        profileReviews: [
          { id: "review-demo-1", authorName: "María Fernández", rating: 5, comment: "Llegó en horario, explicó el problema y dejó todo funcionando.", createdAt: "2026-08-28" },
          { id: "review-demo-2", authorName: "Jorge Acosta", rating: 5, comment: "Muy prolijo y el presupuesto coincidió con el trabajo realizado.", createdAt: "2026-08-17" },
        ],
        services,
        skills: services.map((item) => item.service).join(", "),
        zones: "Río Grande y alrededores",
        availability: "Diagnóstico / visita técnica: 09:00 a 18:00",
        tariffItems: services.map((item) => ({ id: item.id, trade: "Gasista matriculado", label: item.service, unit: "servicio", unitPrice: item.price, enabled: true })),
        published: true,
      };
      setProviderProfile(baseProfile);
    }
  }

  function submitQuote() {
    if (!quoteProvider) return;
    if (quoteDescription.trim().length < 10) return setRequested("Contanos un poco más (mínimo 10 caracteres)");
    const nextRequest: SavedRequest = {
      id: `${Date.now()}`,
      provider: quoteProvider.name,
      trade: quoteProvider.trade,
      description: quoteDescription.trim(),
      zone: quoteZone.trim(),
      desiredAt: quoteDate.trim(),
      createdAt: new Date().toISOString(),
      status: "request_sent",
    };
    setRequests((current) => [nextRequest, ...current]);
    void enqueueMirrorEvent("Contactos", { request_id: nextRequest.id, client_name: session?.name ?? "", client_email: session?.email ?? "", provider_name: nextRequest.provider, trade: nextRequest.trade, channel: "solicitud_presupuesto", status: nextRequest.status, description: nextRequest.description });
    setRequested(`Solicitud creada para ${quoteProvider.name}`);
    setQuoteProvider(null); setQuoteDescription(""); setQuoteZone(""); setQuoteDate("");
  }

  function startQuote(provider: Provider) {
    if (!session) {
      setAuthMode("register");
      setRequested("Creá una cuenta o ingresá para solicitar un presupuesto.");
      return;
    }
    setQuoteProvider(provider);
  }

  function openProviderProfile() {
    if (!session) { setAuthMode("register"); setAuthRole("provider"); return; }
    setProfileDraft(providerProfile ?? { displayName: session.name, city: "", trade: "", bio: "", skills: "", zones: "", availability: "", published: false });
    setProfileError(""); setProfileModal(true);
  }

  async function saveProviderProfile(nextDraft: SavedProviderProfile) {
    setProfileDraft(nextDraft);
    setProfileError("");
    setProfileBusy(true);
    const services = (nextDraft.services ?? []).slice(0, 2);
    const tariffItems = services.map((item) => ({ id: item.id, trade: nextDraft.trade.trim(), label: item.service, unit: "servicio", unitPrice: item.price, enabled: true }));
    let photoUri = nextDraft.photoUri;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setProfileBusy(false); return setProfileError("Volvé a ingresar para publicar el perfil."); }
      if (photoUri?.startsWith("data:")) {
        const photoResponse = await fetch(photoUri);
        const photoBlob = await photoResponse.blob();
        const photoPath = `${user.id}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("profile-photos").upload(photoPath, photoBlob, { contentType: photoBlob.type || "image/jpeg", upsert: true });
        if (uploadError) { setProfileBusy(false); return setProfileError(uploadError.message); }
        photoUri = supabase.storage.from("profile-photos").getPublicUrl(photoPath).data.publicUrl;
      }
      const profileResult = await supabase.from("profiles").upsert({ id: user.id, full_name: nextDraft.displayName.trim(), city: nextDraft.city.trim(), avatar_path: photoUri ?? null });
      const providerResult = await supabase.from("provider_profiles").upsert({ user_id: user.id, trade_title: nextDraft.trade.trim(), bio: nextDraft.bio.trim(), skills_text: nextDraft.skills.trim(), training: nextDraft.training?.trim() || null, certifications: nextDraft.certifications ?? [], zones: nextDraft.zones.split(",").map((zone) => zone.trim()).filter(Boolean), availability: nextDraft.availability.trim(), published: true });
      if (profileResult.error || providerResult.error) { setProfileBusy(false); return setProfileError(profileResult.error?.message ?? providerResult.error?.message ?? "No pudimos publicar el perfil."); }
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "provider" });
      await supabase.from("provider_services").delete().eq("provider_id", user.id);
      const { error: tradesError } = await supabase.from("provider_services").insert({ provider_id: user.id, trade_name: nextDraft.trade.trim(), position: 1 });
      if (tradesError) { setProfileBusy(false); return setProfileError(tradesError.message); }
      await supabase.from("provider_rate_items").delete().eq("provider_id", user.id);
      const { error: ratesError } = await supabase.from("provider_rate_items").insert(services.map((item, index) => ({ provider_id: user.id, trade_name: nextDraft.trade.trim(), label: item.service, unit: "servicio", unit_price: item.price, availability_start: item.startTime, availability_end: item.endTime, slot_position: index + 1, active: true })));
      if (ratesError) { setProfileBusy(false); return setProfileError(ratesError.message); }
    }
    const publishedProfile = { ...nextDraft, photoUri, tariffItems, services, published: true };
    setProviderProfile(publishedProfile);
    setSession((current) => current ? { ...current, role: "provider" } : current);
    void enqueueMirrorEvent("Profesionales", { user_name: publishedProfile.displayName, trade: publishedProfile.trade, city: publishedProfile.city, availability: publishedProfile.availability, bio: publishedProfile.bio, source: supabase ? "supabase" : "mobile_demo" });
    services.forEach((item) => void enqueueMirrorEvent("Tarifario", { id: item.id, provider_name: publishedProfile.displayName, trade_name: publishedProfile.trade, label: item.service, unit: "servicio", unit_price: item.price, availability_start: item.startTime, availability_end: item.endTime, pricing_mode: "itemized", active: true }));
    setProfileBusy(false);
    setProfileModal(false); setRequested("Perfil de prestador guardado y publicado.");
  }

  function signOut() {
    if (supabase) void supabase.auth.signOut();
    setSession(null); setSignedInName(null); setTab("Inicio"); setRequested("Cerraste sesión en este dispositivo.");
  }

  function updateRequest(id: string, updater: (request: SavedRequest) => SavedRequest) {
    setRequests((current) => current.map((request) => request.id === id ? updater(request) : request));
  }

  function runDemoAction(id: string, action: DemoAction) {
    try {
      updateRequest(id, (request) => applyDemoAction(request, action));
      setRequested(action === "pay" ? "Pago simulado aprobado y protegido." : "Estado del trabajo actualizado.");
    } catch {
      setRequested("No se pudo avanzar: el estado del trabajo cambió.");
    }
  }

  function loadSimulations() {
    setRequests((current) => [...createDemoScenarios(), ...current]);
    setRequested("Se cargaron tres casos para probar presupuestos, pagos y estados.");
  }

  function sendModularQuote(draft: Omit<SavedQuote, "version">) {
    if (!quoteBuilderRequestId) return;
    const request = requests.find((item) => item.id === quoteBuilderRequestId);
    try {
      updateRequest(quoteBuilderRequestId, (request) => submitCustomQuote(request, draft));
      if (request) void enqueueMirrorEvent("Presupuestos", { request_id: request.id, provider_name: request.provider, trade: request.trade, version: (request.quote?.version ?? 0) + 1, pricing_mode: draft.pricingMode ?? "itemized", amount_ars: draft.amount, scope: draft.scope, eta: draft.eta, valid_days: draft.validDays ?? 0, notes: draft.notes ?? "", items_json: JSON.stringify(draft.items ?? []) });
      setQuoteBuilderRequestId(null);
      setRequested("Presupuesto modular enviado al cliente.");
    } catch {
      setRequested("No se pudo enviar: el estado de la solicitud cambió.");
    }
  }

  function sendChatMessage() {
    const body = chatMessage.trim();
    setChatError("");
    if (!chatRequestId || !body) return setChatError("Escribí un mensaje para enviarlo.");
    if (containsContactAttempt(body)) return setChatError("Por seguridad, no compartas teléfonos, correos, redes ni enlaces antes de contratar.");
    const message: SavedMessage = { id: `${Date.now()}-client`, sender: "client", body, createdAt: new Date().toISOString() };
    updateRequest(chatRequestId, (request) => ({ ...request, messages: [...(request.messages ?? []), message] }));
    const request = requests.find((item) => item.id === chatRequestId);
    if (request) void enqueueMirrorEvent("Contactos", { request_id: request.id, client_name: session?.name ?? "", client_email: session?.email ?? "", provider_name: request.provider, trade: request.trade, channel: "chat_interno", status: request.status, description: "Mensaje enviado dentro de LaburApp (contenido no copiado por privacidad)" });
    setChatMessage("");
  }

  function submitReview() {
    const request = requests.find((item) => item.id === reviewRequestId);
    setReviewError("");
    if (!request || !reviewIsEligible({ isClient: true, paidInApp: !!request.payment?.protected, status: request.status, alreadyReviewed: !!request.review })) return setReviewError("Esta reseña todavía no está habilitada.");
    if (reviewComment.trim().length < 5) return setReviewError("Contá brevemente cómo fue el trabajo.");
    updateRequest(request.id, (item) => ({ ...item, review: { rating: reviewRating, comment: reviewComment.trim(), createdAt: new Date().toISOString() } }));
    setReviewRequestId(null); setReviewComment(""); setReviewRating(5); setRequested("Reseña verificada publicada.");
  }

  const chatRequest = requests.find((request) => request.id === chatRequestId) ?? null;
  const reviewRequest = requests.find((request) => request.id === reviewRequestId) ?? null;
  const quoteBuilderRequest = requests.find((request) => request.id === quoteBuilderRequestId) ?? null;
  const filtered = useMemo(() => providers
    .map((provider, registrationOrder) => ({ provider, registrationOrder }))
    .filter(({ provider }) => (cityFilter === "Todas" || provider.city === cityFilter) && `${provider.name} ${provider.trade} ${provider.city} ${provider.skills}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => providerSort === "jobs"
      ? b.provider.jobs - a.provider.jobs
      : providerSort === "rating"
        ? (b.provider.rating === "Nuevo" ? 0 : Number(b.provider.rating.replace(",", "."))) - (a.provider.rating === "Nuevo" ? 0 : Number(a.provider.rating.replace(",", ".")))
        : b.registrationOrder - a.registrationOrder)
    .map(({ provider }) => provider), [query, cityFilter, providerSort]);

  return <SafeAreaView style={styles.safe}>
    <View style={[styles.header, compactHeader && styles.headerCompact]}>
      <View style={styles.brandRow}>
        <Image source={officialWordmark} accessibilityLabel="LaburApp" resizeMode="contain" style={[styles.wordmarkLogo, !compactHeader && styles.wordmarkLogoWide]} />
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{query || cityFilter !== "Todas" ? `Resultados · ${filtered.length}` : `Profesionales cerca tuyo · ${filtered.length}`}</Text>
          <View style={styles.compactFilters} accessibilityLabel="Filtros de profesionales">
            <View style={styles.dropdownWrap}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ordenar profesionales" accessibilityState={{ expanded: openFilter === "sort" }} onPress={() => setOpenFilter(openFilter === "sort" ? null : "sort")} style={styles.dropdownButton}>
                <Text numberOfLines={1} style={styles.dropdownButtonText}>Ordenar</Text><Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {openFilter === "sort" && <View style={[styles.dropdownMenu, styles.sortMenu]}>
                {([['recent', 'Recién registrados'], ['jobs', 'Más trabajos'], ['rating', 'Estrellas']] as const).map(([value, label]) => <TouchableOpacity accessibilityRole="menuitem" key={value} onPress={() => { setProviderSort(value); setOpenFilter(null); }} style={[styles.dropdownOption, providerSort === value && styles.dropdownOptionActive]}><Text style={[styles.dropdownOptionText, providerSort === value && styles.dropdownOptionTextActive]}>{providerSort === value ? "✓ " : ""}{label}</Text></TouchableOpacity>)}
              </View>}
            </View>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Filtrar por ciudad" accessibilityState={{ expanded: openFilter === "city" }} onPress={() => setOpenFilter(openFilter === "city" ? null : "city")} style={styles.dropdownButton}>
                <Text numberOfLines={1} style={styles.dropdownButtonText}>Ciudad</Text><Text style={styles.dropdownChevron}>⌄</Text>
              </TouchableOpacity>
              {openFilter === "city" && <View style={[styles.dropdownMenu, styles.cityMenu]}>
                {["Todas", "Río Grande", "Ushuaia", "Tolhuin"].map((city) => <TouchableOpacity accessibilityRole="menuitem" key={city} onPress={() => { setCityFilter(city); setOpenFilter(null); }} style={[styles.dropdownOption, cityFilter === city && styles.dropdownOptionActive]}><Text style={[styles.dropdownOptionText, cityFilter === city && styles.dropdownOptionTextActive]}>{cityFilter === city ? "✓ " : ""}{city}</Text></TouchableOpacity>)}
              </View>}
            </View>
          </View>
        </View>
        {filtered.map((provider) => <View key={provider.name} style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{provider.name.split(" ").map((part) => part[0]).join("")}</Text></View>
          <View style={styles.cardBody}>
            <View style={styles.row}><Text style={styles.name}>{provider.name}</Text><Text style={styles.rating}>★ {provider.rating}</Text></View>
            <Text style={styles.trade}>{provider.trade} · {provider.city}</Text>
            <Text style={styles.skills}>{provider.skills}</Text>
            <Text style={styles.badge}>✓ {provider.badge} · {provider.jobs} trabajos</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => startQuote(provider)}><Text style={styles.buttonText}>Solicitar presupuesto</Text></TouchableOpacity>
          </View>
        </View>)}
        {filtered.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>Tito no encontró coincidencias</Text><Text style={styles.heroCopy}>Probá con “gasista”, “plomería” o una ciudad.</Text></View>}
      </> : tab === "Trabajos" ? <View style={styles.sectionPage}>
        <Text style={styles.pageTitle}>Mis trabajos</Text>
        <Text style={styles.pageCopy}>Seguí en un solo lugar tus solicitudes, presupuestos y trabajos activos.</Text>
        {session?.role === "provider" && <View style={styles.notificationsPanel}>
          <View style={styles.notificationHeading}><View><Text style={styles.panelEyebrow}>NOTIFICACIONES</Text><Text style={styles.notificationTitle}>Solicitudes para responder</Text></View><Text style={styles.notificationCount}>{requests.filter((request) => request.status === "request_sent" || request.status === "quote_revision_requested").length}</Text></View>
          {requests.filter((request) => request.status === "request_sent" || request.status === "quote_revision_requested").slice(0, 3).map((request) => <View key={`notification-${request.id}`} style={styles.notificationRow}><View style={styles.notificationCopy}><Text style={styles.notificationName}>{request.trade}</Text><Text style={styles.notificationText}>{request.description}</Text></View><TouchableOpacity accessibilityRole="button" style={styles.notificationAction} onPress={() => setQuoteBuilderRequestId(request.id)}><Text style={styles.notificationActionText}>Responder presupuesto</Text></TouchableOpacity></View>)}
          {!requests.some((request) => request.status === "request_sent" || request.status === "quote_revision_requested") && <Text style={styles.notificationEmpty}>No tenés presupuestos pendientes.</Text>}
        </View>}
        <View style={styles.simulatorBanner}><View style={styles.simulatorCopy}><Text style={styles.simulatorTitle}>Simulador del PMV</Text><Text style={styles.simulatorText}>Cargá casos ficticios para recorrer el circuito sin pagos ni operaciones reales.</Text></View><TouchableOpacity accessibilityRole="button" style={styles.simulatorButton} onPress={loadSimulations}><Text style={styles.simulatorButtonText}>Cargar 3 casos</Text></TouchableOpacity></View>
        {requests.length === 0 ? <View style={styles.emptyPanel}>
          <Text style={styles.emptyIcon}>🧰</Text><Text style={styles.emptyTitle}>Todavía no hay solicitudes</Text>
          <Text style={styles.centerCopy}>Elegí un profesional y pedile presupuesto. La solicitud va a aparecer acá.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab("Inicio")}><Text style={styles.secondaryText}>Buscar profesionales</Text></TouchableOpacity>
        </View> : requests.map((request) => {
          const presentation = statusPresentation[request.status];
          const primary = primaryActionFor(request.status);
          return <View key={request.id} style={styles.workCard}>
            <View style={styles.workCardTop}><Text style={[styles.workStatus, presentation.tone === "green" && styles.statusGreen, presentation.tone === "blue" && styles.statusBlue, presentation.tone === "red" && styles.statusRed]}>● {presentation.label}</Text><Text style={styles.workDate}>{new Date(request.createdAt).toLocaleDateString("es-AR")}</Text></View>
            <Text style={styles.workProvider}>{request.provider}</Text>
            <Text style={styles.trade}>{request.trade}</Text>
            <Text style={styles.workDescription}>{request.description}</Text>
            {!!request.zone && <Text style={styles.workMeta}>Zona: {request.zone}</Text>}
            {!!request.desiredAt && <Text style={styles.workMeta}>Cuándo: {request.desiredAt}</Text>}
            {request.quote && <View style={styles.quoteBox}>
              <View style={styles.workCardTop}><Text style={styles.quoteLabel}>PRESUPUESTO · VERSIÓN {request.quote.version}</Text><Text style={styles.quoteAmount}>{request.quote.pricingMode === "starting_at" ? "Desde " : ""}${request.quote.amount.toLocaleString("es-AR")}</Text></View>
              <Text style={styles.quoteScope}>{request.quote.scope}</Text><Text style={styles.quoteEta}>{request.quote.eta}</Text>
              {!!request.quote.items?.length && <View style={styles.quoteBreakdown}>{request.quote.items.map((line) => <View key={line.id} style={styles.quoteLine}><Text style={styles.quoteLineName}>{line.label}{line.quantity !== 1 ? ` · ${line.quantity} ${line.unit}` : ""}</Text><Text style={styles.quoteLinePrice}>${(line.quantity * line.unitPrice).toLocaleString("es-AR")}</Text></View>)}</View>}
              {!!request.quote.notes && <Text style={styles.quoteNotes}>{request.quote.notes}</Text>}
              {!!request.quote.validDays && <Text style={styles.quoteValidity}>Válido por {request.quote.validDays} días</Text>}
            </View>}
            {request.payment?.protected && <View style={styles.paymentBox}><Text style={styles.paymentTitle}>🛡 Pago protegido (simulado)</Text><Text style={styles.paymentText}>Total ${request.payment.total.toLocaleString("es-AR")} · comisión ${request.payment.fee.toLocaleString("es-AR")} · recibe el profesional ${request.payment.providerNet.toLocaleString("es-AR")}</Text></View>}
            {!!request.messages?.length && <Text style={styles.lastMessage}>Último mensaje: “{request.messages[request.messages.length - 1].body}”</Text>}
            <View style={styles.nextStep}><Text style={styles.nextStepText}>Próximo paso: {presentation.next}</Text></View>
            {request.status === "quote_sent" && <View style={styles.actionRow}>
              <TouchableOpacity accessibilityRole="button" style={styles.outlineAction} onPress={() => runDemoAction(request.id, "request_revision")}><Text style={styles.outlineActionText}>Pedir cambios</Text></TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" style={styles.primaryAction} onPress={() => runDemoAction(request.id, "accept_quote")}><Text style={styles.primaryActionText}>Aceptar presupuesto</Text></TouchableOpacity>
            </View>}
            {primary && <TouchableOpacity accessibilityRole="button" style={styles.primaryActionFull} onPress={() => primary.action === "provider_quote" || primary.action === "revised_quote" ? setQuoteBuilderRequestId(request.id) : runDemoAction(request.id, primary.action)}><Text style={styles.primaryActionText}>{primary.action === "provider_quote" ? "Armar presupuesto modular" : primary.action === "revised_quote" ? "Editar presupuesto y reenviar" : primary.label}</Text></TouchableOpacity>}
            {request.status === "funds_released" && !request.review && <TouchableOpacity accessibilityRole="button" style={styles.primaryActionFull} onPress={() => { setReviewRequestId(request.id); setReviewError(""); }}><Text style={styles.primaryActionText}>Dejar reseña verificada</Text></TouchableOpacity>}
            {request.review && <View style={styles.reviewPublished}><Text style={styles.reviewStars}>{"★".repeat(request.review.rating)}{"☆".repeat(5 - request.review.rating)}</Text><Text style={styles.reviewPublishedText}>“{request.review.comment}”</Text><Text style={styles.verifiedReview}>✓ Reseña de un trabajo pagado en LaburApp</Text></View>}
            <View style={styles.cardLinks}>
              <TouchableOpacity accessibilityRole="button" onPress={() => { setChatRequestId(request.id); setChatError(""); }}><Text style={styles.cardLink}>Abrir conversación ({request.messages?.filter((message) => message.sender !== "system").length ?? 0})</Text></TouchableOpacity>
              {request.status === "request_sent" && <TouchableOpacity accessibilityRole="button" onPress={() => runDemoAction(request.id, "cancel")}><Text style={styles.cancelLink}>Cancelar solicitud</Text></TouchableOpacity>}
            </View>
          </View>;
        })}
      </View> : tab === "Panel" ? <View style={styles.sectionPage}>
        <Text style={styles.pageTitle}>Panel de administración</Text>
        <Text style={styles.pageCopy}>Vista operativa reservada para cuentas con rol administrador.</Text>
        <View style={styles.adminMetrics}>{[["Usuarios", "1.284"], ["Profesionales", "326"], ["Trabajos activos", "87"], ["Casos a revisar", "6"]].map(([label, value]) => <View key={label} style={styles.adminMetric}><Text style={styles.panelEyebrow}>{label}</Text><Text style={styles.adminMetricValue}>{value}</Text></View>)}</View>
        <View style={styles.providerPanel}><Text style={styles.panelEyebrow}>ACCESOS RÁPIDOS</Text>{["Usuarios y roles", "Verificación de profesionales", "Trabajos y presupuestos", "Pagos y disputas", "Auditoría y actividad"].map((item) => <TouchableOpacity key={item} style={styles.adminLink}><Text style={styles.adminLinkText}>{item}</Text><Text style={styles.adminLinkArrow}>›</Text></TouchableOpacity>)}</View>
        <View style={styles.reviewBox}><Text style={styles.reviewTitle}>{isDemoSession ? "Vista de demostración" : "Seguridad"}</Text><Text style={styles.reviewText}>{isDemoSession ? "Estos indicadores son simulados para recorrer el panel. La cuenta administradora real se valida mediante Supabase antes de permitir operaciones." : "El rol administrador se valida mediante Supabase. La interfaz no concede permisos por sí sola."}</Text></View>
      </View> : <View style={styles.sectionPage}>
        <Text style={styles.pageTitle}>Mi perfil</Text>
        {!session ? <View style={styles.emptyPanel}>
          <Text style={styles.emptyIcon}>👤</Text><Text style={styles.emptyTitle}>Ingresá para continuar</Text>
          <Text style={styles.centerCopy}>Una sola cuenta sirve para contratar profesionales y ofrecer tus servicios.</Text>
          <TouchableOpacity style={styles.modalPrimary} onPress={() => setAuthMode("login")}><Text style={styles.modalPrimaryText}>Ingresar</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setAuthMode("register")}><Text style={styles.secondaryText}>Crear cuenta</Text></TouchableOpacity>
        </View> : <>
          <View style={styles.accountCard}>
            {providerProfile?.photoUri ? <Image source={{ uri: providerProfile.photoUri }} style={styles.profilePhoto} /> : <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{session.name.slice(0, 1).toUpperCase()}</Text></View>}
            <View style={styles.accountBody}><View style={styles.verifiedNameRow}><Text style={styles.accountName}>{session.name}</Text>{providerProfile?.verified && <Text accessibilityLabel="Perfil verificado" style={styles.verifiedIcon}>✓</Text>}</View><Text style={styles.accountEmail}>{session.email}</Text><Text style={styles.localBadge}>{isDemoSession ? "Cuenta de demostración" : backendMode === "supabase" ? "Conectado a Supabase" : "Guardado en este dispositivo"}</Text></View>
            {providerProfile?.published && <TouchableOpacity accessibilityRole="button" style={styles.followersButton} onPress={() => setFollowersVisible((current) => !current)}><Text style={styles.followersCount}>{providerProfile.followersCount ?? 0}</Text><Text style={styles.followersLabel}>seguidores</Text></TouchableOpacity>}
          </View>
          {followersVisible && providerProfile?.published && <View style={styles.followersPanel}><View style={styles.workCardTop}><Text style={styles.panelEyebrow}>SEGUIDORES</Text><TouchableOpacity onPress={() => setFollowersVisible(false)}><Text style={styles.cardLink}>Ocultar</Text></TouchableOpacity></View>{["María Fernández", "Jorge Acosta", "Lucía Pereyra", "Carlos Díaz"].map((name) => <View key={name} style={styles.followerRow}><View style={styles.followerAvatar}><Text style={styles.followerInitial}>{name.slice(0, 1)}</Text></View><Text style={styles.followerName}>{name}</Text><Text style={styles.followingBadge}>Siguiendo</Text></View>)}</View>}
          {session.role === "provider" && providerProfile?.published ? <View style={styles.providerPanel}>
            <View style={styles.workCardTop}><Text style={styles.panelEyebrow}>PERFIL DE PRESTADOR</Text><Text style={styles.publishedBadge}>Publicado</Text></View>
            <Text style={styles.providerTrade}>{providerProfile.trade}</Text>
            <Text style={styles.workDescription}>{providerProfile.bio}</Text>
            <Text style={styles.workMeta}>📍 {providerProfile.city} · {providerProfile.zones}</Text>
            {!!providerProfile.training && <View style={styles.profileSection}><Text style={styles.panelEyebrow}>FORMACIÓN Y EXPERIENCIA</Text><Text style={styles.profileSectionText}>{providerProfile.training}</Text></View>}
            {!!providerProfile.certifications?.length && <View style={styles.profileSection}><Text style={styles.panelEyebrow}>CERTIFICACIONES</Text><View style={styles.certificationList}>{providerProfile.certifications.map((certification) => <View key={certification} style={styles.certificationBadge}><Text style={styles.certificationIcon}>✓</Text><Text style={styles.certificationText}>{certification}</Text></View>)}</View></View>}
            <View style={styles.profileSection}><View style={styles.workCardTop}><Text style={styles.panelEyebrow}>SERVICIOS</Text><Text style={styles.servicePlanBadge}>PLAN GRATIS</Text></View>{(providerProfile.services ?? []).map((service) => <View key={service.id} style={styles.profileServiceCard}><View style={styles.profileServiceCopy}><Text style={styles.profileServiceName}>{service.service}</Text><Text style={styles.profileServiceTime}>Disponible de {service.startTime} a {service.endTime}</Text></View><View><Text style={styles.profileServicePrice}>${service.price.toLocaleString("es-AR")}</Text><Text style={styles.profileServiceCurrency}>ARS</Text></View></View>)}<View style={styles.lockedProfileService}><Text style={styles.lockedProfileServiceText}>🔒 Tercer servicio con membresía</Text></View></View>
            <TouchableOpacity style={styles.secondaryButton} onPress={openProviderProfile}><Text style={styles.secondaryText}>Editar perfil y servicios</Text></TouchableOpacity>
            {!!providerProfile.profileReviews?.length && <View style={styles.profileSection}><View style={styles.workCardTop}><Text style={styles.panelEyebrow}>RESEÑAS</Text><Text style={styles.reviewAverage}>★ 5,0</Text></View>{providerProfile.profileReviews.map((review) => <View key={review.id} style={styles.profileReview}><View style={styles.reviewAuthorRow}><View style={styles.reviewAvatar}><Text style={styles.reviewAvatarText}>{review.authorName.slice(0, 1)}</Text></View><View style={styles.reviewAuthorCopy}><Text style={styles.reviewAuthor}>{review.authorName}</Text><Text style={styles.reviewDate}>{review.createdAt}</Text></View><Text style={styles.reviewStarsSmall}>{"★".repeat(review.rating)}</Text></View><Text style={styles.reviewComment}>“{review.comment}”</Text><Text style={styles.verifiedReview}>✓ Trabajo verificado en LaburApp</Text></View>)}</View>}
          </View> : session.role === "client" || session.role === "provider" ? <View style={styles.providerInvite}>
            <Text style={styles.providerInviteTitle}>¿Querés ofrecer tus servicios?</Text>
            <Text style={styles.pageCopy}>Completá todo en una sola pantalla y empezá a recibir solicitudes.</Text>
            <TouchableOpacity style={styles.modalPrimary} onPress={openProviderProfile}><Text style={styles.modalPrimaryText}>Crear perfil de prestador</Text></TouchableOpacity>
          </View> : <View style={styles.reviewBox}><Text style={styles.reviewTitle}>Cuenta administradora</Text><Text style={styles.reviewText}>Usá la pestaña Panel para moderar usuarios, profesionales, trabajos, pagos y auditoría.</Text></View>}
          <TouchableOpacity style={styles.logoutButton} onPress={signOut}><Text style={styles.logoutText}>Cerrar sesión</Text></TouchableOpacity>
        </>}
      </View>}
    </ScrollView>
    {requested && <View style={styles.toast}><Text style={styles.toastText}>{requested}</Text><TouchableOpacity onPress={() => setRequested(null)}><Text style={styles.toastClose}>Cerrar</Text></TouchableOpacity></View>}
    <AppModal visible={authMode !== null} onRequestClose={() => setAuthMode(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.modalClose} onPress={() => setAuthMode(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>{authMode === "login" ? "Ingresá a LaburApp" : authMode === "recovery" ? "Recuperá tu cuenta" : "Creá tu cuenta"}</Text>
        <Text style={styles.modalCopy}>{authMode === "login" ? (supabase ? "Ingresá con tu cuenta de LaburApp." : "Continuá con una cuenta demo para probar el flujo.") : authMode === "recovery" ? (supabase ? "Ingresá tu correo y te enviaremos instrucciones." : "En el modo demo no se envía ningún correo real.") : "Una cuenta sirve para contratar y ofrecer servicios."}</Text>
        {authMode === "login" && demoAccessEnabled && <View style={styles.demoAccounts}><Text style={styles.modalLabel}>Accesos de prueba</Text>{demoAccounts.map((account) => <TouchableOpacity key={account.email} style={styles.demoAccountButton} onPress={() => loginDemoAccount(account)}><View><Text style={styles.demoAccountTitle}>{account.label}</Text><Text style={styles.demoAccountEmail}>{account.email}</Text></View><Text style={styles.demoAccountArrow}>›</Text></TouchableOpacity>)}<View style={styles.loginDivider}><View style={styles.loginDividerLine} /><Text style={styles.loginDividerText}>o ingresá manualmente</Text><View style={styles.loginDividerLine} /></View></View>}
        {authMode === "register" && <TextInput value={authName} onChangeText={setAuthName} placeholder="Nombre y apellido" placeholderTextColor="#71818B" style={styles.modalInput} />}
        <TextInput value={authEmail} onChangeText={setAuthEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Correo electrónico" placeholderTextColor="#71818B" style={styles.modalInput} />
        {authMode !== "recovery" && <TextInput value={authPassword} onChangeText={setAuthPassword} secureTextEntry placeholder="Contraseña (6 caracteres mínimo)" placeholderTextColor="#71818B" style={styles.modalInput} />}
        {authMode === "register" && <>
          <Text style={styles.modalLabel}>¿Cómo vas a usar LaburApp?</Text>
          <View style={styles.roleRow}>{[["client", "Quiero contratar"], ["provider", "Quiero ofrecer"]].map(([value, label]) => <TouchableOpacity key={value} onPress={() => setAuthRole(value as "client" | "provider")} style={[styles.roleChoice, authRole === value && styles.roleChoiceActive]}><Text style={[styles.roleChoiceText, authRole === value && styles.roleChoiceTextActive]}>{label}</Text></TouchableOpacity>)}</View>
          <Text style={styles.modalLabel}>Tu ciudad</Text>
          <View style={styles.roleRow}>{["Río Grande", "Ushuaia", "Tolhuin"].map((city) => <TouchableOpacity key={city} onPress={() => setAuthCity(city)} style={[styles.roleChoice, authCity === city && styles.roleChoiceActive]}><Text style={[styles.roleChoiceText, authCity === city && styles.roleChoiceTextActive]}>{city}</Text></TouchableOpacity>)}</View>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: acceptedTerms }} onPress={() => setAcceptedTerms(!acceptedTerms)} style={styles.termsRow}><Text style={styles.checkbox}>{acceptedTerms ? "☑" : "☐"}</Text><Text style={styles.termsText}>Acepto los términos y la política de privacidad.</Text></TouchableOpacity>
        </>}
        {!!authError && <Text style={styles.modalError}>{authError}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={authBusy} style={[styles.modalPrimary, authBusy && styles.buttonDisabled]} onPress={submitAuth}><Text style={styles.modalPrimaryText}>{authBusy ? "Procesando…" : authMode === "login" ? "Ingresar" : authMode === "recovery" ? "Enviar instrucciones" : supabase ? "Crear cuenta" : "Crear cuenta demo"}</Text></TouchableOpacity>
        {authMode === "login" && <TouchableOpacity accessibilityRole="button" onPress={() => { setAuthError(""); setAuthMode("recovery"); }}><Text style={styles.recoveryLink}>Olvidé mi contraseña</Text></TouchableOpacity>}
        <TouchableOpacity accessibilityRole="button" onPress={() => { setAuthError(""); setAuthMode(authMode === "login" ? "register" : "login"); }}><Text style={styles.modalSwitch}>{authMode === "login" ? "¿No tenés cuenta? Registrate" : authMode === "recovery" ? "Volver a ingresar" : "¿Ya tenés cuenta? Ingresá"}</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={profileModal} onRequestClose={() => setProfileModal(false)}>
      <View style={styles.modalBackdrop}><ProviderProfileForm key={`${profileDraft.displayName}-${profileModal}`} initialProfile={profileDraft} email={session?.email ?? ""} busy={profileBusy} remoteError={profileError} onCancel={() => setProfileModal(false)} onSubmit={(profile) => void saveProviderProfile(profile)} /></View>
    </AppModal>
    <AppModal visible={quoteProvider !== null} onRequestClose={() => setQuoteProvider(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.modalClose} onPress={() => setQuoteProvider(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>Solicitar presupuesto</Text>
        <Text style={styles.modalCopy}>{quoteProvider ? `${quoteProvider.name} · ${quoteProvider.trade}` : ""}</Text>
        <TextInput multiline value={quoteDescription} onChangeText={setQuoteDescription} placeholder="¿Qué necesitás resolver?" placeholderTextColor="#71818B" style={[styles.modalInput, styles.multiline]} />
        <TextInput value={quoteZone} onChangeText={setQuoteZone} placeholder="Zona aproximada (sin dirección exacta)" placeholderTextColor="#71818B" style={styles.modalInput} />
        <TextInput value={quoteDate} onChangeText={setQuoteDate} placeholder="Fecha o franja horaria (opcional)" placeholderTextColor="#71818B" style={styles.modalInput} />
        <Text style={styles.privacyHint}>No compartas teléfono, correo ni dirección exacta antes de contratar.</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.modalPrimary} onPress={submitQuote}><Text style={styles.modalPrimaryText}>Enviar solicitud</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={chatRequest !== null} onRequestClose={() => setChatRequestId(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.modalClose} onPress={() => setChatRequestId(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>Conversación</Text>
        <Text style={styles.modalCopy}>{chatRequest ? `${chatRequest.provider} · ${chatRequest.trade}` : ""}</Text>
        <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
          {!chatRequest?.messages?.length && <View style={styles.chatEmpty}><Text style={styles.chatEmptyTitle}>Todavía no hay mensajes</Text><Text style={styles.reviewText}>Usá este espacio para aclarar el trabajo sin compartir datos de contacto.</Text></View>}
          {chatRequest?.messages?.map((message) => <View key={message.id} style={[styles.messageBubble, message.sender === "client" ? styles.messageClient : message.sender === "provider" ? styles.messageProvider : styles.messageSystem]}>
            <Text style={styles.messageSender}>{message.sender === "client" ? "Vos" : message.sender === "provider" ? chatRequest.provider : "LaburApp"}</Text><Text style={styles.messageBody}>{message.body}</Text>
          </View>)}
        </ScrollView>
        <TextInput multiline value={chatMessage} onChangeText={setChatMessage} placeholder="Escribí un mensaje" placeholderTextColor="#71818B" style={[styles.modalInput, styles.chatInput]} />
        <Text style={styles.privacyHint}>LaburApp bloquea teléfonos, correos, redes y enlaces para proteger la contratación.</Text>
        {!!chatError && <Text style={styles.modalError}>{chatError}</Text>}
        <TouchableOpacity accessibilityRole="button" style={styles.modalPrimary} onPress={sendChatMessage}><Text style={styles.modalPrimaryText}>Enviar mensaje</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={reviewRequest !== null} onRequestClose={() => setReviewRequestId(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.modalClose} onPress={() => setReviewRequestId(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
        <Text style={styles.modalTitle}>Calificá el trabajo</Text>
        <Text style={styles.modalCopy}>{reviewRequest ? `Tu experiencia con ${reviewRequest.provider}` : ""}</Text>
        <View style={styles.starsRow}>{[1, 2, 3, 4, 5].map((rating) => <TouchableOpacity key={rating} accessibilityRole="button" accessibilityLabel={`${rating} estrellas`} onPress={() => setReviewRating(rating)}><Text style={[styles.starChoice, rating <= reviewRating && styles.starChoiceActive]}>★</Text></TouchableOpacity>)}</View>
        <TextInput multiline value={reviewComment} onChangeText={setReviewComment} placeholder="¿Cómo fue el trabajo?" placeholderTextColor="#71818B" style={[styles.modalInput, styles.multiline]} />
        <View style={styles.reviewBox}><Text style={styles.reviewTitle}>Reseña verificada</Text><Text style={styles.reviewText}>Solo se publica porque el trabajo fue pagado y finalizado dentro de la simulación de LaburApp.</Text></View>
        {!!reviewError && <Text style={styles.modalError}>{reviewError}</Text>}
        <TouchableOpacity accessibilityRole="button" style={styles.modalPrimary} onPress={submitReview}><Text style={styles.modalPrimaryText}>Publicar reseña</Text></TouchableOpacity>
      </View></View>
    </AppModal>
    <AppModal visible={quoteBuilderRequest !== null} onRequestClose={() => setQuoteBuilderRequestId(null)}>
      <View style={styles.modalBackdrop}>{quoteBuilderRequest && <QuoteBuilderForm request={quoteBuilderRequest} tariffItems={providerProfile?.tariffItems} onCancel={() => setQuoteBuilderRequestId(null)} onSubmit={sendModularQuote} />}</View>
    </AppModal>
    <View style={styles.nav}>{navigationItems.map((item) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={item} key={item} onPress={() => setTab(item)} style={styles.navItem}><Text style={[styles.navText, tab === item && styles.navActive]}>{item}</Text></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.snow }, header: { minHeight: 88, paddingHorizontal: 16, paddingVertical: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#000000", borderBottomWidth: 3, borderBottomColor: colors.blue }, headerCompact: { minHeight: 64, paddingVertical: 6, backgroundColor: "#000000" },
  brandRow: { flexDirection: "row", alignItems: "center" }, wordmarkLogo: { width: 176, height: 48 }, wordmarkLogoWide: { width: 210, height: 60 },
  loginButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: colors.cyan, backgroundColor: "#063C78" }, loginButtonText: { color: "white", fontWeight: "800", fontSize: 14 },
  content: { padding: 18, paddingBottom: 110 }, hero: { backgroundColor: colors.navy, borderRadius: 24, padding: 22, marginBottom: 24 }, heroTitle: { color: "white", fontSize: 30, lineHeight: 34, fontWeight: "900" }, heroCopy: { color: "#D6E6EE", fontSize: 15, lineHeight: 21, marginTop: 8 }, search: { backgroundColor: "white", color: colors.navy, borderRadius: 14, minHeight: 52, marginTop: 18, paddingHorizontal: 16, fontSize: 16 }, quickSearches: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }, quickSearch: { minHeight: 26, justifyContent: "center", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(255,255,255,0.08)" }, quickSearchActive: { backgroundColor: colors.orange, borderColor: colors.orange }, quickSearchText: { color: "#D8EEFA", fontSize: 11, lineHeight: 14, fontWeight: "700" }, quickSearchTextActive: { color: "white" },
  sectionHeader: { minHeight: 42, marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, zIndex: 20 }, sectionTitle: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.navy }, compactFilters: { flexDirection: "row", alignItems: "center", gap: 7, zIndex: 30 }, dropdownWrap: { position: "relative", zIndex: 31 }, dropdownButton: { height: 36, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, dropdownButtonText: { color: colors.navy, fontSize: 12, fontWeight: "800" }, dropdownChevron: { color: colors.blue, fontSize: 15, fontWeight: "900", marginTop: -3 }, dropdownMenu: { position: "absolute", top: 41, minWidth: 175, overflow: "hidden", borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: "white", shadowColor: "#001F3F", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 12 }, sortMenu: { right: 0 }, cityMenu: { right: 0 }, dropdownOption: { minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: "#EDF4F7" }, dropdownOptionActive: { backgroundColor: "#E8F6FD" }, dropdownOptionText: { color: colors.stone, fontSize: 12, fontWeight: "700" }, dropdownOptionTextActive: { color: colors.navy, fontWeight: "900" },
  card: { backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 12, flexDirection: "row" }, avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#DDF0F7", alignItems: "center", justifyContent: "center", marginRight: 13 }, avatarText: { color: colors.navy, fontWeight: "900" }, cardBody: { flex: 1 }, row: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, name: { color: colors.navy, fontSize: 17, fontWeight: "800", flex: 1 }, rating: { color: colors.navy, fontWeight: "700" }, trade: { color: colors.blue, fontWeight: "700", marginTop: 2 }, skills: { color: colors.stone, marginTop: 6 }, badge: { color: colors.green, fontSize: 12, fontWeight: "700", marginTop: 7 }, button: { backgroundColor: colors.orange, borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 12 }, buttonText: { color: "white", fontWeight: "800" },
  empty: { minHeight: 360, justifyContent: "center", alignItems: "center", padding: 28 }, emptyTitle: { color: colors.navy, fontSize: 22, fontWeight: "900", textAlign: "center" }, catLarge: { fontSize: 58, marginBottom: 14 }, secondaryButton: { marginTop: 20, borderWidth: 1, borderColor: colors.blue, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18 }, secondaryText: { color: colors.blue, fontWeight: "800" },
  sectionPage: { width: "100%", maxWidth: 760, alignSelf: "center" }, pageTitle: { color: colors.navy, fontSize: 28, fontWeight: "900" }, pageCopy: { color: colors.stone, fontSize: 15, lineHeight: 21, marginTop: 5, marginBottom: 18 }, notificationsPanel: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 15, marginBottom: 12 }, notificationHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }, notificationTitle: { color: colors.navy, fontSize: 17, fontWeight: "900", marginTop: 2 }, notificationCount: { minWidth: 30, height: 30, borderRadius: 15, color: "white", backgroundColor: colors.orange, textAlign: "center", lineHeight: 30, fontWeight: "900" }, notificationRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#EDF4F7" }, notificationCopy: { flex: 1 }, notificationName: { color: colors.navy, fontSize: 13, fontWeight: "900" }, notificationText: { color: colors.stone, fontSize: 11, marginTop: 3 }, notificationAction: { minHeight: 38, borderRadius: 9, backgroundColor: colors.orange, justifyContent: "center", paddingHorizontal: 10 }, notificationActionText: { color: "white", fontSize: 10, fontWeight: "900" }, notificationEmpty: { color: colors.stone, fontSize: 12, paddingVertical: 8 }, simulatorBanner: { backgroundColor: colors.navy, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }, simulatorCopy: { flex: 1 }, simulatorTitle: { color: "white", fontSize: 15, fontWeight: "900" }, simulatorText: { color: "#CFE5F0", fontSize: 11, lineHeight: 16, marginTop: 3 }, simulatorButton: { minHeight: 40, borderRadius: 10, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }, simulatorButtonText: { color: "white", fontSize: 11, fontWeight: "900" }, emptyPanel: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 26, alignItems: "center", marginTop: 8 }, emptyIcon: { fontSize: 48, marginBottom: 12 }, centerCopy: { color: colors.stone, textAlign: "center", lineHeight: 21, marginTop: 8, maxWidth: 430 },
  workCard: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 17, marginTop: 12 }, workCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, workStatus: { color: colors.orange, fontSize: 12, fontWeight: "900" }, statusGreen: { color: colors.green }, statusBlue: { color: colors.blue }, statusRed: { color: "#B7452B" }, workDate: { color: colors.stone, fontSize: 12 }, workProvider: { color: colors.navy, fontSize: 19, fontWeight: "900", marginTop: 12 }, workDescription: { color: colors.stone, lineHeight: 20, marginTop: 10 }, workMeta: { color: colors.navy, fontSize: 13, marginTop: 7 }, nextStep: { backgroundColor: "#FFF3E8", borderRadius: 10, padding: 11, marginTop: 13 }, nextStepText: { color: "#9A4700", fontSize: 12, fontWeight: "700" }, quoteBox: { borderWidth: 1, borderColor: "#B9DDEC", backgroundColor: "#F3FBFE", borderRadius: 13, padding: 13, marginTop: 13 }, quoteLabel: { color: colors.blue, fontSize: 11, fontWeight: "900" }, quoteAmount: { color: colors.navy, fontSize: 20, fontWeight: "900" }, quoteScope: { color: colors.navy, fontSize: 13, lineHeight: 18, marginTop: 8 }, quoteEta: { color: colors.stone, fontSize: 12, marginTop: 5 }, quoteBreakdown: { borderTopWidth: 1, borderTopColor: "#CFE5EF", marginTop: 10, paddingTop: 7 }, quoteLine: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 4 }, quoteLineName: { color: colors.stone, fontSize: 11, flex: 1 }, quoteLinePrice: { color: colors.navy, fontSize: 11, fontWeight: "800" }, quoteNotes: { color: colors.stone, fontSize: 11, lineHeight: 16, marginTop: 7, fontStyle: "italic" }, quoteValidity: { color: colors.blue, fontSize: 10, fontWeight: "800", marginTop: 7 }, paymentBox: { backgroundColor: "#E7F7F0", borderRadius: 12, padding: 12, marginTop: 11 }, paymentTitle: { color: colors.green, fontWeight: "900", fontSize: 13 }, paymentText: { color: "#315F51", fontSize: 12, lineHeight: 17, marginTop: 4 }, lastMessage: { color: colors.stone, fontSize: 12, fontStyle: "italic", marginTop: 11 }, actionRow: { flexDirection: "row", gap: 8, marginTop: 12 }, outlineAction: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.blue, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, outlineActionText: { color: colors.blue, fontSize: 12, fontWeight: "900", textAlign: "center" }, primaryAction: { flex: 1.25, minHeight: 46, borderRadius: 11, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, primaryActionFull: { minHeight: 46, borderRadius: 11, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, marginTop: 12 }, primaryActionText: { color: "white", fontSize: 12, fontWeight: "900", textAlign: "center" }, cardLinks: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 14 }, cardLink: { color: colors.blue, fontSize: 12, fontWeight: "800" }, cancelLink: { color: "#B7452B", fontSize: 12, fontWeight: "800" }, reviewPublished: { backgroundColor: "#F7FAFB", borderRadius: 12, padding: 12, marginTop: 12 }, reviewStars: { color: colors.orange, fontSize: 18, letterSpacing: 2 }, reviewPublishedText: { color: colors.navy, lineHeight: 19, marginTop: 5 }, verifiedReview: { color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 7 },
  accountCard: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginTop: 8 }, profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", marginRight: 13 }, profilePhoto: { width: 56, height: 56, borderRadius: 28, marginRight: 13 }, profileAvatarText: { color: "white", fontSize: 23, fontWeight: "900" }, accountBody: { flex: 1 }, verifiedNameRow: { flexDirection: "row", alignItems: "center", gap: 7 }, accountName: { color: colors.navy, fontSize: 18, fontWeight: "900" }, verifiedIcon: { width: 19, height: 19, borderRadius: 10, color: "white", backgroundColor: colors.blue, textAlign: "center", lineHeight: 19, fontSize: 11, fontWeight: "900" }, accountEmail: { color: colors.stone, marginTop: 2 }, localBadge: { color: colors.green, fontSize: 11, fontWeight: "800", marginTop: 7 }, followersButton: { alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, followersCount: { color: colors.navy, fontSize: 17, fontWeight: "900" }, followersLabel: { color: colors.blue, fontSize: 9, fontWeight: "800" }, followersPanel: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 15, padding: 14, marginTop: 10 }, followerRow: { minHeight: 45, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "#EDF4F7" }, followerAvatar: { width: 29, height: 29, borderRadius: 15, backgroundColor: "#DDF0F7", alignItems: "center", justifyContent: "center", marginRight: 9 }, followerInitial: { color: colors.navy, fontWeight: "900" }, followerName: { flex: 1, color: colors.navy, fontSize: 12, fontWeight: "800" }, followingBadge: { color: colors.green, fontSize: 9, fontWeight: "900" }, providerPanel: { backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 17, marginTop: 14 }, panelEyebrow: { color: colors.stone, fontSize: 11, fontWeight: "900" }, publishedBadge: { color: colors.green, backgroundColor: "#E7F7F0", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: "900" }, providerTrade: { color: colors.navy, fontSize: 21, fontWeight: "900", marginTop: 13 }, profileSection: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#E4EDF2" }, profileSectionText: { color: colors.stone, fontSize: 12, lineHeight: 18, marginTop: 7 }, certificationList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 }, certificationBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 12, backgroundColor: "#EAF8F2", borderWidth: 1, borderColor: "#B8E5D4" }, certificationIcon: { width: 16, height: 16, borderRadius: 8, color: "white", backgroundColor: colors.green, textAlign: "center", lineHeight: 16, fontSize: 9, fontWeight: "900" }, certificationText: { color: "#315F51", fontSize: 10, fontWeight: "900" }, servicePlanBadge: { color: colors.green, fontSize: 9, fontWeight: "900" }, profileServiceCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12, marginTop: 9, backgroundColor: "#FAFDFE" }, profileServiceCopy: { flex: 1 }, profileServiceName: { color: colors.navy, fontSize: 13, fontWeight: "900" }, profileServiceTime: { color: colors.stone, fontSize: 10, marginTop: 4 }, profileServicePrice: { color: colors.navy, fontSize: 17, fontWeight: "900", textAlign: "right" }, profileServiceCurrency: { color: colors.stone, fontSize: 8, fontWeight: "900", textAlign: "right" }, lockedProfileService: { minHeight: 39, justifyContent: "center", borderRadius: 10, backgroundColor: "#F1F4F6", paddingHorizontal: 11, marginTop: 7 }, lockedProfileServiceText: { color: colors.stone, fontSize: 10, fontWeight: "800" }, reviewAverage: { color: colors.orange, fontSize: 12, fontWeight: "900" }, profileReview: { backgroundColor: "#F8FBFC", borderRadius: 12, padding: 11, marginTop: 9 }, reviewAuthorRow: { flexDirection: "row", alignItems: "center" }, reviewAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#DDF0F7", alignItems: "center", justifyContent: "center", marginRight: 8 }, reviewAvatarText: { color: colors.navy, fontWeight: "900" }, reviewAuthorCopy: { flex: 1 }, reviewAuthor: { color: colors.navy, fontSize: 11, fontWeight: "900" }, reviewDate: { color: colors.stone, fontSize: 8, marginTop: 2 }, reviewStarsSmall: { color: colors.orange, fontSize: 10, letterSpacing: 1 }, reviewComment: { color: colors.stone, fontSize: 11, lineHeight: 16, marginTop: 8 }, providerInvite: { backgroundColor: colors.navy, borderRadius: 20, padding: 20, marginTop: 14 }, providerInviteTitle: { color: "white", fontSize: 20, fontWeight: "900" }, logoutButton: { alignSelf: "center", padding: 14, marginTop: 13 }, logoutText: { color: "#B7452B", fontWeight: "800" }, adminMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, adminMetric: { flexGrow: 1, flexBasis: 150, backgroundColor: "white", borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16 }, adminMetricValue: { color: colors.navy, fontSize: 27, fontWeight: "900", marginTop: 6 }, adminLink: { minHeight: 48, borderTopWidth: 1, borderTopColor: "#EDF4F7", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, adminLinkText: { color: colors.navy, fontWeight: "800" }, adminLinkArrow: { color: colors.blue, fontSize: 25 },
  toast: { position: "absolute", bottom: 72, left: 18, right: 18, backgroundColor: colors.green, borderRadius: 14, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, toastText: { color: "white", fontWeight: "700", flex: 1 }, toastClose: { color: "white", textDecorationLine: "underline", marginLeft: 12 }, nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 66, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row" }, navItem: { flex: 1, alignItems: "center", justifyContent: "center" }, navText: { color: colors.stone, fontWeight: "700" }, navActive: { color: colors.orange },
  modalBackdrop: { position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 20, backgroundColor: "rgba(0,19,40,0.62)", justifyContent: "flex-end" }, modalCard: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 30, maxHeight: "92%" }, modalClose: { position: "absolute", right: 18, top: 12, zIndex: 2, width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF5F8", alignItems: "center", justifyContent: "center" }, modalCloseText: { color: colors.navy, fontSize: 27, lineHeight: 29 }, modalTitle: { color: colors.navy, fontSize: 24, fontWeight: "900", marginTop: 4, paddingRight: 36 }, modalCopy: { color: colors.stone, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 14 }, modalInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, color: colors.navy, fontSize: 15, marginBottom: 10, backgroundColor: "#FBFDFE" }, multiline: { minHeight: 88, paddingTop: 13, textAlignVertical: "top" }, modalLabel: { color: colors.navy, fontSize: 13, fontWeight: "800", marginTop: 2, marginBottom: 8 }, demoAccounts: { marginBottom: 10 }, demoAccountButton: { minHeight: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, marginBottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FAFDFE" }, demoAccountTitle: { color: colors.navy, fontSize: 12, fontWeight: "900" }, demoAccountEmail: { color: colors.stone, fontSize: 10, marginTop: 2 }, demoAccountArrow: { color: colors.blue, fontSize: 24 }, loginDivider: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }, loginDividerLine: { height: 1, flex: 1, backgroundColor: colors.line }, loginDividerText: { color: colors.stone, fontSize: 10 }, twoTradesHint: { color: "#6D5B45", backgroundColor: "#FFF7E9", borderRadius: 9, padding: 9, fontSize: 10, lineHeight: 15, marginTop: -2, marginBottom: 9 }, roleRow: { flexDirection: "row", gap: 8, marginBottom: 12 }, roleChoice: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.line, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, roleChoiceActive: { borderColor: colors.blue, backgroundColor: "#E8F6FD" }, roleChoiceText: { color: colors.stone, fontSize: 12, fontWeight: "800" }, roleChoiceTextActive: { color: colors.navy }, termsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, checkbox: { color: colors.orange, fontSize: 22, marginRight: 7 }, termsText: { color: colors.stone, fontSize: 12, flex: 1 }, modalError: { color: "#BF4525", fontSize: 13, fontWeight: "700", marginBottom: 10 }, modalPrimary: { minHeight: 50, borderRadius: 12, backgroundColor: colors.orange, alignItems: "center", justifyContent: "center", marginTop: 4 }, modalPrimaryText: { color: "white", fontSize: 15, fontWeight: "900" }, recoveryLink: { color: colors.navy, fontWeight: "800", textAlign: "center", marginTop: 14 }, modalSwitch: { color: colors.blue, fontWeight: "800", textAlign: "center", marginTop: 15 }, privacyHint: { color: colors.stone, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  buttonDisabled: { opacity: 0.55 },
  stepLabel: { color: colors.orange, fontSize: 11, fontWeight: "900", letterSpacing: 0.7, marginTop: 2 }, progressTrack: { height: 5, borderRadius: 3, backgroundColor: "#E4EDF2", marginTop: 9, marginBottom: 15, overflow: "hidden" }, progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.orange }, reviewBox: { backgroundColor: "#EEF7FB", borderRadius: 12, padding: 13, marginBottom: 10 }, reviewTitle: { color: colors.navy, fontWeight: "900", marginBottom: 4 }, reviewText: { color: colors.stone, fontSize: 12, lineHeight: 17 }, wizardActions: { flexDirection: "row", gap: 9, alignItems: "center" }, wizardBack: { minHeight: 50, minWidth: 86, borderRadius: 12, borderWidth: 1, borderColor: colors.blue, alignItems: "center", justifyContent: "center", marginTop: 4 }, wizardBackText: { color: colors.blue, fontWeight: "900" }, wizardPrimary: { flex: 1 },
  messagesList: { maxHeight: 310, minHeight: 150, marginBottom: 11 }, messagesContent: { paddingVertical: 5, gap: 8 }, chatEmpty: { minHeight: 130, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }, chatEmptyTitle: { color: colors.navy, fontWeight: "900", marginBottom: 6 }, messageBubble: { maxWidth: "88%", borderRadius: 13, padding: 11 }, messageClient: { alignSelf: "flex-end", backgroundColor: "#DDF2FC" }, messageProvider: { alignSelf: "flex-start", backgroundColor: "#F1F4F6" }, messageSystem: { alignSelf: "center", maxWidth: "100%", backgroundColor: "#FFF3E8" }, messageSender: { color: colors.blue, fontSize: 10, fontWeight: "900", marginBottom: 3 }, messageBody: { color: colors.navy, fontSize: 13, lineHeight: 18 }, chatInput: { minHeight: 68, paddingTop: 12, textAlignVertical: "top" }, starsRow: { flexDirection: "row", justifyContent: "center", gap: 7, marginBottom: 17 }, starChoice: { color: "#CAD6DC", fontSize: 38 }, starChoiceActive: { color: colors.orange },
});
