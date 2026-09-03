import type { SavedTariffItem } from "./local-store";

export type ServiceDictionaryItem = Omit<SavedTariffItem, "enabled">;

const row = (id: string, trade: string, label: string, unit: string, unitPrice: number): ServiceDictionaryItem => ({ id, trade, label, unit, unitPrice });

export const serviceDictionary: ServiceDictionaryItem[] = [
  row("gas-visita", "Gasista", "Visita y diagnóstico", "visita", 35000),
  row("gas-mano-obra", "Gasista", "Mano de obra básica", "servicio", 25000),
  row("gas-calefon", "Gasista", "Revisión de calefón", "equipo", 42000),
  row("plom-visita", "Plomería", "Visita y diagnóstico", "visita", 30000),
  row("plom-perdida", "Plomería", "Reparación de pérdida simple", "servicio", 38000),
  row("plom-griferia", "Plomería", "Cambio de grifería", "unidad", 45000),
  row("elec-visita", "Electricidad", "Revisión de instalación", "visita", 30000),
  row("elec-boca", "Electricidad", "Instalación de boca", "unidad", 28000),
  row("elec-tablero", "Electricidad", "Revisión de tablero", "servicio", 50000),
  row("limp-hora", "Limpieza", "Hora de limpieza", "hora", 12000),
  row("limp-profunda", "Limpieza", "Limpieza profunda", "ambiente", 24000),
  row("limp-obra", "Limpieza", "Limpieza final de obra", "m²", 2500),
  row("cuida-hora", "Cuidadora de adultos mayores", "Hora de acompañamiento", "hora", 12000),
  row("cuida-noche", "Cuidadora de adultos mayores", "Guardia nocturna", "noche", 95000),
  row("cuida-dia", "Cuidadora de adultos mayores", "Jornada de cuidado", "jornada", 85000),
  row("obra-jornal", "Ayudante de obra", "Jornal", "jornada", 55000),
  row("obra-media", "Ayudante de obra", "Media jornada", "jornada", 32000),
  row("obra-carga", "Ayudante de obra", "Movimiento de materiales", "hora", 14000),
  row("reparto-viaje", "Repartidor", "Entrega dentro de la ciudad", "viaje", 9000),
  row("reparto-espera", "Repartidor", "Tiempo de espera", "hora", 8000),
  row("reparto-paquete", "Repartidor", "Paquete adicional", "unidad", 2500),
  row("carga-hora", "Carga y descarga", "Operario de carga", "hora", 15000),
  row("carga-cuadrilla", "Carga y descarga", "Cuadrilla de dos personas", "hora", 28000),
  row("carga-minimo", "Carga y descarga", "Servicio mínimo", "servicio", 45000),
  row("pint-m2", "Pintura", "Pintura interior", "m²", 6500),
  row("pint-enduido", "Pintura", "Preparación y enduido", "m²", 4200),
  row("pint-visita", "Pintura", "Visita de medición", "visita", 20000),
  row("jardin-hora", "Jardinería", "Mantenimiento general", "hora", 15000),
  row("jardin-poda", "Jardinería", "Poda", "unidad", 18000),
  row("jardin-corte", "Jardinería", "Corte de césped", "m²", 1800),
  row("flete-base", "Fletes y mudanzas", "Flete base", "viaje", 60000),
  row("flete-hora", "Fletes y mudanzas", "Hora adicional", "hora", 25000),
  row("flete-peon", "Fletes y mudanzas", "Ayudante de carga", "hora", 16000),
  row("mec-diagnostico", "Mecánica", "Diagnóstico", "revisión", 40000),
  row("mec-service", "Mecánica", "Service básico", "servicio", 85000),
  row("mec-frenos", "Mecánica", "Mano de obra de frenos", "eje", 70000),
  row("info-visita", "Informática y soporte técnico", "Diagnóstico", "visita", 25000),
  row("info-hora", "Informática y soporte técnico", "Soporte técnico", "hora", 22000),
  row("info-formateo", "Informática y soporte técnico", "Instalación y configuración", "equipo", 55000),
  row("carp-visita", "Carpintería", "Visita y medición", "visita", 25000),
  row("carp-hora", "Carpintería", "Mano de obra", "hora", 20000),
  row("carp-armado", "Carpintería", "Armado de mueble", "unidad", 45000),
  row("herr-visita", "Herrería", "Visita y medición", "visita", 25000),
  row("herr-soldadura", "Herrería", "Trabajo de soldadura", "hora", 26000),
  row("herr-instalacion", "Herrería", "Instalación", "servicio", 55000),
];

export function dictionaryForTrades(trades: string[]) {
  const normalized = trades.map((trade) => trade.trim().toLowerCase()).filter(Boolean);
  return serviceDictionary.filter((item) => normalized.some((trade) => item.trade.toLowerCase().includes(trade) || trade.includes(item.trade.toLowerCase())));
}
