import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export type MirrorTab = "Usuarios" | "Profesionales" | "Contactos" | "Presupuestos" | "Trabajos" | "Reseñas" | "Pagos" | "Agenda" | "Auditoría" | "Tarifario" | "Plantillas" | "Membresías";

export type MirrorEvent = {
  id: string;
  tab: MirrorTab;
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
};

const QUEUE_KEY = "laburapp.sheets-mirror.v1";

async function readQueue(): Promise<MirrorEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) as MirrorEvent[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(events: MirrorEvent[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-500)));
}

export async function enqueueMirrorEvent(tab: MirrorTab, payload: MirrorEvent["payload"]) {
  const event: MirrorEvent = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, tab, occurredAt: new Date().toISOString(), payload };
  const pending = [...await readQueue(), event];
  await writeQueue(pending);
  return flushMirrorEvents();
}

export async function flushMirrorEvents() {
  if (!supabase) return { sent: 0, pending: (await readQueue()).length };
  const pending = await readQueue();
  const remaining: MirrorEvent[] = [];
  let sent = 0;
  const configuredUrl = process.env.EXPO_PUBLIC_SHEETS_MIRROR_URL;
  const mirrorUrl = configuredUrl || (typeof window !== "undefined" ? "/api/sheets-mirror" : "");
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  for (const event of pending) {
    try {
      if (mirrorUrl && accessToken) {
        const response = await fetch(mirrorUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(event),
        });
        if (!response.ok) throw new Error("mirror_failed");
      } else {
        const { error } = await supabase.functions.invoke("sheets-mirror", { body: event });
        if (error) throw error;
      }
      sent += 1;
    } catch {
      remaining.push(event);
    }
  }
  await writeQueue(remaining);
  return { sent, pending: remaining.length };
}
