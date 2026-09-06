import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import { containsContactAttempt, containsPriceAttempt, reviewIsEligible } from "@laburapp/shared";
import { PortfolioEditor } from "../components/PortfolioEditor";
import { ProviderProfileForm } from "../components/ProviderProfileForm";
import { QuoteBuilderForm } from "../components/QuoteBuilderForm";
import {
  applyDemoAction,
  createDemoScenarios,
  DemoAction,
  primaryActionFor,
  statusPresentation,
  submitCustomQuote,
} from "../lib/demo-flow";
import {
  loadLocalState,
  saveLocalState,
  SavedMessage,
  SavedPortfolioWork,
  SavedProviderProfile,
  SavedQuote,
  SavedRequest,
  SavedSession,
} from "../lib/local-store";
import { enqueueMirrorEvent, flushMirrorEvents } from "../lib/mirror-events";
import { backendMode, supabase } from "../lib/supabase";

const providers = [
  {
    name: "Martín Gómez",
    trade: "Gasista",
    city: "Río Grande",
    rating: "4,9",
    jobs: 52,
    badge: "Matrícula verificada",
    skills: "Calefones · Pérdidas",
  },
  {
    name: "Laura Torres",
    trade: "Electricidad",
    city: "Ushuaia",
    rating: "4,8",
    jobs: 31,
    badge: "Identidad verificada",
    skills: "Tableros · Instalaciones",
  },
  {
    name: "Nicolás Vera",
    trade: "Plomería",
    city: "Tolhuin",
    rating: "Nuevo",
    jobs: 0,
    badge: "Correo verificado",
    skills: "Cañerías · Grifería",
  },
  {
    name: "Carla Ruiz",
    trade: "Limpieza",
    city: "Río Grande",
    rating: "5,0",
    jobs: 18,
    badge: "Recomendada",
    skills: "Hogares · Oficinas",
  },
  {
    name: "Ana Pereyra",
    trade: "Cuidadora de adultos mayores",
    city: "Río Grande",
    rating: "4,9",
    jobs: 44,
    badge: "Identidad verificada",
    skills: "Acompañamiento · Higiene · Comidas",
  },
  {
    name: "Diego Mansilla",
    trade: "Despachante de aduana",
    city: "Ushuaia",
    rating: "4,8",
    jobs: 27,
    badge: "Matrícula verificada",
    skills: "Importación · Exportación · SIM",
  },
  {
    name: "Ezequiel Quispe",
    trade: "Carga y descarga",
    city: "Río Grande",
    rating: "4,7",
    jobs: 63,
    badge: "Identidad verificada",
    skills: "Depósitos · Camiones · Bultos",
  },
  {
    name: "Tomás Roldán",
    trade: "Repartidor",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 86,
    badge: "Recomendado",
    skills: "Paquetería · Cadetería · Envíos",
  },
  {
    name: "Kevin Almirón",
    trade: "Ayudante de obra",
    city: "Tolhuin",
    rating: "4,6",
    jobs: 12,
    badge: "Correo verificado",
    skills: "Mezcla · Limpieza · Materiales",
  },
  {
    name: "Julia Ferreyra",
    trade: "Pintura",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 38,
    badge: "Recomendada",
    skills: "Interiores · Exteriores · Enduido",
  },
  {
    name: "Omar Villalba",
    trade: "Albañilería",
    city: "Río Grande",
    rating: "4,8",
    jobs: 71,
    badge: "Identidad verificada",
    skills: "Revoque · Contrapiso · Reparaciones",
  },
  {
    name: "Rocío Benítez",
    trade: "Jardinería",
    city: "Tolhuin",
    rating: "5,0",
    jobs: 23,
    badge: "Recomendada",
    skills: "Poda · Césped · Mantenimiento",
  },
  {
    name: "Pablo Acosta",
    trade: "Fletes y mudanzas",
    city: "Río Grande",
    rating: "4,7",
    jobs: 55,
    badge: "Identidad verificada",
    skills: "Mudanzas · Embalaje · Traslados",
  },
  {
    name: "Mariana López",
    trade: "Costura y arreglos",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 34,
    badge: "Recomendada",
    skills: "Dobladillos · Cierres · Confección",
  },
  {
    name: "Sergio Sosa",
    trade: "Mecánica",
    city: "Río Grande",
    rating: "4,8",
    jobs: 92,
    badge: "Identidad verificada",
    skills: "Frenos · Tren delantero · Service",
  },
  {
    name: "Nadia Medina",
    trade: "Asistencia administrativa",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 19,
    badge: "Correo verificado",
    skills: "Facturación · Agenda · Documentación",
  },
  {
    name: "Bruno Herrera",
    trade: "Informática y soporte técnico",
    city: "Tolhuin",
    rating: "4,9",
    jobs: 41,
    badge: "Recomendado",
    skills: "PC · Redes · Configuración",
  },
  {
    name: "Teresa Juárez",
    trade: "Cuidado de niños",
    city: "Río Grande",
    rating: "5,0",
    jobs: 29,
    badge: "Identidad verificada",
    skills: "Niñera · Apoyo escolar · Rutinas",
  },
  {
    name: "Ariel Navarro",
    trade: "Herrería",
    city: "Ushuaia",
    rating: "4,8",
    jobs: 47,
    badge: "Identidad verificada",
    skills: "Rejas · Portones · Soldadura",
  },
  {
    name: "Victoria Silva",
    trade: "Carpintería",
    city: "Río Grande",
    rating: "4,9",
    jobs: 36,
    badge: "Recomendada",
    skills: "Muebles · Estantes · Reparaciones",
  },
  {
    name: "Lucas Ortiz",
    trade: "Cerrajería",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 68,
    badge: "Identidad verificada",
    skills: "Aperturas · Cerraduras · Copias",
  },
  {
    name: "Belén Figueroa",
    trade: "Refrigeración",
    city: "Río Grande",
    rating: "4,8",
    jobs: 32,
    badge: "Matrícula cargada",
    skills: "Heladeras · Cámaras · Mantenimiento",
  },
  {
    name: "Cristian Romero",
    trade: "Reparación de electrodomésticos",
    city: "Tolhuin",
    rating: "4,6",
    jobs: 26,
    badge: "Correo verificado",
    skills: "Lavarropas · Hornos · Secarropas",
  },
  {
    name: "Mirta Cáceres",
    trade: "Cocina domiciliaria",
    city: "Ushuaia",
    rating: "5,0",
    jobs: 51,
    badge: "Recomendada",
    skills: "Viandas · Comidas caseras · Eventos",
  },
  {
    name: "Franco Duarte",
    trade: "Chofer",
    city: "Río Grande",
    rating: "4,8",
    jobs: 73,
    badge: "Documentación verificada",
    skills: "Traslados · Repartos · Viajes",
  },
  {
    name: "Luciana Cabrera",
    trade: "Cuidado de mascotas",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 39,
    badge: "Recomendada",
    skills: "Paseos · Visitas · Alimentación",
  },
  {
    name: "Raúl Giménez",
    trade: "Mantenimiento de edificios",
    city: "Río Grande",
    rating: "4,7",
    jobs: 84,
    badge: "Identidad verificada",
    skills: "Consorcios · Reparaciones · Guardias",
  },
  {
    name: "Agustina Molina",
    trade: "Fotografía",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 22,
    badge: "Recomendada",
    skills: "Eventos · Productos · Retratos",
  },
  {
    name: "Matías Leiva",
    trade: "Soldadura",
    city: "Tolhuin",
    rating: "4,8",
    jobs: 43,
    badge: "Identidad verificada",
    skills: "Eléctrica · MIG · Reparaciones",
  },
  {
    name: "Patricia Vargas",
    trade: "Acompañante terapéutica",
    city: "Río Grande",
    rating: "5,0",
    jobs: 31,
    badge: "Matrícula verificada",
    skills: "Acompañamiento · Rutinas · Inclusión",
  },
  {
    name: "Gonzalo Castro",
    trade: "Gestor de trámites",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 48,
    badge: "Identidad verificada",
    skills: "Automotor · Formularios · Turnos",
  },
  {
    name: "Daniela Ibáñez",
    trade: "Manicuría",
    city: "Río Grande",
    rating: "4,9",
    jobs: 66,
    badge: "Recomendada",
    skills: "Semipermanente · Kapping · Esculpidas",
  },
  {
    name: "Javier Ferreyra",
    trade: "Seguridad e higiene",
    city: "Ushuaia",
    rating: "4,8",
    jobs: 25,
    badge: "Matrícula verificada",
    skills: "Obras · Capacitaciones · Informes",
  },
  {
    name: "Micaela Arias",
    trade: "Community manager",
    city: "Tolhuin",
    rating: "4,8",
    jobs: 17,
    badge: "Correo verificado",
    skills: "Redes · Contenido · Respuestas",
  },
  {
    name: "Andrés Godoy",
    trade: "Vidriería",
    city: "Río Grande",
    rating: "4,7",
    jobs: 37,
    badge: "Identidad verificada",
    skills: "Ventanas · Espejos · DVH",
  },
  {
    name: "Paola Núñez",
    trade: "Lavandería y planchado",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 58,
    badge: "Recomendada",
    skills: "Lavado · Planchado · Retiro",
  },
  {
    name: "Héctor Ojeda",
    trade: "Techista",
    city: "Río Grande",
    rating: "4,8",
    jobs: 46,
    badge: "Identidad verificada",
    skills: "Filtraciones · Chapa · Aislación",
  },
  {
    name: "Noelia Ríos",
    trade: "Peluquería",
    city: "Tolhuin",
    rating: "4,9",
    jobs: 61,
    badge: "Recomendada",
    skills: "Corte · Color · Peinados",
  },
  {
    name: "Emanuel Peralta",
    trade: "Instalador de durlock",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 33,
    badge: "Identidad verificada",
    skills: "Cielorrasos · Tabiques · Revestimientos",
  },
  {
    name: "Silvina Campos",
    trade: "Masajista",
    city: "Río Grande",
    rating: "4,9",
    jobs: 28,
    badge: "Matrícula cargada",
    skills: "Descontracturante · Relajación · Drenaje",
  },
  {
    name: "Ignacio Luna",
    trade: "Tapicería",
    city: "Ushuaia",
    rating: "4,8",
    jobs: 24,
    badge: "Identidad verificada",
    skills: "Sillones · Sillas · Retapizado",
  },
  {
    name: "Carolina Bravo",
    trade: "Decoración de eventos",
    city: "Río Grande",
    rating: "5,0",
    jobs: 35,
    badge: "Recomendada",
    skills: "Cumpleaños · Ambientación · Mesas",
  },
  {
    name: "Walter Maidana",
    trade: "Operador de autoelevador",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 76,
    badge: "Documentación verificada",
    skills: "Depósitos · Movimiento · Carga",
  },
  {
    name: "Florencia Vega",
    trade: "Traducción",
    city: "Tolhuin",
    rating: "4,9",
    jobs: 21,
    badge: "Identidad verificada",
    skills: "Inglés · Documentos · Turismo",
  },
  {
    name: "Gabriel Díaz",
    trade: "Logística de depósito",
    city: "Río Grande",
    rating: "4,8",
    jobs: 69,
    badge: "Identidad verificada",
    skills: "Inventario · Picking · Expedición",
  },
  {
    name: "Lorena Suárez",
    trade: "Limpieza industrial",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 54,
    badge: "Recomendada",
    skills: "Galpones · Final de obra · Oficinas",
  },
  {
    name: "Federico Paredes",
    trade: "Cadetería",
    city: "Río Grande",
    rating: "4,9",
    jobs: 88,
    badge: "Identidad verificada",
    skills: "Trámites · Encomiendas · Compras",
  },
  {
    name: "Cecilia Torres",
    trade: "Enfermería domiciliaria",
    city: "Ushuaia",
    rating: "5,0",
    jobs: 42,
    badge: "Matrícula verificada",
    skills: "Curaciones · Controles · Medicación",
  },
  {
    name: "Pedro Ledesma",
    trade: "Armado de muebles",
    city: "Tolhuin",
    rating: "4,8",
    jobs: 30,
    badge: "Recomendado",
    skills: "Placares · Mesas · Estanterías",
  },
  {
    name: "Soledad Quiroga",
    trade: "Servicios de hotelería",
    city: "Ushuaia",
    rating: "4,7",
    jobs: 49,
    badge: "Identidad verificada",
    skills: "Habitaciones · Desayuno · Recepción",
  },
  {
    name: "Sebastián Ferreyra",
    trade: "Mantenimiento de embarcaciones",
    city: "Río Grande",
    rating: "4,8",
    jobs: 20,
    badge: "Identidad verificada",
    skills: "Motores · Cubierta · Reparaciones",
  },
  {
    name: "Profesional Demo",
    trade: "Gasista",
    city: "Río Grande",
    rating: "5,0",
    jobs: 3,
    badge: "Matrícula verificada",
    skills: "Calefones · Cañerías · Instalaciones",
  },
  {
    name: "Valentina Rossi",
    trade: "Guía turístico/a y excursiones",
    city: "Ushuaia",
    rating: "4,9",
    jobs: 37,
    badge: "Identidad verificada",
    skills: "Senderismo · Excursiones · Circuitos locales",
  },
  {
    name: "Camila Soto",
    trade: "Candy",
    city: "Río Grande",
    rating: "4,8",
    jobs: 24,
    badge: "Identidad verificada",
    skills: "Candy bar · Mesas dulces · Cumpleaños",
  },
  {
    name: "Julieta Navarro",
    trade: "Wedding planner",
    city: "Ushuaia",
    rating: "5,0",
    jobs: 18,
    badge: "Identidad verificada",
    skills: "Planificación · Proveedores · Coordinación",
  },
];

const quickSearches = [
  "Gasista",
  "Plomería",
  "Electricidad",
  "Limpieza",
  "Adultos mayores",
  "Aduana",
  "Carga y descarga",
  "Repartidor",
  "Ayudante de obra",
  "Pintura",
  "Fletes",
  "Jardinería",
  "Mecánica",
  "Costura",
  "Informática",
];
type Provider = (typeof providers)[number] & { providerId?: string; publicId?: string };
type ProviderSort = "recent" | "jobs" | "rating";
type FeaturedWork = {
  title: string;
  description: string;
  photoUri: string;
};
type PublicPortfolioWork = {
  id: string;
  title: string;
  description: string;
  photoUris: string[];
};
type PublicProfileDetails = {
  bio: string;
  certifications: string[];
  diagnosticPrice?: number;
  reviews: Array<{ author: string; comment: string; rating: number }>;
};
type InfoPageKey = "terms" | "privacy" | "about" | "usage" | "certifications";

