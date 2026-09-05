import { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import ViewShot, { captureRef } from "react-native-view-shot";
import type { ViewShotRef } from "react-native-view-shot";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { containsContactAttempt } from "@laburapp/shared";
import type { SavedPortfolioWork } from "../lib/local-store";

const wordmark = require("../assets/brand/laburapp-wordmark-clean.png");
const watermarkTiles = Array.from({ length: 25 }, (_, index) => ({ left: (index % 5) * 150 - 40, top: Math.floor(index / 5) * 150 - 25 }));

function emptyWork(index: number): SavedPortfolioWork {
  return { id: `work-${Date.now()}-${index}`, service: "", description: "", photos: [] };
}

export function PortfolioEditor({ darkMode, initialWorks, availableServices, busy, remoteError, onCancel, onSubmit }: {
  darkMode: boolean;
  initialWorks: SavedPortfolioWork[];
  availableServices: string[];
  busy: boolean;
  remoteError: string;
  onCancel: () => void;
  onSubmit: (works: SavedPortfolioWork[]) => void;
}) {
  const styles = useMemo(() => createStyles(darkMode), [darkMode]);
  const [works, setWorks] = useState(() => initialWorks.slice(0, 3));
  const [openServiceId, setOpenServiceId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ workId: string; photoId: string; sourceUri: string } | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [localError, setLocalError] = useState("");
  const watermarkRef = useRef<ViewShotRef>(null);

  function updateWork(id: string, patch: Partial<SavedPortfolioWork>) {
    setWorks((current) => current.map((work) => work.id === id ? { ...work, ...patch } : work));
  }

  useEffect(() => {
    if (!pending || !imageReady || !watermarkRef.current) return;
    const timer = setTimeout(() => {
      void captureRef(watermarkRef, { width: 900, height: 900, format: "jpg", quality: 0.68, result: "data-uri" }).then((uri) => {
        setWorks((current) => current.map((work) => work.id === pending.workId ? { ...work, photos: [...work.photos, { id: pending.photoId, uri, watermarked: true }] } : work));
        setPending(null);
        setImageReady(false);
        setProcessing(false);
      }).catch(() => {
        setPending(null);
        setImageReady(false);
        setProcessing(false);
        setLocalError("No pudimos optimizar esa foto. Probá con otra imagen.");
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [imageReady, pending]);

  async function pickWorkPhoto(work: SavedPortfolioWork) {
    setLocalError("");
    if (processing) return;
    if (work.photos.length >= 3) return setLocalError("Cada trabajo admite hasta tres fotos.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.82 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const side = Math.min(asset.width, asset.height);
    setProcessing(true);
    try {
      const optimized = await ImageManipulator.manipulateAsync(asset.uri, [
        { crop: { originX: Math.max(0, (asset.width - side) / 2), originY: Math.max(0, (asset.height - side) / 2), width: side, height: side } },
        { resize: { width: 900, height: 900 } },
      ], { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG });
      setPending({ workId: work.id, photoId: `photo-${Date.now()}`, sourceUri: optimized.uri });
    } catch {
      setProcessing(false);
      setLocalError("No pudimos recortar esa foto. Probá con otra imagen.");
    }
  }

  function submit() {
    setLocalError("");
    if (works.some((work) => !availableServices.includes(work.service))) return setLocalError("Elegí uno de tus servicios en cada trabajo.");
    if (works.some((work) => work.description.trim().length < 10 || work.description.trim().length > 300)) return setLocalError("Describí cada trabajo con entre 10 y 300 caracteres.");
    if (works.some((work) => containsContactAttempt(work.description))) return setLocalError("No incluyas teléfonos, correos, redes ni enlaces en los trabajos.");
    if (works.some((work) => work.photos.length !== 3)) return setLocalError("Cada trabajo debe tener exactamente tres fotos cuadradas.");
    onSubmit(works);
  }

  return <View style={styles.card}>
    <Text style={styles.eyebrow}>PORTFOLIO GRATUITO</Text>
    <Text style={styles.title}>Trabajos realizados</Text>
    <Text style={styles.copy}>Podés publicar hasta 3 trabajos, con 3 fotos cuadradas por trabajo.</Text>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {works.map((work, index) => <View key={work.id} style={styles.workCard}>
        <View style={styles.workTop}><Text style={styles.workNumber}>TRABAJO {index + 1}</Text><TouchableOpacity onPress={() => setWorks((current) => current.filter((item) => item.id !== work.id))}><Text style={styles.remove}>Quitar</Text></TouchableOpacity></View>
        <Text style={styles.label}>Servicio de</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Elegir servicio del trabajo ${index + 1}`} style={styles.selector} onPress={() => setOpenServiceId(openServiceId === work.id ? null : work.id)}><Text style={[styles.selectorText, !work.service && styles.placeholder]}>{work.service || "Seleccioná uno de tus servicios"}</Text><Text style={styles.chevron}>⌄</Text></TouchableOpacity>
        {openServiceId === work.id && <View style={styles.options}>{availableServices.map((service) => <TouchableOpacity key={service} style={[styles.option, work.service === service && styles.optionActive]} onPress={() => { updateWork(work.id, { service }); setOpenServiceId(null); }}><Text style={[styles.optionText, work.service === service && styles.optionTextActive]}>{service}</Text></TouchableOpacity>)}</View>}
        <Text style={styles.label}>Descripción</Text>
        <TextInput multiline maxLength={300} value={work.description} onChangeText={(description) => updateWork(work.id, { description })} placeholder="Contá qué problema resolviste y cuál fue el resultado." placeholderTextColor="#71818B" style={[styles.input, styles.description]} />
        <Text style={styles.counter}>{work.description.length}/300</Text>
        <View style={styles.photosRow}>
          {work.photos.map((photo, photoIndex) => <View key={photo.id} style={styles.photoWrap}><Image source={{ uri: photo.uri }} style={styles.photo} /><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Quitar foto ${photoIndex + 1} del trabajo ${index + 1}`} style={styles.photoRemove} onPress={() => updateWork(work.id, { photos: work.photos.filter((item) => item.id !== photo.id) })}><Text style={styles.photoRemoveText}>×</Text></TouchableOpacity></View>)}
          {work.photos.length < 3 && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Agregar foto al trabajo ${index + 1}`} disabled={processing} style={styles.addPhoto} onPress={() => void pickWorkPhoto(work)}><Text style={styles.addPhotoPlus}>＋</Text><Text style={styles.addPhotoText}>{processing ? "Optimizando…" : "Foto 1:1"}</Text></TouchableOpacity>}
        </View>
        <Text style={styles.photoHelp}>Recorte 1:1 · 900 px · compresión liviana · marca de agua LaburApp.</Text>
      </View>)}
      {works.length < 3 && <TouchableOpacity accessibilityRole="button" style={styles.addWork} onPress={() => setWorks((current) => [...current, emptyWork(current.length)])}><Text style={styles.addWorkText}>＋ Agregar trabajo realizado</Text></TouchableOpacity>}
      {!works.length && <View style={styles.empty}><Text style={styles.emptyTitle}>Todavía no cargaste trabajos</Text><Text style={styles.emptyText}>Agregá el primero para mostrar ejemplos reales de lo que hacés.</Text></View>}
    </ScrollView>
    {!!(localError || remoteError) && <Text style={styles.error}>{localError || remoteError}</Text>}
    <View style={styles.actions}><TouchableOpacity style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancelar</Text></TouchableOpacity><TouchableOpacity disabled={busy || processing} style={[styles.save, (busy || processing) && styles.disabled]} onPress={submit}><Text style={styles.saveText}>{busy ? "Guardando…" : "Guardar trabajos"}</Text></TouchableOpacity></View>
    {pending && <ViewShot ref={watermarkRef} style={styles.captureStage} options={{ width: 900, height: 900, format: "jpg", quality: 0.68, result: "data-uri" }}><Image source={{ uri: pending.sourceUri }} style={styles.captureImage} onLoad={() => setImageReady(true)} />{watermarkTiles.map((tile, index) => <Image key={index} source={wordmark} resizeMode="contain" style={[styles.watermark, { left: tile.left, top: tile.top }]} />)}</ViewShot>}
  </View>;
}

function createStyles(darkMode: boolean) {
  const palette = darkMode ? { background: "#10202F", surface: "#162A3B", input: "#132738", text: "#EAF4FC", muted: "#AFC2D2", line: "#29465B", soft: "#1B3041", danger: "#FF8A72" } : { background: "#FFFFFF", surface: "#F8FCFE", input: "#FBFDFE", text: "#063C78", muted: "#5E7183", line: "#D6E8F2", soft: "#EEF7FB", danger: "#B7452B" };
  return StyleSheet.create({
    card: { backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 24, maxHeight: "96%" }, eyebrow: { color: "#FF8A1F", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 }, title: { color: palette.text, fontSize: 25, fontWeight: "900", marginTop: 3 }, copy: { color: palette.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 }, scroll: { maxHeight: 650 }, scrollContent: { paddingBottom: 12 },
    workCard: { borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, borderRadius: 14, padding: 12, marginTop: 10 }, workTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, workNumber: { color: "#49B2F5", fontSize: 10, fontWeight: "900" }, remove: { color: palette.danger, fontSize: 10, fontWeight: "900" }, label: { color: palette.text, fontSize: 11, fontWeight: "900", marginTop: 10, marginBottom: 6 },
    selector: { minHeight: 46, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.input, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 }, selectorText: { color: palette.text, fontSize: 12, fontWeight: "800", flex: 1 }, placeholder: { color: palette.muted, fontWeight: "500" }, chevron: { color: "#49B2F5", fontSize: 17, fontWeight: "900" }, options: { borderWidth: 1, borderColor: palette.line, borderRadius: 10, overflow: "hidden", marginTop: 5, backgroundColor: palette.input }, option: { minHeight: 40, justifyContent: "center", paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: palette.line }, optionActive: { backgroundColor: palette.soft }, optionText: { color: palette.muted, fontSize: 11, fontWeight: "800" }, optionTextActive: { color: palette.text, fontWeight: "900" },
    input: { minHeight: 46, borderWidth: 1, borderColor: palette.line, borderRadius: 11, paddingHorizontal: 12, color: palette.text, backgroundColor: palette.input }, description: { minHeight: 78, paddingTop: 11, textAlignVertical: "top" }, counter: { color: palette.muted, fontSize: 9, textAlign: "right", marginTop: 4 }, photosRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, photoWrap: { width: 92, height: 92, position: "relative" }, photo: { width: 92, height: 92, borderRadius: 10 }, photoRemove: { position: "absolute", right: 4, top: 4, width: 23, height: 23, borderRadius: 12, backgroundColor: "rgba(7,18,29,0.82)", alignItems: "center", justifyContent: "center" }, photoRemoveText: { color: "white", fontSize: 16, lineHeight: 18, fontWeight: "900" }, addPhoto: { width: 92, height: 92, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", borderColor: "#49B2F5", backgroundColor: palette.input, alignItems: "center", justifyContent: "center" }, addPhotoPlus: { color: "#49B2F5", fontSize: 22, fontWeight: "900" }, addPhotoText: { color: "#49B2F5", fontSize: 9, fontWeight: "900", marginTop: 2 }, photoHelp: { color: palette.muted, fontSize: 9, lineHeight: 13, marginTop: 7 },
    addWork: { minHeight: 46, borderWidth: 1, borderStyle: "dashed", borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 10 }, addWorkText: { color: "#49B2F5", fontSize: 12, fontWeight: "900" }, empty: { backgroundColor: palette.soft, borderRadius: 12, padding: 16, marginTop: 10 }, emptyTitle: { color: palette.text, fontSize: 13, fontWeight: "900" }, emptyText: { color: palette.muted, fontSize: 10, lineHeight: 15, marginTop: 4 }, error: { color: palette.danger, fontSize: 12, fontWeight: "800", marginTop: 7 }, actions: { flexDirection: "row", gap: 8, marginTop: 12 }, cancel: { minHeight: 48, minWidth: 92, borderWidth: 1, borderColor: "#49B2F5", borderRadius: 11, alignItems: "center", justifyContent: "center" }, cancelText: { color: "#49B2F5", fontWeight: "900" }, save: { flex: 1, minHeight: 48, borderRadius: 11, backgroundColor: "#FF7800", alignItems: "center", justifyContent: "center" }, saveText: { color: "white", fontWeight: "900" }, disabled: { opacity: 0.55 },
    captureStage: { position: "absolute", left: -10000, top: 0, width: 750, height: 750, overflow: "hidden", backgroundColor: "#FFFFFF" }, captureImage: { position: "absolute", left: 0, top: 0, width: 750, height: 750 }, watermark: { position: "absolute", width: 190, height: 72, opacity: 0.1, transform: [{ rotate: "-25deg" }] },
  });
}
