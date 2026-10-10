package io.github.chiko111.scenekit;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Endpoints for the back-office editor (SceneEditor onUpload / onSave / loading a scene).
 *
 * ⚠️ Protect /api/** with your existing back-office security (see README) — these must never be public.
 */
@RestController
@RequestMapping("/api")
public class BackofficeSceneController {

  private final SceneStorage storage;
  private final SceneValidator validator;
  private final SceneKitProperties props;

  public BackofficeSceneController(SceneStorage storage, SceneValidator validator, SceneKitProperties props) {
    this.storage = storage;
    this.validator = validator;
    this.props = props;
  }

  /** SceneEditor onUpload → returns the public https URL of the image. */
  @PostMapping(path = "/scene-assets", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<Map<String, String>> uploadAsset(@RequestParam("file") MultipartFile file) throws IOException {
    if (file.isEmpty()) throw new BadRequestException("Empty file");
    if (file.getSize() > props.maxUploadBytes()) throw new PayloadTooLargeException("Image is too large");

    byte[] bytes = file.getBytes();
    ImageType type = ImageType.sniff(bytes).orElseThrow(UnsupportedImageException::new);
    String name = storage.saveAsset(bytes, type);

    String url = props.publicBaseUrlNoSlash() + "/scene-assets/" + name;
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
  }

  /** SceneEditor onSave → strict validation, then publish. */
  @PutMapping(path = "/scenes/{id}")
  public ResponseEntity<Void> saveScene(@PathVariable String id, InputStream body) throws IOException {
    Ids.requireSceneId(id);
    byte[] bytes = body.readNBytes(props.maxSceneBytes() + 1);
    if (bytes.length > props.maxSceneBytes()) throw new PayloadTooLargeException("Scene is too large");

    SceneValidator.ValidScene scene = validator.validate(bytes);
    if (!scene.id().equals(id)) throw new BadRequestException("Scene id does not match the URL");

    storage.saveScene(id, scene.json());
    return ResponseEntity.noContent().build();
  }

  /** Load an existing scene into the editor (initialScene). */
  @GetMapping(path = "/scenes/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<byte[]> getScene(@PathVariable String id) {
    return storage.readScene(id)
        .map(file -> ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(file.bytes()))
        .orElseGet(() -> ResponseEntity.notFound().build());
  }

  /** Scene picker in the back office. */
  @GetMapping("/scenes")
  public List<String> listScenes() {
    return storage.listSceneIds();
  }

  public static class PayloadTooLargeException extends RuntimeException {
    public PayloadTooLargeException(String message) {
      super(message);
    }
  }

  public static class UnsupportedImageException extends RuntimeException {
    public UnsupportedImageException() {
      super("Only WebP, PNG, JPEG or GIF images are allowed");
    }
  }
}
