package io.github.chiko111.scenekit;

import java.nio.file.Path;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * @param storageDir        where scenes and uploaded images are stored (served by this app or nginx/CDN)
 * @param publicBaseUrl     base URL the apps use, e.g. https://api.example.com/public or https://cdn.example.com
 *                          (asset URLs returned by the upload endpoint start with it; must be https in production)
 * @param maxUploadBytes    image upload limit
 * @param maxSceneBytes     scene JSON size limit
 * @param publicCacheSeconds Cache-Control max-age for scene JSON served to the apps
 * @param backofficeOrigins CORS origins allowed to call /api/** (empty = same origin only)
 */
@ConfigurationProperties(prefix = "scene-kit")
public record SceneKitProperties(
    @DefaultValue("./scene-kit-data") Path storageDir,
    @DefaultValue("http://localhost:8080/public") String publicBaseUrl,
    @DefaultValue("2097152") long maxUploadBytes,
    @DefaultValue("262144") int maxSceneBytes,
    @DefaultValue("60") int publicCacheSeconds,
    @DefaultValue List<String> backofficeOrigins) {

  public String publicBaseUrlNoSlash() {
    return publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
  }
}
