import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { containsContactAttempt } from "@laburapp/shared";
import type { QuotePricingMode, SavedQuote, SavedQuoteItem, SavedRequest, SavedTariffItem } from "../lib/local-store";
import { quoteDraftTotal, quoteTemplateFor, type QuoteDraft } from "../lib/quote-templates";

const modes: Array<{ value: QuotePricingMode; label: string; hint: string }> = [
  { value: "itemized", label: "Por ítems", hint: "Desglosá conceptos, cantidades y valores." },
  { value: "fixed", label: "Precio fijo", hint: "Un único importe por todo el trabajo." },
  { value: "starting_at", label: "Honorarios desde", hint: "Mostrá un valor inicial sujeto a revisión." },
];
const emptyTariffItems: SavedTariffItem[] = [];

function numericValue(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function QuoteBuilderForm({ darkMode, request, tariffItems = emptyTariffItems, onCancel, onSubmit }: { darkMode: boolean; request: SavedRequest; tariffItems?: SavedTariffItem[]; onCancel: () => void; onSubmit: (quote: Omit<SavedQuote, "version">) => void }) {
  const styles = useMemo(() => createStyles(darkMode), [darkMode]);
  const availableTariff = useMemo(() => tariffItems.filter((item) => item.enabled && (!item.trade || request.trade.toLowerCase().includes(item.trade.toLowerCase()) || item.trade.toLowerCase().includes(request.trade.toLowerCase()))), [request.trade, tariffItems]);
  const [draft, setDraft] = useState<QuoteDraft>(() => quoteTemplateFor(request));
  const [error, setError] = useState("");

  useEffect(() => {
    const template = quoteTemplateFor(request);
    if (request.quote) {
      setDraft({
        pricingMode: request.quote.pricingMode ?? "itemized",
        baseAmount: request.quote.amount,
        items: request.quote.items?.map((current) => ({ ...current })) ?? template.items,
        eta: request.quote.eta,
        notes: request.quote.notes ?? "",
        validDays: request.quote.validDays ?? 7,
      });
    } else setDraft(availableTariff.length ? { ...template, pricingMode: "itemized", items: availableTariff.map((current) => ({ id: current.id, label: current.label, quantity: 1, unit: current.unit, unitPrice: current.unitPrice })) } : template);
    setError("");
  }, [request, availableTariff]);

  const total = useMemo(() => quoteDraftTotal(draft), [draft]);
  const selectedMode = modes.find((mode) => mode.value === draft.pricingMode) ?? modes[0];

  function updateItem(id: string, patch: Partial<SavedQuoteItem>) {
    setDraft((current) => ({ ...current, items: current.items.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }

  function addItem() {
    setDraft((current) => ({ ...current, items: [...current.items, { id: `${Date.now()}`, label: "Nuevo concepto", quantity: 1, unit: "unidad", unitPrice: 0 }] }));
  }

  function send() {
    setError("");
    if (total <= 0) return setError("El presupuesto debe tener un valor mayor a cero.");
    if (!draft.eta.trim()) return setError("Indicá un plazo o tiempo estimado.");
    if (containsContactAttempt(`${draft.eta} ${draft.notes} ${draft.items.map((item) => item.label).join(" ")}`)) return setError("No está permitido compartir teléfonos de contacto o emails.");
    const items = draft.pricingMode === "itemized" ? draft.items.filter((line) => line.label.trim() && line.quantity > 0) : [{ id: "base", label: draft.pricingMode === "fixed" ? "Precio fijo del trabajo" : "Honorarios profesionales desde", quantity: 1, unit: "servicio", unitPrice: draft.baseAmount }];
    if (!items.length) return setError("Agregá al menos un concepto al presupuesto.");
    onSubmit({
      amount: total,
      pricingMode: draft.pricingMode,
      items,
      scope: draft.pricingMode === "itemized" ? items.map((line) => line.label).join(" · ") : `${draft.pricingMode === "fixed" ? "Precio fijo" : "Honorarios desde"} para: ${request.description}`,
      eta: draft.eta.trim(),
      notes: draft.notes.trim(),
      validDays: Math.max(1, draft.validDays),
    });
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>PRESUPUESTO MODULAR</Text>
    <Text style={styles.title}>{request.provider}</Text>
    <Text style={styles.copy}>{request.trade} · Versión {(request.quote?.version ?? 0) + 1}</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Modalidad de cobro</Text>
      <View style={styles.modeRow}>{modes.map((mode) => <TouchableOpacity accessibilityRole="button" key={mode.value} onPress={() => setDraft((current) => ({ ...current, pricingMode: mode.value }))} style={[styles.modeButton, draft.pricingMode === mode.value && styles.modeButtonActive]}><Text style={[styles.modeText, draft.pricingMode === mode.value && styles.modeTextActive]}>{mode.label}</Text></TouchableOpacity>)}</View>
      <Text style={styles.hint}>{selectedMode.hint}</Text>

      {draft.pricingMode === "itemized" ? <>
        <Text style={styles.label}>Conceptos</Text>
        {!!availableTariff.length && <View style={styles.tariffNotice}><Text style={styles.tariffNoticeTitle}>✓ Cargado desde tu tarifario</Text><Text style={styles.tariffNoticeText}>Elegí conceptos guardados o ajustalos para este trabajo.</Text><View style={styles.savedOptions}>{availableTariff.map((saved) => <TouchableOpacity key={saved.id} onPress={() => setDraft((current) => current.items.some((item) => item.id === saved.id) ? current : { ...current, items: [...current.items, { id: saved.id, label: saved.label, quantity: 1, unit: saved.unit, unitPrice: saved.unitPrice }] })} style={styles.savedOption}><Text style={styles.savedOptionText}>+ {saved.label}</Text></TouchableOpacity>)}</View></View>}
        {draft.items.map((line, index) => <View key={line.id} style={styles.lineCard}>
          <View style={styles.lineTop}><Text style={styles.lineNumber}>Ítem {index + 1}</Text>{draft.items.length > 1 && <TouchableOpacity accessibilityRole="button" onPress={() => setDraft((current) => ({ ...current, items: current.items.filter((item) => item.id !== line.id) }))}><Text style={styles.remove}>Quitar</Text></TouchableOpacity>}</View>
          <TextInput value={line.label} onChangeText={(label) => updateItem(line.id, { label })} placeholder="Concepto" placeholderTextColor="#71818B" style={styles.input} />
          <View style={styles.fieldRow}>
            <View style={styles.smallField}><Text style={styles.miniLabel}>Cantidad</Text><TextInput value={`${line.quantity}`} onChangeText={(value) => updateItem(line.id, { quantity: numericValue(value) })} keyboardType="decimal-pad" style={styles.input} /></View>
            <View style={styles.smallField}><Text style={styles.miniLabel}>Unidad</Text><TextInput value={line.unit} onChangeText={(unit) => updateItem(line.id, { unit })} style={styles.input} /></View>
            <View style={styles.priceField}><Text style={styles.miniLabel}>Valor unitario</Text><TextInput value={`${line.unitPrice}`} onChangeText={(value) => updateItem(line.id, { unitPrice: numericValue(value) })} keyboardType="numeric" style={styles.input} /></View>
          </View>
        </View>)}
        <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={addItem}><Text style={styles.addText}>+ Agregar concepto</Text></TouchableOpacity>
      </> : <>
        <Text style={styles.label}>{draft.pricingMode === "fixed" ? "Importe total" : "Honorarios a partir de"}</Text>
        <View style={styles.moneyInput}><Text style={styles.currency}>$</Text><TextInput accessibilityLabel="Importe base" value={`${draft.baseAmount}`} onChangeText={(value) => setDraft((current) => ({ ...current, baseAmount: numericValue(value) }))} keyboardType="numeric" style={styles.moneyField} /><Text style={styles.currency}>ARS</Text></View>
        {draft.pricingMode === "starting_at" && <Text style={styles.notice}>El cliente verá claramente que es un valor inicial y que el total puede cambiar cuando se confirme el alcance.</Text>}
      </>}

      <Text style={styles.label}>Plazo estimado</Text>
      <TextInput value={draft.eta} onChangeText={(eta) => setDraft((current) => ({ ...current, eta }))} placeholder="Ej. 1 jornada o 3 días" placeholderTextColor="#71818B" style={styles.input} />
      <Text style={styles.label}>Vigencia en días</Text>
      <TextInput value={`${draft.validDays}`} onChangeText={(value) => setDraft((current) => ({ ...current, validDays: numericValue(value) }))} keyboardType="numeric" style={styles.input} />
      <Text style={styles.label}>Observaciones</Text>
      <TextInput multiline value={draft.notes} onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))} placeholder="Condiciones, materiales o aclaraciones" placeholderTextColor="#71818B" style={[styles.input, styles.multiline]} />
      <Text style={styles.contactWarning}>No está permitido compartir teléfonos de contacto o emails.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
    <View style={styles.totalRow}><View><Text style={styles.totalLabel}>{draft.pricingMode === "starting_at" ? "TOTAL DESDE" : "TOTAL"}</Text><Text style={styles.totalHint}>Valores editables antes de enviar</Text></View><Text style={styles.total}>${total.toLocaleString("es-AR")}</Text></View>
    <View style={styles.actions}><TouchableOpacity accessibilityRole="button" style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" style={styles.submit} onPress={send}><Text style={styles.submitText}>Enviar presupuesto</Text></TouchableOpacity></View>
  </View>;
}

function createStyles(darkMode: boolean) {
  const palette = darkMode ? { background: "#10202F", surface: "#162A3B", input: "#132738", text: "#EAF4FC", muted: "#AFC2D2", line: "#29465B", soft: "#1B3041", success: "#12372C", successText: "#87E5C1", warning: "#3A291B", warningText: "#FFC078", danger: "#FF8A72" } : { background: "#FFFFFF", surface: "#FAFDFE", input: "#FFFFFF", text: "#063C78", muted: "#5E7183", line: "#D6E8F2", soft: "#E8F6FD", success: "#EAF8F2", successText: "#16825B", warning: "#FFF3E8", warningText: "#9A4700", danger: "#B7452B" };
  return StyleSheet.create({
  card: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 26, maxHeight: "94%" }, eyebrow: { color: "#FF8A1F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, title: { color: palette.text, fontSize: 23, fontWeight: "900", marginTop: 4 }, copy: { color: palette.muted, marginTop: 3, marginBottom: 10 }, scroll: { maxHeight: 500 }, scrollContent: { paddingBottom: 10 }, label: { color: palette.text, fontSize: 13, fontWeight: "900", marginTop: 13, marginBottom: 7 }, hint: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, modeRow: { flexDirection: "row", gap: 6 }, modeButton: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: palette.line, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, modeButtonActive: { borderColor: "#49B2F5", backgroundColor: palette.soft }, modeText: { color: palette.muted, fontSize: 11, fontWeight: "800", textAlign: "center" }, modeTextActive: { color: palette.text }, tariffNotice: { backgroundColor: palette.success, borderRadius: 10, padding: 10, marginBottom: 9 }, tariffNoticeTitle: { color: palette.successText, fontSize: 11, fontWeight: "900" }, tariffNoticeText: { color: palette.successText, fontSize: 10, marginTop: 2 }, savedOptions: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }, savedOption: { backgroundColor: palette.input, borderWidth: 1, borderColor: palette.successText, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, savedOptionText: { color: palette.successText, fontSize: 9, fontWeight: "800" }, lineCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 12, padding: 11, marginBottom: 8 }, lineTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 7 }, lineNumber: { color: "#49B2F5", fontSize: 11, fontWeight: "900" }, remove: { color: palette.danger, fontSize: 11, fontWeight: "800" }, input: { minHeight: 43, borderWidth: 1, borderColor: palette.line, borderRadius: 9, paddingHorizontal: 10, color: palette.text, backgroundColor: palette.input, marginBottom: 7 }, fieldRow: { flexDirection: "row", gap: 6 }, smallField: { flex: 0.8 }, priceField: { flex: 1.3 }, miniLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", marginBottom: 4 }, addButton: { borderWidth: 1, borderStyle: "dashed", borderColor: "#49B2F5", minHeight: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" }, addText: { color: "#49B2F5", fontWeight: "900", fontSize: 12 }, moneyInput: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 13, backgroundColor: palette.input }, currency: { color: palette.muted, fontWeight: "900" }, moneyField: { flex: 1, minHeight: 50, color: palette.text, fontSize: 20, fontWeight: "900" }, notice: { color: palette.warningText, backgroundColor: palette.warning, borderRadius: 9, padding: 10, fontSize: 11, lineHeight: 16, marginTop: 8 }, multiline: { minHeight: 75, paddingTop: 10, textAlignVertical: "top" }, contactWarning: { color: palette.warningText, backgroundColor: palette.warning, borderRadius: 9, padding: 9, fontSize: 10, fontWeight: "800" }, error: { color: palette.danger, fontSize: 12, fontWeight: "800", marginTop: 5 }, totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 13, marginTop: 5 }, totalLabel: { color: palette.muted, fontSize: 10, fontWeight: "900" }, totalHint: { color: palette.muted, fontSize: 9, marginTop: 2 }, total: { color: palette.text, fontSize: 24, fontWeight: "900" }, actions: { flexDirection: "row", gap: 8, marginTop: 13 }, cancel: { minHeight: 48, minWidth: 92, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#49B2F5", fontWeight: "900" }, submit: { flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: "#FF7800", alignItems: "center", justifyContent: "center" }, submitText: { color: "white", fontWeight: "900" },
  });
}
