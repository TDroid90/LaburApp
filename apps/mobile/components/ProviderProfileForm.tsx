import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { containsContactAttempt } from "@laburapp/shared";
import type { SavedProviderProfile, SavedServiceOffer } from "../lib/local-store";
import { certificationSuggestions, professionalSuggestions, providerServiceCatalog, serviceSpecialtiesAreValid, specialtyDescription } from "./provider-service-catalog";

const cities = ["San Sebastián", "Río Grande", "Tolhuin", "Almanza", "Ushuaia"];
const coverageChoices = [...cities, "Zonas rurales"];

function coverageLabel(areas: string[]) {
  if (coverageChoices.every((choice) => areas.includes(choice))) return "Toda la provincia";
  if (!areas.length) return "Elegí las localidades";
  if (areas.length === 1) return areas[0];
  return `${areas.length} zonas seleccionadas`;
}

function numericValue(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function isDiagnostic(service?: string) {
  const value = service?.toLocaleLowerCase("es-AR") ?? "";
  return value.includes("diagnóstico") || value.includes("visita técnica");
}

function defaultService(seed: string | number = Date.now()): SavedServiceOffer {
  return { id: `service-${seed}`, family: "", service: "", specialties: [], description: "", price: 0, startTime: "", endTime: "" };
}

function inferredService(trade: string): SavedServiceOffer {
  const normalizedTrade = trade.toLocaleLowerCase("es-AR").replace(/ matriculad[oa]$/, "");
  const match = providerServiceCatalog.flatMap((family) => family.specialties.map((specialty) => ({ family, specialty })))
    .find(({ specialty }) => normalizedTrade.includes(specialty.toLocaleLowerCase("es-AR")) || specialty.toLocaleLowerCase("es-AR").includes(normalizedTrade));
  if (!match) return defaultService();
  return { ...defaultService(), family: match.family.name, service: match.specialty, specialties: [match.specialty], description: specialtyDescription(match.family.name, match.specialty) };
}

function normalizeServices(profile: SavedProviderProfile) {
  const realServices = (profile.services ?? []).filter((item) => !isDiagnostic(item.service)).slice(0, 2).map((item) => ({
    ...item,
    family: item.family ?? "",
    specialties: item.specialties?.length ? item.specialties.slice(0, 2) : item.service ? [item.service] : [],
    description: item.description ?? "",
  }));
  return realServices.length ? realServices : [inferredService(profile.trade)];
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
  const legacyDiagnostic = initialProfile.services?.find((item) => isDiagnostic(item.service));
  const initialCoverage = initialProfile.coverageAreas?.filter((area) => coverageChoices.includes(area)) ?? (initialProfile.zones === "Toda la provincia" ? coverageChoices : initialProfile.city ? [initialProfile.city] : []);
  const [draft, setDraft] = useState<SavedProviderProfile>(() => ({
    ...initialProfile,
    diagnosticPrice: initialProfile.diagnosticPrice ?? legacyDiagnostic?.price ?? 35000,
    services: normalizeServices(initialProfile),
    certifications: initialProfile.certifications ?? [],
    coverageAreas: initialCoverage,
    zones: coverageLabel(initialCoverage),
  }));
  const [cityOpen, setCityOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [activeTradeField, setActiveTradeField] = useState<"primary" | "secondary" | null>(null);
  const [certificationInput, setCertificationInput] = useState("");
  const [openFamilyId, setOpenFamilyId] = useState<string | null>(null);
  const [openSpecialtyId, setOpenSpecialtyId] = useState<string | null>(null);
  const [membershipNotice, setMembershipNotice] = useState(false);
  const [localError, setLocalError] = useState("");
  const services = draft.services ?? [];
  const activeTradeValue = activeTradeField === "secondary" ? draft.secondaryTrade ?? "" : draft.trade;
  const filteredTrades = professionalSuggestions.filter((item) => item.toLocaleLowerCase("es-AR").includes(activeTradeValue.trim().toLocaleLowerCase("es-AR"))).slice(0, 6);
  const filteredCertifications = certificationSuggestions.filter((item) => !draft.certifications?.includes(item) && item.toLocaleLowerCase("es-AR").includes(certificationInput.trim().toLocaleLowerCase("es-AR"))).slice(0, 6);

  function updateService(id: string, patch: Partial<SavedServiceOffer>) {
    setDraft((current) => ({ ...current, services: (current.services ?? []).map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function selectCity(city: string) {
    setDraft((current) => {
      const currentCoverage = current.coverageAreas ?? [];
      const coverageAreas = currentCoverage.length === 1 && currentCoverage[0] === current.city ? [city] : currentCoverage;
      return { ...current, city, coverageAreas, zones: coverageLabel(coverageAreas) };
    });
    setCityOpen(false);
  }

  function toggleCoverage(area: string) {
    setDraft((current) => {
      const selected = current.coverageAreas ?? [];
      const coverageAreas = selected.includes(area) ? selected.filter((item) => item !== area) : [...selected, area];
      return { ...current, coverageAreas, zones: coverageLabel(coverageAreas) };
    });
  }

  function toggleAllCoverage() {
    setDraft((current) => {
      const coverageAreas = coverageChoices.every((choice) => current.coverageAreas?.includes(choice)) ? [] : [...coverageChoices];
      return { ...current, coverageAreas, zones: coverageLabel(coverageAreas) };
    });
  }

  function toggleSpecialty(item: SavedServiceOffer, specialty: string) {
    const selected = item.specialties?.length ? item.specialties : item.service ? [item.service] : [];
    const specialties = selected.includes(specialty) ? selected.filter((value) => value !== specialty) : selected.length < 2 ? [...selected, specialty] : selected;
    const service = specialties.join(" · ");
    const family = providerServiceCatalog.find((option) => option.name === item.family);
    const description = !item.description?.trim() || selected.length === 0 ? `${specialties.join(" y ")}. ${family?.description ?? ""}`.trim() : item.description;
    updateService(item.id, { specialties, service, description });
  }

  function addCertification(value: string) {
    const certification = value.trim().replace(/^#/, "");
    if (certification.length < 2 || draft.certifications?.some((item) => item.toLocaleLowerCase("es-AR") === certification.toLocaleLowerCase("es-AR"))) return;
    setDraft((current) => ({ ...current, certifications: [...(current.certifications ?? []), certification] }));
    setCertificationInput("");
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
    if (!cities.includes(draft.city)) return setLocalError("Elegí tu ciudad.");
    if ((draft.diagnosticPrice ?? 0) <= 0) return setLocalError("Indicá el valor inicial del diagnóstico o visita.");
    if (draft.trade.trim().length < 3) return setLocalError("Indicá cómo querés presentarte profesionalmente.");
    if (draft.secondaryTrade !== undefined && draft.secondaryTrade.trim().length < 3) return setLocalError("Completá o quitá la segunda profesión.");
    if (draft.bio.trim().length < 20) return setLocalError("Escribí una presentación de al menos 20 caracteres.");
    if (containsContactAttempt(draft.bio)) return setLocalError("No incluyas teléfonos, correos, redes ni enlaces en tu presentación.");
    if (!draft.coverageAreas?.length || draft.coverageAreas.some((area) => !coverageChoices.includes(area))) return setLocalError("Elegí al menos una localidad o zona de cobertura.");
    if (!services.length || services.some((item) => !serviceSpecialtiesAreValid(item.family, item.specialties?.length ? item.specialties : item.service ? [item.service] : []))) return setLocalError("Elegí una familia y hasta dos especialidades válidas para cada servicio.");
    if (services.some((item) => (item.description?.trim().length ?? 0) < 10 || (item.description?.trim().length ?? 0) > 240)) return setLocalError("Describí cada servicio con entre 10 y 240 caracteres.");
    if (services.some((item) => containsContactAttempt(item.description ?? ""))) return setLocalError("No incluyas teléfonos, correos, redes ni enlaces en la descripción del servicio.");
    onSubmit({ ...draft, trade: draft.trade.trim().replace(/ matriculad[oa]$/i, ""), secondaryTrade: draft.secondaryTrade?.trim().replace(/ matriculad[oa]$/i, "") || undefined, zones: coverageLabel(draft.coverageAreas), availability: coverageLabel(draft.coverageAreas), skills: services.flatMap((item) => item.specialties ?? [item.service]).join(", "), services });
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>UN SOLO PASO</Text>
    <Text style={styles.title}>Tu perfil profesional</Text>
    <Text style={styles.copy}>Completá tu presentación, tu tarifa inicial y los servicios que realmente ofrecés.</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>Tu información</Text>
      <View style={styles.identityRow}>
        {draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={styles.photo} /> : <View style={styles.photoFallback}><Text style={styles.photoInitial}>{draft.displayName.slice(0, 1).toUpperCase() || "P"}</Text></View>}
        <View style={styles.identityFields}><TouchableOpacity accessibilityRole="button" style={styles.photoButton} onPress={() => void pickPhoto()}><Text style={styles.photoButtonText}>{draft.photoUri ? "Cambiar foto" : "Agregar foto"}</Text></TouchableOpacity><Text style={styles.email}>{email}</Text></View>
      </View>
      <View style={[styles.fieldsRow, compact && styles.fieldsColumn]}>
        <View style={styles.flexField}><Text style={styles.label}>Nombre y apellido</Text><TextInput value={draft.displayName} onChangeText={(displayName) => setDraft({ ...draft, displayName })} placeholder="Nombre y apellido" placeholderTextColor="#71818B" style={styles.input} /></View>
        <View style={styles.diagnosticField}><Text style={styles.label}>Diagnóstico desde</Text><View style={styles.money}><Text style={styles.currency}>$</Text><TextInput value={`${draft.diagnosticPrice || ""}`} onChangeText={(value) => setDraft({ ...draft, diagnosticPrice: numericValue(value) })} keyboardType="numeric" placeholder="35000" placeholderTextColor="#71818B" style={styles.priceInput} /><Text style={styles.currency}>ARS</Text></View></View>
      </View>
      <Text style={styles.help}>Es una tarifa inicial de visita o diagnóstico; no cuenta como servicio.</Text>

      <Text style={styles.label}>Ciudad</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir ciudad" style={styles.selector} onPress={() => { setCityOpen((current) => !current); setCoverageOpen(false); setActiveTradeField(null); setOpenFamilyId(null); setOpenSpecialtyId(null); }}><Text style={[styles.selectorText, !draft.city && styles.placeholder]}>{draft.city || "Seleccioná tu ciudad"}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
      {cityOpen && <View style={styles.options}>{cities.map((city) => <TouchableOpacity key={city} style={[styles.option, draft.city === city && styles.optionActive]} onPress={() => selectCity(city)}><Text style={[styles.optionText, draft.city === city && styles.optionTextActive]}>{city}</Text></TouchableOpacity>)}</View>}

      <Text style={styles.label}>Profesional · hasta 2 en el plan gratis</Text>
      <TextInput value={draft.trade} onFocus={() => { setActiveTradeField("primary"); setCityOpen(false); setCoverageOpen(false); }} onChangeText={(trade) => { setDraft({ ...draft, trade }); setActiveTradeField("primary"); }} placeholder="Ej. Gasista" placeholderTextColor="#71818B" style={styles.input} />
      {activeTradeField === "primary" && filteredTrades.length > 0 && <View style={styles.suggestions}>{filteredTrades.map((trade) => <TouchableOpacity key={trade} style={styles.suggestion} onPress={() => { setDraft({ ...draft, trade }); setActiveTradeField(null); }}><Text style={styles.suggestionHash}>+</Text><Text style={styles.suggestionText}>{trade}</Text></TouchableOpacity>)}</View>}
      {draft.secondaryTrade !== undefined ? <>
        <View style={styles.serviceTop}><Text style={styles.miniLabel}>SEGUNDA PROFESIÓN</Text><TouchableOpacity onPress={() => { setDraft({ ...draft, secondaryTrade: undefined }); setActiveTradeField(null); }}><Text style={styles.remove}>Quitar</Text></TouchableOpacity></View>
        <TextInput value={draft.secondaryTrade} onFocus={() => { setActiveTradeField("secondary"); setCityOpen(false); setCoverageOpen(false); }} onChangeText={(secondaryTrade) => { setDraft({ ...draft, secondaryTrade }); setActiveTradeField("secondary"); }} placeholder="Ej. Plomero" placeholderTextColor="#71818B" style={styles.input} />
        {activeTradeField === "secondary" && filteredTrades.length > 0 && <View style={styles.suggestions}>{filteredTrades.map((trade) => <TouchableOpacity key={trade} style={styles.suggestion} onPress={() => { setDraft({ ...draft, secondaryTrade: trade }); setActiveTradeField(null); }}><Text style={styles.suggestionHash}>+</Text><Text style={styles.suggestionText}>{trade}</Text></TouchableOpacity>)}</View>}
      </> : <TouchableOpacity accessibilityRole="button" style={styles.addService} onPress={() => { setDraft({ ...draft, secondaryTrade: "" }); setActiveTradeField("secondary"); }}><Text style={styles.addServiceText}>+ Agregar segunda profesión</Text></TouchableOpacity>}
      <Text style={styles.help}>Podés mostrar hasta dos profesiones sin costo. Una tercera requiere membresía.</Text>
      <TextInput multiline value={draft.bio} onChangeText={(bio) => setDraft({ ...draft, bio })} placeholder="Breve presentación: qué hacés y cómo trabajás" placeholderTextColor="#71818B" maxLength={600} style={[styles.input, styles.multiline]} />
      <TextInput multiline value={draft.training ?? ""} onChangeText={(training) => setDraft({ ...draft, training })} placeholder="Formación y experiencia" placeholderTextColor="#71818B" maxLength={1200} style={[styles.input, styles.multilineSmall]} />

      <Text style={styles.label}>Certificaciones</Text>
      {!!draft.certifications?.length && <View style={styles.chipList}>{draft.certifications.map((certification) => <View key={certification} style={styles.chip}><Text style={styles.chipText}>#{certification.replace(/\s+/g, "_")}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Quitar ${certification}`} onPress={() => setDraft((current) => ({ ...current, certifications: current.certifications?.filter((item) => item !== certification) }))}><Text style={styles.chipRemove}>×</Text></TouchableOpacity></View>)}</View>}
      <TextInput value={certificationInput} onFocus={() => { setActiveTradeField(null); setCityOpen(false); setCoverageOpen(false); }} onChangeText={setCertificationInput} onSubmitEditing={() => addCertification(certificationInput)} placeholder="Escribí para agregar una certificación" placeholderTextColor="#71818B" style={styles.input} />
      {certificationInput.trim().length > 0 && <View style={styles.suggestions}>{filteredCertifications.map((certification) => <TouchableOpacity key={certification} style={styles.suggestion} onPress={() => addCertification(certification)}><Text style={styles.suggestionHash}>#</Text><Text style={styles.suggestionText}>{certification}</Text></TouchableOpacity>)}<TouchableOpacity style={styles.suggestion} onPress={() => addCertification(certificationInput)}><Text style={styles.suggestionHash}>+</Text><Text style={styles.suggestionText}>Agregar “{certificationInput.trim()}”</Text></TouchableOpacity></View>}

      <Text style={styles.label}>Dónde trabajás</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elegir alcance de trabajo" style={styles.selector} onPress={() => { setCoverageOpen((current) => !current); setCityOpen(false); setActiveTradeField(null); setOpenFamilyId(null); setOpenSpecialtyId(null); }}><Text style={styles.selectorText}>{draft.zones}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
      {coverageOpen && <View style={styles.options}>
        <TouchableOpacity style={[styles.coverageOption, draft.zones === "Toda la provincia" && styles.optionActive]} onPress={toggleAllCoverage}><Text style={styles.optionCheck}>{draft.zones === "Toda la provincia" ? "☑" : "☐"}</Text><Text style={[styles.optionText, draft.zones === "Toda la provincia" && styles.optionTextActive]}>Toda la provincia</Text></TouchableOpacity>
        {coverageChoices.map((coverage) => {
          const selected = draft.coverageAreas?.includes(coverage) ?? false;
          return <TouchableOpacity key={coverage} style={[styles.coverageOption, selected && styles.optionActive]} onPress={() => toggleCoverage(coverage)}><Text style={styles.optionCheck}>{selected ? "☑" : "☐"}</Text><Text style={[styles.optionText, selected && styles.optionTextActive]}>{coverage}</Text></TouchableOpacity>;
        })}
      </View>}

      <View style={styles.servicesHeading}><View><Text style={styles.sectionTitle}>Tus servicios</Text><Text style={styles.help}>Elegí el rubro y después una especialidad concreta.</Text></View><Text style={styles.freeBadge}>GRATIS · 2</Text></View>
      {services.map((item, index) => {
        const family = providerServiceCatalog.find((option) => option.name === item.family);
        const descriptionLength = item.description?.length ?? 0;
        return <View key={item.id} style={styles.serviceCard}>
          <View style={styles.serviceTop}><Text style={styles.serviceNumber}>SERVICIO {index + 1}</Text>{services.length > 1 && <TouchableOpacity onPress={() => setDraft({ ...draft, services: services.filter((service) => service.id !== item.id) })}><Text style={styles.remove}>Quitar</Text></TouchableOpacity>}</View>
          <Text style={styles.miniLabel}>FAMILIA</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Elegir familia del servicio ${index + 1}`} style={styles.selector} onPress={() => { setOpenFamilyId(openFamilyId === item.id ? null : item.id); setOpenSpecialtyId(null); setCityOpen(false); setCoverageOpen(false); setActiveTradeField(null); }}><Text style={[styles.selectorText, !item.family && styles.placeholder]}>{item.family || "Elegí un rubro"}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
          {openFamilyId === item.id && <ScrollView nestedScrollEnabled style={styles.catalogOptions}>{providerServiceCatalog.map((option) => <TouchableOpacity key={option.name} style={[styles.familyOption, item.family === option.name && styles.optionActive]} onPress={() => { updateService(item.id, { family: option.name, service: "", specialties: [], description: "" }); setOpenFamilyId(null); setOpenSpecialtyId(item.id); }}><Text style={[styles.optionText, item.family === option.name && styles.optionTextActive]}>{option.name}</Text><Text style={styles.optionDescription}>{option.description}</Text></TouchableOpacity>)}</ScrollView>}
          <Text style={styles.miniLabel}>ESPECIALIDADES · ELEGÍ HASTA 2</Text>
          <TouchableOpacity accessibilityRole="button" disabled={!family} accessibilityLabel={`Elegir especialidades del servicio ${index + 1}`} style={[styles.selector, !family && styles.disabledSelector]} onPress={() => family && setOpenSpecialtyId(openSpecialtyId === item.id ? null : item.id)}><Text style={[styles.selectorText, !item.specialties?.length && styles.placeholder]}>{item.specialties?.length ? item.specialties.join(" · ") : family ? "Elegí hasta 2 especialidades" : "Primero elegí una familia"}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
          {openSpecialtyId === item.id && family && <ScrollView nestedScrollEnabled style={styles.specialtyOptions}>{family.specialties.map((specialty) => {
            const selected = item.specialties?.includes(specialty) ?? false;
            const unavailable = !selected && (item.specialties?.length ?? 0) >= 2;
            return <TouchableOpacity key={specialty} disabled={unavailable} style={[styles.specialtyOption, selected && styles.specialtyOptionActive, unavailable && styles.unavailableOption]} onPress={() => toggleSpecialty(item, specialty)}><View style={styles.specialtyTitleRow}><Text style={styles.optionCheck}>{selected ? "☑" : "☐"}</Text><Text style={[styles.specialtyTitle, selected && styles.optionTextActive]}>{specialty}</Text></View><Text style={styles.optionDescription}>{specialtyDescription(family.name, specialty)}</Text></TouchableOpacity>;
          })}</ScrollView>}
          <View style={styles.descriptionHeading}><Text style={styles.miniLabel}>CONTALE BREVEMENTE AL CLIENTE QUÉ OFRECÉS</Text><Text style={styles.counter}>{descriptionLength}/240</Text></View>
          <TextInput multiline maxLength={240} value={item.description ?? ""} onChangeText={(description) => updateService(item.id, { description })} placeholder="Ej. Reviso la instalación, detecto la falla y explico las opciones antes de comenzar." placeholderTextColor="#71818B" style={[styles.input, styles.serviceDescription]} />
          <Text style={styles.help}>No incluyas teléfono, correo, redes sociales ni enlaces.</Text>
        </View>;
      })}
      <TouchableOpacity accessibilityRole="button" style={styles.addService} onPress={() => {
        if (services.length >= 2) return setMembershipNotice(true);
        setMembershipNotice(false);
        setDraft({ ...draft, services: [...services, defaultService(`${Date.now()}-${services.length}`)] });
      }}><Text style={styles.addServiceText}>＋ Agregar otro servicio</Text></TouchableOpacity>
      {membershipNotice && <View style={styles.membershipNotice}><Text style={styles.lockedTitle}>🔒 Alcanzaste los 2 servicios gratuitos</Text><Text style={styles.lockedText}>El tercer servicio se habilitará con la membresía profesional. Por ahora podés editar o quitar uno de los anteriores.</Text></View>}
      <View style={styles.lockedService}><View><Text style={styles.lockedTitle}>Tercer servicio</Text><Text style={styles.lockedText}>Próximamente con membresía profesional.</Text></View><Text style={styles.membershipBadge}>MEMBRESÍA</Text></View>
    </ScrollView>
    {!!(localError || remoteError) && <Text style={styles.error}>{localError || remoteError}</Text>}
    <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={[styles.save, busy && styles.disabled]} onPress={submit}><Text style={styles.saveText}>{busy ? "Guardando…" : "Guardar y publicar"}</Text></TouchableOpacity></View>
  </View>;
}

function createStyles(darkMode: boolean) {
  const palette = darkMode ? { background: "#10202F", surface: "#162A3B", input: "#132738", text: "#EAF4FC", muted: "#AFC2D2", line: "#29465B", soft: "#1B3041", warning: "#3A291B", warningText: "#FFC078", danger: "#FF8A72" } : { background: "#FFFFFF", surface: "#F8FCFE", input: "#FBFDFE", text: "#063C78", muted: "#5E7183", line: "#D6E8F2", soft: "#EEF7FB", warning: "#FFF7E9", warningText: "#6D5B45", danger: "#B7452B" };
  return StyleSheet.create({
    card: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24, maxHeight: "96%" }, eyebrow: { color: "#FF8A1F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, title: { color: palette.text, fontSize: 25, fontWeight: "900", marginTop: 3 }, copy: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 7 },
    scroll: { maxHeight: 650 }, scrollContent: { paddingBottom: 12 }, sectionTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginTop: 12, marginBottom: 8 }, identityRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 }, photo: { width: 68, height: 68, borderRadius: 34, marginRight: 13 }, photoFallback: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#063C78", alignItems: "center", justifyContent: "center", marginRight: 13 }, photoInitial: { color: "white", fontSize: 27, fontWeight: "900" }, identityFields: { flex: 1 }, photoButton: { minHeight: 38, alignSelf: "flex-start", justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 10 }, photoButtonText: { color: "#49B2F5", fontSize: 12, fontWeight: "900" }, email: { color: palette.muted, fontSize: 11, marginTop: 7 },
    fieldsRow: { flexDirection: "row", gap: 10 }, fieldsColumn: { flexDirection: "column" }, flexField: { flex: 1.6 }, diagnosticField: { flex: 1 }, input: { minHeight: 46, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input, marginBottom: 8 }, label: { color: palette.text, fontSize: 12, fontWeight: "900", marginTop: 5, marginBottom: 6 }, help: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: -3, marginBottom: 8 }, multiline: { minHeight: 76, paddingTop: 11, textAlignVertical: "top" }, multilineSmall: { minHeight: 62, paddingTop: 11, textAlignVertical: "top" }, money: { minHeight: 46, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: palette.line, borderRadius: 11, backgroundColor: palette.input, paddingHorizontal: 10, marginBottom: 8 }, currency: { color: palette.muted, fontSize: 10, fontWeight: "900" }, priceInput: { flex: 1, color: palette.text, fontWeight: "900", paddingHorizontal: 6 },
    selector: { minHeight: 46, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.input, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, marginBottom: 7 }, disabledSelector: { opacity: 0.48 }, selectorText: { color: palette.text, fontSize: 12, fontWeight: "800", flex: 1 }, placeholder: { color: palette.muted, fontWeight: "500" }, chevron: { color: "#49B2F5", fontSize: 17, fontWeight: "900" }, options: { borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", marginTop: -3, marginBottom: 8, backgroundColor: palette.input }, catalogOptions: { maxHeight: 265, borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", marginTop: -3, marginBottom: 9, backgroundColor: palette.input }, specialtyOptions: { maxHeight: 280, borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", marginTop: -3, marginBottom: 9, backgroundColor: palette.input }, option: { minHeight: 41, justifyContent: "center", paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: palette.line }, coverageOption: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: palette.line }, optionCheck: { color: "#49B2F5", fontSize: 15, fontWeight: "900" }, familyOption: { minHeight: 57, justifyContent: "center", paddingHorizontal: 11, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.line }, specialtyOption: { minHeight: 66, justifyContent: "center", paddingHorizontal: 11, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.line }, specialtyOptionActive: { backgroundColor: palette.soft }, unavailableOption: { opacity: 0.38 }, specialtyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 }, optionActive: { backgroundColor: palette.soft }, optionText: { color: palette.muted, fontSize: 12, fontWeight: "800" }, optionTextActive: { color: palette.text, fontWeight: "900" }, optionDescription: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }, specialtyTitle: { color: palette.text, fontSize: 12, fontWeight: "900" },
    suggestions: { borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", backgroundColor: palette.surface, marginTop: -5, marginBottom: 9 }, suggestion: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: palette.line }, suggestionHash: { color: "#49B2F5", fontSize: 13, fontWeight: "900" }, suggestionText: { color: palette.text, fontSize: 11, fontWeight: "800" }, chipList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }, chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#49B2F5", backgroundColor: palette.soft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 }, chipText: { color: "#49B2F5", fontSize: 10, fontWeight: "900" }, chipRemove: { color: palette.danger, fontSize: 16, lineHeight: 16, fontWeight: "900" },
    servicesHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 2 }, freeBadge: { color: "#56D3A1", backgroundColor: palette.soft, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, fontSize: 10, fontWeight: "900" }, serviceCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 14, padding: 11, marginTop: 8 }, serviceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }, serviceNumber: { color: "#49B2F5", fontSize: 10, fontWeight: "900", letterSpacing: 0.4 }, remove: { color: palette.danger, fontSize: 10, fontWeight: "900" }, miniLabel: { color: palette.muted, fontSize: 9, fontWeight: "900", marginTop: 4, marginBottom: 5 }, descriptionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, counter: { color: palette.muted, fontSize: 9, fontWeight: "800" }, serviceDescription: { minHeight: 82, paddingTop: 11, textAlignVertical: "top" }, addService: { minHeight: 44, borderWidth: 1, borderStyle: "dashed", borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 9 }, addServiceText: { color: "#49B2F5", fontSize: 12, fontWeight: "900" }, lockedService: { minHeight: 58, borderRadius: 11, backgroundColor: palette.soft, marginTop: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, opacity: 0.86 }, membershipNotice: { borderWidth: 1, borderColor: palette.warningText, borderRadius: 11, backgroundColor: palette.warning, marginTop: 9, padding: 11 }, lockedTitle: { color: palette.muted, fontSize: 12, fontWeight: "900" }, lockedText: { color: palette.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, membershipBadge: { color: palette.warningText, fontSize: 9, fontWeight: "900", backgroundColor: palette.warning, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
    error: { color: palette.danger, fontSize: 12, fontWeight: "800", marginTop: 7 }, actions: { flexDirection: "row", gap: 8, marginTop: 12 }, cancel: { minHeight: 48, minWidth: 92, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#49B2F5", fontWeight: "900" }, save: { flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: "#FF7800", alignItems: "center", justifyContent: "center" }, saveText: { color: "white", fontWeight: "900" }, disabled: { opacity: 0.55 },
  });
}