const CONTACT_WARNING = "No está permitido compartir teléfonos de contacto o emails.";
const FREE_WEEKLY_REQUEST_LIMIT = 3;
const REQUEST_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000;
const CLIENT_HISTORY_MS = 183 * 24 * 60 * 60 * 1000;
const reviewQualitySuggestions = [
  "Puntualidad",
  "Rapidez",
  "Buena comunicación",
  "Buena charla",
  "Prolijidad",
  "Amabilidad",
  "Cumplió lo acordado",
];
const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minutes}`;
});
const hiredStatuses = new Set([
  "quote_accepted",
  "payment_pending",
  "payment_authorized",
  "funds_held",
  "scheduled",
  "in_progress",
  "completion_proposed",
  "client_confirmation_pending",
  "completed",
  "funds_released",
  "disputed",
  "refunded",
]);

const completedStatuses = new Set(["completed", "funds_released"]);
const cancellableStatuses = new Set(["request_created", "request_sent", "provider_reviewing", "quote_sent", "quote_revision_requested"]);

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - day + 1);
  return now.getTime();
}

function requestExpiresAt(request: SavedRequest) {
  return request.expiresAt
    ? new Date(request.expiresAt).getTime()
    : new Date(request.createdAt).getTime() + REQUEST_LIFETIME_MS;
}

function activeRequest(request: SavedRequest) {
  return hiredStatuses.has(request.status) || requestExpiresAt(request) > Date.now();
}

const featuredWorks: Record<string, FeaturedWork> = {
  "Martín Gómez": { title: "Reparación de calefón", description: "Diagnóstico, cambio de componentes y prueba final de funcionamiento seguro.", photoUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=75" },
  "Laura Torres": { title: "Armado de tablero eléctrico", description: "Reordenamiento del tablero, protecciones nuevas y rotulado completo de circuitos.", photoUri: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=75" },
  "Nicolás Vera": { title: "Cambio de grifería", description: "Retiro de la grifería anterior, colocación y control de pérdidas.", photoUri: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=75" },
  "Carla Ruiz": { title: "Limpieza final de obra", description: "Limpieza profunda de ambientes, aberturas, pisos y superficies delicadas.", photoUri: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=75" },
  "Ana Pereyra": { title: "Acompañamiento domiciliario", description: "Organización de rutina diaria y acompañamiento personalizado en el hogar.", photoUri: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=75" },
  "Diego Mansilla": { title: "Gestión de importación", description: "Preparación documental y seguimiento integral hasta la liberación de la carga.", photoUri: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=75" },
  "Ezequiel Quispe": { title: "Organización de depósito", description: "Descarga, clasificación y ubicación segura de mercadería pesada.", photoUri: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=900&q=75" },
  "Tomás Roldán": { title: "Entrega de paquetería", description: "Ruta urbana optimizada y entrega confirmada dentro de la franja acordada.", photoUri: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=75" },
  "Kevin Almirón": { title: "Preparación de materiales", description: "Asistencia de obra, preparación de mezcla y orden del espacio de trabajo.", photoUri: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=75" },
  "Julia Ferreyra": { title: "Pintura interior", description: "Preparación de paredes, enduido y terminación uniforme en dos manos.", photoUri: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=75" },
  "Profesional Demo": { title: "Revisión integral de calefón", description: "Diagnóstico, limpieza, recambio de componentes y prueba final de funcionamiento.", photoUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=75" },
  "Valentina Rossi": { title: "Senderismo guiado en Ushuaia", description: "Recorrido personalizado con orientación, interpretación del paisaje y paradas fotográficas.", photoUri: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=75" },
  "Camila Soto": { title: "Candy bar para cumpleaños", description: "Diseño y armado de una mesa dulce personalizada para la celebración.", photoUri: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=75" },
  "Julieta Navarro": { title: "Coordinación integral de boda", description: "Planificación de proveedores, tiempos y acompañamiento durante todo el evento.", photoUri: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=75" },
};

const portfolioPhotoPool = [
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=75",
  "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=75",
];

const demoPortfolioWorks: SavedPortfolioWork[] = [
  {
    id: "demo-work-1",
    service: "Revisión integral de calefón",
    description: "Diagnóstico, limpieza, recambio de componentes y prueba final de funcionamiento.",
    photos: portfolioPhotoPool.slice(0, 3).map((uri, index) => ({ id: `demo-work-1-photo-${index + 1}`, uri, watermarked: true })),
  },
  {
    id: "demo-work-2",
    service: "Renovación de cañería",
    description: "Reemplazo del tramo deteriorado, nuevas conexiones y control completo de pérdidas.",
    photos: portfolioPhotoPool.slice(3, 6).map((uri, index) => ({ id: `demo-work-2-photo-${index + 1}`, uri, watermarked: true })),
  },
  {
    id: "demo-work-3",
    service: "Puesta a punto de instalación",
    description: "Revisión preventiva, ajuste de conexiones y verificación final de seguridad.",
    photos: portfolioPhotoPool.slice(6, 9).map((uri, index) => ({ id: `demo-work-3-photo-${index + 1}`, uri, watermarked: true })),
  },
];

const infoPages: Record<InfoPageKey, { title: string; body: string }> = {
  terms: { title: "Términos y condiciones", body: "Reglas de uso de LaburApp para clientes y profesionales, contratación, presupuestos, pagos, cancelaciones y responsabilidades." },
  privacy: { title: "Política de privacidad", body: "Cómo protegemos los datos personales, qué información utiliza la aplicación y cómo se puede solicitar su corrección o eliminación." },
  about: { title: "Nosotros", body: "LaburApp conecta personas con profesionales locales, priorizando perfiles claros, trabajos verificables y presupuestos ordenados." },
  usage: { title: "Mecánica de uso", body: "Buscá un servicio, compará perfiles y trabajos realizados, pedí un presupuesto y seguí todo desde tu cuenta." },
  certifications: { title: "Certificaciones", body: "Las insignias permiten distinguir identidad, matrículas y documentación revisada. Cada validación mostrará su alcance y vigencia." },
};

function featuredWorkFor(provider: Provider): FeaturedWork {
  return featuredWorks[provider.name] ?? {
    title: `Trabajo de ${provider.trade}`,
    description: `Trabajo finalizado en ${provider.city}, seleccionado por el profesional como muestra destacada.`,
    photoUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=75",
  };
}

function publicPortfolioFor(provider: Provider): PublicPortfolioWork[] {
  if (provider.name === "Profesional Demo") {
    return demoPortfolioWorks.map((work) => ({
      id: work.id,
      title: work.service,
      description: work.description,
      photoUris: work.photos.map((photo) => photo.uri),
    }));
  }
  const featured = featuredWorkFor(provider);
  const specialties = provider.skills.split(" · ");
  return [
    { id: `${provider.name}-work-1`, title: featured.title, description: featured.description, photoUris: [featured.photoUri, portfolioPhotoPool[1], portfolioPhotoPool[2]] },
    { id: `${provider.name}-work-2`, title: `${specialties[0] ?? provider.trade}: trabajo terminado`, description: `Trabajo de ${provider.trade.toLowerCase()} realizado en ${provider.city}, con revisión y entrega final.`, photoUris: portfolioPhotoPool.slice(3, 6) },
    { id: `${provider.name}-work-3`, title: `${specialties[1] ?? provider.trade}: puesta a punto`, description: "Preparación, ejecución y control final documentado por el profesional.", photoUris: portfolioPhotoPool.slice(6, 9) },
  ];
}

function publicDetailsFor(provider: Provider): PublicProfileDetails {
  if (provider.name === "Profesional Demo") {
    return {
      bio: "Mantenimiento, diagnóstico y reparaciones domiciliarias con atención clara y ordenada. Formación técnica y más de seis años de experiencia.",
      certifications: ["Matrícula vigente", "Instalaciones domiciliarias"],
      diagnosticPrice: 35000,
      reviews: [
        { author: "María Fernández", rating: 5, comment: "Llegó en horario, explicó el problema y dejó todo funcionando." },
        { author: "Jorge Acosta", rating: 5, comment: "Muy prolijo y el presupuesto coincidió con el trabajo realizado." },
      ],
    };
  }
  return {
    bio: `${provider.name} ofrece servicios de ${provider.trade.toLowerCase()} en ${provider.city}, con experiencia respaldada por sus trabajos publicados.`,
    certifications: [provider.badge],
    reviews: [],
  };
}

const demoAccounts: Array<SavedSession & { label: string }> = [
  {
    label: "Entrar como cliente",
    name: "Cliente Demo",
    email: "cliente@laburapp.demo",
    role: "client",
  },
  {
    label: "Entrar como profesional",
    name: "Profesional Demo",
    email: "profesional@laburapp.demo",
    role: "provider",
  },
  {
    label: "Entrar como administrador",
    name: "Administrador",
    email: "admin@laburapp.demo",
    role: "admin",
  },
];

function createDemoProviderProfile(displayName = "Profesional Demo"): SavedProviderProfile {
  const services = [
    {
      id: "demo-gasista",
      family: "Instalaciones",
      service: "Gasista",
      specialties: ["Gasista"],
      description: "Reviso instalaciones domiciliarias, detecto fallas y explico las opciones de reparación antes de comenzar.",
      price: 0,
      startTime: "08:00",
      endTime: "18:00",
    },
  ];
  return {
    publicId: "LP000001",
    displayName,
    city: "Río Grande",
    trade: "Gasista",
    diagnosticPrice: 35000,
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
    coverageAreas: ["Río Grande"],
    portfolioWorks: demoPortfolioWorks,
    skills: services.map((item) => item.service).join(", "),
    zones: "Solo localidad",
    availability: "Solo localidad",
    tariffItems: [{ id: "diagnostic-fee", trade: "Gasista", label: "Diagnóstico / visita técnica", unit: "visita", unitPrice: 35000, enabled: true }],
    published: true,
  };
}

const lightColors = {
  navy: "#063C78",
  brandNavy: "#063C78",
  blue: "#078EE9",
  cyan: "#39BCEB",
  snow: "#F4FAFD",
  stone: "#5E7183",
  orange: "#FF7800",
  green: "#16825B",
  line: "#D6E8F2",
  surface: "#FFFFFF",
  surfaceSoft: "#F7FAFB",
  input: "#FBFDFE",
  avatar: "#DDF0F7",
  raised: "#EEF5F8",
  successSurface: "#E7F7F0",
  successText: "#315F51",
  warningSurface: "#FFF3E8",
  warningText: "#9A4700",
  danger: "#B7452B",
};
const darkColors: typeof lightColors = {
  navy: "#EAF4FC",
  brandNavy: "#063C78",
  blue: "#49B2F5",
  cyan: "#66D0F5",
  snow: "#07121D",
  stone: "#AFC2D2",
  orange: "#FF8A1F",
  green: "#56D3A1",
  line: "#29465B",
  surface: "#10202F",
  surfaceSoft: "#162A3B",
  input: "#132738",
  avatar: "#183A54",
  raised: "#1B3041",
  successSurface: "#12372C",
  successText: "#87E5C1",
  warningSurface: "#3A291B",
  warningText: "#FFC078",
  danger: "#FF8A72",
};
type ThemeColors = typeof lightColors;
const THEME_STORAGE_KEY = "laburapp-color-theme";
const officialWordmark = require("../assets/brand/laburapp-wordmark-clean.png");
const demoAccessEnabled = process.env.EXPO_PUBLIC_DEMO_ACCESS !== "false";
const cityChoices = [
  "San Sebastián",
  "Río Grande",
  "Tolhuin",
  "Almanza",
  "Ushuaia",
];
const driveProfessionalsFolderId = "1YyLePscAWsVX8O9aIKaQTaMHSPpMq3ZD";

function safeFolderPart(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "Profesional"
  );
}

function AppModal({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: ReactNode;
}) {
  if (!visible) return null;
  if (Platform.OS === "web") return <>{children}</>;
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      {children}
    </Modal>
  );
}

export default function Home() {
  const { width } = useWindowDimensions();
  const [darkMode, setDarkMode] = useState(true);
  const colors = darkMode ? darkColors : lightColors;
  const styles = useMemo(() => createStyles(colors), [darkMode]);
  const [query, setQuery] = useState("");
  const [providerSort, setProviderSort] = useState<ProviderSort>("recent");
  const [cityFilter, setCityFilter] = useState("Todas");
  const [openFilter, setOpenFilter] = useState<"sort" | "city" | null>(null);
  const [expandedProviderName, setExpandedProviderName] = useState<string | null>(null);
  const [publicProfileProvider, setPublicProfileProvider] = useState<Provider | null>(null);
  const [workPhoto, setWorkPhoto] = useState<{ provider: Provider; work: FeaturedWork } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoPage, setInfoPage] = useState<InfoPageKey | null>(null);
  const [tab, setTab] = useState("Inicio");
  const [requested, setRequested] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<
    "login" | "register" | "recovery" | null
  >(null);
  const [signedInName, setSignedInName] = useState<string | null>(null);
  const [session, setSession] = useState<SavedSession | null>(null);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [providerProfile, setProviderProfile] =
    useState<SavedProviderProfile | null>(null);
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
  const [quoteStartTime, setQuoteStartTime] = useState("08:00");
  const [quoteEndTime, setQuoteEndTime] = useState("18:00");
  const [quoteTimePicker, setQuoteTimePicker] = useState<"start" | "end" | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [profileDraft, setProfileDraft] = useState<SavedProviderProfile>({
    displayName: "",
    city: "",
    trade: "",
    bio: "",
    skills: "",
    zones: "",
    availability: "",
    published: false,
  });
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [portfolioModal, setPortfolioModal] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [followersVisible, setFollowersVisible] = useState(false);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatError, setChatError] = useState("");
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewQualities, setReviewQualities] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [acceptQuoteRequestId, setAcceptQuoteRequestId] = useState<string | null>(null);
  const [completionQr, setCompletionQr] = useState<{ requestId: string; value: string } | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [manualQrCode, setManualQrCode] = useState("");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [clientPlan, setClientPlan] = useState<"free" | "plus">("free");
  const [clientPhotoBusy, setClientPhotoBusy] = useState(false);
  const [quoteBuilderRequestId, setQuoteBuilderRequestId] = useState<
    string | null
  >(null);
  const compactHeader = width < 720;
  const authButtonLabel = signedInName
    ? `Hola, ${signedInName.split(" ")[0]}`
    : "Ingresar";
  const navigationItems =
    session?.role === "admin"
      ? ["Inicio", "Panel", "Perfil"]
      : session?.role === "client"
        ? ["Inicio", "Solicitudes", "QR", "Contratados", "Perfil"]
        : ["Inicio", "Trabajos", "Perfil"];
  const isDemoSession = session?.email.endsWith("@laburapp.demo") ?? false;

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedTheme) => {
      if (savedTheme === "light") setDarkMode(false);
      if (savedTheme === "dark") setDarkMode(true);
    });
    void flushMirrorEvents();
    loadLocalState().then((saved) => {
      const restoredProviderProfile =
        saved.session?.email === "profesional@laburapp.demo" &&
        (!saved.providerProfile || !saved.providerProfile.portfolioWorks?.length)
          ? createDemoProviderProfile(saved.session.name)
          : saved.providerProfile;
      setSession(saved.session);
      setSignedInName(saved.session?.name ?? null);
      setRequests(saved.requests);
      setProviderProfile(restoredProviderProfile);
      if (restoredProviderProfile) setProfileDraft(restoredProviderProfile);
      setHydrated(true);
    });
  }, []);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      void AsyncStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      return next;
    });
  }

  function goHome() {
    setTab("Inicio");
    setQuery("");
    setCityFilter("Todas");
    setOpenFilter(null);
    setExpandedProviderName(null);
    setPublicProfileProvider(null);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!hydrated) return;
    saveLocalState({ session, requests, providerProfile }).catch(() =>
      setRequested("No pudimos guardar los cambios en este dispositivo."),
    );
  }, [hydrated, session, requests, providerProfile]);

  useEffect(() => {
    if (!hydrated || !session || !supabase || isDemoSession) return;
    let cancelled = false;
    void (async () => {
      const userResult = await supabase.auth.getUser();
      const currentUserId = userResult.data.user?.id;
      if (!currentUserId || cancelled) return;
      await supabase.rpc("purge_expired_client_data");
      if (session.role === "client") {
        const membership = await supabase
          .from("client_memberships")
          .select("plan_code")
          .eq("client_id", currentUserId)
          .maybeSingle();
        if (!cancelled && membership.data?.plan_code === "plus") setClientPlan("plus");
      }
      const result = await supabase
        .from("service_requests")
        .select("id, provider_id, description, approximate_zone, desired_at, preferred_start_time, preferred_end_time, status, created_at, expires_at, completion_verified_at, profiles!service_requests_provider_id_fkey(full_name), quotes(total, scope, eta, version, pricing_mode, items, notes, valid_days, expires_at), jobs(id, completion_verified_at, updated_at), messages(id, sender_id, body, created_at, expires_at)")
        .gte("created_at", new Date(Date.now() - CLIENT_HISTORY_MS).toISOString())
        .order("created_at", { ascending: false });
      if (result.error || cancelled) return;
      const providerIds = Array.from(new Set((result.data ?? []).map((row: any) => row.provider_id)));
      const tradesResult = providerIds.length
        ? await supabase.from("provider_services").select("provider_id, trade_name, position").in("provider_id", providerIds).order("position")
        : { data: [] };
      const trades = new Map<string, string>();
      for (const row of tradesResult.data ?? []) if (!trades.has(row.provider_id)) trades.set(row.provider_id, row.trade_name);
      const remoteRequests: SavedRequest[] = (result.data ?? []).map((row: any) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const quoteRows = Array.isArray(row.quotes) ? [...row.quotes].sort((a, b) => b.version - a.version) : [];
        const quote = quoteRows[0];
        const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
        const activeMessages = (Array.isArray(row.messages) ? row.messages : [])
          .filter((message: any) => !message.expires_at || new Date(message.expires_at).getTime() > Date.now())
          .map((message: any) => ({
            id: message.id,
            sender: message.sender_id === currentUserId
              ? session.role === "provider" ? "provider" : "client"
              : session.role === "client" ? "provider" : "client",
            body: message.body,
            createdAt: message.created_at,
            expiresAt: message.expires_at,
          }));
        return {
          id: row.id,
          jobId: job?.id,
          providerId: row.provider_id,
          clientEmail: session.role === "client" ? session.email : undefined,
          provider: profile?.full_name ?? providerProfile?.displayName ?? "Profesional",
          trade: trades.get(row.provider_id) ?? "Servicio profesional",
          description: row.description,
          zone: row.approximate_zone ?? "",
          desiredAt: [row.desired_at ? new Date(row.desired_at).toLocaleDateString("es-AR") : "", row.preferred_start_time && row.preferred_end_time ? `${String(row.preferred_start_time).slice(0, 5)} a ${String(row.preferred_end_time).slice(0, 5)}` : ""].filter(Boolean).join(" · "),
          preferredStartTime: row.preferred_start_time?.slice(0, 5),
          preferredEndTime: row.preferred_end_time?.slice(0, 5),
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          completedAt: job?.updated_at,
          completionVerifiedAt: row.completion_verified_at ?? job?.completion_verified_at,
          status: row.status,
          messages: activeMessages,
          quote: quote ? {
            amount: Number(quote.total), scope: quote.scope, eta: quote.eta ?? "", version: quote.version,
            pricingMode: quote.pricing_mode, items: quote.items ?? [], notes: quote.notes ?? "", validDays: quote.valid_days, expiresAt: quote.expires_at,
          } : undefined,
        };
      });
      if (!cancelled) setRequests((current) => [...remoteRequests, ...current.filter((local) => !remoteRequests.some((remote) => remote.id === local.id))]);
    })();
    return () => { cancelled = true; };
  }, [hydrated, session?.email, session?.role, isDemoSession, providerProfile?.displayName, providerProfile?.publicId]);

  async function submitAuth() {
    setAuthError("");
    if (!authEmail.includes("@"))
      return setAuthError("Ingresá un correo válido.");
    if (authMode === "recovery") {
      setAuthBusy(true);
      const { error } = supabase
        ? await supabase.auth.resetPasswordForEmail(
            authEmail.trim().toLowerCase(),
            {
              redirectTo:
                process.env.EXPO_PUBLIC_APP_URL ??
                "https://laburapp-iota.vercel.app",
            },
          )
        : { error: null };
      setAuthBusy(false);
      if (error) return setAuthError(error.message);
      setAuthMode(null);
      setRequested(
        supabase
          ? "Revisá tu correo para recuperar la cuenta."
          : "Modo demostración: no se envió un correo real.",
      );
      return;
    }
    if (authPassword.length < 6)
      return setAuthError("La contraseña debe tener al menos 6 caracteres.");
    if (authMode === "register" && authName.trim().length < 2)
      return setAuthError("Ingresá tu nombre y apellido.");
    if (authMode === "register" && !acceptedTerms)
      return setAuthError(
        "Aceptá los términos y la política de privacidad para continuar.",
      );
    setAuthBusy(true);
    let name =
      authMode === "register" ? authName.trim() : authEmail.split("@")[0];
    let resolvedRole: SavedSession["role"] =
      authMode === "register" ? authRole : "client";
    let photoUri: string | undefined;
    if (supabase) {
      const result =
        authMode === "register"
          ? await supabase.auth.signUp({
              email: authEmail.trim().toLowerCase(),
              password: authPassword,
              options: {
                data: { full_name: name, role: authRole, city: authCity },
              },
            })
          : await supabase.auth.signInWithPassword({
              email: authEmail.trim().toLowerCase(),
              password: authPassword,
            });
      if (result.error) {
        setAuthBusy(false);
        return setAuthError(result.error.message);
      }
      if (authMode === "register" && !result.data.session) {
        setAuthBusy(false);
        setAuthMode(null);
        setAuthPassword("");
        setRequested(
          "Cuenta creada. Revisá tu correo para confirmarla y después ingresá.",
        );
        return;
      }
      name = String(result.data.user?.user_metadata?.full_name || name);
      if (authMode === "login" && result.data.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", result.data.user.id);
        resolvedRole = roles?.some((item) => item.role === "admin")
          ? "admin"
          : roles?.some((item) => item.role === "provider")
            ? "provider"
            : "client";
        const profileResult = await supabase
          .from("profiles")
          .select("full_name, avatar_path")
          .eq("id", result.data.user.id)
          .maybeSingle();
        if (profileResult.data?.full_name) name = profileResult.data.full_name;
        photoUri = profileResult.data?.avatar_path ?? undefined;
      }
    } else if (authMode === "login") {
      const demo = demoAccounts.find(
        (account) => account.email === authEmail.trim().toLowerCase(),
      );
      if (demo) {
        name = demo.name;
        resolvedRole = demo.role;
      }
    }
    const nextSession: SavedSession = {
      name,
      email: authEmail.trim().toLowerCase(),
      role: resolvedRole,
      photoUri,
    };
    setSession(nextSession);
    setSignedInName(name);
    if (authMode === "register")
      void enqueueMirrorEvent("Usuarios", {
        user_name: name,
        email: nextSession.email,
        role: nextSession.role,
        city: authCity,
        source: supabase ? "supabase" : "mobile_demo",
      });
    setAuthBusy(false);
    setAuthMode(null);
    setAuthPassword("");
    if (authMode === "register" && authRole === "provider") {
      setProfileDraft((current) => ({
        ...current,
        displayName: name,
        city: authCity,
      }));
      setProfileModal(true);
    }
  }

  function loginDemoAccount(account: SavedSession) {
    setSession(account);
    setSignedInName(account.name);
    setAuthMode(null);
    setAuthError("");
    setAuthPassword("");
    if (account.role === "admin") setTab("Panel");
    if (
      account.role === "provider" &&
      (!providerProfile || providerProfile.displayName === "Profesional Demo")
    ) {
      setProviderProfile(createDemoProviderProfile(account.name));
    }
  }

  async function submitQuote() {
    if (!quoteProvider) return;
    const weeklyRequests = requests.filter(
      (request) =>
        (!request.clientEmail || request.clientEmail === session?.email) &&
        new Date(request.createdAt).getTime() >= startOfCurrentWeek() &&
        request.status !== "cancelled",
    ).length;
    if (clientPlan === "free" && weeklyRequests >= FREE_WEEKLY_REQUEST_LIMIT)
      return setRequested(
        "Ya usaste tus 3 solicitudes gratuitas de esta semana. Para pedir más necesitás la suscripción Cliente Plus.",
      );
    if (quoteDescription.trim().length < 10)
      return setRequested("Contanos un poco más (mínimo 10 caracteres)");
    if (containsContactAttempt(`${quoteDescription} ${quoteZone}`))
      return setRequested(CONTACT_WARNING);
    if (quoteStartTime >= quoteEndTime)
      return setRequested("El horario hasta debe ser posterior al horario desde.");
    let requestId = `${Date.now()}`;
    let providerId = quoteProvider.providerId;
    let storedInDatabase = false;
    if (supabase && !isDemoSession) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return setRequested("Volvé a ingresar para enviar la solicitud.");
      if (!providerId) {
        const providerResult = await supabase
          .from("profiles")
          .select("id")
          .eq("full_name", quoteProvider.name)
          .limit(1)
          .maybeSingle();
        providerId = providerResult.data?.id;
      }
      if (providerId) {
        const desiredAt = /^\d{4}-\d{2}-\d{2}$/.test(quoteDate.trim())
          ? `${quoteDate.trim()}T${quoteStartTime}:00-03:00`
          : null;
        const requestPayload = {
          client_id: userData.user.id,
          provider_id: providerId,
          description: quoteDescription.trim(),
          approximate_zone: quoteZone.trim() || null,
          desired_at: desiredAt,
          preferred_start_time: quoteStartTime,
          preferred_end_time: quoteEndTime,
          status: "request_sent",
        };
        let result = await supabase
          .from("service_requests")
          .insert(requestPayload)
          .select("id")
          .single();
        if (result.error?.code === "PGRST204") {
          const { preferred_start_time: _start, preferred_end_time: _end, ...compatiblePayload } = requestPayload;
          result = await supabase.from("service_requests").insert(compatiblePayload).select("id").single();
        }
        if (result.error)
          return setRequested(
            result.error.message.includes("FREE_WEEKLY_REQUEST_LIMIT")
              ? "Ya usaste tus 3 solicitudes gratuitas de esta semana. Para pedir más necesitás Cliente Plus."
              : `No pudimos guardar la solicitud: ${result.error.message}`,
          );
        requestId = result.data.id;
        storedInDatabase = true;
      }
    }
    const nextRequest: SavedRequest = {
      id: requestId,
      clientEmail: session?.email,
      providerId,
      provider: quoteProvider.name,
      trade: quoteProvider.trade,
      description: quoteDescription.trim(),
      zone: quoteZone.trim(),
      desiredAt: [quoteDate.trim(), `${quoteStartTime} a ${quoteEndTime}`].filter(Boolean).join(" · "),
      preferredStartTime: quoteStartTime,
      preferredEndTime: quoteEndTime,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + REQUEST_LIFETIME_MS).toISOString(),
      status: "request_sent",
    };
    setRequests((current) => [nextRequest, ...current]);
    if (!storedInDatabase) void enqueueMirrorEvent("Contactos", {
      request_id: nextRequest.id,
      client_name: session?.name ?? "",
      client_email: session?.email ?? "",
      provider_name: nextRequest.provider,
      trade: nextRequest.trade,
      channel: "solicitud_presupuesto",
      status: nextRequest.status,
      description: nextRequest.description,
      availability_from: quoteStartTime,
      availability_to: quoteEndTime,
      source: "directorio_demo",
    });
    setRequested(`Solicitud creada para ${quoteProvider.name}`);
    setQuoteProvider(null);
    setQuoteDescription("");
    setQuoteZone("");
    setQuoteDate("");
    setQuoteStartTime("08:00");
    setQuoteEndTime("18:00");
    setQuoteTimePicker(null);
  }

  function startQuote(provider: Provider) {
    if (!session) {
      setAuthMode("register");
      setRequested("Creá una cuenta o ingresá para solicitar un presupuesto.");
      return;
    }
    if (provider.name === providerProfile?.displayName) {
      const availability = providerProfile.services?.find((service) => service.startTime && service.endTime);
      if (availability) {
        setQuoteStartTime(availability.startTime);
        setQuoteEndTime(availability.endTime);
      }
    }
    setQuoteProvider(provider);
  }

  function openProviderProfile() {
    if (!session) {
      setAuthMode("register");
      setAuthRole("provider");
      return;
    }
    setProfileDraft(
      providerProfile ?? {
        displayName: session.name,
        city: "",
        trade: "",
        bio: "",
        skills: "",
        zones: "",
        availability: "",
        published: false,
      },
    );
    setProfileError("");
    setProfileModal(true);
  }

  async function saveProviderProfile(nextDraft: SavedProviderProfile) {
    setProfileDraft(nextDraft);
    setProfileError("");
    setProfileBusy(true);
    const services = (nextDraft.services ?? []).slice(0, 2);
    const diagnosticPrice = nextDraft.diagnosticPrice ?? 0;
    const tariffItems = [
      {
        id: "diagnostic-fee",
        trade: nextDraft.trade.trim(),
        label: "Diagnóstico / visita técnica",
        unit: "visita",
        unitPrice: diagnosticPrice,
        enabled: true,
      },
    ];
    let photoUri = nextDraft.photoUri;
    if (supabase && !isDemoSession) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setProfileBusy(false);
        return setProfileError("Volvé a ingresar para publicar el perfil.");
      }
      if (photoUri?.startsWith("data:")) {
        const photoResponse = await fetch(photoUri);
        const photoBlob = await photoResponse.blob();
        const photoPath = `${user.id}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(photoPath, photoBlob, {
            contentType: photoBlob.type || "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          setProfileBusy(false);
          return setProfileError(uploadError.message);
        }
        photoUri = supabase.storage
          .from("profile-photos")
          .getPublicUrl(photoPath).data.publicUrl;
      }
      const profileResult = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: nextDraft.displayName.trim(),
          city: nextDraft.city.trim(),
          avatar_path: photoUri ?? null,
        })
        .select("public_id")
        .single();
      const providerResult = await supabase
        .from("provider_profiles")
        .upsert({
          user_id: user.id,
          trade_title: [nextDraft.trade.trim(), nextDraft.secondaryTrade?.trim()].filter(Boolean).join(" · "),
          diagnostic_price: diagnosticPrice,
          bio: nextDraft.bio.trim(),
          skills_text: nextDraft.skills.trim(),
          training: nextDraft.training?.trim() || null,
          certifications: nextDraft.certifications ?? [],
          zones: nextDraft.coverageAreas?.length
            ? nextDraft.coverageAreas
            : [nextDraft.city],
          availability: nextDraft.availability.trim(),
          published: true,
        });
      if (profileResult.error || providerResult.error) {
        setProfileBusy(false);
        return setProfileError(
          profileResult.error?.message ??
            providerResult.error?.message ??
            "No pudimos publicar el perfil.",
        );
      }
      await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: "provider" });
      await supabase
        .from("provider_services")
        .delete()
        .eq("provider_id", user.id);
      const professionalItems = [nextDraft.trade.trim(), nextDraft.secondaryTrade?.trim()]
        .filter((item): item is string => !!item)
        .slice(0, 2);
      const { error: tradesError } = await supabase
        .from("provider_services")
        .insert(professionalItems.map((tradeName, index) => ({
          provider_id: user.id,
          trade_name: tradeName,
          position: index + 1,
        })));
      if (tradesError) {
        setProfileBusy(false);
        return setProfileError(tradesError.message);
      }
      await supabase
        .from("provider_rate_items")
        .delete()
        .eq("provider_id", user.id);
      const { error: ratesError } = await supabase
        .from("provider_rate_items")
        .insert({
          provider_id: user.id,
          trade_name: nextDraft.trade.trim(),
          label: "Diagnóstico / visita técnica",
          unit: "visita",
          unit_price: diagnosticPrice,
          slot_position: 1,
          active: true,
        });
      if (ratesError) {
        setProfileBusy(false);
        return setProfileError(ratesError.message);
      }
      await supabase
        .from("provider_service_offers")
        .delete()
        .eq("provider_id", user.id);
      const { error: offersError } = await supabase
        .from("provider_service_offers")
        .insert(
          services.map((item, index) => ({
            provider_id: user.id,
            family: item.family,
            specialization: (item.specialties?.length
              ? item.specialties
              : [item.service]
            ).join(" · "),
            specializations: item.specialties?.length
              ? item.specialties
              : [item.service],
            description: item.description?.trim(),
            position: index + 1,
            active: true,
          })),
        );
      if (offersError) {
        setProfileBusy(false);
        return setProfileError(offersError.message);
      }
      nextDraft.publicId = String(
        profileResult.data?.public_id ?? nextDraft.publicId ?? "",
      );
    }
    const publishedProfile = {
      ...nextDraft,
      photoUri,
      tariffItems,
      services,
      published: true,
    };
    setProviderProfile(publishedProfile);
    setSession((current) =>
      current ? { ...current, role: "provider" } : current,
    );
    void enqueueMirrorEvent("Profesionales", {
      public_id: publishedProfile.publicId ?? "",
      user_name: publishedProfile.displayName,
      trade: [publishedProfile.trade, publishedProfile.secondaryTrade].filter(Boolean).join(" · "),
      city: publishedProfile.city,
      coverage:
        publishedProfile.coverageAreas?.join(", ") || publishedProfile.zones,
      services_json: JSON.stringify(
        services.map((item) => ({
          family: item.family,
          specializations: item.specialties?.length
            ? item.specialties
            : [item.service],
          description: item.description,
        })),
      ),
      bio: publishedProfile.bio,
      source: supabase ? "supabase" : "mobile_demo",
    });
    void enqueueMirrorEvent("Tarifario", {
      id: "diagnostic-fee",
      provider_name: publishedProfile.displayName,
      trade_name: publishedProfile.trade,
      label: "Diagnóstico / visita técnica",
      unit: "visita",
      unit_price: diagnosticPrice,
      pricing_mode: "starting_at",
      active: true,
    });
    setProfileBusy(false);
    setProfileModal(false);
    setRequested("Perfil de prestador guardado y publicado.");
  }

  function openPortfolioEditor() {
    if (!providerProfile?.published) return openProviderProfile();
    setPortfolioError("");
    setPortfolioModal(true);
  }

  async function savePortfolioWorks(nextWorks: SavedPortfolioWork[]) {
    setPortfolioError("");
    setPortfolioBusy(true);
    const trimmedWorks = nextWorks
      .slice(0, 3)
      .map((work) => ({ ...work, description: work.description.trim() }));
    if (!supabase || isDemoSession) {
      setProviderProfile((current) =>
        current ? { ...current, portfolioWorks: trimmedWorks } : current,
      );
      setPortfolioBusy(false);
      setPortfolioModal(false);
      setRequested("Trabajos realizados guardados.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPortfolioBusy(false);
      setPortfolioError("Volvé a ingresar para guardar los trabajos.");
      return;
    }
    const profileResult = await supabase
      .from("profiles")
      .select("public_id, full_name")
      .eq("id", user.id)
      .single();
    if (profileResult.error) {
      setPortfolioBusy(false);
      setPortfolioError(profileResult.error.message);
      return;
    }
    const publicId = String(profileResult.data.public_id);
    const providerFolder = `${safeFolderPart(publicId)}_${safeFolderPart(profileResult.data.full_name)}`;
    const oldItemsResult = await supabase
      .from("provider_portfolio_items")
      .select("storage_path")
      .eq("provider_id", user.id);
    if (oldItemsResult.error) {
      setPortfolioBusy(false);
      setPortfolioError(oldItemsResult.error.message);
      return;
    }
    const oldPaths = (oldItemsResult.data ?? [])
      .map((item) => item.storage_path)
      .filter(Boolean);
    const deleteItems = await supabase
      .from("provider_portfolio_items")
      .delete()
      .eq("provider_id", user.id);
    const deleteWorks = await supabase
      .from("provider_completed_works")
      .delete()
      .eq("provider_id", user.id);
    if (deleteItems.error || deleteWorks.error) {
      setPortfolioBusy(false);
      setPortfolioError(
        deleteItems.error?.message ??
          deleteWorks.error?.message ??
          "No pudimos actualizar el portfolio.",
      );
      return;
    }
    if (oldPaths.length)
      await supabase.storage.from("portfolio").remove(oldPaths);

    const storedWorks: SavedPortfolioWork[] = [];
    for (let workIndex = 0; workIndex < trimmedWorks.length; workIndex += 1) {
      const work = trimmedWorks[workIndex];
      const workCode = `TR${String(workIndex + 1).padStart(2, "0")}`;
      const driveWorkFolder = `${providerFolder}/Trabajos/${workCode}_${safeFolderPart(work.service)}`;
      const insertedWork = await supabase
        .from("provider_completed_works")
        .insert({
          provider_id: user.id,
          work_code: workCode,
          service_label: work.service,
          description: work.description,
          position: workIndex + 1,
        })
        .select("id")
        .single();
      if (insertedWork.error) {
        setPortfolioBusy(false);
        setPortfolioError(insertedWork.error.message);
        return;
      }
      const storedPhotos = [];
      for (
        let photoIndex = 0;
        photoIndex < work.photos.length;
        photoIndex += 1
      ) {
        const photo = work.photos[photoIndex];
        const photoResponse = await fetch(photo.uri);
        const photoBlob = await photoResponse.blob();
        const storagePath = `${user.id}/works/${workCode}/foto-${photoIndex + 1}.jpg`;
        const uploadResult = await supabase.storage
          .from("portfolio")
          .upload(storagePath, photoBlob, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (uploadResult.error) {
          setPortfolioBusy(false);
          setPortfolioError(uploadResult.error.message);
          return;
        }
        const publicUrl = supabase.storage
          .from("portfolio")
          .getPublicUrl(storagePath).data.publicUrl;
        const portfolioItem = await supabase
          .from("provider_portfolio_items")
          .insert({
            provider_id: user.id,
            work_id: insertedWork.data.id,
            storage_path: storagePath,
            caption: work.description,
            sort_order: workIndex * 3 + photoIndex,
            photo_position: photoIndex + 1,
            drive_folder_path: driveWorkFolder,
            drive_sync_status: "pending",
            watermarked: true,
          });
        if (portfolioItem.error) {
          setPortfolioBusy(false);
          setPortfolioError(portfolioItem.error.message);
          return;
        }
        const driveFileName = `${workCode}_foto_${photoIndex + 1}.jpg`;
        const outboxResult = await supabase
          .from("drive_media_outbox")
          .insert({
            provider_id: user.id,
            completed_work_id: insertedWork.data.id,
            source_storage_path: storagePath,
            target_root_folder_id: driveProfessionalsFolderId,
            target_relative_path: driveWorkFolder,
            target_file_name: driveFileName,
          });
        if (outboxResult.error) {
          setPortfolioBusy(false);
          setPortfolioError(outboxResult.error.message);
          return;
        }
        storedPhotos.push({
          ...photo,
          uri: publicUrl,
          storagePath,
          watermarked: true,
        });
      }
      storedWorks.push({
        ...work,
        id: insertedWork.data.id,
        photos: storedPhotos,
      });
    }
    setProviderProfile((current) =>
      current ? { ...current, publicId, portfolioWorks: storedWorks } : current,
    );
    void enqueueMirrorEvent("Profesionales", {
      public_id: publicId,
      user_name: providerProfile?.displayName ?? session?.name ?? "",
      portfolio_works: storedWorks.length,
      drive_folder: providerFolder,
      source: "supabase",
    });
    let driveSynced = false;
    try {
      const authState = await supabase.auth.getSession();
      const accessToken = authState.data.session?.access_token;
      if (accessToken) {
        const appUrl = process.env.EXPO_PUBLIC_APP_URL ?? "https://laburapp-iota.vercel.app";
        const syncResponse = await fetch(Platform.OS === "web" ? "/api/drive-sync" : `${appUrl}/api/drive-sync`, {
          method: "POST",
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          driveSynced = Number(syncResult.failed ?? 0) === 0;
        }
      }
    } catch {
      driveSynced = false;
    }
    setPortfolioBusy(false);
    setPortfolioModal(false);
    setRequested(
      driveSynced
        ? "Portfolio guardado y copiado en Drive."
        : "Portfolio guardado. La copia en Drive quedó en espera y se puede reintentar.",
    );
  }

  function signOut() {
    if (supabase) void supabase.auth.signOut();
    setSession(null);
    setSignedInName(null);
    setTab("Inicio");
    setRequested("Cerraste sesión en este dispositivo.");
  }

  function updateRequest(
    id: string,
    updater: (request: SavedRequest) => SavedRequest,
  ) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? updater(request) : request,
      ),
    );
  }

  function runDemoAction(id: string, action: DemoAction) {
    try {
      updateRequest(id, (request) => applyDemoAction(request, action));
      setRequested(
        action === "pay"
          ? "Pago simulado aprobado y protegido."
          : "Estado del trabajo actualizado.",
      );
    } catch {
      setRequested("No se pudo avanzar: el estado del trabajo cambió.");
    }
  }

  async function acceptQuote(request: SavedRequest) {
    try {
      let jobId = request.jobId;
      if (supabase && !isDemoSession && /^[0-9a-f-]{36}$/i.test(request.id)) {
        const result = await supabase.rpc("accept_service_quote", { target_request_id: request.id });
        if (result.error) throw result.error;
        jobId = String(result.data);
      }
      updateRequest(request.id, (current) => ({
        ...applyDemoAction(current, "accept_quote"),
        jobId,
      }));
      setAcceptQuoteRequestId(null);
      setRequested("Presupuesto aceptado. Ya figura como trabajo contratado.");
    } catch {
      setAcceptQuoteRequestId(null);
      setRequested("El presupuesto venció o ya no está disponible para aceptar.");
    }
  }

  async function cancelRequest(request: SavedRequest) {
    try {
      if (supabase && !isDemoSession && /^[0-9a-f-]{36}$/i.test(request.id)) {
        const result = await supabase.rpc("cancel_service_request", { target_request_id: request.id });
        if (result.error) throw result.error;
      }
      updateRequest(request.id, (current) => ({ ...current, status: "cancelled" }));
      setRequested("Solicitud cancelada.");
    } catch {
      setRequested("Esta solicitud ya no se puede cancelar.");
    }
  }

  function openRevisionChat(request: SavedRequest) {
    setChatRequestId(request.id);
    setChatError("");
    setChatMessage(`Solicitud de Cambios Presupuesto ${request.id}\n`);
  }

  async function issueCompletionQr(request: SavedRequest) {
    setQrBusy(true);
    try {
      let token = `DEMO-${request.id}`;
      if (supabase && !isDemoSession && request.jobId) {
        const result = await supabase.rpc("issue_completion_token", { target_job_id: request.jobId });
        if (result.error) throw result.error;
        token = String(result.data);
      }
      setCompletionQr({ requestId: request.id, value: `laburapp://complete?token=${encodeURIComponent(token)}` });
    } catch {
      setRequested("No pudimos generar el QR. El trabajo debe estar coordinado o en curso.");
    } finally {
      setQrBusy(false);
    }
  }

  async function confirmCompletionCode(rawValue: string) {
    if (qrBusy || qrScanned) return;
    setQrBusy(true);
    setQrScanned(true);
    try {
      const match = rawValue.match(/[?&]token=([^&]+)/);
      const token = decodeURIComponent(match?.[1] ?? rawValue.trim());
      let requestId = token.startsWith("DEMO-") ? token.slice(5) : "";
      if (supabase && !isDemoSession && !token.startsWith("DEMO-")) {
        const result = await supabase.rpc("confirm_completion_token", { raw_token: token });
        if (result.error) throw result.error;
        requestId = String(result.data);
      }
      if (!requestId) throw new Error("invalid_token");
      const completedAt = new Date().toISOString();
      updateRequest(requestId, (request) => ({
        ...request,
        status: "completed",
        completedAt,
        completionVerifiedAt: completedAt,
        messages: [...(request.messages ?? []), {
          id: `${Date.now()}-qr`,
          sender: "system",
          body: "Trabajo terminado y verificado mediante QR.",
          createdAt: completedAt,
        }],
      }));
      setManualQrCode("");
      setTab("Contratados");
      setRequested("Trabajo terminado. Ya podés dejar tu reseña verificada.");
    } catch {
      setRequested("El QR no corresponde a tu trabajo, venció o ya fue utilizado.");
    } finally {
      setQrBusy(false);
      setTimeout(() => setQrScanned(false), 1200);
    }
  }

  function loadSimulations() {
    setRequests((current) => [...createDemoScenarios(), ...current]);
    setRequested(
      "Se cargaron tres casos para probar presupuestos, pagos y estados.",
    );
  }

  async function sendModularQuote(draft: Omit<SavedQuote, "version">) {
    if (!quoteBuilderRequestId) return;
    const request = requests.find((item) => item.id === quoteBuilderRequestId);
    try {
      const validDays = Math.min(draft.validDays ?? 5, 5);
      const normalizedDraft = { ...draft, validDays };
      let storedInDatabase = false;
      if (request && supabase && !isDemoSession && /^[0-9a-f-]{36}$/i.test(request.id)) {
        const nextVersion = (request.quote?.version ?? 0) + 1;
        const quoteResult = await supabase.from("quotes").insert({
          request_id: request.id,
          version: nextVersion,
          total: draft.amount,
          scope: draft.scope,
          pricing_mode: draft.pricingMode ?? "itemized",
          items: draft.items ?? [],
          eta: draft.eta,
          notes: draft.notes ?? "",
          valid_days: validDays,
          expires_at: new Date(Date.now() + validDays * 86400000).toISOString(),
        });
        if (quoteResult.error) throw quoteResult.error;
        const statusResult = await supabase.from("service_requests").update({ status: "quote_sent" }).eq("id", request.id);
        if (statusResult.error) throw statusResult.error;
        storedInDatabase = true;
      }
      updateRequest(quoteBuilderRequestId, (request) =>
        submitCustomQuote(request, normalizedDraft),
      );
      if (request && !storedInDatabase)
        void enqueueMirrorEvent("Presupuestos", {
          request_id: request.id,
          provider_name: request.provider,
          trade: request.trade,
          version: (request.quote?.version ?? 0) + 1,
          pricing_mode: draft.pricingMode ?? "itemized",
          amount_ars: draft.amount,
          scope: draft.scope,
          eta: draft.eta,
          valid_days: validDays,
          notes: draft.notes ?? "",
          items_json: JSON.stringify(draft.items ?? []),
        });
      setQuoteBuilderRequestId(null);
      setRequested("Presupuesto modular enviado al cliente.");
    } catch {
      setRequested("No se pudo enviar: el estado de la solicitud cambió.");
    }
  }

  async function sendChatMessage() {
    const body = chatMessage.trim();
    setChatError("");
    if (!chatRequestId || !body)
      return setChatError("Escribí un mensaje para enviarlo.");
    if (containsContactAttempt(body))
      return setChatError(
        "Por seguridad, no compartas teléfonos, correos, redes ni enlaces antes de contratar.",
      );
    if (containsPriceAttempt(body))
      return setChatError(
        "Los precios sólo se envían mediante un presupuesto. Usá el chat para consultar el alcance del servicio.",
      );
    const messageExpiry = new Date(Date.now() + REQUEST_LIFETIME_MS).toISOString();
    const message: SavedMessage = {
      id: `${Date.now()}-${session?.role ?? "client"}`,
      sender: session?.role === "provider" ? "provider" : "client",
      body,
      createdAt: new Date().toISOString(),
      expiresAt: messageExpiry,
    };
    const request = requests.find((item) => item.id === chatRequestId);
    const isRevision = body.startsWith(`Solicitud de Cambios Presupuesto ${chatRequestId}`);
    if (request && supabase && !isDemoSession && /^[0-9a-f-]{36}$/i.test(request.id)) {
      const userResult = await supabase.auth.getUser();
      if (!userResult.data.user) return setChatError("Volvé a ingresar para enviar el mensaje.");
      const result = isRevision
        ? await supabase.rpc("request_quote_revision", { target_request_id: request.id, revision_message: body })
        : await supabase.from("messages").insert({ request_id: request.id, sender_id: userResult.data.user.id, body });
      if (result.error) return setChatError("No pudimos enviar el mensaje. Revisá si la solicitud sigue vigente.");
    }
    updateRequest(chatRequestId, (current) => ({
      ...current,
      status: isRevision ? "quote_revision_requested" : current.status,
      messages: [...(current.messages ?? []).map((item) => ({ ...item, expiresAt: messageExpiry })), message],
    }));
    if (request)
      void enqueueMirrorEvent("Contactos", {
        request_id: request.id,
        client_name: session?.name ?? "",
        client_email: session?.email ?? "",
        provider_name: request.provider,
        trade: request.trade,
        channel: "chat_interno",
        status: request.status,
        description:
          "Mensaje enviado dentro de LaburApp (contenido no copiado por privacidad)",
      });
    setChatMessage("");
  }

  async function submitReview() {
    const request = requests.find((item) => item.id === reviewRequestId);
    setReviewError("");
    if (
      !request ||
      !reviewIsEligible({
        isClient: true,
        paidInApp: !!request.payment?.protected,
        status: request.status,
        alreadyReviewed: !!request.review,
        completionVerified: !!request.completionVerifiedAt,
      })
    )
      return setReviewError("Esta reseña todavía no está habilitada.");
    if (reviewComment.trim().length < 5)
      return setReviewError("Contá brevemente cómo fue el trabajo.");
    if (reviewQualities.length > 3)
      return setReviewError("Elegí hasta 3 cualidades.");
    if (supabase && !isDemoSession && request.jobId && request.providerId) {
      const userResult = await supabase.auth.getUser();
      if (!userResult.data.user) return setReviewError("Volvé a ingresar para publicar la reseña.");
      const result = await supabase.from("reviews").insert({
        job_id: request.jobId,
        client_id: userResult.data.user.id,
        provider_id: request.providerId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        qualities: reviewQualities,
      });
      if (result.error) return setReviewError("No pudimos publicar la reseña verificada.");
    }
    updateRequest(request.id, (item) => ({
      ...item,
      review: {
        rating: reviewRating,
        comment: reviewComment.trim(),
        qualities: reviewQualities,
        createdAt: new Date().toISOString(),
      },
    }));
    setReviewRequestId(null);
    setReviewComment("");
    setReviewRating(5);
    setReviewQualities([]);
    setRequested("Reseña verificada publicada.");
  }

  async function pickClientPhoto() {
    if (!session || session.role !== "client") return;
    setClientPhotoBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.72 });
      if (result.canceled || !result.assets[0]?.uri) return;
      let photoUri = result.assets[0].uri;
      if (supabase && !isDemoSession) {
        const userResult = await supabase.auth.getUser();
        if (!userResult.data.user) throw new Error("not_signed_in");
        const photoBlob = await (await fetch(photoUri)).blob();
        const storagePath = `${userResult.data.user.id}/perfil.jpg`;
        const upload = await supabase.storage.from("avatars").upload(storagePath, photoBlob, { contentType: "image/jpeg", upsert: true });
        if (upload.error) throw upload.error;
        photoUri = supabase.storage.from("avatars").getPublicUrl(storagePath).data.publicUrl;
        const profileUpdate = await supabase.from("profiles").update({ avatar_path: photoUri }).eq("id", userResult.data.user.id);
        if (profileUpdate.error) throw profileUpdate.error;
      }
      setSession((current) => current ? { ...current, photoUri } : current);
      setRequested("Foto de perfil actualizada.");
    } catch {
      setRequested("No pudimos actualizar la foto.");
    } finally {
      setClientPhotoBusy(false);
    }
  }

  const chatRequest =
    requests.find((request) => request.id === chatRequestId) ?? null;
  const reviewRequest =
    requests.find((request) => request.id === reviewRequestId) ?? null;
  const acceptQuoteRequest =
    requests.find((request) => request.id === acceptQuoteRequestId) ?? null;
  const quoteBuilderRequest =
    requests.find((request) => request.id === quoteBuilderRequestId) ?? null;
  const filtered = useMemo(
    () =>
      providers
        .map((provider, registrationOrder) => ({ provider, registrationOrder }))
        .filter(
          ({ provider }) =>
            (cityFilter === "Todas" || provider.city === cityFilter) &&
            `${provider.name} ${provider.trade} ${provider.city} ${provider.skills}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          providerSort === "jobs"
            ? b.provider.jobs - a.provider.jobs
            : providerSort === "rating"
              ? (b.provider.rating === "Nuevo"
                  ? 0
                  : Number(b.provider.rating.replace(",", "."))) -
                (a.provider.rating === "Nuevo"
                  ? 0
                  : Number(a.provider.rating.replace(",", ".")))
              : b.registrationOrder - a.registrationOrder,
        )
        .map(({ provider }) => provider),
    [query, cityFilter, providerSort],
  );
  const selectedPublicWorks = publicProfileProvider
    ? publicPortfolioFor(publicProfileProvider)
    : [];
  const selectedPublicDetails = publicProfileProvider
    ? publicDetailsFor(publicProfileProvider)
    : null;
  const currentProviderName = providerProfile?.displayName ?? session?.name ?? "";
  const participantRequests = requests.filter((request) =>
    session?.role === "provider"
      ? request.provider === currentProviderName
      : session?.role === "client"
        ? !request.clientEmail || request.clientEmail === session.email
        : true,
  );
  const workRequests = participantRequests.filter((request) =>
    session?.role === "client"
      ? activeRequest(request) && !completedStatuses.has(request.status)
      : true,
  );
  const providerPendingRequests = workRequests.filter(
    (request) => request.status === "request_sent" || request.status === "quote_revision_requested",
  );
  const clientHistory = participantRequests
    .filter((request) =>
      completedStatuses.has(request.status) &&
      new Date(request.completedAt ?? request.createdAt).getTime() >= Date.now() - CLIENT_HISTORY_MS,
    )
    .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
    .slice(0, 10);
  const weeklyRequestCount = participantRequests.filter(
    (request) => new Date(request.createdAt).getTime() >= startOfCurrentWeek() && request.status !== "cancelled",
  ).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.header, compactHeader && styles.headerCompact]}>
        <View style={styles.brandRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            accessibilityState={{ expanded: menuOpen }}
            style={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel="Ir al inicio de LaburApp"
            onPress={goHome}
          >
            <Image
              source={officialWordmark}
              resizeMode="contain"
              style={[
                styles.wordmarkLogo,
                !compactHeader && styles.wordmarkLogoWide,
              ]}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              darkMode ? "Usar modo claro" : "Usar modo oscuro"
            }
            style={styles.themeButton}
            onPress={toggleTheme}
          >
            <Text style={styles.themeButtonText}>{darkMode ? "☀" : "☾"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ingresar a LaburApp"
            style={styles.loginButton}
            onPress={() =>
              signedInName ? setTab("Perfil") : setAuthMode("login")
            }
          >
            <Text style={styles.loginButtonText}>{authButtonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "Inicio" ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>
                Encontrá a quien sabe hacerlo.
              </Text>
              <Text style={styles.heroCopy}>
                Prestadores locales, pagos protegidos y reseñas de trabajos
                reales.
              </Text>
              <TextInput
                accessibilityLabel="Buscar servicio"
                value={query}
                onChangeText={setQuery}
                placeholder="¿Qué necesitás resolver?"
                placeholderTextColor="#71818B"
                style={styles.search}
              />
              <View
                style={styles.quickSearches}
                accessibilityLabel="Búsquedas frecuentes"
              >
                {quickSearches.map((term) => (
                  <TouchableOpacity
                    key={term}
                    accessibilityRole="button"
                    accessibilityLabel={`Buscar ${term}`}
                    onPress={() => setQuery(term)}
                    style={[
                      styles.quickSearch,
                      query === term && styles.quickSearchActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickSearchText,
                        query === term && styles.quickSearchTextActive,
                      ]}
                    >
                      {term}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {query || cityFilter !== "Todas"
                  ? `Resultados · ${filtered.length}`
                  : `Profesionales cerca tuyo · ${filtered.length}`}
              </Text>
              <View
                style={styles.compactFilters}
                accessibilityLabel="Filtros de profesionales"
              >
                <View style={styles.dropdownWrap}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Ordenar profesionales"
                    accessibilityState={{ expanded: openFilter === "sort" }}
                    onPress={() =>
                      setOpenFilter(openFilter === "sort" ? null : "sort")
                    }
                    style={styles.dropdownButton}
                  >
                    <Text numberOfLines={1} style={styles.dropdownButtonText}>
                      Ordenar
                    </Text>
                    <Text style={styles.dropdownChevron}>⌄</Text>
                  </TouchableOpacity>
                  {openFilter === "sort" && (
                    <View style={[styles.dropdownMenu, styles.sortMenu]}>
                      {(
                        [
                          ["recent", "Recién registrados"],
                          ["jobs", "Más trabajos"],
                          ["rating", "Estrellas"],
                        ] as const
                      ).map(([value, label]) => (
                        <TouchableOpacity
                          accessibilityRole="menuitem"
                          key={value}
                          onPress={() => {
                            setProviderSort(value);
                            setOpenFilter(null);
                          }}
                          style={[
                            styles.dropdownOption,
                            providerSort === value &&
                              styles.dropdownOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              providerSort === value &&
                                styles.dropdownOptionTextActive,
                            ]}
                          >
                            {providerSort === value ? "✓ " : ""}
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.dropdownWrap}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar por ciudad"
                    accessibilityState={{ expanded: openFilter === "city" }}
                    onPress={() =>
                      setOpenFilter(openFilter === "city" ? null : "city")
                    }
                    style={styles.dropdownButton}
                  >
                    <Text numberOfLines={1} style={styles.dropdownButtonText}>
                      Ciudad
                    </Text>
                    <Text style={styles.dropdownChevron}>⌄</Text>
                  </TouchableOpacity>
                  {openFilter === "city" && (
                    <View style={[styles.dropdownMenu, styles.cityMenu]}>
                      {["Todas", ...cityChoices].map((city) => (
                        <TouchableOpacity
                          accessibilityRole="menuitem"
                          key={city}
                          onPress={() => {
                            setCityFilter(city);
                            setOpenFilter(null);
                          }}
                          style={[
                            styles.dropdownOption,
                            cityFilter === city && styles.dropdownOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              cityFilter === city &&
                                styles.dropdownOptionTextActive,
                            ]}
                          >
                            {cityFilter === city ? "✓ " : ""}
                            {city}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>
            {filtered.map((provider) => {
              const featuredWork = featuredWorkFor(provider);
              const expanded = expandedProviderName === provider.name;
              const initials = provider.name.split(" ").map((part) => part[0]).join("");
              return <View key={provider.name} style={[styles.card, expanded && styles.cardExpanded]}>
                <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Abrir perfil profesional completo de ${provider.name}`} style={styles.cardOpenArea} onPress={() => setPublicProfileProvider(provider)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.row}>
                      <Text style={styles.nameLink}>{provider.name}</Text>
                      <Text style={styles.rating}>★ {provider.rating}</Text>
                    </View>
                    <Text style={styles.trade}>{provider.trade} · {provider.city}</Text>
                    <Text style={styles.skills}>{provider.skills}</Text>
                    <Text style={styles.badge}>✓ {provider.badge} · {provider.jobs} trabajos</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? "Ocultar" : "Ver"} trabajo destacado de ${provider.name}`} style={styles.featuredToggleButton} onPress={() => setExpandedProviderName(expanded ? null : provider.name)}>
                  <Text style={styles.featuredToggle}>{expanded ? "Ocultar trabajo destacado ︿" : "Ver trabajo destacado ﹀"}</Text>
                </TouchableOpacity>
                {expanded && <View style={styles.featuredWork}>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Ampliar foto de ${featuredWork.title}`} style={styles.featuredPhotoButton} onPress={() => setWorkPhoto({ provider, work: featuredWork })}>
                      <Image source={{ uri: featuredWork.photoUri }} resizeMode="cover" style={styles.featuredPhoto} />
                    </TouchableOpacity>
                    <View style={styles.featuredWorkCopy}><Text style={styles.favoriteLabel}>★ DESTACADO</Text><Text style={styles.featuredWorkTitle}>{featuredWork.title}</Text><Text numberOfLines={3} style={styles.featuredWorkDescription}>{featuredWork.description}</Text><TouchableOpacity accessibilityRole="link" onPress={() => setPublicProfileProvider(provider)}><Text style={styles.viewProfileLink}>Ver perfil completo</Text></TouchableOpacity></View>
                </View>}
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => startQuote(provider)}><Text style={styles.buttonText}>Solicitar presupuesto</Text></TouchableOpacity>
              </View>;
            })}
            {filtered.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>
                  Tito no encontró coincidencias
                </Text>
                <Text style={styles.heroCopy}>
                  Probá con “gasista”, “plomería” o una ciudad.
                </Text>
              </View>
            )}
          </>
        ) : tab === "Trabajos" || tab === "Solicitudes" ? (
          <View style={styles.sectionPage}>
            <Text style={styles.pageTitle}>
              {session?.role === "client" ? "Mis solicitudes" : "Mis trabajos"}
            </Text>
            <Text style={styles.pageCopy}>
              {session?.role === "client"
                ? "Acá recibís los presupuestos de los profesionales y seguís cada solicitud."
                : "Respondé solicitudes y administrá los trabajos activos."}
            </Text>
            {session?.role === "client" && (
              <View style={styles.requestQuotaCard}>
                <View>
                  <Text style={styles.panelEyebrow}>PLAN GRATIS</Text>
                  <Text style={styles.requestQuotaTitle}>Presupuestos de esta semana</Text>
                  {clientPlan === "free" && weeklyRequestCount >= FREE_WEEKLY_REQUEST_LIMIT && (
                    <TouchableOpacity accessibilityRole="button" onPress={() => setRequested("Cliente Plus habilitará solicitudes adicionales. La contratación de la membresía se conectará con el módulo de pagos.")}>
                      <Text style={styles.upgradeLink}>Ver Cliente Plus</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.requestQuotaCount}>
                  {Math.min(weeklyRequestCount, FREE_WEEKLY_REQUEST_LIMIT)} / {FREE_WEEKLY_REQUEST_LIMIT}
                </Text>
              </View>
            )}
            {session?.role === "provider" && (
              <View style={styles.notificationsPanel}>
                <View style={styles.notificationHeading}>
                  <View>
                    <Text style={styles.panelEyebrow}>NOTIFICACIONES</Text>
                    <Text style={styles.notificationTitle}>
                      Solicitudes para responder
                    </Text>
                  </View>
                  <Text style={styles.notificationCount}>
                    {providerPendingRequests.length}
                  </Text>
                </View>
                {providerPendingRequests
                  .slice(0, 3)
                  .map((request) => (
                    <View
                      key={`notification-${request.id}`}
                      style={styles.notificationRow}
                    >
                      <View style={styles.notificationCopy}>
                        <Text style={styles.notificationName}>
                          {request.trade}
                        </Text>
                        <Text style={styles.notificationText}>
                          {request.description}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.notificationAction}
                        onPress={() => setQuoteBuilderRequestId(request.id)}
                      >
                        <Text style={styles.notificationActionText}>
                          Responder presupuesto
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                {providerPendingRequests.length === 0 && (
                  <Text style={styles.notificationEmpty}>
                    No tenés presupuestos pendientes.
                  </Text>
                )}
              </View>
            )}
            {session?.role === "provider" && isDemoSession && <View style={styles.simulatorBanner}>
              <View style={styles.simulatorCopy}>
                <Text style={styles.simulatorTitle}>Simulador del PMV</Text>
                <Text style={styles.simulatorText}>
                  Cargá casos ficticios para recorrer el circuito sin pagos ni
                  operaciones reales.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.simulatorButton}
                onPress={loadSimulations}
              >
                <Text style={styles.simulatorButtonText}>Cargar 3 casos</Text>
              </TouchableOpacity>
            </View>}
            {workRequests.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyIcon}>🧰</Text>
                <Text style={styles.emptyTitle}>
                  Todavía no hay solicitudes
                </Text>
                <Text style={styles.centerCopy}>
                  Elegí un profesional y pedile presupuesto. La solicitud va a
                  aparecer acá.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setTab("Inicio")}
                >
                  <Text style={styles.secondaryText}>Buscar profesionales</Text>
                </TouchableOpacity>
              </View>
            ) : (
              workRequests.map((request) => {
                const presentation = statusPresentation[request.status];
                const primary = primaryActionFor(request.status);
                return (
                  <View key={request.id} style={styles.workCard}>
                    <View style={styles.workCardTop}>
                      <Text
                        style={[
                          styles.workStatus,
                          presentation.tone === "green" && styles.statusGreen,
                          presentation.tone === "blue" && styles.statusBlue,
                          presentation.tone === "red" && styles.statusRed,
                        ]}
                      >
                        ● {presentation.label}
                      </Text>
                      <Text style={styles.workDate}>
                        {new Date(request.createdAt).toLocaleDateString(
                          "es-AR",
                        )}
                      </Text>
                    </View>
                    <Text style={styles.workProvider}>{request.provider}</Text>
                    <Text style={styles.trade}>{request.trade}</Text>
                    <Text style={styles.workDescription}>
                      {request.description}
                    </Text>
                    {!!request.zone && (
                      <Text style={styles.workMeta}>Zona: {request.zone}</Text>
                    )}
                    {!!request.desiredAt && (
                      <Text style={styles.workMeta}>
                        Cuándo: {request.desiredAt}
                      </Text>
                    )}
                    {session?.role === "client" && !hiredStatuses.has(request.status) && request.status !== "cancelled" && (
                      <Text style={styles.expiryText}>
                        La solicitud vence el {new Date(requestExpiresAt(request)).toLocaleDateString("es-AR")}.
                      </Text>
                    )}
                    {request.quote && (
                      <View style={styles.quoteBox}>
                        <View style={styles.workCardTop}>
                          <Text style={styles.quoteLabel}>
                            PRESUPUESTO · VERSIÓN {request.quote.version}
                          </Text>
                          <Text style={styles.quoteAmount}>
                            {request.quote.pricingMode === "starting_at"
                              ? "Desde "
                              : ""}
                            ${request.quote.amount.toLocaleString("es-AR")}
                          </Text>
                        </View>
                        <Text style={styles.quoteScope}>
                          {request.quote.scope}
                        </Text>
                        <Text style={styles.quoteEta}>{request.quote.eta}</Text>
                        {!!request.quote.items?.length && (
                          <View style={styles.quoteBreakdown}>
                            {request.quote.items.map((line) => (
                              <View key={line.id} style={styles.quoteLine}>
                                <Text style={styles.quoteLineName}>
                                  {line.label}
                                  {line.quantity !== 1
                                    ? ` · ${line.quantity} ${line.unit}`
                                    : ""}
                                </Text>
                                <Text style={styles.quoteLinePrice}>
                                  $
                                  {(
                                    line.quantity * line.unitPrice
                                  ).toLocaleString("es-AR")}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {!!request.quote.notes && (
                          <Text style={styles.quoteNotes}>
                            {request.quote.notes}
                          </Text>
                        )}
                        {!!request.quote.validDays && (
                          <Text style={styles.quoteValidity}>
                            Válido por {request.quote.validDays} días
                          </Text>
                        )}
                      </View>
                    )}
                    {request.payment?.protected && (
                      <View style={styles.paymentBox}>
                        <Text style={styles.paymentTitle}>
                          🛡 Pago protegido (simulado)
                        </Text>
                        <Text style={styles.paymentText}>
                          Total ${request.payment.total.toLocaleString("es-AR")}{" "}
                          · comisión $
                          {request.payment.fee.toLocaleString("es-AR")} · recibe
                          el profesional $
                          {request.payment.providerNet.toLocaleString("es-AR")}
                        </Text>
                      </View>
                    )}
                    {!!request.messages?.length && (
                      <Text style={styles.lastMessage}>
                        Último mensaje: “
                        {request.messages[request.messages.length - 1].body}”
                      </Text>
                    )}
                    <View style={styles.nextStep}>
                      <Text style={styles.nextStepText}>
                        Próximo paso: {presentation.next}
                      </Text>
                    </View>
                    {session?.role === "client" && request.status === "quote_sent" && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={styles.outlineAction}
                          onPress={() => openRevisionChat(request)}
                        >
                          <Text style={styles.outlineActionText}>
                            Solicitar cambios
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          style={styles.primaryAction}
                          onPress={() => setAcceptQuoteRequestId(request.id)}
                        >
                          <Text style={styles.primaryActionText}>
                            Acepto el presupuesto
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {session?.role === "provider" && primary && (primary.action === "provider_quote" || primary.action === "revised_quote") && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.primaryActionFull}
                        onPress={() => setQuoteBuilderRequestId(request.id)}
                      >
                        <Text style={styles.primaryActionText}>
                          {primary.action === "provider_quote"
                            ? "Armar presupuesto modular"
                            : primary.action === "revised_quote"
                              ? "Editar presupuesto y reenviar"
                              : primary.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {session?.role === "client" && !!request.completionVerifiedAt && completedStatuses.has(request.status) && !request.review && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.primaryActionFull}
                        onPress={() => {
                          setReviewRequestId(request.id);
                          setReviewError("");
                        }}
                      >
                        <Text style={styles.primaryActionText}>
                          Dejar reseña verificada
                        </Text>
                      </TouchableOpacity>
                    )}
                    {session?.role === "provider" && request.jobId && hiredStatuses.has(request.status) && !completedStatuses.has(request.status) && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={qrBusy}
                        style={styles.primaryActionFull}
                        onPress={() => void issueCompletionQr(request)}
                      >
                        <Text style={styles.primaryActionText}>{qrBusy ? "Generando QR…" : "Trabajo terminado · Mostrar QR"}</Text>
                      </TouchableOpacity>
                    )}
                    {request.review && (
                      <View style={styles.reviewPublished}>
                        <Text style={styles.reviewStars}>
                          {"★".repeat(request.review.rating)}
                          {"☆".repeat(5 - request.review.rating)}
                        </Text>
                        <Text style={styles.reviewPublishedText}>
                          “{request.review.comment}”
                        </Text>
                        {!!request.review.qualities?.length && (
                          <Text style={styles.reviewQualitiesText}>{request.review.qualities.join(" · ")}</Text>
                        )}
                        <Text style={styles.verifiedReview}>
                          ✓ Reseña de un trabajo pagado en LaburApp
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardLinks}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => {
                          setChatRequestId(request.id);
                          setChatError("");
                        }}
                      >
                        <Text style={styles.cardLink}>
                          Abrir conversación (
                          {request.messages?.filter(
                            (message) => message.sender !== "system",
                          ).length ?? 0}
                          )
                        </Text>
                      </TouchableOpacity>
                      {session?.role === "client" && cancellableStatuses.has(request.status) && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          onPress={() => void cancelRequest(request)}
                        >
                          <Text style={styles.cancelLink}>
                            Cancelar solicitud
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : tab === "QR" ? (
          <View style={styles.sectionPage}>
            <Text style={styles.pageTitle}>Confirmar trabajo</Text>
            <Text style={styles.pageCopy}>
              Escaneá el QR que muestra el profesional cuando termina. No contiene tu nombre, teléfono ni información del presupuesto.
            </Text>
            <View style={styles.qrScannerCard}>
              {!cameraPermission ? (
                <Text style={styles.centerCopy}>Preparando la cámara…</Text>
              ) : !cameraPermission.granted ? (
                <View style={styles.qrPermissionBox}>
                  <Text style={styles.emptyIcon}>▣</Text>
                  <Text style={styles.emptyTitle}>Necesitamos acceso a la cámara</Text>
                  <Text style={styles.centerCopy}>La cámara se usa únicamente para leer el QR de finalización.</Text>
                  <TouchableOpacity accessibilityRole="button" style={styles.modalPrimary} onPress={() => void requestCameraPermission()}>
                    <Text style={styles.modalPrimaryText}>Habilitar cámara</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cameraFrame}>
                  <CameraView
                    active={tab === "QR"}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={qrScanned ? undefined : ({ data }) => void confirmCompletionCode(data)}
                    style={styles.camera}
                  />
                  <View pointerEvents="none" style={styles.cameraGuide} />
                </View>
              )}
            </View>
            <View style={styles.manualQrCard}>
              <Text style={styles.panelEyebrow}>¿NO PODÉS USAR LA CÁMARA?</Text>
              <Text style={styles.reviewText}>Ingresá el código corto que aparece debajo del QR.</Text>
              <TextInput
                autoCapitalize="characters"
                value={manualQrCode}
                onChangeText={setManualQrCode}
                placeholder="Código de finalización"
                placeholderTextColor="#71818B"
                style={styles.modalInput}
              />
              <TouchableOpacity accessibilityRole="button" disabled={qrBusy || !manualQrCode.trim()} style={[styles.secondaryButton, (qrBusy || !manualQrCode.trim()) && styles.buttonDisabled]} onPress={() => void confirmCompletionCode(manualQrCode)}>
                <Text style={styles.secondaryText}>{qrBusy ? "Verificando…" : "Confirmar código"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : tab === "Contratados" ? (
          <View style={styles.sectionPage}>
            <Text style={styles.pageTitle}>Contratados</Text>
            <Text style={styles.pageCopy}>
              Tus últimos 10 trabajos contratados, con el profesional y el estado de cada servicio.
            </Text>
            {clientHistory.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyIcon}>🤝</Text>
                <Text style={styles.emptyTitle}>Todavía no contrataste trabajos</Text>
                <Text style={styles.centerCopy}>
                  Cuando aceptes un presupuesto, vas a encontrarlo en esta sección.
                </Text>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab("Inicio")}>
                  <Text style={styles.secondaryText}>Buscar profesionales</Text>
                </TouchableOpacity>
              </View>
            ) : clientHistory.map((request) => {
              const presentation = statusPresentation[request.status];
              return (
                <View key={`hired-${request.id}`} style={styles.workCard}>
                  <View style={styles.workCardTop}>
                    <View>
                      <Text style={styles.workProvider}>{request.provider}</Text>
                      <Text style={styles.jobId}>Trabajo #{request.id.slice(-10).toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.workStatus, presentation.tone === "green" && styles.statusGreen, presentation.tone === "blue" && styles.statusBlue, presentation.tone === "red" && styles.statusRed]}>
                      ● {presentation.label}
                    </Text>
                  </View>
                  <Text style={styles.trade}>{request.trade}</Text>
                  <Text style={styles.workDescription}>{request.description}</Text>
                  {!!request.zone && <Text style={styles.workMeta}>Zona: {request.zone}</Text>}
                  {!!request.desiredAt && <Text style={styles.workMeta}>Disponibilidad: {request.desiredAt}</Text>}
                  {!!request.quote && <Text style={styles.hiredAmount}>Presupuesto: ${request.quote.amount.toLocaleString("es-AR")}</Text>}
                  <Text style={styles.completedVerified}>✓ Finalización confirmada por QR</Text>
                  {!request.review ? (
                    <TouchableOpacity accessibilityRole="button" style={styles.primaryActionFull} onPress={() => { setReviewRequestId(request.id); setReviewError(""); }}>
                      <Text style={styles.primaryActionText}>Dejar reseña</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.verifiedReview}>✓ Reseña publicada</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : tab === "Panel" ? (
          <View style={styles.sectionPage}>
            <Text style={styles.pageTitle}>Panel de administración</Text>
            <Text style={styles.pageCopy}>
              Vista operativa reservada para cuentas con rol administrador.
            </Text>
            <View style={styles.adminMetrics}>
              {[
                ["Usuarios", "1.284"],
                ["Profesionales", "326"],
                ["Trabajos activos", "87"],
                ["Casos a revisar", "6"],
              ].map(([label, value]) => (
                <View key={label} style={styles.adminMetric}>
                  <Text style={styles.panelEyebrow}>{label}</Text>
                  <Text style={styles.adminMetricValue}>{value}</Text>
                </View>
              ))}
            </View>
            <View style={styles.providerPanel}>
              <Text style={styles.panelEyebrow}>ACCESOS RÁPIDOS</Text>
              {[
                "Usuarios y roles",
                "Verificación de profesionales",
                "Trabajos y presupuestos",
                "Pagos y disputas",
                "Auditoría y actividad",
              ].map((item) => (
                <TouchableOpacity key={item} style={styles.adminLink}>
                  <Text style={styles.adminLinkText}>{item}</Text>
                  <Text style={styles.adminLinkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.reviewTitle}>
                {isDemoSession ? "Vista de demostración" : "Seguridad"}
              </Text>
              <Text style={styles.reviewText}>
                {isDemoSession
                  ? "Estos indicadores son simulados para recorrer el panel. La cuenta administradora real se valida mediante Supabase antes de permitir operaciones."
                  : "El rol administrador se valida mediante Supabase. La interfaz no concede permisos por sí sola."}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.sectionPage}>
            <Text style={styles.pageTitle}>Mi perfil</Text>
            {!session ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyIcon}>👤</Text>
                <Text style={styles.emptyTitle}>Ingresá para continuar</Text>
                <Text style={styles.centerCopy}>
                  Una sola cuenta sirve para contratar profesionales y ofrecer
                  tus servicios.
                </Text>
                <TouchableOpacity
                  style={styles.modalPrimary}
                  onPress={() => setAuthMode("login")}
                >
                  <Text style={styles.modalPrimaryText}>Ingresar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setAuthMode("register")}
                >
                  <Text style={styles.secondaryText}>Crear cuenta</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.accountCard}>
                  {(session.role === "provider" ? providerProfile?.photoUri : session.photoUri) ? (
                    <Image
                      source={{ uri: session.role === "provider" ? providerProfile?.photoUri : session.photoUri }}
                      style={styles.profilePhoto}
                    />
                  ) : (
                    <View style={styles.profileAvatar}>
                      <Text style={styles.profileAvatarText}>
                        {session.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.accountBody}>
                    <View style={styles.verifiedNameRow}>
                      <Text style={styles.accountName}>{session.name}</Text>
                      {session.role === "provider" && providerProfile?.verified && (
                        <Text
                          accessibilityLabel="Perfil verificado"
                          style={styles.verifiedIcon}
                        >
                          ✓
                        </Text>
                      )}
                      {session.role === "provider" && !!providerProfile?.diagnosticPrice && (
                        <Text style={styles.diagnosticBadge}>
                          Diagnóstico desde $
                          {providerProfile.diagnosticPrice.toLocaleString(
                            "es-AR",
                          )}
                        </Text>
                      )}
                    </View>
                    {session.role === "client" ? (
                      <Text style={styles.clientJobsCount}>{clientHistory.length} trabajos contratados en los últimos 6 meses</Text>
                    ) : (
                      <>
                        <Text style={styles.accountEmail}>{session.email}</Text>
                        <Text style={styles.localBadge}>
                          {isDemoSession
                            ? "Cuenta de demostración"
                            : backendMode === "supabase"
                              ? "Conectado a Supabase"
                              : "Guardado en este dispositivo"}
                        </Text>
                      </>
                    )}
                  </View>
                  {session.role === "client" && (
                    <TouchableOpacity accessibilityRole="button" disabled={clientPhotoBusy} style={styles.editProfileButton} onPress={() => void pickClientPhoto()}>
                      <Text style={styles.editProfileButtonText}>{clientPhotoBusy ? "CARGANDO…" : session.photoUri ? "CAMBIAR FOTO" : "AGREGAR FOTO"}</Text>
                    </TouchableOpacity>
                  )}
                  {session.role === "provider" && providerProfile?.published && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.followersButton}
                      onPress={() => setFollowersVisible((current) => !current)}
                    >
                      <Text style={styles.followersCount}>
                        {providerProfile.followersCount ?? 0}
                      </Text>
                      <Text style={styles.followersLabel}>seguidores</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {session.role === "provider" && followersVisible && providerProfile?.published && (
                  <View style={styles.followersPanel}>
                    <View style={styles.workCardTop}>
                      <Text style={styles.panelEyebrow}>SEGUIDORES</Text>
                      <TouchableOpacity
                        onPress={() => setFollowersVisible(false)}
                      >
                        <Text style={styles.cardLink}>Ocultar</Text>
                      </TouchableOpacity>
                    </View>
                    {[
                      "María Fernández",
                      "Jorge Acosta",
                      "Lucía Pereyra",
                      "Carlos Díaz",
                    ].map((name) => (
                      <View key={name} style={styles.followerRow}>
                        <View style={styles.followerAvatar}>
                          <Text style={styles.followerInitial}>
                            {name.slice(0, 1)}
                          </Text>
                        </View>
                        <Text style={styles.followerName}>{name}</Text>
                        <Text style={styles.followingBadge}>Siguiendo</Text>
                      </View>
                    ))}
                  </View>
                )}
                {session.role === "provider" && providerProfile?.published ? (
                  <View style={styles.providerPanel}>
                    <View style={styles.workCardTop}>
                      <Text style={styles.panelEyebrow}>
                        PERFIL DE PRESTADOR
                      </Text>
                      <View style={styles.providerHeaderActions}>
                        <Text style={styles.publishedBadge}>Publicado</Text>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Editar perfil de prestador"
                          style={styles.editProfileButton}
                          onPress={openProviderProfile}
                        >
                          <Text style={styles.editProfileButtonText}>
                            EDITAR
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.providerTrade}>
                      {[providerProfile.trade, providerProfile.secondaryTrade].filter(Boolean).join(" · ")}
                    </Text>
                    <Text style={styles.workDescription}>
                      {providerProfile.bio}
                    </Text>
                    <Text style={styles.workMeta}>
                      📍 {providerProfile.city} ·{" "}
                      {providerProfile.coverageAreas?.length === 6
                        ? "Toda la provincia"
                        : providerProfile.coverageAreas?.join(", ") ||
                          providerProfile.zones}
                    </Text>
                    {!!providerProfile.training && (
                      <View style={styles.profileSection}>
                        <Text style={styles.panelEyebrow}>
                          FORMACIÓN Y EXPERIENCIA
                        </Text>
                        <Text style={styles.profileSectionText}>
                          {providerProfile.training}
                        </Text>
                      </View>
                    )}
                    {!!providerProfile.certifications?.length && (
                      <View style={styles.profileSection}>
                        <Text style={styles.panelEyebrow}>CERTIFICACIONES</Text>
                        <View style={styles.certificationList}>
                          {providerProfile.certifications.map(
                            (certification) => (
                              <View
                                key={certification}
                                style={styles.certificationBadge}
                              >
                                <Text style={styles.certificationIcon}>✓</Text>
                                <Text style={styles.certificationText}>
                                  {certification}
                                </Text>
                              </View>
                            ),
                          )}
                        </View>
                      </View>
                    )}
                    <View style={styles.profileSection}>
                      <View style={styles.workCardTop}>
                        <Text style={styles.panelEyebrow}>SERVICIOS</Text>
                        <Text style={styles.servicePlanBadge}>PLAN GRATIS</Text>
                      </View>
                      {(providerProfile.services ?? []).map((service) => (
                        <View
                          key={service.id}
                          style={styles.profileServiceCard}
                        >
                          <View style={styles.profileServiceCopy}>
                            <Text style={styles.profileServiceFamily}>
                              {service.family}
                            </Text>
                            <View style={styles.profileSpecialties}>
                              {(service.specialties?.length
                                ? service.specialties
                                : [service.service]
                              ).map((specialty) => (
                                <Text
                                  key={specialty}
                                  style={styles.profileSpecialty}
                                >
                                  {specialty}
                                </Text>
                              ))}
                            </View>
                            <Text style={styles.profileServiceDescription}>
                              {service.description}
                            </Text>
                          </View>
                        </View>
                      ))}
                      <View style={styles.lockedProfileService}>
                        <Text style={styles.lockedProfileServiceText}>
                          🔒 Tercer servicio con membresía
                        </Text>
                      </View>
                    </View>
                    {!!providerProfile.profileReviews?.length && (
                      <View style={styles.profileSection}>
                        <View style={styles.workCardTop}>
                          <Text style={styles.panelEyebrow}>RESEÑAS</Text>
                          <Text style={styles.reviewAverage}>★ 5,0</Text>
                        </View>
                        {providerProfile.profileReviews.map((review) => (
                          <View key={review.id} style={styles.profileReview}>
                            <View style={styles.reviewAuthorRow}>
                              <View style={styles.reviewAvatar}>
                                <Text style={styles.reviewAvatarText}>
                                  {review.authorName.slice(0, 1)}
                                </Text>
                              </View>
                              <View style={styles.reviewAuthorCopy}>
                                <Text style={styles.reviewAuthor}>
                                  {review.authorName}
                                </Text>
                                <Text style={styles.reviewDate}>
                                  {review.createdAt}
                                </Text>
                              </View>
                              <Text style={styles.reviewStarsSmall}>
                                {"★".repeat(review.rating)}
                              </Text>
                            </View>
                            <Text style={styles.reviewComment}>
                              “{review.comment}”
                            </Text>
                            <Text style={styles.verifiedReview}>
                              ✓ Trabajo verificado en LaburApp
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    <View style={styles.profileSection}>
                      <View style={styles.workCardTop}>
                        <Text style={styles.panelEyebrow}>
                          TRABAJOS REALIZADOS
                        </Text>
                        <View style={styles.providerHeaderActions}>
                          <Text style={styles.servicePlanBadge}>3 GRATIS</Text>
                          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Editar trabajos realizados" style={styles.editProfileButton} onPress={openPortfolioEditor}>
                            <Text style={styles.editProfileButtonText}>EDITAR</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      {providerProfile.portfolioWorks?.length ? (
                        providerProfile.portfolioWorks.map((work) => (
                          <View key={work.id} style={styles.portfolioWorkCard}>
                            <Text style={styles.portfolioWorkTitle}>
                              Servicio de {work.service}
                            </Text>
                            <Text style={styles.portfolioWorkDescription}>
                              {work.description}
                            </Text>
                            <View style={styles.portfolioPhotos}>
                              {work.photos.map((photo) => (
                                <Image
                                  key={photo.id}
                                  source={{ uri: photo.uri }}
                                  style={styles.portfolioPhoto}
                                />
                              ))}
                            </View>
                          </View>
                        ))
                      ) : (
                        <View style={styles.portfolioEmpty}>
                          <Text style={styles.portfolioEmptyTitle}>
                            Todavía no publicaste trabajos
                          </Text>
                          <Text style={styles.portfolioEmptyText}>
                            Mostrá ejemplos reales con tres fotos cuadradas por
                            trabajo.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : session.role === "client" || session.role === "provider" ? (
                  <View style={styles.providerInvite}>
                    <Text style={styles.providerInviteTitle}>
                      ¿Querés ofrecer tus servicios?
                    </Text>
                    <Text style={styles.pageCopy}>
                      Completá todo en una sola pantalla y empezá a recibir
                      solicitudes.
                    </Text>
                    <TouchableOpacity
                      style={styles.modalPrimary}
                      onPress={openProviderProfile}
                    >
                      <Text style={styles.modalPrimaryText}>
                        Crear perfil de prestador
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewTitle}>
                      Cuenta administradora
                    </Text>
                    <Text style={styles.reviewText}>
                      Usá la pestaña Panel para moderar usuarios, profesionales,
                      trabajos, pagos y auditoría.
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                  <Text style={styles.logoutText}>Cerrar sesión</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
      {requested && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{requested}</Text>
          <TouchableOpacity onPress={() => setRequested(null)}>
            <Text style={styles.toastClose}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}
      <AppModal visible={menuOpen} onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.drawerBackdrop}>
          <View style={styles.drawerPanel}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>LaburApp</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar menú" style={styles.drawerClose} onPress={() => setMenuOpen(false)}>
                <Text style={styles.drawerCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.drawerEyebrow}>INFORMACIÓN</Text>
            {(
              [
                ["terms", "Términos y condiciones"],
                ["privacy", "Política de privacidad"],
                ["about", "Nosotros"],
                ["usage", "Mecánica de uso"],
                ["certifications", "Certificaciones"],
              ] as const
            ).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                accessibilityRole="link"
                style={styles.drawerItem}
                onPress={() => {
                  setMenuOpen(false);
                  setInfoPage(key);
                }}
              >
                <Text style={styles.drawerItemText}>{label}</Text>
                <Text style={styles.drawerItemArrow}>›</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.socialRow}>
              <TouchableOpacity accessibilityRole="link" accessibilityLabel="Facebook de LaburApp" style={styles.socialButton} onPress={() => setRequested("Falta vincular la cuenta oficial de Facebook.")}>
                <Text style={styles.facebookIcon}>f</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="link" accessibilityLabel="Instagram de LaburApp" style={styles.socialButton} onPress={() => setRequested("Falta vincular la cuenta oficial de Instagram.")}>
                <View style={styles.instagramIcon}><View style={styles.instagramLens} /><View style={styles.instagramDot} /></View>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar menú lateral" style={styles.drawerDismissArea} onPress={() => setMenuOpen(false)} />
        </View>
      </AppModal>
      <AppModal visible={infoPage !== null} onRequestClose={() => setInfoPage(null)}>
        <View style={styles.modalBackdrop}>
          {infoPage && <View style={styles.infoPageCard}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar información" style={styles.modalClose} onPress={() => setInfoPage(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{infoPages[infoPage].title}</Text>
            <Text style={styles.infoPageBody}>{infoPages[infoPage].body}</Text>
          </View>}
        </View>
      </AppModal>
      <AppModal visible={publicProfileProvider !== null} onRequestClose={() => setPublicProfileProvider(null)}>
        <View style={styles.modalBackdrop}>
          {publicProfileProvider && <ScrollView style={styles.publicProfileCard} contentContainerStyle={styles.publicProfileContent}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar perfil profesional" style={styles.modalClose} onPress={() => setPublicProfileProvider(null)}><Text style={styles.modalCloseText}>×</Text></TouchableOpacity>
            <View style={styles.publicProfileHeader}>
              <View style={styles.publicProfileAvatar}><Text style={styles.publicProfileAvatarText}>{publicProfileProvider.name.split(" ").map((part) => part[0]).join("")}</Text></View>
              <View style={styles.publicProfileIdentity}><View style={styles.verifiedNameRow}><Text style={styles.publicProfileName}>{publicProfileProvider.name}</Text><Text accessibilityLabel="Perfil verificado" style={styles.verifiedIcon}>✓</Text></View><Text style={styles.publicProfileTrade}>{publicProfileProvider.trade} · {publicProfileProvider.city}</Text><Text style={styles.publicProfileSkills}>{publicProfileProvider.skills}</Text></View>
            </View>
            <View style={styles.publicProfileStats}><View style={styles.publicProfileStat}><Text style={styles.publicProfileStatValue}>★ {publicProfileProvider.rating}</Text><Text style={styles.publicProfileStatLabel}>calificación</Text></View><View style={styles.publicProfileStat}><Text style={styles.publicProfileStatValue}>{publicProfileProvider.jobs}</Text><Text style={styles.publicProfileStatLabel}>trabajos</Text></View><View style={styles.publicProfileStat}><Text style={styles.publicProfileStatValue}>✓</Text><Text style={styles.publicProfileStatLabel}>{publicProfileProvider.badge}</Text></View></View>
            {selectedPublicDetails && <>
              <View style={styles.publicProfileSection}>
                <Text style={styles.panelEyebrow}>SOBRE EL PROFESIONAL</Text>
                <Text style={styles.publicProfileWorkDescription}>{selectedPublicDetails.bio}</Text>
              </View>
              <View style={styles.publicProfileSection}>
                <View style={styles.workCardTop}>
                  <Text style={styles.panelEyebrow}>SERVICIO</Text>
                  {!!selectedPublicDetails.diagnosticPrice && <Text style={styles.diagnosticBadge}>Diagnóstico desde ${selectedPublicDetails.diagnosticPrice.toLocaleString("es-AR")}</Text>}
                </View>
                <Text style={styles.publicProfileWorkTitle}>{publicProfileProvider.trade}</Text>
                <Text style={styles.publicProfileWorkDescription}>{publicProfileProvider.skills}</Text>
              </View>
              <View style={styles.publicProfileSection}>
                <Text style={styles.panelEyebrow}>CERTIFICACIONES</Text>
                <View style={styles.certificationList}>
                  {selectedPublicDetails.certifications.map((certification) => <View key={certification} style={styles.certificationBadge}><Text style={styles.certificationIcon}>✓</Text><Text style={styles.certificationText}>{certification}</Text></View>)}
                </View>
              </View>
              {!!selectedPublicDetails.reviews.length && <View style={styles.publicProfileSection}>
                <View style={styles.workCardTop}><Text style={styles.panelEyebrow}>RESEÑAS</Text><Text style={styles.reviewAverage}>★ 5,0</Text></View>
                {selectedPublicDetails.reviews.map((review) => <View key={review.author} style={styles.publicReviewRow}><View><Text style={styles.reviewAuthor}>{review.author}</Text><Text style={styles.publicReviewComment}>“{review.comment}”</Text></View><Text style={styles.reviewStarsSmall}>{"★".repeat(review.rating)}</Text></View>)}
              </View>}
            </>}
            <View style={styles.publicProfileSection}>
              <View style={styles.workCardTop}>
                <Text style={styles.panelEyebrow}>TRABAJOS REALIZADOS</Text>
                <Text style={styles.servicePlanBadge}>3 · PLAN GRATIS</Text>
              </View>
              {selectedPublicWorks.map((work, workIndex) => (
                <View key={work.id} style={styles.publicPortfolioWork}>
                  <View style={styles.workCardTop}>
                    <Text style={styles.publicWorkNumber}>TRABAJO {workIndex + 1}</Text>
                    {workIndex === 0 && <Text style={styles.favoriteLabel}>★ FAVORITO</Text>}
                  </View>
                  <View style={styles.publicWorkPhotos}>
                    {work.photoUris.slice(0, 3).map((photoUri, photoIndex) => (
                      <TouchableOpacity
                        key={`${work.id}-photo-${photoIndex}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Ampliar foto ${photoIndex + 1} de ${work.title}`}
                        style={styles.publicWorkPhotoButton}
                        onPress={() => setWorkPhoto({ provider: publicProfileProvider, work: { title: work.title, description: work.description, photoUri } })}
                      >
                        <Image source={{ uri: photoUri }} resizeMode="cover" style={styles.publicWorkPhoto} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={styles.publicProfileWorkTitle}>{work.title}</Text>
                  <Text style={styles.publicProfileWorkDescription}>{work.description}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { const provider = publicProfileProvider; setPublicProfileProvider(null); startQuote(provider); }}><Text style={styles.buttonText}>Solicitar presupuesto</Text></TouchableOpacity>
          </ScrollView>}
        </View>
      </AppModal>
      <AppModal visible={workPhoto !== null} onRequestClose={() => setWorkPhoto(null)}>
        <View style={styles.lightboxBackdrop}>
          {workPhoto && <><Image source={{ uri: workPhoto.work.photoUri }} resizeMode="contain" style={styles.lightboxImage} /><Text style={styles.lightboxTitle}>{workPhoto.work.title}</Text><Text style={styles.lightboxCaption}>{workPhoto.provider.name} · {workPhoto.provider.city}</Text></>}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar imagen ampliada" style={styles.lightboxClose} onPress={() => setWorkPhoto(null)}><Text style={styles.lightboxCloseText}>×</Text></TouchableOpacity>
        </View>
      </AppModal>
      <AppModal
        visible={authMode !== null}
        onRequestClose={() => setAuthMode(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.modalClose}
              onPress={() => setAuthMode(null)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {authMode === "login"
                ? "Ingresá a LaburApp"
                : authMode === "recovery"
                  ? "Recuperá tu cuenta"
                  : "Creá tu cuenta"}
            </Text>
            <Text style={styles.modalCopy}>
              {authMode === "login"
                ? supabase
                  ? "Ingresá con tu cuenta de LaburApp."
                  : "Continuá con una cuenta demo para probar el flujo."
                : authMode === "recovery"
                  ? supabase
                    ? "Ingresá tu correo y te enviaremos instrucciones."
                    : "En el modo demo no se envía ningún correo real."
                  : "Una cuenta sirve para contratar y ofrecer servicios."}
            </Text>
            {authMode === "login" && demoAccessEnabled && (
              <View style={styles.demoAccounts}>
                <Text style={styles.modalLabel}>Accesos de prueba</Text>
                {demoAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.email}
                    style={styles.demoAccountButton}
                    onPress={() => loginDemoAccount(account)}
                  >
                    <View>
                      <Text style={styles.demoAccountTitle}>
                        {account.label}
                      </Text>
                      <Text style={styles.demoAccountEmail}>
                        {account.email}
                      </Text>
                    </View>
                    <Text style={styles.demoAccountArrow}>›</Text>
                  </TouchableOpacity>
                ))}
                <View style={styles.loginDivider}>
                  <View style={styles.loginDividerLine} />
                  <Text style={styles.loginDividerText}>
                    o ingresá manualmente
                  </Text>
                  <View style={styles.loginDividerLine} />
                </View>
              </View>
            )}
            {authMode === "register" && (
              <TextInput
                value={authName}
                onChangeText={setAuthName}
                placeholder="Nombre y apellido"
                placeholderTextColor="#71818B"
                style={styles.modalInput}
              />
            )}
            <TextInput
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Correo electrónico"
              placeholderTextColor="#71818B"
              style={styles.modalInput}
            />
            {authMode !== "recovery" && (
              <TextInput
                value={authPassword}
                onChangeText={setAuthPassword}
                secureTextEntry
                placeholder="Contraseña (6 caracteres mínimo)"
                placeholderTextColor="#71818B"
                style={styles.modalInput}
              />
            )}
            {authMode === "register" && (
              <>
                <Text style={styles.modalLabel}>
                  ¿Cómo vas a usar LaburApp?
                </Text>
                <View style={styles.roleRow}>
                  {[
                    ["client", "Quiero contratar"],
                    ["provider", "Quiero ofrecer"],
                  ].map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() =>
                        setAuthRole(value as "client" | "provider")
                      }
                      style={[
                        styles.roleChoice,
                        authRole === value && styles.roleChoiceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleChoiceText,
                          authRole === value && styles.roleChoiceTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalLabel}>Tu ciudad</Text>
                <View style={styles.roleRow}>
                  {cityChoices.map((city) => (
                    <TouchableOpacity
                      key={city}
                      onPress={() => setAuthCity(city)}
                      style={[
                        styles.roleChoice,
                        authCity === city && styles.roleChoiceActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleChoiceText,
                          authCity === city && styles.roleChoiceTextActive,
                        ]}
                      >
                        {city}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: acceptedTerms }}
                  onPress={() => setAcceptedTerms(!acceptedTerms)}
                  style={styles.termsRow}
                >
                  <Text style={styles.checkbox}>
                    {acceptedTerms ? "☑" : "☐"}
                  </Text>
                  <Text style={styles.termsText}>
                    Acepto los términos y la política de privacidad.
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {!!authError && <Text style={styles.modalError}>{authError}</Text>}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={authBusy}
              style={[styles.modalPrimary, authBusy && styles.buttonDisabled]}
              onPress={submitAuth}
            >
              <Text style={styles.modalPrimaryText}>
                {authBusy
                  ? "Procesando…"
                  : authMode === "login"
                    ? "Ingresar"
                    : authMode === "recovery"
                      ? "Enviar instrucciones"
                      : supabase
                        ? "Crear cuenta"
                        : "Crear cuenta demo"}
              </Text>
            </TouchableOpacity>
            {authMode === "login" && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  setAuthError("");
                  setAuthMode("recovery");
                }}
              >
                <Text style={styles.recoveryLink}>Olvidé mi contraseña</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setAuthError("");
                setAuthMode(authMode === "login" ? "register" : "login");
              }}
            >
              <Text style={styles.modalSwitch}>
                {authMode === "login"
                  ? "¿No tenés cuenta? Registrate"
                  : authMode === "recovery"
                    ? "Volver a ingresar"
                    : "¿Ya tenés cuenta? Ingresá"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={profileModal}
        onRequestClose={() => setProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <ProviderProfileForm
            darkMode={darkMode}
            key={`${profileDraft.displayName}-${profileModal}`}
            initialProfile={profileDraft}
            email={session?.email ?? ""}
            busy={profileBusy}
            remoteError={profileError}
            onCancel={() => setProfileModal(false)}
            onSubmit={(profile) => void saveProviderProfile(profile)}
          />
        </View>
      </AppModal>
      <AppModal
        visible={portfolioModal}
        onRequestClose={() => setPortfolioModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <PortfolioEditor
            darkMode={darkMode}
            key={`${providerProfile?.publicId}-${portfolioModal}`}
            initialWorks={providerProfile?.portfolioWorks ?? []}
            availableServices={Array.from(
              new Set(
                (providerProfile?.services ?? []).flatMap((service) =>
                  service.specialties?.length
                    ? service.specialties
                    : [service.service],
                ),
              ),
            )}
            busy={portfolioBusy}
            remoteError={portfolioError}
            onCancel={() => setPortfolioModal(false)}
            onSubmit={(works) => void savePortfolioWorks(works)}
          />
        </View>
      </AppModal>
      <AppModal
        visible={quoteProvider !== null}
        onRequestClose={() => setQuoteProvider(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.modalClose}
              onPress={() => setQuoteProvider(null)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Solicitar presupuesto</Text>
            <Text style={styles.modalCopy}>
              {quoteProvider
                ? `${quoteProvider.name} · ${quoteProvider.trade}`
                : ""}
            </Text>
            <TextInput
              multiline
              value={quoteDescription}
              onChangeText={setQuoteDescription}
              placeholder="¿Qué necesitás resolver?"
              placeholderTextColor="#71818B"
              style={[styles.modalInput, styles.multiline]}
            />
            <TextInput
              value={quoteZone}
              onChangeText={setQuoteZone}
              placeholder="Zona aproximada (sin dirección exacta)"
              placeholderTextColor="#71818B"
              style={styles.modalInput}
            />
            <TextInput
              value={quoteDate}
              onChangeText={setQuoteDate}
              placeholder="Fecha estimada: AAAA-MM-DD (opcional)"
              placeholderTextColor="#71818B"
              style={styles.modalInput}
            />
            <Text style={styles.modalFieldLabel}>Disponibilidad horaria del prestador</Text>
            <View style={styles.quoteTimeRow}>
              {(["start", "end"] as const).map((field) => {
                const value = field === "start" ? quoteStartTime : quoteEndTime;
                return <View key={field} style={styles.quoteTimeField}>
                  <Text style={styles.quoteTimeLabel}>{field === "start" ? "Desde" : "Hasta"}</Text>
                  <TouchableOpacity accessibilityRole="button" style={styles.quoteTimeButton} onPress={() => setQuoteTimePicker(quoteTimePicker === field ? null : field)}>
                    <Text style={styles.quoteTimeValue}>{value}</Text><Text style={styles.dropdownChevron}>⌄</Text>
                  </TouchableOpacity>
                  {quoteTimePicker === field && <ScrollView nestedScrollEnabled style={styles.quoteTimeOptions}>
                    {timeOptions.map((time) => <TouchableOpacity key={`${field}-${time}`} style={[styles.quoteTimeOption, value === time && styles.dropdownOptionActive]} onPress={() => { field === "start" ? setQuoteStartTime(time) : setQuoteEndTime(time); setQuoteTimePicker(null); }}>
                      <Text style={[styles.dropdownOptionText, value === time && styles.dropdownOptionTextActive]}>{time}</Text>
                    </TouchableOpacity>)}
                  </ScrollView>}
                </View>;
              })}
            </View>
            <Text style={styles.privacyHint}>
              {CONTACT_WARNING}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.modalPrimary}
              onPress={() => void submitQuote()}
            >
              <Text style={styles.modalPrimaryText}>Enviar solicitud</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal visible={acceptQuoteRequest !== null} onRequestClose={() => setAcceptQuoteRequestId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmIcon}>✓</Text>
            <Text style={styles.modalTitle}>¿Seguro que aceptás?</Text>
            <Text style={styles.modalCopy}>
              {acceptQuoteRequest?.provider} recibirá la confirmación y el presupuesto quedará asociado al trabajo.
            </Text>
            {!!acceptQuoteRequest?.quote && (
              <Text style={styles.confirmAmount}>${acceptQuoteRequest.quote.amount.toLocaleString("es-AR")}</Text>
            )}
            <TouchableOpacity accessibilityRole="button" style={styles.modalPrimary} onPress={() => acceptQuoteRequest && void acceptQuote(acceptQuoteRequest)}>
              <Text style={styles.modalPrimaryText}>Sí, acepto</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => setAcceptQuoteRequestId(null)}>
              <Text style={styles.secondaryText}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal visible={completionQr !== null} onRequestClose={() => setCompletionQr(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.completionQrCard}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar QR" style={styles.modalClose} onPress={() => setCompletionQr(null)}>
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.panelEyebrow}>TRABAJO TERMINADO</Text>
            <Text style={styles.modalTitle}>Mostrale este QR al cliente</Text>
            <Text style={styles.modalCopy}>El cliente debe abrir el botón QR de su menú y escanearlo. Vence en 15 minutos y sólo puede usarse una vez.</Text>
            {completionQr && <View style={styles.qrCodeSurface}><QRCode value={completionQr.value} size={220} backgroundColor="#FFFFFF" color="#063C78" /></View>}
            <Text style={styles.qrShortCode}>{completionQr?.value.match(/[?&]token=([^&]+)/)?.[1] ?? ""}</Text>
            <Text style={styles.privacyHint}>El código no contiene datos personales ni precios.</Text>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={chatRequest !== null}
        onRequestClose={() => setChatRequestId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.modalClose}
              onPress={() => setChatRequestId(null)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Conversación</Text>
            <Text style={styles.modalCopy}>
              {chatRequest
                ? `${chatRequest.provider} · ${chatRequest.trade}`
                : ""}
            </Text>
            <ScrollView
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
            >
              {!chatRequest?.messages?.length && (
                <View style={styles.chatEmpty}>
                  <Text style={styles.chatEmptyTitle}>
                    Todavía no hay mensajes
                  </Text>
                  <Text style={styles.reviewText}>
                    Usá este espacio para aclarar el trabajo sin compartir datos
                    de contacto.
                  </Text>
                </View>
              )}
              {chatRequest?.messages?.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.sender === "client"
                      ? styles.messageClient
                      : message.sender === "provider"
                        ? styles.messageProvider
                        : styles.messageSystem,
                  ]}
                >
                  <Text style={styles.messageSender}>
                    {message.sender === "client"
                      ? "Vos"
                      : message.sender === "provider"
                        ? chatRequest.provider
                        : "LaburApp"}
                  </Text>
                  <Text style={styles.messageBody}>{message.body}</Text>
                </View>
              ))}
            </ScrollView>
            <TextInput
              multiline
              value={chatMessage}
              onChangeText={setChatMessage}
              placeholder="Escribí un mensaje"
              placeholderTextColor="#71818B"
              style={[styles.modalInput, styles.chatInput]}
            />
            <Text style={styles.privacyHint}>
              {CONTACT_WARNING}
            </Text>
            {!!chatError && <Text style={styles.modalError}>{chatError}</Text>}
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.modalPrimary}
              onPress={sendChatMessage}
            >
              <Text style={styles.modalPrimaryText}>Enviar mensaje</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={reviewRequest !== null}
        onRequestClose={() => setReviewRequestId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.modalClose}
              onPress={() => setReviewRequestId(null)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Calificá el trabajo</Text>
            <Text style={styles.modalCopy}>
              {reviewRequest
                ? `Tu experiencia con ${reviewRequest.provider}`
                : ""}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  accessibilityRole="button"
                  accessibilityLabel={`${rating} estrellas`}
                  onPress={() => setReviewRating(rating)}
                >
                  <Text
                    style={[
                      styles.starChoice,
                      rating <= reviewRating && styles.starChoiceActive,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              multiline
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="¿Cómo fue el trabajo?"
              placeholderTextColor="#71818B"
              style={[styles.modalInput, styles.multiline]}
            />
            <Text style={styles.modalLabel}>Elegí hasta 3 cualidades</Text>
            <View style={styles.qualityChoices}>
              {reviewQualitySuggestions.map((quality) => {
                const selected = reviewQualities.includes(quality);
                return (
                  <TouchableOpacity
                    key={quality}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[styles.qualityChoice, selected && styles.qualityChoiceActive]}
                    onPress={() => setReviewQualities((current) => selected ? current.filter((item) => item !== quality) : current.length < 3 ? [...current, quality] : current)}
                  >
                    <Text style={[styles.qualityChoiceText, selected && styles.qualityChoiceTextActive]}>{quality}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.reviewBox}>
              <Text style={styles.reviewTitle}>Reseña verificada</Text>
              <Text style={styles.reviewText}>
                Se habilita únicamente porque el cliente confirmó la finalización escaneando el QR del profesional.
              </Text>
            </View>
            {!!reviewError && (
              <Text style={styles.modalError}>{reviewError}</Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.modalPrimary}
              onPress={() => void submitReview()}
            >
              <Text style={styles.modalPrimaryText}>Publicar reseña</Text>
            </TouchableOpacity>
          </View>
        </View>
      </AppModal>
      <AppModal
        visible={quoteBuilderRequest !== null}
        onRequestClose={() => setQuoteBuilderRequestId(null)}
      >
        <View style={styles.modalBackdrop}>
          {quoteBuilderRequest && (
            <QuoteBuilderForm
              darkMode={darkMode}
              request={quoteBuilderRequest}
              tariffItems={providerProfile?.tariffItems}
              onCancel={() => setQuoteBuilderRequestId(null)}
              onSubmit={sendModularQuote}
            />
          )}
        </View>
      </AppModal>
      <View style={styles.nav}>
        {navigationItems.map((item) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={item}
            key={item}
            onPress={() => setTab(item)}
            style={[styles.navItem, item === "QR" && styles.qrNavItem]}
          >
            {item === "QR" ? (
              <><Text style={styles.qrNavIcon}>▣</Text><Text style={[styles.qrNavText, tab === item && styles.navActive]}>QR</Text></>
            ) : (
              <Text style={[styles.navText, tab === item && styles.navActive]}>{item}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.snow },
    header: {
      minHeight: 88,
      paddingHorizontal: 16,
      paddingVertical: 6,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#000000",
      borderBottomWidth: 3,
      borderBottomColor: colors.blue,
    },
    headerCompact: {
      minHeight: 64,
      paddingVertical: 6,
      backgroundColor: "#000000",
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    menuButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(102,208,245,0.72)",
      backgroundColor: "#0B2035",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    menuLine: { width: 15, height: 2, borderRadius: 2, backgroundColor: "white" },
    wordmarkLogo: { width: 176, height: 48 },
    wordmarkLogoWide: { width: 210, height: 60 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    themeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cyan,
      backgroundColor: "#0B2035",
      alignItems: "center",
      justifyContent: "center",
    },
    themeButtonText: { color: "white", fontSize: 19, lineHeight: 22 },
    loginButton: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cyan,
      backgroundColor: "#063C78",
    },
    loginButtonText: { color: "white", fontWeight: "800", fontSize: 14 },
    content: { padding: 18, paddingBottom: 110 },
    hero: {
      backgroundColor: colors.brandNavy,
      borderRadius: 24,
      padding: 22,
      marginBottom: 24,
    },
    heroTitle: {
      color: "white",
      fontSize: 30,
      lineHeight: 34,
      fontWeight: "900",
    },
    heroCopy: { color: "#D6E6EE", fontSize: 15, lineHeight: 21, marginTop: 8 },
    search: {
      backgroundColor: colors.surface,
      color: colors.navy,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      minHeight: 52,
      marginTop: 18,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    quickSearches: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 12,
    },
    quickSearch: {
      minHeight: 26,
      justifyContent: "center",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    quickSearchActive: {
      backgroundColor: colors.orange,
      borderColor: colors.orange,
    },
    quickSearchText: {
      color: "#D8EEFA",
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "700",
    },
    quickSearchTextActive: { color: "white" },
    sectionHeader: {
      minHeight: 42,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      zIndex: 20,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 20,
      fontWeight: "800",
      color: colors.navy,
    },
    compactFilters: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      zIndex: 30,
    },
    dropdownWrap: { position: "relative", zIndex: 31 },
    dropdownButton: {
      height: 36,
      paddingHorizontal: 11,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    dropdownButtonText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
    dropdownChevron: {
      color: colors.blue,
      fontSize: 15,
      fontWeight: "900",
      marginTop: -3,
    },
    dropdownMenu: {
      position: "absolute",
      top: 41,
      minWidth: 175,
      overflow: "hidden",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      shadowColor: "#001F3F",
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.36,
      shadowRadius: 12,
      elevation: 12,
    },
    sortMenu: { right: 0 },
    cityMenu: { right: 0 },
    dropdownOption: {
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    dropdownOptionActive: { backgroundColor: colors.raised },
    dropdownOptionText: {
      color: colors.stone,
      fontSize: 12,
      fontWeight: "700",
    },
    dropdownOptionTextActive: { color: colors.navy, fontWeight: "900" },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 15,
      marginBottom: 12,
      flexDirection: "column",
    },
    cardExpanded: { borderColor: colors.blue },
    cardOpenArea: { flexDirection: "row", alignItems: "flex-start" },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.avatar,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },
    avatarText: { color: colors.navy, fontWeight: "900" },
    cardBody: { flex: 1 },
    row: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    nameLink: { color: colors.blue, fontSize: 17, fontWeight: "900" },
    rating: { color: colors.navy, fontWeight: "700" },
    trade: { color: colors.blue, fontWeight: "700", marginTop: 2 },
    skills: { color: colors.stone, marginTop: 6 },
    badge: {
      color: colors.green,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 7,
    },
    button: {
      backgroundColor: colors.orange,
      borderRadius: 12,
      paddingVertical: 11,
      alignItems: "center",
      marginTop: 12,
    },
    buttonText: { color: "white", fontWeight: "800" },
    featuredToggleButton: { alignSelf: "flex-start", minHeight: 30, justifyContent: "center", marginLeft: 65 },
    featuredToggle: { color: colors.blue, fontSize: 10, fontWeight: "900" },
    featuredWork: { flexDirection: "row", gap: 11, marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line },
    featuredPhotoButton: { width: 108, height: 108, borderRadius: 11, overflow: "hidden", backgroundColor: colors.raised },
    featuredPhoto: { width: 108, height: 108 },
    featuredWorkCopy: { flex: 1, minWidth: 0 },
    favoriteLabel: { color: colors.orange, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
    featuredWorkTitle: { color: colors.navy, fontSize: 13, fontWeight: "900", marginTop: 4 },
    featuredWorkDescription: { color: colors.stone, fontSize: 10, lineHeight: 14, marginTop: 4 },
    viewProfileLink: { color: colors.blue, fontSize: 10, fontWeight: "900", marginTop: 7 },
    empty: {
      minHeight: 360,
      justifyContent: "center",
      alignItems: "center",
      padding: 28,
    },
    emptyTitle: {
      color: colors.navy,
      fontSize: 22,
      fontWeight: "900",
      textAlign: "center",
    },
    catLarge: { fontSize: 58, marginBottom: 14 },
    secondaryButton: {
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.blue,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 18,
    },
    secondaryText: { color: colors.blue, fontWeight: "800" },
    sectionPage: { width: "100%", maxWidth: 760, alignSelf: "center" },
    pageTitle: { color: colors.navy, fontSize: 28, fontWeight: "900" },
    pageCopy: {
      color: colors.stone,
      fontSize: 15,
      lineHeight: 21,
      marginTop: 5,
      marginBottom: 18,
    },
    notificationsPanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 17,
      padding: 15,
      marginBottom: 12,
    },
    notificationHeading: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 7,
    },
    notificationTitle: {
      color: colors.navy,
      fontSize: 17,
      fontWeight: "900",
      marginTop: 2,
    },
    notificationCount: {
      minWidth: 30,
      height: 30,
      borderRadius: 15,
      color: "white",
      backgroundColor: colors.orange,
      textAlign: "center",
      lineHeight: 30,
      fontWeight: "900",
    },
    notificationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    notificationCopy: { flex: 1 },
    notificationName: { color: colors.navy, fontSize: 13, fontWeight: "900" },
    notificationText: { color: colors.stone, fontSize: 11, marginTop: 3 },
    notificationAction: {
      minHeight: 38,
      borderRadius: 9,
      backgroundColor: colors.orange,
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    notificationActionText: { color: "white", fontSize: 10, fontWeight: "900" },
    notificationEmpty: {
      color: colors.stone,
      fontSize: 12,
      paddingVertical: 8,
    },
    simulatorBanner: {
      backgroundColor: colors.brandNavy,
      borderRadius: 17,
      padding: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    simulatorCopy: { flex: 1 },
    simulatorTitle: { color: "white", fontSize: 15, fontWeight: "900" },
    simulatorText: {
      color: "#CFE5F0",
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    simulatorButton: {
      minHeight: 40,
      borderRadius: 10,
      backgroundColor: colors.orange,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    simulatorButtonText: { color: "white", fontSize: 11, fontWeight: "900" },
    emptyPanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 20,
      padding: 26,
      alignItems: "center",
      marginTop: 8,
    },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    centerCopy: {
      color: colors.stone,
      textAlign: "center",
      lineHeight: 21,
      marginTop: 8,
      maxWidth: 430,
    },
    workCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 18,
      padding: 17,
      marginTop: 12,
    },
    workCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    workStatus: { color: colors.orange, fontSize: 12, fontWeight: "900" },
    statusGreen: { color: colors.green },
    statusBlue: { color: colors.blue },
    statusRed: { color: colors.danger },
    workDate: { color: colors.stone, fontSize: 12 },
    workProvider: {
      color: colors.navy,
      fontSize: 19,
      fontWeight: "900",
      marginTop: 12,
    },
    jobId: { color: colors.stone, fontSize: 9, marginTop: 3, letterSpacing: 0.35 },
    hiredAmount: { color: colors.green, fontSize: 13, fontWeight: "900", marginTop: 10, marginBottom: 10 },
    workDescription: { color: colors.stone, lineHeight: 20, marginTop: 10 },
    workMeta: { color: colors.navy, fontSize: 13, marginTop: 7 },
    nextStep: {
      backgroundColor: colors.warningSurface,
      borderRadius: 10,
      padding: 11,
      marginTop: 13,
    },
    nextStepText: {
      color: colors.warningText,
      fontSize: 12,
      fontWeight: "700",
    },
    quoteBox: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 13,
      padding: 13,
      marginTop: 13,
    },
    quoteLabel: { color: colors.blue, fontSize: 11, fontWeight: "900" },
    quoteAmount: { color: colors.navy, fontSize: 20, fontWeight: "900" },
    quoteScope: {
      color: colors.navy,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 8,
    },
    quoteEta: { color: colors.stone, fontSize: 12, marginTop: 5 },
    quoteBreakdown: {
      borderTopWidth: 1,
      borderTopColor: colors.line,
      marginTop: 10,
      paddingTop: 7,
    },
    quoteLine: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
      paddingVertical: 4,
    },
    quoteLineName: { color: colors.stone, fontSize: 11, flex: 1 },
    quoteLinePrice: { color: colors.navy, fontSize: 11, fontWeight: "800" },
    quoteNotes: {
      color: colors.stone,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 7,
      fontStyle: "italic",
    },
    quoteValidity: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "800",
      marginTop: 7,
    },
    paymentBox: {
      backgroundColor: colors.successSurface,
      borderRadius: 12,
      padding: 12,
      marginTop: 11,
    },
    paymentTitle: { color: colors.green, fontWeight: "900", fontSize: 13 },
    paymentText: {
      color: colors.successText,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
    lastMessage: {
      color: colors.stone,
      fontSize: 12,
      fontStyle: "italic",
      marginTop: 11,
    },
    actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    outlineAction: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.blue,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    outlineActionText: {
      color: colors.blue,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },
    primaryAction: {
      flex: 1.25,
      minHeight: 46,
      borderRadius: 11,
      backgroundColor: colors.orange,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    primaryActionFull: {
      minHeight: 46,
      borderRadius: 11,
      backgroundColor: colors.orange,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
      marginTop: 12,
    },
    primaryActionText: {
      color: "white",
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },
    cardLinks: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 12,
      marginTop: 14,
    },
    cardLink: { color: colors.blue, fontSize: 12, fontWeight: "800" },
    cancelLink: { color: colors.danger, fontSize: 12, fontWeight: "800" },
    reviewPublished: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
    },
    reviewStars: { color: colors.orange, fontSize: 18, letterSpacing: 2 },
    reviewPublishedText: { color: colors.navy, lineHeight: 19, marginTop: 5 },
    verifiedReview: {
      color: colors.green,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 7,
    },
    accountCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 18,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.brandNavy,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },
    profilePhoto: { width: 56, height: 56, borderRadius: 28, marginRight: 13 },
    profileAvatarText: { color: "white", fontSize: 23, fontWeight: "900" },
    accountBody: { flex: 1 },
    verifiedNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },
    accountName: { color: colors.navy, fontSize: 18, fontWeight: "900" },
    verifiedIcon: {
      width: 19,
      height: 19,
      borderRadius: 10,
      color: "white",
      backgroundColor: colors.blue,
      textAlign: "center",
      lineHeight: 19,
      fontSize: 11,
      fontWeight: "900",
    },
    diagnosticBadge: {
      color: colors.orange,
      backgroundColor: colors.warningSurface,
      borderRadius: 11,
      paddingHorizontal: 8,
      paddingVertical: 5,
      fontSize: 9,
      fontWeight: "900",
    },
    accountEmail: { color: colors.stone, marginTop: 2 },
    localBadge: {
      color: colors.green,
      fontSize: 11,
      fontWeight: "800",
      marginTop: 7,
    },
    followersButton: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    followersCount: { color: colors.navy, fontSize: 17, fontWeight: "900" },
    followersLabel: { color: colors.blue, fontSize: 9, fontWeight: "800" },
    followersPanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 15,
      padding: 14,
      marginTop: 10,
    },
    followerRow: {
      minHeight: 45,
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    followerAvatar: {
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor: colors.avatar,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },
    followerInitial: { color: colors.navy, fontWeight: "900" },
    followerName: {
      flex: 1,
      color: colors.navy,
      fontSize: 12,
      fontWeight: "800",
    },
    followingBadge: { color: colors.green, fontSize: 9, fontWeight: "900" },
    providerPanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 18,
      padding: 17,
      marginTop: 14,
    },
    panelEyebrow: { color: colors.stone, fontSize: 11, fontWeight: "900" },
    providerHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    publishedBadge: {
      color: colors.green,
      backgroundColor: colors.successSurface,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
      fontSize: 11,
      fontWeight: "900",
    },
    editProfileButton: {
      minHeight: 27,
      justifyContent: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.blue,
      paddingHorizontal: 10,
      backgroundColor: colors.raised,
    },
    editProfileButtonText: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "900",
    },
    providerTrade: {
      color: colors.navy,
      fontSize: 21,
      fontWeight: "900",
      marginTop: 13,
    },
    profileSection: {
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    profileSectionText: {
      color: colors.stone,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 7,
    },
    certificationList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 9,
    },
    certificationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 12,
      backgroundColor: colors.successSurface,
      borderWidth: 1,
      borderColor: colors.green,
    },
    certificationIcon: {
      width: 16,
      height: 16,
      borderRadius: 8,
      color: "white",
      backgroundColor: colors.green,
      textAlign: "center",
      lineHeight: 16,
      fontSize: 9,
      fontWeight: "900",
    },
    certificationText: {
      color: colors.successText,
      fontSize: 10,
      fontWeight: "900",
    },
    servicePlanBadge: { color: colors.green, fontSize: 9, fontWeight: "900" },
    profileServiceCard: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      padding: 12,
      marginTop: 9,
      backgroundColor: colors.surfaceSoft,
    },
    profileServiceCopy: { flex: 1 },
    profileServiceFamily: {
      color: colors.blue,
      fontSize: 9,
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    profileSpecialties: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 7,
    },
    profileSpecialty: {
      color: colors.navy,
      backgroundColor: colors.raised,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 5,
      fontSize: 11,
      fontWeight: "900",
    },
    profileServiceName: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 4,
    },
    profileServiceDescription: {
      color: colors.stone,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 5,
    },
    lockedProfileService: {
      minHeight: 39,
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: colors.raised,
      paddingHorizontal: 11,
      marginTop: 7,
    },
    lockedProfileServiceText: {
      color: colors.stone,
      fontSize: 10,
      fontWeight: "800",
    },
    reviewAverage: { color: colors.orange, fontSize: 12, fontWeight: "900" },
    profileReview: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 12,
      padding: 11,
      marginTop: 9,
    },
    reviewAuthorRow: { flexDirection: "row", alignItems: "center" },
    reviewAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.avatar,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    reviewAvatarText: { color: colors.navy, fontWeight: "900" },
    reviewAuthorCopy: { flex: 1 },
    reviewAuthor: { color: colors.navy, fontSize: 11, fontWeight: "900" },
    reviewDate: { color: colors.stone, fontSize: 8, marginTop: 2 },
    reviewStarsSmall: { color: colors.orange, fontSize: 10, letterSpacing: 1 },
    reviewComment: {
      color: colors.stone,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 8,
    },
    portfolioWorkCard: {
      marginTop: 10,
      padding: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceSoft,
    },
    portfolioWorkTitle: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "900",
    },
    portfolioWorkDescription: {
      color: colors.stone,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 5,
    },
    portfolioPhotos: { flexDirection: "row", gap: 7, marginTop: 9 },
    portfolioPhoto: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 9,
      backgroundColor: colors.raised,
    },
    portfolioEmpty: {
      marginTop: 9,
      padding: 13,
      borderRadius: 11,
      backgroundColor: colors.raised,
    },
    portfolioEmptyTitle: {
      color: colors.navy,
      fontSize: 12,
      fontWeight: "900",
    },
    portfolioEmptyText: {
      color: colors.stone,
      fontSize: 10,
      lineHeight: 15,
      marginTop: 3,
    },
    portfolioEditButton: {
      minHeight: 43,
      marginTop: 10,
      borderWidth: 1,
      borderColor: colors.blue,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
    },
    portfolioEditButtonText: {
      color: colors.blue,
      fontSize: 11,
      fontWeight: "900",
    },
    providerInvite: {
      backgroundColor: colors.brandNavy,
      borderRadius: 20,
      padding: 20,
      marginTop: 14,
    },
    providerInviteTitle: { color: "white", fontSize: 20, fontWeight: "900" },
    logoutButton: { alignSelf: "center", padding: 14, marginTop: 13 },
    logoutText: { color: colors.danger, fontWeight: "800" },
    adminMetrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    adminMetric: {
      flexGrow: 1,
      flexBasis: 150,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      padding: 16,
    },
    adminMetricValue: {
      color: colors.navy,
      fontSize: 27,
      fontWeight: "900",
      marginTop: 6,
    },
    adminLink: {
      minHeight: 48,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    adminLinkText: { color: colors.navy, fontWeight: "800" },
    adminLinkArrow: { color: colors.blue, fontSize: 25 },
    toast: {
      position: "absolute",
      bottom: 72,
      left: 18,
      right: 18,
      backgroundColor: colors.green,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toastText: { color: "white", fontWeight: "700", flex: 1 },
    toastClose: {
      color: "white",
      textDecorationLine: "underline",
      marginLeft: 12,
    },
    nav: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 66,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      flexDirection: "row",
    },
    navItem: { flex: 1, alignItems: "center", justifyContent: "center" },
    navText: { color: colors.stone, fontWeight: "700" },
    navActive: { color: colors.orange },
    drawerBackdrop: {
      position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1150,
      elevation: 28,
      backgroundColor: "rgba(0,6,12,0.76)",
      flexDirection: "row",
    },
    drawerPanel: {
      width: "82%",
      maxWidth: 350,
      height: "100%",
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.line,
      paddingTop: 24,
      paddingHorizontal: 20,
    },
    drawerDismissArea: { flex: 1 },
    drawerHeader: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    drawerTitle: { color: colors.navy, fontSize: 24, fontWeight: "900" },
    drawerClose: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    drawerCloseText: { color: colors.navy, fontSize: 30, lineHeight: 32, fontWeight: "800" },
    drawerEyebrow: { color: colors.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 8 },
    drawerItem: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    drawerItemText: { color: colors.navy, fontSize: 15, fontWeight: "800" },
    drawerItemArrow: { color: colors.blue, fontSize: 24, fontWeight: "700" },
    socialRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 24 },
    socialButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    facebookIcon: { color: colors.blue, fontSize: 31, lineHeight: 36, fontWeight: "900" },
    instagramIcon: { width: 25, height: 25, borderRadius: 7, borderWidth: 2.5, borderColor: colors.blue, alignItems: "center", justifyContent: "center" },
    instagramLens: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: colors.blue },
    instagramDot: { position: "absolute", width: 3, height: 3, borderRadius: 2, backgroundColor: colors.blue, top: 4, right: 4 },
    infoPageCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 38, minHeight: 220 },
    infoPageBody: { color: colors.stone, fontSize: 15, lineHeight: 23, marginTop: 14, maxWidth: 680 },
    publicProfileCard: { width: "100%", maxWidth: 680, maxHeight: "92%", alignSelf: "center", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    publicProfileContent: { padding: 22, paddingBottom: 30 },
    publicProfileHeader: { flexDirection: "row", alignItems: "center", paddingRight: 38 },
    publicProfileAvatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.brandNavy, alignItems: "center", justifyContent: "center", marginRight: 13 },
    publicProfileAvatarText: { color: "white", fontSize: 20, fontWeight: "900" },
    publicProfileIdentity: { flex: 1 },
    publicProfileName: { color: colors.navy, fontSize: 20, fontWeight: "900" },
    publicProfileTrade: { color: colors.blue, fontSize: 13, fontWeight: "800", marginTop: 4 },
    publicProfileSkills: { color: colors.stone, fontSize: 11, marginTop: 4 },
    publicProfileStats: { flexDirection: "row", gap: 8, marginTop: 16 },
    publicProfileStat: { flex: 1, minHeight: 68, borderRadius: 12, backgroundColor: colors.raised, alignItems: "center", justifyContent: "center", padding: 7 },
    publicProfileStatValue: { color: colors.navy, fontSize: 15, fontWeight: "900" },
    publicProfileStatLabel: { color: colors.stone, fontSize: 8, fontWeight: "700", textAlign: "center", marginTop: 3 },
    publicProfileSection: { marginTop: 17, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
    publicPortfolioWork: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: colors.raised },
    publicWorkNumber: { color: colors.blue, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
    publicWorkPhotos: { flexDirection: "row", gap: 7, marginTop: 9 },
    publicWorkPhotoButton: { flex: 1, aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: colors.surfaceSoft },
    publicWorkPhoto: { width: "100%", height: "100%" },
    publicReviewRow: { marginTop: 9, padding: 11, borderRadius: 11, backgroundColor: colors.raised, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
    publicReviewComment: { color: colors.stone, fontSize: 10, lineHeight: 15, marginTop: 4, maxWidth: 470 },
    publicProfileWorkTitle: { color: colors.navy, fontSize: 17, fontWeight: "900", marginTop: 10 },
    publicProfileWorkDescription: { color: colors.stone, fontSize: 12, lineHeight: 18, marginTop: 5 },
    lightboxBackdrop: { position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1200, elevation: 30, backgroundColor: "rgba(0,6,12,0.96)", alignItems: "center", justifyContent: "center", paddingTop: 28, paddingBottom: 18 },
    lightboxImage: { width: "92%", maxWidth: 920, height: "72%" },
    lightboxTitle: { color: "white", fontSize: 16, fontWeight: "900", textAlign: "center", marginTop: 10 },
    lightboxCaption: { color: "#AFC2D2", fontSize: 11, textAlign: "center", marginTop: 4 },
    lightboxClose: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
    lightboxCloseText: { color: "white", fontSize: 34, lineHeight: 38, fontWeight: "900" },
    modalBackdrop: {
      position: Platform.OS === "web" ? ("fixed" as "absolute") : "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 1000,
      elevation: 20,
      backgroundColor: "rgba(0,10,20,0.78)",
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 22,
      paddingBottom: 30,
      maxHeight: "92%",
    },
    modalClose: {
      position: "absolute",
      right: 18,
      top: 12,
      zIndex: 2,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.raised,
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseText: { color: colors.navy, fontSize: 27, lineHeight: 29 },
    modalTitle: {
      color: colors.navy,
      fontSize: 24,
      fontWeight: "900",
      marginTop: 4,
      paddingRight: 36,
    },
    modalCopy: {
      color: colors.stone,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
      marginBottom: 14,
    },
    modalInput: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 12,
      paddingHorizontal: 14,
      color: colors.navy,
      fontSize: 15,
      marginBottom: 10,
      backgroundColor: colors.input,
    },
    modalFieldLabel: { color: colors.navy, fontSize: 12, fontWeight: "900", marginBottom: 7 },
    quoteTimeRow: { flexDirection: "row", gap: 9, marginBottom: 10, zIndex: 4 },
    quoteTimeField: { flex: 1 },
    quoteTimeLabel: { color: colors.stone, fontSize: 10, fontWeight: "800", marginBottom: 5 },
    quoteTimeButton: { minHeight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: 11, paddingHorizontal: 12, backgroundColor: colors.input, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    quoteTimeValue: { color: colors.navy, fontSize: 14, fontWeight: "900" },
    quoteTimeOptions: { maxHeight: 160, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface, marginTop: 4 },
    quoteTimeOption: { minHeight: 37, justifyContent: "center", paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
    multiline: { minHeight: 88, paddingTop: 13, textAlignVertical: "top" },
    modalLabel: {
      color: colors.navy,
      fontSize: 13,
      fontWeight: "800",
      marginTop: 2,
      marginBottom: 8,
    },
    demoAccounts: { marginBottom: 10 },
    demoAccountButton: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 11,
      paddingHorizontal: 12,
      marginBottom: 7,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceSoft,
    },
    demoAccountTitle: { color: colors.navy, fontSize: 12, fontWeight: "900" },
    demoAccountEmail: { color: colors.stone, fontSize: 10, marginTop: 2 },
    demoAccountArrow: { color: colors.blue, fontSize: 24 },
    loginDivider: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginVertical: 8,
    },
    loginDividerLine: { height: 1, flex: 1, backgroundColor: colors.line },
    loginDividerText: { color: colors.stone, fontSize: 10 },
    twoTradesHint: {
      color: colors.warningText,
      backgroundColor: colors.warningSurface,
      borderRadius: 9,
      padding: 9,
      fontSize: 10,
      lineHeight: 15,
      marginTop: -2,
      marginBottom: 9,
    },
    roleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    roleChoice: {
      flexGrow: 1,
      flexBasis: 115,
      minHeight: 42,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
    },
    roleChoiceActive: {
      borderColor: colors.blue,
      backgroundColor: colors.raised,
    },
    roleChoiceText: { color: colors.stone, fontSize: 12, fontWeight: "800" },
    roleChoiceTextActive: { color: colors.navy },
    termsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    checkbox: { color: colors.orange, fontSize: 22, marginRight: 7 },
    termsText: { color: colors.stone, fontSize: 12, flex: 1 },
    modalError: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 10,
    },
    modalPrimary: {
      minHeight: 50,
      borderRadius: 12,
      backgroundColor: colors.orange,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    modalPrimaryText: { color: "white", fontSize: 15, fontWeight: "900" },
    recoveryLink: {
      color: colors.navy,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 14,
    },
    modalSwitch: {
      color: colors.blue,
      fontWeight: "800",
      textAlign: "center",
      marginTop: 15,
    },
    privacyHint: {
      color: colors.stone,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 10,
    },
    buttonDisabled: { opacity: 0.55 },
    stepLabel: {
      color: colors.orange,
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: 2,
    },
    progressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.line,
      marginTop: 9,
      marginBottom: 15,
      overflow: "hidden",
    },
    progressFill: {
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.orange,
    },
    reviewBox: {
      backgroundColor: colors.raised,
      borderRadius: 12,
      padding: 13,
      marginBottom: 10,
    },
    reviewTitle: { color: colors.navy, fontWeight: "900", marginBottom: 4 },
    reviewText: { color: colors.stone, fontSize: 12, lineHeight: 17 },
    wizardActions: { flexDirection: "row", gap: 9, alignItems: "center" },
    wizardBack: {
      minHeight: 50,
      minWidth: 86,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.blue,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    wizardBackText: { color: colors.blue, fontWeight: "900" },
    wizardPrimary: { flex: 1 },
    messagesList: { maxHeight: 310, minHeight: 150, marginBottom: 11 },
    messagesContent: { paddingVertical: 5, gap: 8 },
    chatEmpty: {
      minHeight: 130,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    chatEmptyTitle: { color: colors.navy, fontWeight: "900", marginBottom: 6 },
    messageBubble: { maxWidth: "88%", borderRadius: 13, padding: 11 },
    messageClient: { alignSelf: "flex-end", backgroundColor: colors.avatar },
    messageProvider: {
      alignSelf: "flex-start",
      backgroundColor: colors.raised,
    },
    messageSystem: {
      alignSelf: "center",
      maxWidth: "100%",
      backgroundColor: colors.warningSurface,
    },
    messageSender: {
      color: colors.blue,
      fontSize: 10,
      fontWeight: "900",
      marginBottom: 3,
    },
    messageBody: { color: colors.navy, fontSize: 13, lineHeight: 18 },
    chatInput: { minHeight: 68, paddingTop: 12, textAlignVertical: "top" },
    starsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 7,
      marginBottom: 17,
    },
    starChoice: { color: colors.line, fontSize: 38 },
    starChoiceActive: { color: colors.orange },
    requestQuotaCard: {
      minHeight: 72,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      paddingHorizontal: 15,
      paddingVertical: 12,
      marginBottom: 13,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    requestQuotaTitle: { color: colors.navy, fontSize: 14, fontWeight: "900", marginTop: 3 },
    upgradeLink: { color: colors.blue, fontSize: 10, fontWeight: "900", marginTop: 5 },
    requestQuotaCount: { color: colors.orange, fontSize: 22, fontWeight: "900" },
    expiryText: { color: colors.orange, fontSize: 10, fontWeight: "800", marginTop: 9 },
    completedVerified: { color: colors.green, fontSize: 12, fontWeight: "900", marginTop: 11 },
    clientJobsCount: { color: colors.stone, fontSize: 12, marginTop: 5 },
    confirmCard: {
      width: "92%",
      maxWidth: 430,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      padding: 24,
      alignSelf: "center",
      alignItems: "stretch",
    },
    confirmIcon: { color: colors.green, fontSize: 42, fontWeight: "900", textAlign: "center", marginBottom: 8 },
    confirmAmount: { color: colors.navy, fontSize: 30, fontWeight: "900", textAlign: "center", marginVertical: 15 },
    completionQrCard: {
      width: "94%",
      maxWidth: 480,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      padding: 22,
      alignSelf: "center",
    },
    qrCodeSurface: { backgroundColor: "white", borderRadius: 18, padding: 18, alignSelf: "center", marginVertical: 16 },
    qrShortCode: { color: colors.navy, fontSize: 16, fontWeight: "900", letterSpacing: 2, textAlign: "center", marginBottom: 12 },
    qrScannerCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginBottom: 14 },
    qrPermissionBox: { minHeight: 330, padding: 24, alignItems: "center", justifyContent: "center" },
    cameraFrame: { height: 390, backgroundColor: "#000", position: "relative" },
    camera: { width: "100%", height: "100%" },
    cameraGuide: { position: "absolute", width: 220, height: 220, top: 85, alignSelf: "center", borderWidth: 3, borderColor: colors.orange, borderRadius: 22 },
    manualQrCard: { borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 15 },
    qualityChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 13 },
    qualityChoice: { borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: colors.surfaceSoft },
    qualityChoiceActive: { borderColor: colors.green, backgroundColor: colors.successSurface },
    qualityChoiceText: { color: colors.stone, fontSize: 11, fontWeight: "800" },
    qualityChoiceTextActive: { color: colors.green },
    reviewQualitiesText: { color: colors.green, fontSize: 10, fontWeight: "900", marginTop: 6 },
    qrNavItem: { marginTop: -16 },
    qrNavIcon: { width: 48, height: 48, borderRadius: 24, color: "white", backgroundColor: colors.orange, textAlign: "center", lineHeight: 48, fontSize: 24, fontWeight: "900", overflow: "hidden" },
    qrNavText: { color: colors.stone, fontSize: 9, fontWeight: "900", marginTop: 2 },
  });
}
