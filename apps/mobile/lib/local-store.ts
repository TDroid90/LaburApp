import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JobStatus } from "@laburapp/shared";

export type SavedSession = {
  name: string;
  email: string;
  role: "client" | "provider" | "admin";
};

export type SavedRequest = {
  id: string;
  provider: string;
  trade: string;
  description: string;
  zone: string;
  desiredAt: string;
  createdAt: string;
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
};

export type SavedMessage = {
  id: string;
  sender: "client" | "provider" | "system";
  body: string;
  createdAt: string;
};

export type SavedProviderProfile = {
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
  description?: string;
  price: number;
  startTime: string;
  endTime: string;
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
    const realServices = savedRealServices.length ? savedRealServices : rawProfile && /gasista/i.test(rawProfile.trade) ? [{
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
      services: realServices,
    } : null;
    return {
      session: parsed.session ?? null,
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      providerProfile,
    };
  } catch {
    return emptyState;
  }
}

export async function saveLocalState(state: LocalAppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
