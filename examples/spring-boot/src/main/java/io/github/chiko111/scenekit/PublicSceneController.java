package io.github.chiko111.scenekit;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the apps (React Native / web) call. Public, read-only, cache-friendly.
 * If you put a CDN or nginx in front of scene-kit.storage-dir, you can drop this controller.
 */
@RestController
@RequestMapping("/public")
public class PublicSceneController {

  private final SceneStorage storage;
  private final SceneKitProperties props;

  public PublicSceneController(SceneStorage storage, SceneKitProperties props) {
    this.storage = storage;
    this.props = props;
  }

  /** GET /public/scenes/{id} → scene JSON. Short cache + ETag, so edits show up within a minute. */
  @GetMapping("/scenes/{id}")
  public ResponseEntity<byte[]> getScene(
      @PathVariable String id, @RequestHeader(value = "If-None-Match", required = false) String ifNoneMatch) {
    return storage.readScene(id)
        .map(file -> {
          String etag = "\"" + FileSystemSceneStorage.sha256(file.bytes()).substring(0, 32) + "\"";
          CacheControl cache = CacheControl.maxAge(Duration.ofSeconds(props.publicCacheSeconds())).cachePublic();
          if (matches(ifNoneMatch, etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).cacheControl(cache).<byte[]>build();
          }
          return ResponseEntity.ok()
              .eTag(etag)
              .cacheControl(cache)
              .lastModified(file.lastModified())
              .contentType(MediaType.APPLICATION_JSON)
              .body(file.bytes());
        })
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** GET /public/scene-assets/{sha256}.{ext} → image. Content-addressed, so cached forever. */
  @GetMapping("/scene-assets/{name:.+}")
  public ResponseEntity<byte[]> getAsset(@PathVariable String name) {
    Ids.requireAssetName(name);
    ImageType type = ImageType.fromExtension(name.substring(name.lastIndexOf('.') + 1)).orElseThrow();
    return storage.readAsset(name)
        .map(file -> ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
            .contentType(MediaType.parseMediaType(type.contentType))
            .header("X-Content-Type-Options", "nosniff")
            .body(file.bytes()))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** If-None-Match may be a list and may use weak validators (W/"…"). */
  static boolean matches(String ifNoneMatch, String etag) {
    if (ifNoneMatch == null) return false;
    for (String candidate : ifNoneMatch.split(",")) {
      String value = candidate.trim();
      if (value.startsWith("W/")) value = value.substring(2);
      if (value.equals("*") || value.equals(etag)) return true;
    }
    return false;
  }
}
