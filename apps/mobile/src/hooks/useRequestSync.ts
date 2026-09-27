import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRefreshScheduler } from "./request-sync-scheduler";

type SyncStatus = "disabled" | "connecting" | "connected" | "fallback";

type Options = {
  client: SupabaseClient | null;
  enabled: boolean;
  userKey: string;
  onRefresh: () => void;
};

const FALLBACK_POLL_MS = 15_000;
const EVENT_DEBOUNCE_MS = 250;

export function useRequestSync({ client, enabled, userKey, onRefresh }: Options) {
  const refreshRef = useRef(onRefresh);
  const [isOffline, setIsOffline] = useState(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active");
  const [status, setStatus] = useState<SyncStatus>(enabled ? "connecting" : "disabled");

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!client || !enabled) {
      setStatus("disabled");
      return;
    }

    let disposed = false;
    let offline = false;
    let realtimeConnected = false;
    const scheduler = createRefreshScheduler(() => refreshRef.current(), EVENT_DEBOUNCE_MS);

    const scheduleRefresh = () => {
      if (disposed || offline) return;
      scheduler.schedule();
    };

    setStatus("connecting");
    const channel = client
      .channel(`app-sync-${userKey || "account"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "credentials" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscription_requests" }, scheduleRefresh)
      .subscribe((nextStatus) => {
        if (disposed) return;
        realtimeConnected = nextStatus === "SUBSCRIBED";
        setStatus(realtimeConnected ? "connected" : "fallback");
      });

    const unsubscribeNetwork = NetInfo.addEventListener((network) => {
      const nextOffline = network.isConnected === false || network.isInternetReachable === false;
      const reconnected = offline && !nextOffline;
      offline = nextOffline;
      setIsOffline(nextOffline);
      if (reconnected) scheduleRefresh();
    });

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
      if (nextState === "active") scheduleRefresh();
    });

    // Polling is only a bounded fallback while Realtime is unavailable.
    const fallbackTimer = setInterval(() => {
      if (!realtimeConnected) {
        setStatus("fallback");
        scheduleRefresh();
      }
    }, FALLBACK_POLL_MS);

    return () => {
      disposed = true;
      scheduler.dispose();
      clearInterval(fallbackTimer);
      unsubscribeNetwork();
      appStateSubscription.remove();
      void client.removeChannel(channel);
    };
  }, [client, enabled, userKey]);

  return { isOffline, isAppActive, status };
}
