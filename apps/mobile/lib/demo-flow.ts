import { calculateFee, canTransition, type JobStatus } from "@laburapp/shared";
import type { SavedRequest } from "./local-store";

export type DemoAction =
  | "provider_quote"
  | "request_revision"
  | "revised_quote"
  | "accept_quote"
  | "pay"
  | "schedule"
  | "start"
  | "propose_completion"
  | "confirm_completion"
  | "release"
  | "cancel";

export const statusPresentation: Record<JobStatus, { label: string; next: string; tone: "orange" | "blue" | "green" | "red" }> = {
  request_created: { label: "Solicitud creada", next: "Enviar la solicitud al profesional.", tone: "orange" },
  request_sent: { label: "Solicitud enviada", next: "El profesional revisa el pedido.", tone: "orange" },
  provider_reviewing: { label: "En revisión", next: "El profesional prepara su presupuesto.", tone: "blue" },
  quote_sent: { label: "Presupuesto recibido", next: "Aceptalo o pedí una modificación.", tone: "blue" },
  quote_revision_requested: { label: "Cambios solicitados", next: "El profesional envía una nueva versión.", tone: "orange" },
  quote_accepted: { label: "Presupuesto aceptado", next: "Realizá el pago protegido simulado.", tone: "blue" },
  payment_pending: { label: "Pago pendiente", next: "Completá el pago protegido.", tone: "orange" },
  payment_authorized: { label: "Pago autorizado", next: "LaburApp protege los fondos.", tone: "blue" },
  funds_held: { label: "Pago protegido", next: "Coordiná la fecha del trabajo.", tone: "green" },
  scheduled: { label: "Trabajo coordinado", next: "El profesional confirma el inicio.", tone: "blue" },
  in_progress: { label: "Trabajo en curso", next: "El profesional propone la finalización.", tone: "blue" },
  completion_proposed: { label: "Finalización propuesta", next: "El cliente confirma el resultado.", tone: "orange" },
  client_confirmation_pending: { label: "Esperando confirmación", next: "Confirmá que el trabajo fue terminado.", tone: "orange" },
  completed: { label: "Trabajo completado", next: "LaburApp libera los fondos protegidos.", tone: "green" },
  funds_released: { label: "Finalizado y pagado", next: "Dejá una reseña verificada.", tone: "green" },
  cancelled: { label: "Cancelado", next: "Este trabajo no continuará.", tone: "red" },
  disputed: { label: "En revisión", next: "El equipo revisa el caso.", tone: "red" },
  refunded: { label: "Reintegrado", next: "El pago fue reintegrado.", tone: "green" },
};

const paths: Record<DemoAction, readonly JobStatus[]> = {
  provider_quote: ["request_sent", "provider_reviewing", "quote_sent"],
  request_revision: ["quote_sent", "quote_revision_requested"],
  revised_quote: ["quote_revision_requested", "quote_sent"],
  accept_quote: ["quote_sent", "quote_accepted"],
  pay: ["quote_accepted", "payment_pending", "payment_authorized", "funds_held"],
  schedule: ["funds_held", "scheduled"],
  start: ["scheduled", "in_progress"],
  propose_completion: ["in_progress", "completion_proposed", "client_confirmation_pending"],
  confirm_completion: ["client_confirmation_pending", "completed"],
  release: ["completed", "funds_released"],
  cancel: ["request_sent", "cancelled"],
};

function assertPath(path: readonly JobStatus[]) {
  for (let index = 0; index < path.length - 1; index++) {
    if (!canTransition(path[index], path[index + 1])) throw new Error(`Transición inválida: ${path[index]} → ${path[index + 1]}`);
  }
}

function suggestedAmount(request: SavedRequest) {
  return Math.ceil((18000 + request.trade.length * 625) / 500) * 500;
}

