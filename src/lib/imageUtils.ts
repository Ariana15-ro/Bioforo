import { supabase } from "@/lib/supabase";

export interface ProcessImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export function getPublicSightingImageUrl(value: string | null | undefined): string {
  const imageUrl = value?.trim();
  if (!imageUrl || /^(blob:|data:)/i.test(imageUrl)) return "";

  let path = imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) {
    try {
      const url = new URL(imageUrl);
      const storagePath = "/storage/v1/object/public/sightings/";
      const pathStart = url.pathname.indexOf(storagePath);
      if (pathStart === -1) return "";
      path = decodeURIComponent(url.pathname.slice(pathStart + storagePath.length));
    } catch {
      return "";
    }
  } else {
    path = imageUrl.replace(/^\/+/, "");
  }

  if (!path) return "";
  return supabase.storage.from("sightings").getPublicUrl(path).data.publicUrl;
}

export async function processImage(
  file: File,
  options: ProcessImageOptions = {},
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    mimeType = "image/jpeg",
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo inicializar el procesamiento de imagen.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });

  if (!blob) {
    throw new Error("No se pudo generar la imagen procesada.");
  }

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^/.]+$/, "");
  const processedName = `${name}_processed.${ext}`;

  return new File([blob], processedName, { type: mimeType });
}
