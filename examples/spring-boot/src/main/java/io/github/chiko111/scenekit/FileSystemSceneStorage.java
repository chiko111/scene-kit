package io.github.chiko111.scenekit;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

/**
 * Layout under scene-kit.storage-dir:
 *   scenes/{id}.json                      current version (what the apps read)
 *   scenes/_history/{id}/{epochMs}.json   every saved version (audit / rollback)
 *   assets/{sha256}.{ext}                 uploaded images
 * Point nginx/CDN at this folder or serve it through PublicSceneController.
 */
@Component
public class FileSystemSceneStorage implements SceneStorage {

  private final Path scenes;
  private final Path history;
  private final Path assets;

  public FileSystemSceneStorage(SceneKitProperties props) {
    Path root = props.storageDir().toAbsolutePath().normalize();
    this.scenes = root.resolve("scenes");
    this.history = scenes.resolve("_history");
    this.assets = root.resolve("assets");
    try {
      Files.createDirectories(history);
      Files.createDirectories(assets);
    } catch (IOException e) {
      throw new UncheckedIOException("Cannot create storage directories under " + root, e);
    }
  }

  @Override
  public void saveScene(String id, byte[] json) {
    Ids.requireSceneId(id);
    Path historyDir = history.resolve(id);
    try {
      Files.createDirectories(historyDir);
      writeAtomically(historyDir.resolve(System.currentTimeMillis() + ".json"), json);
      writeAtomically(scenes.resolve(id + ".json"), json);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public Optional<StoredFile> readScene(String id) {
    Ids.requireSceneId(id);
    return read(scenes.resolve(id + ".json"));
  }

  @Override
  public List<String> listSceneIds() {
    try (Stream<Path> files = Files.list(scenes)) {
      return files
          .map(p -> p.getFileName().toString())
          .filter(n -> n.endsWith(".json"))
          .map(n -> n.substring(0, n.length() - ".json".length()))
          .filter(Ids::isSceneId)
          .sorted()
          .toList();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  @Override
  public String saveAsset(byte[] bytes, ImageType type) {
    String name = sha256(bytes) + "." + type.extension;
    Path target = assets.resolve(name);
    try {
      if (!Files.exists(target)) writeAtomically(target, bytes);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
    return name;
  }

  @Override
  public Optional<StoredFile> readAsset(String fileName) {
    Ids.requireAssetName(fileName);
    return read(assets.resolve(fileName));
  }

  private static Optional<StoredFile> read(Path file) {
    try {
      return Optional.of(new StoredFile(Files.readAllBytes(file), Files.getLastModifiedTime(file).toInstant()));
    } catch (NoSuchFileException e) {
      return Optional.empty();
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** Readers never see a half-written file. */
  private static void writeAtomically(Path target, byte[] bytes) throws IOException {
    Path tmp = Files.createTempFile(target.getParent(), ".tmp-", ".part");
    try {
      Files.write(tmp, bytes);
      try {
        Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
      } catch (AtomicMoveNotSupportedException e) {
        Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING);
      }
    } finally {
      Files.deleteIfExists(tmp);
    }
  }

  static String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
