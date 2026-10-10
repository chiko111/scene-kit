package io.github.chiko111.scenekit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Standalone runner for the example. In your backend you only copy the package contents. */
@SpringBootApplication
@ConfigurationPropertiesScan
public class SceneKitApplication {

  public static void main(String[] args) {
    SpringApplication.run(SceneKitApplication.class, args);
  }
}
