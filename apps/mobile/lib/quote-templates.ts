import type { QuotePricingMode, SavedQuoteItem, SavedRequest } from "./local-store";

export type QuoteDraft = {
  pricingMode: QuotePricingMode;
  baseAmount: number;
  items: SavedQuoteItem[];
  eta: string;
  notes: string;
  validDays: number;
};

const item = (id: string, label: string, unitPrice: number, unit = "unidad"): SavedQuoteItem => ({ id, label, quantity: 1, unit, unitPrice });

export function quoteTemplateFor(request: SavedRequest): QuoteDraft {
  const trade = request.trade.toLowerCase();
  if (trade.includes("gas")) return { pricingMode: "itemized", baseAmount: 35000, items: [item("visit", "Visita y diagnóstico", 35000, "visita"), item("labor", "Mano de obra", 25000, "servicio"), item("materials", "Materiales", 0, "estimado")], eta: "1 jornada", notes: "Materiales sujetos a confirmación luego de la revisión.", validDays: 7 };
  if (trade.includes("electric")) return { pricingMode: "itemized", baseAmount: 30000, items: [item("visit", "Revisión del tablero", 30000, "visita"), item("labor", "Mano de obra", 28000, "servicio"), item("materials", "Repuestos y materiales", 0, "estimado")], eta: "1 jornada", notes: "No incluye trabajos adicionales no detallados.", validDays: 7 };
  if (trade.includes("cuidad")) return { pricingMode: "itemized", baseAmount: 12000, items: [item("hour", "Hora de acompañamiento", 12000, "hora")], eta: "Según días y horarios acordados", notes: "El total final depende de la cantidad de horas contratadas.", validDays: 5 };
  return { pricingMode: "starting_at", baseAmount: 35000, items: [item("fees", "Honorarios profesionales", 35000, "servicio")], eta: "A coordinar", notes: "Valor inicial sujeto al alcance definitivo del trabajo.", validDays: 7 };
}

export function quoteDraftTotal(draft: QuoteDraft) {
  if (draft.pricingMode !== "itemized") return Math.max(0, draft.baseAmount);
  return draft.items.reduce((total, current) => total + Math.max(0, current.quantity) * Math.max(0, current.unitPrice), 0);
}
