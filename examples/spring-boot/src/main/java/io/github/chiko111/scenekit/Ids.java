package io.github.chiko111.scenekit;

import java.util.regex.Pattern;

/** Path-safe identifiers. Anything else is rejected before it can touch the filesystem. */
final class Ids {

  /** Same rule as the scene schema id. */
  private static final Pattern SCENE_ID = Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
  private static final Pattern ASSET_NAME = Pattern.compile("^[a-f0-9]{64}\\.(webp|png|jpg|gif)$");

  private Ids() {}

  static boolean isSceneId(String id) {
    return id != null && SCENE_ID.matcher(id).matches();
  }

  static boolean isAssetName(String name) {
    return name != null && ASSET_NAME.matcher(name).matches();
  }

  static void requireSceneId(String id) {
    if (!isSceneId(id)) throw new BadRequestException("Invalid scene id");
  }

  static void requireAssetName(String name) {
    if (!isAssetName(name)) throw new BadRequestException("Invalid asset name");
  }
}
