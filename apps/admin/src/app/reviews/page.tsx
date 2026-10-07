"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Review = { id: string; job_id: string; rating: number; comment: string | null; moderated_at: string | null; created_at: string; client_name: string; provider_name: string };

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/reviews", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error("No pudimos cargar las reseñas.");
      setReviews(data.reviews ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos cargar las reseñas."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/reviews", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("No pudimos cargar las reseñas.");
        if (active) setReviews(data.reviews ?? []);
      })
      .catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "No pudimos cargar las reseñas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function act(review: Review, action: "hide" | "restore" | "delete") {
    const question = action === "delete" ? "¿Eliminar permanentemente esta reseña? Esta acción no se puede deshacer." : action === "hide" ? "¿Ocultar esta reseña del perfil público?" : "¿Volver a publicar esta reseña?";
    if (!window.confirm(question)) return;
    setBusy(review.id);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: review.id, action }) });
      if (!response.ok) throw new Error("No pudimos aplicar la decisión.");
      await refresh();
      setMessage(action === "delete" ? "Reseña eliminada." : action === "hide" ? "Reseña oculta." : "Reseña publicada.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos aplicar la decisión."); }
    finally { setBusy(""); }
  }

  return <main style={{ minHeight: "100vh", background: "#07131e", color: "#e8f2fa", padding: "clamp(20px, 5vw, 64px)", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <Link href="/" style={{ color: "#54bdff" }}>← Panel de administración</Link>
      <p style={{ color: "#54bdff", fontWeight: 800, letterSpacing: 1.2, marginTop: 36 }}>MODERACIÓN</p>
      <h1>Reseñas</h1>
      <p style={{ color: "#b5c6d5" }}>Revisá reseñas recientes, ocultalas temporalmente o eliminalas. Una reseña oculta deja de aparecer en el perfil público.</p>
      <button onClick={() => void refresh()} style={{ border: "1px solid #56baff", background: "#10283a", color: "#e8f2fa", borderRadius: 10, padding: "11px 16px", cursor: "pointer" }}>Actualizar lista</button>
      {!!message && <p role="status">{message}</p>}
      {loading ? <p>Cargando reseñas…</p> : reviews.length === 0 ? <p>No hay reseñas para revisar.</p> : <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {reviews.map((review) => <article key={review.id} style={{ border: "1px solid #29475c", background: "#0e1e2b", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><strong>{review.client_name} → {review.provider_name}</strong><span>{review.moderated_at ? "Oculta" : "Publicada"} · {review.rating}/5 ★</span></div>
          <p style={{ color: "#d7e5ef", whiteSpace: "pre-wrap" }}>{review.comment || "Sin comentario"}</p>
          <small style={{ color: "#a9bfd0" }}>Trabajo: {review.job_id} · {new Date(review.created_at).toLocaleString("es-AR")}</small>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <button disabled={busy === review.id} onClick={() => void act(review, review.moderated_at ? "restore" : "hide")} style={{ border: "1px solid #56baff", background: "transparent", color: "#8bd2ff", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>{review.moderated_at ? "Restaurar" : "Ocultar"}</button>
            <button disabled={busy === review.id} onClick={() => void act(review, "delete")} style={{ border: "1px solid #e0877c", background: "transparent", color: "#ffaca2", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}>Eliminar</button>
          </div>
        </article>)}
      </div>}
    </div>
  </main>;
}
