import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { SavedProviderProfile, SavedTariffItem } from "../lib/local-store";
import { dictionaryForTrades } from "../lib/service-dictionary";

function numericValue(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function TariffEditorForm({ profile, onCancel, onSave }: { profile: SavedProviderProfile; onCancel: () => void; onSave: (items: SavedTariffItem[]) => void }) {
  const suggested = useMemo(() => dictionaryForTrades([profile.trade, profile.secondaryTrade ?? ""]), [profile.trade, profile.secondaryTrade]);
  const [items, setItems] = useState<SavedTariffItem[]>(() => profile.tariffItems?.length ? profile.tariffItems.map((item) => ({ ...item })) : suggested.map((item) => ({ ...item, enabled: true })));

  function updateItem(id: string, patch: Partial<SavedTariffItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addSuggested(item: (typeof suggested)[number]) {
    setItems((current) => current.some((saved) => saved.id === item.id) ? current : [...current, { ...item, enabled: true }]);
  }

  function addCustom() {
    setItems((current) => [...current, { id: `custom-${Date.now()}`, trade: profile.trade, label: "Nuevo servicio", unit: "servicio", unitPrice: 0, enabled: true }]);
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>MI TARIFARIO</Text>
    <Text style={styles.title}>Precios reutilizables</Text>
    <Text style={styles.copy}>Se ofrecen al responder un presupuesto. Siempre podés cambiar cantidades, conceptos y valores antes de enviarlo.</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {!!suggested.length && <>
        <Text style={styles.label}>Sugerencias del diccionario</Text>
        <View style={styles.suggestions}>{suggested.filter((suggestion) => !items.some((item) => item.id === suggestion.id)).map((suggestion) => <TouchableOpacity key={suggestion.id} onPress={() => addSuggested(suggestion)} style={styles.suggestion}><Text style={styles.suggestionText}>+ {suggestion.label}</Text></TouchableOpacity>)}</View>
      </>}
      <Text style={styles.label}>Servicios guardados</Text>
      {items.map((item) => <View key={item.id} style={[styles.item, !item.enabled && styles.itemDisabled]}>
        <View style={styles.itemHeader}><Text style={styles.trade}>{item.trade}</Text><TouchableOpacity onPress={() => updateItem(item.id, { enabled: !item.enabled })}><Text style={item.enabled ? styles.enabled : styles.disabled}>{item.enabled ? "Activo" : "Oculto"}</Text></TouchableOpacity></View>
        <TextInput value={item.label} onChangeText={(label) => updateItem(item.id, { label })} placeholder="Servicio" placeholderTextColor="#71818B" style={styles.input} />
        <View style={styles.row}><TextInput value={item.unit} onChangeText={(unit) => updateItem(item.id, { unit })} placeholder="Unidad" placeholderTextColor="#71818B" style={[styles.input, styles.unit]} /><View style={styles.money}><Text style={styles.currency}>$</Text><TextInput value={`${item.unitPrice}`} onChangeText={(value) => updateItem(item.id, { unitPrice: numericValue(value) })} keyboardType="numeric" style={styles.price} /><Text style={styles.currency}>ARS</Text></View></View>
      </View>)}
      <TouchableOpacity onPress={addCustom} style={styles.add}><Text style={styles.addText}>+ Agregar servicio propio</Text></TouchableOpacity>
    </ScrollView>
    <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity style={styles.save} onPress={() => onSave(items.filter((item) => item.label.trim()))}><Text style={styles.saveText}>Guardar tarifario</Text></TouchableOpacity></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 26, maxHeight: "94%" }, eyebrow: { color: "#FF7800", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, title: { color: "#063C78", fontSize: 23, fontWeight: "900", marginTop: 4 }, copy: { color: "#5E7183", fontSize: 12, lineHeight: 17, marginTop: 5, marginBottom: 9 }, scroll: { maxHeight: 510 }, scrollContent: { paddingBottom: 10 }, label: { color: "#063C78", fontSize: 12, fontWeight: "900", marginTop: 10, marginBottom: 8 }, suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, suggestion: { borderWidth: 1, borderColor: "#9DD7F0", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "#F2FAFD" }, suggestionText: { color: "#078EE9", fontSize: 10, fontWeight: "800" }, item: { borderWidth: 1, borderColor: "#D6E8F2", backgroundColor: "#FAFDFE", borderRadius: 12, padding: 10, marginBottom: 8 }, itemDisabled: { opacity: 0.55 }, itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }, trade: { color: "#5E7183", fontSize: 10, fontWeight: "900" }, enabled: { color: "#16825B", fontSize: 10, fontWeight: "900" }, disabled: { color: "#9A4700", fontSize: 10, fontWeight: "900" }, input: { minHeight: 42, borderWidth: 1, borderColor: "#D6E8F2", borderRadius: 9, paddingHorizontal: 10, color: "#063C78", backgroundColor: "white", marginBottom: 7 }, row: { flexDirection: "row", gap: 7 }, unit: { flex: 0.8, marginBottom: 0 }, money: { flex: 1.4, minHeight: 42, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#D6E8F2", borderRadius: 9, paddingHorizontal: 9, backgroundColor: "white" }, price: { flex: 1, color: "#063C78", fontWeight: "900", paddingHorizontal: 5 }, currency: { color: "#5E7183", fontSize: 10, fontWeight: "900" }, add: { minHeight: 42, borderWidth: 1, borderStyle: "dashed", borderColor: "#078EE9", borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 4 }, addText: { color: "#078EE9", fontSize: 12, fontWeight: "900" }, actions: { flexDirection: "row", gap: 8, marginTop: 13 }, cancel: { minHeight: 48, minWidth: 92, borderWidth: 1, borderColor: "#078EE9", borderRadius: 11, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#078EE9", fontWeight: "900" }, save: { flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: "#FF7800", alignItems: "center", justifyContent: "center" }, saveText: { color: "white", fontWeight: "900" },
});
