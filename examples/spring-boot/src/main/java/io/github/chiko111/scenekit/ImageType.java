package io.github.chiko111.scenekit;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

/** Allowed image types, detected from the file content (magic bytes), never from the name or Content-Type. */
public enum ImageType {
  WEBP("webp", "image/webp"),
  PNG("png", "image/png"),
  JPEG("jpg", "image/jpeg"),
  GIF("gif", "image/gif");

  public final String extension;
  public final String contentType;

  ImageType(String extension, String contentType) {
    this.extension = extension;
    this.contentType = contentType;
  }

  public static Optional<ImageType> sniff(byte[] b) {
    if (b == null || b.length < 12) return Optional.empty();
    if (ascii(b, 0, 4).equals("RIFF") && ascii(b, 8, 12).equals("WEBP")) return Optional.of(WEBP);
    if ((b[0] & 0xff) == 0x89 && ascii(b, 1, 4).equals("PNG")) return Optional.of(PNG);
    if ((b[0] & 0xff) == 0xff && (b[1] & 0xff) == 0xd8 && (b[2] & 0xff) == 0xff) return Optional.of(JPEG);
    if (ascii(b, 0, 6).equals("GIF87a") || ascii(b, 0, 6).equals("GIF89a")) return Optional.of(GIF);
    return Optional.empty();
  }

  public static Optional<ImageType> fromExtension(String ext) {
    return Arrays.stream(values()).filter(t -> t.extension.equals(ext)).findFirst();
  }

  private static String ascii(byte[] b, int from, int to) {
    return new String(b, from, to - from, StandardCharsets.US_ASCII);
  }
}
