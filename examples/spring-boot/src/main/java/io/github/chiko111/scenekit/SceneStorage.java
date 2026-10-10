package io.github.chiko111.scenekit;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Where scenes and images live. The example ships a filesystem implementation; swap in S3/R2/GCS
 * by implementing this interface as a @Component and removing FileSystemSceneStorage.
 */
public interface SceneStorage {

  record StoredFile(byte[] bytes, Instant lastModified) {}

  /** Saves the scene (atomically) and keeps a timestamped copy as history. */
  void saveScene(String id, byte[] json);

  Optional<StoredFile> readScene(String id);

  List<String> listSceneIds();

  /** Content-addressed: same bytes → same name, so asset URLs are immutable and cacheable forever. */
  String saveAsset(byte[] bytes, ImageType type);

  Optional<StoredFile> readAsset(String fileName);
}
