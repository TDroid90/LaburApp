export function passwordSecurityError(value: string) {
  if (value.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (!/[a-záéíóúñ]/.test(value) || !/[A-ZÁÉÍÓÚÑ]/.test(value))
    return "Incluí al menos una mayúscula y una minúscula.";
  if (!/\d/.test(value) || !/[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]/.test(value))
    return "Incluí al menos un número y un símbolo.";
  return null;
}

export function readableAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials"))
    return "El correo o la contraseña no son correctos.";
  if (normalized.includes("email not confirmed"))
    return "Confirmá tu correo antes de ingresar.";
  if (normalized.includes("user already registered"))
    return "No pudimos crear la cuenta. Probá ingresar o recuperar la contraseña si ya te registraste.";
  if (normalized.includes("rate limit") || normalized.includes("too many requests"))
    return "Hiciste varios intentos seguidos. Esperá unos minutos y volvé a probar.";
  if (normalized.includes("password should be") || normalized.includes("weak password"))
    return "La contraseña no cumple los requisitos de seguridad.";
  return "No pudimos completar el acceso. Volvé a intentarlo.";
}

export function isDemoAccessEnabled(flag: string | undefined, appEnvironment: string | undefined) {
  return flag === "true" && appEnvironment === "development";
}

export function shouldClearSessionOnAuthEvent(event: string, email?: string | null) {
  return event === "SIGNED_OUT" && !!email && !email.endsWith("@laburapp.demo");
}
