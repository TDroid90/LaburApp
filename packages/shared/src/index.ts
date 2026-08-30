export type JobStatus =
  | "request_created" | "request_sent" | "provider_reviewing"
  | "quote_sent" | "quote_revision_requested" | "quote_accepted"
  | "payment_pending" | "payment_authorized" | "funds_held"
  | "scheduled" | "in_progress" | "completion_proposed"
  | "client_confirmation_pending" | "completed" | "funds_released"
  | "cancelled" | "disputed" | "refunded";

export const jobTransitions: Record<JobStatus, readonly JobStatus[]> = {
  request_created: ["request_sent", "cancelled"],
  request_sent: ["provider_reviewing", "cancelled"],
  provider_reviewing: ["quote_sent", "cancelled"],
  quote_sent: ["quote_revision_requested", "quote_accepted", "cancelled"],
  quote_revision_requested: ["quote_sent", "cancelled"],
  quote_accepted: ["payment_pending", "cancelled"],
  payment_pending: ["payment_authorized", "cancelled"],
  payment_authorized: ["funds_held", "refunded"],
  funds_held: ["scheduled", "disputed", "refunded"],
  scheduled: ["in_progress", "cancelled", "disputed"],
  in_progress: ["completion_proposed", "disputed"],
  completion_proposed: ["client_confirmation_pending", "disputed"],
  client_confirmation_pending: ["completed", "disputed"],
  completed: ["funds_released", "disputed"],
  funds_released: ["disputed"],
  cancelled: [], disputed: ["refunded", "funds_released"], refunded: []
};

export function canTransition(from: JobStatus, to: JobStatus) {
  return jobTransitions[from].includes(to);
}

export const rankDefinitions = [
  [0, "Recién llegado"], [1, "Primer trabajo"], [5, "En marcha"],
  [15, "Activo"], [30, "Aprendiz"], [50, "Principiante"],
  [100, "Calificado"], [150, "Bronce"], [250, "Plata"],
  [400, "Oro"], [600, "Platino"], [850, "Diamante"],
  [1200, "Maestro"], [1750, "Gran Maestro"], [2500, "Leyenda"]
] as const;

export function rankFor(completedJobs: number) {
  let current: string = rankDefinitions[0][1];
  for (const [minimum, name] of rankDefinitions) if (completedJobs >= minimum) current = name;
  return current;
}

export type FeeSnapshot = {
  total: number; rate: number; fee: number; providerNet: number; currency: "ARS";
};

export function calculateFee(total: number, fiscalVerified: boolean): FeeSnapshot {
  if (!Number.isFinite(total) || total < 0) throw new Error("El importe debe ser positivo");
  const rate = fiscalVerified ? 0.05 : 0.07;
  const fee = Math.round(total * rate * 100) / 100;
  return { total, rate, fee, providerNet: Math.round((total - fee) * 100) / 100, currency: "ARS" };
}

export function containsContactAttempt(input: string) {
  const normalized = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const compact = normalized.replace(/[\s().+_-]/g, "");
  return /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/.test(normalized)
    || /(?:https?:\/\/|www\.|\.com\b|\.com\.ar\b)/.test(normalized)
    || /(?:whatsapp|telegram|instagram|facebook|mi celu|escribime afuera|buscame en)/.test(normalized)
    || /\d{8,15}/.test(compact);
}

export function reviewIsEligible(input: { isClient: boolean; paidInApp: boolean; status: JobStatus; alreadyReviewed: boolean }) {
  return input.isClient && input.paidInApp && input.status === "funds_released" && !input.alreadyReviewed;
}
