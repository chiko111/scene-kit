package io.github.chiko111.scenekit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
class SceneApiTest {

  @TempDir static Path storage;

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry registry) {
    registry.add("scene-kit.storage-dir", () -> storage.toString());
    registry.add("scene-kit.public-base-url", () -> "https://cdn.example.com/public/");
  }

  @Autowired WebApplicationContext context;
  MockMvc mvc;

  @BeforeEach
  void setUp() {
    mvc = MockMvcBuilders.webAppContextSetup(context).build();
  }

  static byte[] fixture(String name) throws IOException {
    try (var in = SceneApiTest.class.getResourceAsStream("/fixtures/" + name + ".json")) {
      return in.readAllBytes();
    }
  }

  /** Minimal bytes that pass the WebP signature check. */
  static byte[] fakeWebp() {
    byte[] b = new byte[64];
    System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, b, 0, 4);
    System.arraycopy("WEBPVP8 ".getBytes(StandardCharsets.US_ASCII), 0, b, 8, 8);
    return b;
  }

  // ───────────── upload ─────────────

  @Test
  void uploadReturnsContentAddressedHttpsUrl() throws Exception {
    MvcResult result = mvc.perform(multipart("/api/scene-assets")
            .file(new MockMultipartFile("file", "coin.webp", "image/webp", fakeWebp())))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.matchesPattern(
            "^https://cdn\\.example\\.com/public/scene-assets/[a-f0-9]{64}\\.webp$")))
        .andReturn();

    String url = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), "$.url");
    String name = url.substring(url.lastIndexOf('/') + 1);

    mvc.perform(get("/public/scene-assets/" + name))
        .andExpect(status().isOk())
        .andExpect(content().contentType("image/webp"))
        .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("immutable")))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"));
  }

  @Test
  void uploadRejectsNonImagesEvenWithImageContentType() throws Exception {
    byte[] html = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
    mvc.perform(multipart("/api/scene-assets").file(new MockMultipartFile("file", "x.webp", "image/webp", html)))
        .andExpect(status().isUnsupportedMediaType())
        .andExpect(jsonPath("$.error").exists());
  }

  @Test
  void uploadWithoutFileIs400() throws Exception {
    mvc.perform(multipart("/api/scene-assets")).andExpect(status().isBadRequest());
  }

  // ───────────── save / load ─────────────

  @Test
  void saveThenServeToApps() throws Exception {
    byte[] scene = fixture("valid-full");

    mvc.perform(put("/api/scenes/promo_welcome").contentType(MediaType.APPLICATION_JSON).content(scene))
        .andExpect(status().isNoContent());

    // back office reload
    mvc.perform(get("/api/scenes/promo_welcome"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id").value("promo_welcome"))
        .andExpect(jsonPath("$.nodes.length()").value(7));

    // app fetch with caching
    MvcResult first = mvc.perform(get("/public/scenes/promo_welcome"))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON))
        .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("max-age=60")))
        .andExpect(header().exists("ETag"))
        .andReturn();

    String etag = first.getResponse().getHeader("ETag");
    mvc.perform(get("/public/scenes/promo_welcome").header("If-None-Match", etag))
        .andExpect(status().isNotModified());
    mvc.perform(get("/public/scenes/promo_welcome").header("If-None-Match", "W/" + etag))
        .andExpect(status().isNotModified());

    // history copy kept for audit / rollback
    try (var history = Files.list(storage.resolve("scenes/_history/promo_welcome"))) {
      assertThat(history.count()).isGreaterThanOrEqualTo(1);
    }
    mvc.perform(get("/api/scenes")).andExpect(jsonPath("$[0]").value("promo_welcome"));
  }

  @Test
  void invalidSceneIs422WithDetails() throws Exception {
    mvc.perform(put("/api/scenes/promo_welcome").contentType(MediaType.APPLICATION_JSON)
            .content(fixture("invalid-http-image")))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.error").exists())
        .andExpect(jsonPath("$.details").isArray());
  }

  @Test
  void idMustMatchUrl() throws Exception {
    mvc.perform(put("/api/scenes/other_id").contentType(MediaType.APPLICATION_JSON).content(fixture("valid-full")))
        .andExpect(status().isBadRequest());
  }

  @Test
  void pathTraversalIsRejected() throws Exception {
    mvc.perform(get("/public/scenes/..%2F..%2Fetc%2Fpasswd")).andExpect(status().is4xxClientError());
    mvc.perform(get("/public/scenes/a.b")).andExpect(status().isBadRequest());
    mvc.perform(get("/public/scene-assets/..%2Fscenes%2Fx.json")).andExpect(status().is4xxClientError());
    mvc.perform(get("/public/scene-assets/notahash.webp")).andExpect(status().isBadRequest());
  }

  @Test
  void oversizedSceneIs413() throws Exception {
    byte[] huge = new byte[262_145];
    java.util.Arrays.fill(huge, (byte) ' ');
    mvc.perform(put("/api/scenes/big").contentType(MediaType.APPLICATION_JSON).content(huge))
        .andExpect(status().isPayloadTooLarge());
  }

  @Test
  void unknownSceneIs404() throws Exception {
    mvc.perform(get("/public/scenes/nope")).andExpect(status().isNotFound());
    mvc.perform(get("/api/scenes/nope")).andExpect(status().isNotFound());
  }
}