export function applyDemoAction(request: SavedRequest, action: DemoAction): SavedRequest {
  const path = paths[action];
  if (request.status !== path[0]) throw new Error(`La acción ${action} no corresponde al estado ${request.status}`);
  assertPath(path);
  const now = new Date().toISOString();
  const status = path[path.length - 1];
  const messages = [...(request.messages ?? [])];
  let quote = request.quote;
  let payment = request.payment;

  if (action === "provider_quote" || action === "revised_quote") {
    const amount = (request.quote?.amount ?? suggestedAmount(request)) + (action === "revised_quote" ? 1500 : 0);
    quote = { amount, scope: `Incluye mano de obra para: ${request.description}`, eta: "Trabajo estimado: 1 jornada", version: (request.quote?.version ?? 0) + 1 };
    messages.push({ id: `${Date.now()}-provider`, sender: "provider", body: `Te envié el presupuesto${action === "revised_quote" ? " corregido" : ""}. Si tenés dudas, escribime por acá.`, createdAt: now });
  }
  if (action === "request_revision") messages.push({ id: `${Date.now()}-system`, sender: "system", body: "El cliente solicitó una modificación del presupuesto.", createdAt: now });
  if (action === "pay" && quote) {
    const fee = calculateFee(quote.amount, false);
    payment = { total: fee.total, fee: fee.fee, providerNet: fee.providerNet, protected: true };
    messages.push({ id: `${Date.now()}-payment`, sender: "system", body: "Pago simulado aprobado. Los fondos quedan protegidos hasta confirmar el trabajo.", createdAt: now });
  }
  if (action === "schedule") messages.push({ id: `${Date.now()}-schedule`, sender: "system", body: "Trabajo coordinado para la fecha conversada.", createdAt: now });
  if (action === "start") messages.push({ id: `${Date.now()}-start`, sender: "provider", body: "Ya estoy trabajando en el pedido.", createdAt: now });
  if (action === "propose_completion") messages.push({ id: `${Date.now()}-finish`, sender: "provider", body: "Terminé el trabajo. Revisalo y confirmá la finalización desde la app.", createdAt: now });
  if (action === "release") messages.push({ id: `${Date.now()}-release`, sender: "system", body: "Trabajo confirmado. Fondos liberados al profesional.", createdAt: now });

  return { ...request, status, quote, payment, messages };
}

export function primaryActionFor(status: JobStatus): { action: DemoAction; label: string } | null {
  switch (status) {
    case "request_sent": return { action: "provider_quote", label: "Simular respuesta del profesional" };
    case "quote_revision_requested": return { action: "revised_quote", label: "Simular presupuesto corregido" };
    case "quote_accepted": return { action: "pay", label: "Simular pago protegido" };
    case "funds_held": return { action: "schedule", label: "Confirmar fecha acordada" };
    case "scheduled": return { action: "start", label: "Simular inicio del trabajo" };
    case "in_progress": return { action: "propose_completion", label: "Simular trabajo terminado" };
    case "client_confirmation_pending": return { action: "confirm_completion", label: "Confirmar que está terminado" };
    case "completed": return { action: "release", label: "Liberar pago simulado" };
    default: return null;
  }
}

export function createDemoScenarios(): SavedRequest[] {
  const stamp = Date.now();
  const makeRequest = (suffix: string, provider: string, trade: string, description: string): SavedRequest => ({
    id: `scenario-${stamp}-${suffix}`,
    provider,
    trade,
    description,
    zone: "Río Grande",
    desiredAt: "Esta semana",
    createdAt: new Date().toISOString(),
    status: "request_sent",
    messages: [],
  });

  const waiting = makeRequest("waiting", "Ana Pereyra", "Cuidadora de adultos mayores", "Necesito acompañamiento para una persona mayor durante tres tardes.");
  const quoted = applyDemoAction(makeRequest("quote", "Martín Gómez", "Gasista", "Revisión de una pérdida de gas debajo de la mesada."), "provider_quote");
  let active = applyDemoAction(makeRequest("active", "Laura Torres", "Electricidad", "Revisión del tablero eléctrico y cambio de dos térmicas."), "provider_quote");
  active = applyDemoAction(active, "accept_quote");
  active = applyDemoAction(active, "pay");
  active = applyDemoAction(active, "schedule");
  active = applyDemoAction(active, "start");
  return [waiting, quoted, active];
}
