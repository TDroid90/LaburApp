"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type RequestItem = {
  user_id: string;
  full_name: string;
  status: string;
  requested_at: string;
  delete_after: string | null;
  attempts: number;
  last_error: string | null;
};

export default function AccountDeletionsPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account-deletions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos cargar la cola de revisión.");
      setRequests(data.requests ?? []);
      setNow(Date.now());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos cargar las solicitudes.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/account-deletions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No pudimos cargar la cola de revisión.");
        if (active) {
          setRequests(data.requests ?? []);
          setNow(Date.now());
          setMessage("");
        }
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "No pudimos cargar las solicitudes.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function act(item: RequestItem, action: "confirm" | "reject") {
    const prompt = action === "confirm"
      ? `Confirmar la eliminación permanente de la cuenta de ${item.full_name}? Esta acción no se puede deshacer.`
      : `Rechazar la solicitud de ${item.full_name} y reactivar su cuenta?`;
    if (!window.confirm(prompt)) return;
    setBusy(item.user_id);
    setMessage("");
    try {
      const response = await fetch("/api/account-deletions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: item.user_id, action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === "review_window_not_elapsed"
        ? `Todavía no transcurrieron 72 horas. Disponible después del ${new Date(data.delete_after).toLocaleString("es-AR")}.`
        : data.error || "No pudimos aplicar la decisión.");
      setMessage(action === "confirm" ? "Eliminación confirmada y procesada." : "Solicitud rechazada; la cuenta fue reactivada.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No pudimos aplicar la decisión.");
    } finally { setBusy(""); }
  }

  return <main style={{ minHeight: "100vh", background: "#07131e", color: "#e8f2fa", padding: "clamp(20px, 5vw, 64px)", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/" style={{ color: "#54bdff" }}>← Panel de administración</Link>
      <p style={{ color: "#54bdff", fontWeight: 800, letterSpacing: 1.2, marginTop: 36 }}>REVISIÓN MANUAL</p>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 44px)", margin: "8px 0" }}>Solicitudes para eliminar cuentas</h1>
      <p style={{ color: "#b5c6d5", lineHeight: 1.6, maxWidth: 760 }}>La cuenta nunca se elimina automáticamente. Revisá el caso; la confirmación solo se habilita una vez transcurridas 72 horas desde la solicitud. Rechazar restaura el acceso.</p>
      <button onClick={() => void refresh()} style={{ margin: "18px 0", border: "1px solid #56baff", background: "#10283a", color: "#e8f2fa", borderRadius: 10, padding: "11px 16px", cursor: "pointer" }}>Actualizar lista</button>
      {!!message && <p role="status" style={{ padding: 14, background: "#10283a", borderRadius: 10 }}>{message}</p>}
      {loading ? <p>Cargando solicitudes…</p> : requests.length === 0 ? <p>No hay solicitudes pendientes de revisión.</p> : <div style={{ display: "grid", gap: 14 }}>
        {requests.map((item) => {
          const due = item.delete_after ? new Date(item.delete_after) : null;
          const eligible = !!due && now > 0 && due.getTime() <= now;
          return <article key={item.user_id} style={{ border: "1px solid #29475c", background: "#0e1e2b", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
              <div><h2 style={{ margin: "0 0 6px" }}>{item.full_name}</h2><small style={{ color: "#a9bfd0" }}>ID: {item.user_id} · Estado: {item.status}</small></div>
              <strong style={{ color: eligible ? "#65d9ae" : "#ffc266" }}>{eligible ? "Plazo cumplido" : "En espera de 72 horas"}</strong>
            </div>
            <p style={{ color: "#b5c6d5", lineHeight: 1.6 }}>Solicitada: {new Date(item.requested_at).toLocaleString("es-AR")}<br />Revisión desde: {due ? due.toLocaleString("es-AR") : "Fecha no disponible"}</p>
            {item.status === "failed" && <p style={{ color: "#ffb2a8" }}>El intento anterior falló. Puede revisarse y reintentarse.</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button disabled={!eligible || busy === item.user_id} onClick={() => void act(item, "confirm")} style={{ border: 0, background: eligible ? "#bd4a3f" : "#46525c", color: "white", borderRadius: 10, padding: "12px 16px", cursor: eligible ? "pointer" : "not-allowed" }}>Confirmar eliminación</button>
              <button disabled={busy === item.user_id} onClick={() => void act(item, "reject")} style={{ border: "1px solid #56baff", background: "transparent", color: "#8bd2ff", borderRadius: 10, padding: "12px 16px", cursor: "pointer" }}>Rechazar y reactivar cuenta</button>
            </div>
          </article>;
        })}
      </div>}
    </div>
  </main>;
}
