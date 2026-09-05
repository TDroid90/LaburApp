import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import type { SavedProviderProfile, SavedServiceOffer } from "../lib/local-store";

const serviceOptions = [
  "Diagnóstico / visita técnica",
  "Reparación",
  "Instalación",
  "Mantenimiento preventivo",
  "Urgencia",
  "Asesoramiento",
  "Mano de obra por hora",
  "Jornada completa",
  "Media jornada",
  "Visita de medición",
  "Limpieza general",
  "Limpieza profunda",
  "Cuidado por hora",
  "Guardia nocturna",
  "Carga y descarga",
  "Entrega / reparto",
  "Armado",
  "Pintura por m²",
  "Poda / jardinería",
  "Soporte técnico",
];

function numericValue(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function timeToMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function shiftTime(value: string, direction: number) {
  const next = (timeToMinutes(value) + direction * 30 + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, "0")}:${String(next % 60).padStart(2, "0")}`;
}

function defaultService(): SavedServiceOffer {
  return { id: `service-${Date.now()}`, service: "Diagnóstico / visita técnica", price: 35000, startTime: "09:00", endTime: "18:00" };
}

export function ProviderProfileForm({ darkMode, initialProfile, email, busy, remoteError, onCancel, onSubmit }: {
  darkMode: boolean;
  initialProfile: SavedProviderProfile;
  email: string;
  busy: boolean;
  remoteError: string;
  onCancel: () => void;
  onSubmit: (profile: SavedProviderProfile) => void;
}) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(darkMode), [darkMode]);
  const compact = width < 720;
  const [draft, setDraft] = useState<SavedProviderProfile>(() => ({
    ...initialProfile,
    services: initialProfile.services?.length ? initialProfile.services.slice(0, 2) : [defaultService()],
    certifications: initialProfile.certifications ?? [],
  }));
  const [openServiceId, setOpenServiceId] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");
  const services = draft.services ?? [];
  const certificationsText = useMemo(() => (draft.certifications ?? []).join(", "), [draft.certifications]);

  function updateService(id: string, patch: Partial<SavedServiceOffer>) {
    setDraft((current) => ({ ...current, services: (current.services ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const photoUri = asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri;
    setDraft((current) => ({ ...current, photoUri }));
  }

  function submit() {
    setLocalError("");
    if (draft.displayName.trim().length < 3) return setLocalError("Ingresá tu nombre y apellido.");
    if (!draft.city.trim()) return setLocalError("Indicá tu ciudad.");
    if (!draft.trade.trim()) return setLocalError("Indicá cómo querés presentarte profesionalmente.");
    if (draft.bio.trim().length < 20) return setLocalError("Escribí una presentación de al menos 20 caracteres.");
    if (!draft.zones.trim()) return setLocalError("Indicá dónde trabajás.");
    if (!services.length || services.some((item) => !item.service || item.price <= 0 || item.startTime === item.endTime)) return setLocalError("Completá servicio, precio y un horario válido.");
    const availability = services.map((item) => `${item.service}: ${item.startTime} a ${item.endTime}`).join(" · ");
    const skills = services.map((item) => item.service).join(", ");
    onSubmit({ ...draft, availability, skills, secondaryTrade: undefined, services });
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>UN SOLO PASO</Text>
    <Text style={styles.title}>Tu perfil profesional</Text>
    <Text style={styles.copy}>Completá tu presentación y el servicio que querés ofrecer. Después vas a poder editar todo.</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Tu información</Text>
      <View style={styles.identityRow}>
        {draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.photo} /> : <View style={styles.photoFallback}><Text style={styles.photoInitial}>{draft.displayName.slice(0, 1).toUpperCase() || "P"}</Text></View>}
        <View style={styles.identityFields}>
          <TouchableOpacity accessibilityRole="button" style={styles.photoButton} onPress={() => void pickPhoto()}><Text style={styles.photoButtonText}>{draft.photoUri ? "Cambiar foto" : "Agregar foto"}</Text></TouchableOpacity>
          <Text style={styles.email}>{email}</Text>
        </View>
      </View>
      <View style={[styles.fieldsRow, compact && styles.fieldsColumn]}>
        <TextInput value={draft.displayName} onChangeText={(displayName) => setDraft({ ...draft, displayName })} placeholder="Nombre y apellido" placeholderTextColor="#71818B" style={[styles.input, styles.flexField]} />
        <TextInput value={draft.city} onChangeText={(city) => setDraft({ ...draft, city })} placeholder="Ciudad" placeholderTextColor="#71818B" style={[styles.input, styles.flexField]} />
      </View>

      <Text style={styles.label}>Profesional</Text>
      <TextInput value={draft.trade} onChangeText={(trade) => setDraft({ ...draft, trade })} placeholder="Ej. Gasista matriculado" placeholderTextColor="#71818B" style={styles.input} />
      <Text style={styles.help}>Así vas a presentarte debajo de tu nombre en el perfil.</Text>
      <TextInput multiline value={draft.bio} onChangeText={(bio) => setDraft({ ...draft, bio })} placeholder="Breve presentación: qué hacés y cómo trabajás" placeholderTextColor="#71818B" style={[styles.input, styles.multiline]} />
      <TextInput multiline value={draft.training ?? ""} onChangeText={(training) => setDraft({ ...draft, training })} placeholder="Formación y experiencia" placeholderTextColor="#71818B" style={[styles.input, styles.multilineSmall]} />
      <TextInput value={certificationsText} onChangeText={(value) => setDraft({ ...draft, certifications: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Certificaciones, separadas por comas" placeholderTextColor="#71818B" style={styles.input} />
      <TextInput value={draft.zones} onChangeText={(zones) => setDraft({ ...draft, zones })} placeholder="Dónde trabajás: ciudad, barrios o zonas" placeholderTextColor="#71818B" style={styles.input} />

      <View style={styles.servicesHeading}>
        <View><Text style={styles.sectionTitle}>Tus servicios</Text><Text style={styles.help}>Dos líneas incluidas en el plan gratuito.</Text></View>
        <Text style={styles.freeBadge}>GRATIS · 2</Text>
      </View>
      {services.map((item, index) => <View key={item.id} style={styles.serviceCard}>
        <View style={styles.serviceTop}><Text style={styles.serviceNumber}>SERVICIO {index + 1}</Text>{index > 0 && <TouchableOpacity onPress={() => setDraft({ ...draft, services: services.filter((service) => service.id !== item.id) })}><Text style={styles.remove}>Quitar</Text></TouchableOpacity>}</View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Elegir servicio ${index + 1}`} style={styles.selector} onPress={() => setOpenServiceId(openServiceId === item.id ? null : item.id)}><Text style={styles.selectorText}>{item.service}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
        {openServiceId === item.id && <ScrollView nestedScrollEnabled style={styles.options}>{serviceOptions.map((option) => <TouchableOpacity key={option} style={[styles.option, item.service === option && styles.optionActive]} onPress={() => { updateService(item.id, { service: option }); setOpenServiceId(null); }}><Text style={[styles.optionText, item.service === option && styles.optionTextActive]}>{option}</Text></TouchableOpacity>)}</ScrollView>}
        <View style={[styles.serviceDataRow, compact && styles.fieldsColumn]}>
          <View style={styles.priceWrap}><Text style={styles.miniLabel}>PRECIO</Text><View style={styles.money}><Text style={styles.currency}>$</Text><TextInput value={`${item.price || ""}`} onChangeText={(value) => updateService(item.id, { price: numericValue(value) })} keyboardType="numeric" placeholder="35000" placeholderTextColor="#71818B" style={styles.priceInput} /><Text style={styles.currency}>ARS</Text></View></View>
          <TimeStepper darkMode={darkMode} label="DESDE" value={item.startTime} onChange={(startTime) => updateService(item.id, { startTime })} />
          <TimeStepper darkMode={darkMode} label="HASTA" value={item.endTime} onChange={(endTime) => updateService(item.id, { endTime })} />
        </View>
      </View>)}
      {services.length < 2 && <TouchableOpacity accessibilityRole="button" style={styles.addService} onPress={() => setDraft({ ...draft, services: [...services, { ...defaultService(), id: `service-${Date.now()}-${services.length}` }] })}><Text style={styles.addServiceText}>＋ Agregar segundo servicio</Text></TouchableOpacity>}
      <View style={styles.lockedService}><View><Text style={styles.lockedTitle}>🔒 Tercer servicio</Text><Text style={styles.lockedText}>Disponible con la membresía profesional.</Text></View><Text style={styles.membershipBadge}>MEMBRESÍA</Text></View>
      <Text style={styles.planNote}>El plan gratuito incluye una presentación profesional y hasta dos servicios. Los oficios adicionales se habilitarán con la membresía multioficio.</Text>
    </ScrollView>
    {!!(localError || remoteError) && <Text style={styles.error}>{localError || remoteError}</Text>}
    <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={[styles.save, busy && styles.disabled]} onPress={submit}><Text style={styles.saveText}>{busy ? "Guardando…" : "Guardar y publicar"}</Text></TouchableOpacity></View>
  </View>;
}

