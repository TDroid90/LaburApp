import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JobStatus } from "@laburapp/shared";

export type SavedSession = {
  name: string;
  email: string;
  role: "client" | "provider" | "admin";
  photoUri?: string;
};

export type SavedRequest = {
  id: string;
  jobId?: string;
  clientEmail?: string;
  providerId?: string;
  provider: string;
  trade: string;
  description: string;
  zone: string;
  desiredAt: string;
  preferredStartTime?: string;
  preferredEndTime?: string;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
  completionVerifiedAt?: string;
  status: JobStatus;
  quote?: SavedQuote;
  payment?: {
    total: number;
    fee: number;
    providerNet: number;
    protected: boolean;
  };
  messages?: SavedMessage[];
  review?: {
    rating: number;
    comment: string;
    qualities?: string[];
    createdAt: string;
  };
};

export type QuotePricingMode = "itemized" | "fixed" | "starting_at";

export type SavedQuoteItem = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type SavedQuote = {
  amount: number;
  scope: string;
  eta: string;
  version: number;
  pricingMode?: QuotePricingMode;
  items?: SavedQuoteItem[];
  notes?: string;
  validDays?: number;
  expiresAt?: string;
};

export type SavedMessage = {
  id: string;
  sender: "client" | "provider" | "system";
  body: string;
  createdAt: string;
  expiresAt?: string;
};

export type SavedProviderProfile = {
  publicId?: string;
  displayName: string;
  city: string;
  trade: string;
  diagnosticPrice?: number;
  secondaryTrade?: string;
  photoUri?: string;
  verified?: boolean;
  followersCount?: number;
  bio: string;
  training?: string;
  certifications?: string[];
  services?: SavedServiceOffer[];
  coverageAreas?: string[];
  portfolioWorks?: SavedPortfolioWork[];
  profileReviews?: SavedProfileReview[];
  skills: string;
  zones: string;
  availability: string;
  tariffItems?: SavedTariffItem[];
  published: boolean;
};

export type SavedServiceOffer = {
  id: string;
  family?: string;
  service: string;
  specialties?: string[];
  description?: string;
  price: number;
  startTime: string;
  endTime: string;
};

export type SavedWorkPhoto = {
  id: string;
  uri: string;
  storagePath?: string;
  driveFileId?: string;
  driveUrl?: string;
  watermarked: boolean;
};

export type SavedPortfolioWork = {
  id: string;
  service: string;
  description: string;
  photos: SavedWorkPhoto[];
};

export type SavedProfileReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

export type SavedTariffItem = {
  id: string;
  trade: string;
  label: string;
  unit: string;
  unitPrice: number;
  enabled: boolean;
};

export type LocalAppState = {
  session: SavedSession | null;
  requests: SavedRequest[];
  providerProfile: SavedProviderProfile | null;
};

const STORAGE_KEY = "laburapp.demo.v1";
const emptyState: LocalAppState = { session: null, requests: [], providerProfile: null };
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const durableRequestStatuses = new Set(["quote_accepted", "payment_pending", "payment_authorized", "funds_held", "scheduled", "in_progress", "completion_proposed", "client_confirmation_pending", "completed", "funds_released", "disputed", "refunded"]);

export async function loadLocalState(): Promise<LocalAppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<LocalAppState>;
    const rawProfile = parsed.providerProfile ?? null;
    const legacyServices = rawProfile?.services?.length ? rawProfile.services : rawProfile?.tariffItems?.slice(0, 2).map((item, index) => ({
        id: item.id || `legacy-service-${index}`,
        service: item.label,
        price: item.unitPrice,
        startTime: "09:00",
        endTime: "18:00",
      }));
    const diagnosticService = legacyServices?.find((item) => /diagnóstico|visita técnica/i.test(item.service));
    const savedRealServices = legacyServices?.filter((item) => !/diagnóstico|visita técnica/i.test(item.service)) ?? [];
    const realServices: SavedServiceOffer[] = savedRealServices.length ? savedRealServices as SavedServiceOffer[] : rawProfile && /gasista/i.test(rawProfile.trade) ? [{
      id: "migrated-gasista",
      family: "Instalaciones",
      service: "Gasista",
      description: "Reviso instalaciones domiciliarias, detecto fallas y explico las opciones de reparación antes de comenzar.",
      price: 0,
      startTime: "",
      endTime: "",
    }] : [];
    const providerProfile = rawProfile ? {
      ...rawProfile,
      diagnosticPrice: rawProfile.diagnosticPrice ?? diagnosticService?.price ?? 35000,
      services: realServices.map((service) => ({ ...service, specialties: service.specialties?.length ? service.specialties : service.service ? [service.service] : [] })),
      coverageAreas: rawProfile.coverageAreas?.length ? rawProfile.coverageAreas : rawProfile.zones === "Toda la provincia" ? ["San Sebastián", "Río Grande", "Tolhuin", "Almanza", "Ushuaia", "Zonas rurales"] : rawProfile.city ? [rawProfile.city] : [],
      portfolioWorks: rawProfile.portfolioWorks ?? [],
    } : null;
    const now = Date.now();
    const activeRequests = (Array.isArray(parsed.requests) ? parsed.requests : [])
      .filter((request) => durableRequestStatuses.has(request.status) || new Date(request.expiresAt ?? new Date(new Date(request.createdAt).getTime() + FIVE_DAYS_MS).toISOString()).getTime() > now)
      .map((request) => ({
        ...request,
        messages: request.messages?.filter((message) => new Date(message.expiresAt ?? new Date(new Date(message.createdAt).getTime() + FIVE_DAYS_MS).toISOString()).getTime() > now),
      }));
    const latestDemoByKind = new Map<string, SavedRequest>();
    for (const request of activeRequests) {
      const demoKind = request.id.match(/^scenario-\d+-(waiting|quote|active)$/)?.[1];
      if (!demoKind) continue;
      const current = latestDemoByKind.get(demoKind);
      if (!current || new Date(request.createdAt).getTime() > new Date(current.createdAt).getTime()) {
        latestDemoByKind.set(demoKind, request);
      }
    }
    const requests = activeRequests.filter((request) => {
      const demoKind = request.id.match(/^scenario-\d+-(waiting|quote|active)$/)?.[1];
      return !demoKind || latestDemoByKind.get(demoKind)?.id === request.id;
    });
    return {
      session: parsed.session ?? null,
      requests,
      providerProfile,
    };
  } catch {
    return emptyState;
  }
}

export async function saveLocalState(state: LocalAppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
