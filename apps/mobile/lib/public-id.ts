const localityCodes: Record<string, string> = {
  "san sebastián": "SS",
  "río grande": "RG",
  tolhuin: "TOL",
  almanza: "ALM",
  ushuaia: "USH",
};

export function displayPublicId(publicId: string, city?: string | null): string {
  const code = localityCodes[(city ?? "").trim().toLocaleLowerCase("es-AR")];
  return code && publicId ? `${code}-${publicId}` : publicId;
}

export function canonicalPublicId(input: string): string {
  return input.trim().toUpperCase().replace(/^(?:SS|RG|TOL|ALM|USH)-(?=LP\d{6,}$)/, "");
}
