import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Deliberately avoid logging stacks or session data in production.
  }

  render() {
    if (!this.state.error) return this.props.children;
    const developmentDetail = __DEV__ ? ` (${this.state.error.name})` : "";

    return (
      <View style={styles.screen} accessibilityRole="alert">
        <Text style={styles.title}>LaburApp necesita recuperarse</Text>
        <Text style={styles.copy}>
          Ocurrió un error inesperado{developmentDetail}. Tus datos de acceso no se muestran ni se borraron.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reintentar abrir LaburApp"
          onPress={() => this.setState({ error: null })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07121D",
    padding: 24,
  },
  title: { color: "#F4F8FB", fontSize: 24, fontWeight: "900", textAlign: "center" },
  copy: { color: "#B9CAD5", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 10, maxWidth: 520 },
  button: { minHeight: 48, minWidth: 150, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#FF7800", marginTop: 20, paddingHorizontal: 18 },
  buttonText: { color: "white", fontSize: 15, fontWeight: "900" },
});
