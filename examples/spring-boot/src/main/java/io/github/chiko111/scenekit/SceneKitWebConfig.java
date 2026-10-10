package io.github.chiko111.scenekit;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS:
 *  - /public/** readable from anywhere (web app on another domain, Expo web, etc.). RN apps don't need CORS.
 *  - /api/** only from the back-office origins you configure (credentials allowed for cookie sessions).
 * If you use Spring Security, also enable `http.cors(Customizer.withDefaults())`.
 */
@Configuration
public class SceneKitWebConfig implements WebMvcConfigurer {

  private final SceneKitProperties props;

  public SceneKitWebConfig(SceneKitProperties props) {
    this.props = props;
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/public/**").allowedOrigins("*").allowedMethods("GET", "HEAD").maxAge(3600);

    if (!props.backofficeOrigins().isEmpty()) {
      registry
          .addMapping("/api/**")
          .allowedOrigins(props.backofficeOrigins().toArray(String[]::new))
          .allowedMethods("GET", "POST", "PUT")
          .allowCredentials(true)
          .maxAge(3600);
    }
  }
}