function TimeStepper({ darkMode, label, value, onChange }: { darkMode: boolean; label: string; value: string; onChange: (value: string) => void }) {
  const styles = useMemo(() => createStyles(darkMode), [darkMode]);
  return <View style={styles.timeWrap}><Text style={styles.miniLabel}>{label}</Text><View style={styles.timeControl}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Restar 30 minutos a ${label.toLowerCase()}`} style={styles.timeButton} onPress={() => onChange(shiftTime(value, -1))}><Text style={styles.timeButtonText}>−</Text></TouchableOpacity><Text style={styles.timeValue}>{value}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Sumar 30 minutos a ${label.toLowerCase()}`} style={styles.timeButton} onPress={() => onChange(shiftTime(value, 1))}><Text style={styles.timeButtonText}>＋</Text></TouchableOpacity></View></View>;
}

function createStyles(darkMode: boolean) {
  const palette = darkMode ? { background: "#10202F", surface: "#162A3B", input: "#132738", text: "#EAF4FC", muted: "#AFC2D2", line: "#29465B", avatar: "#183A54", soft: "#1B3041", warning: "#3A291B", warningText: "#FFC078", danger: "#FF8A72" } : { background: "#FFFFFF", surface: "#F8FCFE", input: "#FBFDFE", text: "#063C78", muted: "#5E7183", line: "#D6E8F2", avatar: "#063C78", soft: "#EEF7FB", warning: "#FFF7E9", warningText: "#6D5B45", danger: "#B7452B" };
  return StyleSheet.create({
  card: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24, maxHeight: "96%" }, eyebrow: { color: "#FF8A1F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, title: { color: palette.text, fontSize: 25, fontWeight: "900", marginTop: 3 }, copy: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 7 }, scroll: { maxHeight: 650 }, scrollContent: { paddingBottom: 12 }, sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginTop: 12, marginBottom: 8 }, identityRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, photo: { width: 68, height: 68, borderRadius: 34, marginRight: 13 }, photoFallback: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#063C78", alignItems: "center", justifyContent: "center", marginRight: 13 }, photoInitial: { color: "white", fontSize: 27, fontWeight: "900" }, identityFields: { flex: 1 }, photoButton: { minHeight: 38, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 10 }, photoButtonText: { color: "#49B2F5", fontSize: 12, fontWeight: "900" }, email: { color: palette.muted, fontSize: 11, marginTop: 7 }, fieldsRow: { flexDirection: "row", gap: 8 }, fieldsColumn: { flexDirection: "column" }, flexField: { flex: 1 }, input: { minHeight: 46, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, marginBottom: 8 }, label: { color: palette.text, fontSize: 12, fontWeight: "900", marginTop: 5, marginBottom: 6 }, help: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: -3, marginBottom: 8 }, multiline: { minHeight: 76, paddingTop: 11, textAlignVertical: "top" }, multilineSmall: { minHeight: 62, paddingTop: 11, textAlignVertical: "top" }, servicesHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2 }, freeBadge: { color: "#56D3A1", backgroundColor: palette.soft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 10, fontWeight: "900" }, serviceCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 14, padding: 11, marginTop: 8 }, serviceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }, serviceNumber: { color: "#49B2F5", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 }, remove: { color: palette.danger, fontSize: 10, fontWeight: "900" }, selector: { minHeight: 44, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.input, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 11 }, selectorText: { color: palette.text, fontSize: 12, fontWeight: "800", flex: 1 }, chevron: { color: "#49B2F5", fontSize: 17, fontWeight: "900" }, options: { maxHeight: 230, borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", marginTop: 5, backgroundColor: palette.input }, option: { minHeight: 37, justifyContent: "center", paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: palette.line }, optionActive: { backgroundColor: palette.soft }, optionText: { color: palette.muted, fontSize: 11 }, optionTextActive: { color: palette.text, fontWeight: "900" }, serviceDataRow: { flexDirection: "row", gap: 8, marginTop: 9 }, priceWrap: { flex: 1.45 }, timeWrap: { flex: 1 }, miniLabel: { color: palette.muted, fontSize: 9, fontWeight: "900", marginBottom: 4 }, money: { minHeight: 42, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: palette.line, borderRadius: 9, backgroundColor: palette.input, paddingHorizontal: 8 }, currency: { color: palette.muted, fontSize: 9, fontWeight: "900" }, priceInput: { flex: 1, color: palette.text, fontWeight: "900", paddingHorizontal: 5 }, timeControl: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: palette.line, borderRadius: 9, backgroundColor: palette.input, overflow: "hidden" }, timeButton: { width: 34, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: palette.soft }, timeButtonText: { color: "#49B2F5", fontSize: 17, fontWeight: "900" }, timeValue: { color: palette.text, fontSize: 11, fontWeight: "900" }, addService: { minHeight: 44, borderWidth: 1, borderStyle: "dashed", borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 9 }, addServiceText: { color: "#49B2F5", fontSize: 12, fontWeight: "900" }, lockedService: { minHeight: 58, borderRadius: 11, backgroundColor: palette.soft, marginTop: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, opacity: 0.86 }, lockedTitle: { color: palette.muted, fontSize: 12, fontWeight: "900" }, lockedText: { color: palette.muted, fontSize: 10, marginTop: 2 }, membershipBadge: { color: palette.warningText, fontSize: 9, fontWeight: "900", backgroundColor: palette.warning, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 }, planNote: { color: palette.warningText, backgroundColor: palette.warning, borderRadius: 9, padding: 9, fontSize: 10, lineHeight: 15, marginTop: 9 }, error: { color: palette.danger, fontSize: 12, fontWeight: "800", marginTop: 7 }, actions: { flexDirection: "row", gap: 8, marginTop: 12 }, cancel: { minHeight: 48, minWidth: 92, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#49B2F5", fontWeight: "900" }, save: { flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: "#FF7800", alignItems: "center", justifyContent: "center" }, saveText: { color: "white", fontWeight: "900" }, disabled: { opacity: 0.55 },
  });
}
