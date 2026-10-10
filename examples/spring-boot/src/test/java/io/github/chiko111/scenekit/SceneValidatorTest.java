package io.github.chiko111.scenekit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/** Same fixtures as the JS tests in @chiko111/scene-kit-core → Java and JS accept/reject identically. */
class SceneValidatorTest {

  private final SceneValidator validator = new SceneValidator();

  static Stream<Path> fixtures() throws IOException, URISyntaxException {
    Path dir = Path.of(SceneValidatorTest.class.getResource("/fixtures").toURI());
    return Files.list(dir).filter(p -> p.toString().endsWith(".json")).sorted();
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("fixtures")
  void conformance(Path fixture) throws IOException {
    byte[] json = Files.readAllBytes(fixture);
    String name = fixture.getFileName().toString();

    if (name.startsWith("valid-")) {
      SceneValidator.ValidScene scene = validator.validate(json);
      assertThat(scene.id()).isNotBlank();
    } else {
      assertThatThrownBy(() -> validator.validate(json))
          .as(name)
          .isInstanceOf(SceneValidationException.class);
    }
  }

  @Test
  void rejectsDuplicateKeys() {
    String json = "{\"version\":1,\"version\":1,\"id\":\"a\",\"name\":\"\",\"aspectRatio\":1,\"background\":null,\"nodes\":[]}";
    assertThatThrownBy(() -> validator.validate(json.getBytes(StandardCharsets.UTF_8)))
        .isInstanceOf(SceneValidationException.class)
        .hasMessageContaining("Invalid JSON");
  }

  @Test
  void rejectsGarbageAndNonObjects() {
    for (String body : new String[] {"", "{nope", "[]", "42", "null"}) {
      assertThatThrownBy(() -> validator.validate(body.getBytes(StandardCharsets.UTF_8)))
          .as(body)
          .isInstanceOf(SceneValidationException.class);
    }
  }

  @Test
  void errorsPointToTheProblem() {
    String json = "{\"version\":1,\"id\":\"a\",\"name\":\"\",\"aspectRatio\":99,\"background\":null,\"nodes\":[]}";
    assertThatThrownBy(() -> validator.validate(json.getBytes(StandardCharsets.UTF_8)))
        .isInstanceOfSatisfying(SceneValidationException.class,
            e -> assertThat(String.join(" ", e.errors())).contains("aspectRatio"));
  }

  @Test
  void firstErrorIsTheSpecificOne() throws IOException {
    byte[] json;
    try (var in = SceneValidatorTest.class.getResourceAsStream("/fixtures/invalid-hex-color.json")) {
      json = in.readAllBytes();
    }
    assertThatThrownBy(() -> validator.validate(json))
        .isInstanceOfSatisfying(SceneValidationException.class,
            e -> assertThat(e.getMessage()).contains("/nodes/3/fill"));
  }
}
