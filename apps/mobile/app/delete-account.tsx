import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeleteAccountInstructions() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.eyebrow}>PRIVACIDAD Y CUENTA</Text>
        <Text style={styles.title}>Cómo eliminar tu cuenta de LaburApp</Text>
        <Text style={styles.copy}>La eliminación se realiza desde la aplicación para poder verificar que sos la persona titular de la cuenta.</Text>
        <View style={styles.card}>
          <Text style={styles.step}>1. Ingresá a LaburApp.</Text>
          <Text style={styles.step}>2. Abrí la pestaña Perfil.</Text>
          <Text style={styles.step}>3. Tocá “Eliminar cuenta”.</Text>
          <Text style={styles.step}>4. Leé las consecuencias, ingresá tu contraseña y escribí ELIMINAR.</Text>
        </View>
        <Text style={styles.copy}>Se eliminan el acceso, el perfil público y los archivos personales. El historial contractual, financiero o antifraude estrictamente necesario puede conservarse anonimizado.</Text>
        <Text style={styles.note}>La dirección pública definitiva de esta página se completará cuando LaburApp tenga dominio. No se inventó una URL temporal.</Text>
        <Link href="/" style={styles.link}>Volver a LaburApp</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#06131D" },
  page: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 24, gap: 16 },
  eyebrow: { color: "#45B9FF", fontSize: 12, fontWeight: "900" },
  title: { color: "#F3F7FA", fontSize: 30, lineHeight: 36, fontWeight: "900" },
  copy: { color: "#C4D2DD", fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: "#102536", borderColor: "#2D526A", borderWidth: 1, borderRadius: 16, padding: 18, gap: 12 },
  step: { color: "#F3F7FA", fontSize: 16, lineHeight: 23, fontWeight: "700" },
  note: { color: "#F0B26B", fontSize: 14, lineHeight: 21 },
  link: { color: "#45B9FF", fontSize: 16, fontWeight: "900", paddingVertical: 10 },
});
