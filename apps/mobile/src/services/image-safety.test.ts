import { describe, expect, it } from "vitest";
import { DOCUMENT_IMAGE_POLICY, longestSideResize, PHOTO_IMAGE_POLICY, pickedImageError } from "./image-safety";

describe("image safety", () => {
  const image = { uri: "file:///photo.jpg", type: "image", mimeType: "image/jpeg", width: 1200, height: 900, fileSize: 1_000_000 };

  it("accepts a decodable image and rejects unexpected MIME or corrupt dimensions", () => {
    expect(pickedImageError(image, PHOTO_IMAGE_POLICY)).toBeNull();
    expect(pickedImageError({ ...image, mimeType: "application/pdf" }, DOCUMENT_IMAGE_POLICY)).toContain("no es una imagen");
    expect(pickedImageError({ ...image, width: 0 }, PHOTO_IMAGE_POLICY)).toContain("dimensiones");
  });

  it("enforces input size and resolution bounds", () => {
    expect(pickedImageError({ ...image, fileSize: PHOTO_IMAGE_POLICY.maxInputBytes + 1 }, PHOTO_IMAGE_POLICY)).toContain("pesado");
    expect(pickedImageError({ ...image, height: PHOTO_IMAGE_POLICY.maxDimension + 1 }, PHOTO_IMAGE_POLICY)).toContain("resolución");
  });

  it("preserves aspect ratio when limiting the longest side", () => {
    expect(longestSideResize(3000, 2000, 1280)).toEqual([{ resize: { width: 1280 } }]);
    expect(longestSideResize(800, 1200, 1600)).toEqual([]);
  });
});

