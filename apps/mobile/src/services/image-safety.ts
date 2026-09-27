export type PickedImageDescriptor = {
  type?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  uri?: string | null;
};

export type ImagePolicy = {
  maxInputBytes: number;
  maxDimension: number;
};

export const PHOTO_IMAGE_POLICY: ImagePolicy = {
  maxInputBytes: 15 * 1024 * 1024,
  maxDimension: 12_000,
};

export const DOCUMENT_IMAGE_POLICY: ImagePolicy = {
  maxInputBytes: 25 * 1024 * 1024,
  maxDimension: 16_000,
};

export function pickedImageError(asset: PickedImageDescriptor, policy: ImagePolicy) {
  if (!asset.uri) return "La imagen seleccionada no tiene un archivo válido.";
  if (asset.type && asset.type !== "image") return "Seleccioná un archivo de imagen.";
  if (asset.mimeType && !asset.mimeType.toLowerCase().startsWith("image/")) {
    return "El archivo seleccionado no es una imagen compatible.";
  }
  const width = Number(asset.width ?? 0);
  const height = Number(asset.height ?? 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "No pudimos leer las dimensiones de esa imagen.";
  }
  if (width > policy.maxDimension || height > policy.maxDimension) {
    return "La imagen tiene una resolución demasiado grande. Elegí una versión más pequeña.";
  }
  if (asset.fileSize && asset.fileSize > policy.maxInputBytes) {
    return "El archivo es demasiado pesado. Elegí una imagen más pequeña.";
  }
  return null;
}
export function longestSideResize(width: number, height: number, maximum: number) {
  if (width <= maximum && height <= maximum) return [];
  return width >= height
    ? [{ resize: { width: maximum } }]
    : [{ resize: { height: maximum } }];
}
