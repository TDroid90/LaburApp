import AsyncStorage from "@react-native-async-storage/async-storage";

export type SavedSession = {
  name: string;
  email: string;
  role: "client" | "provider";
};

export type SavedRequest = {
  id: string;
  provider: string;
  trade: string;
  description: string;
  zone: string;
  desiredAt: string;
  createdAt: string;
  status: "request_sent";
};

export type SavedProviderProfile = {
  displayName: string;
  city: string;
  trade: string;
  bio: string;
  skills: string;
  zones: string;
  availability: string;
  published: boolean;
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
    return {
      session: parsed.session ?? null,
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      providerProfile: parsed.providerProfile ?? null,
    };
  } catch {
    return emptyState;
  }
}

export async function saveLocalState(state: LocalAppState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
