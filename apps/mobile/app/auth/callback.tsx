import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { parseNativeAuthCallback } from "../../lib/public-app-url";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const url = Linking.useLinkingURL();
  const [message, setMessage] = useState("Confirmando tu registro…");

  useEffect(() => {
    if (!url) return;

    void (async () => {
      const callback = parseNativeAuthCallback(url);
      if (!supabase || !callback || callback.error) {
        setMessage("No pudimos confirmar el registro. Volviendo a LaburApp…");
        setTimeout(() => router.replace("/"), 2_000);
        return;
      }

      const result = callback.code
        ? await supabase.auth.exchangeCodeForSession(callback.code)
        : callback.accessToken && callback.refreshToken
          ? await supabase.auth.setSession({
              access_token: callback.accessToken,
              refresh_token: callback.refreshToken,
            })
          : { error: new Error("AUTH_CALLBACK_INVALID") };

      if (result.error) {
        setMessage("El enlace venció o ya fue utilizado. Volviendo a LaburApp…");
        setTimeout(() => router.replace("/"), 2_000);
        return;
      }

      router.replace("/");
    })();
  }, [url]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator color="#39B8FF" size="large" />
      <Text accessibilityLiveRegion="polite" style={styles.title}>{message}</Text>
      <Text style={styles.detail}>Esto demora sólo unos segundos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 28,
    backgroundColor: "#071722",
  },
  title: {
    color: "#F3F8FC",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  detail: {
    color: "#B6C7D3",
    fontSize: 14,
    textAlign: "center",
  },
});
