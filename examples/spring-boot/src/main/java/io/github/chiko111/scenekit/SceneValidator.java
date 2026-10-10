package io.github.chiko111.scenekit;

import com.networknt.schema.Error;
import com.networknt.schema.InputFormat;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Strict scene validation before saving — same rules as validateScene() in @chiko111/scene-kit-core:
 *  1. scene.schema.json (generated from the zod schema the apps use)
 *  2. checks JSON Schema cannot express: unique node ids, one effect per type, ≤ 10 navigate params
 *
 * Duplicate JSON keys are rejected too. Thread-safe; build once, reuse.
 */
@Component
public class SceneValidator {

  public static final String SCHEMA_RESOURCE = "/scene-kit/scene.schema.json";
  private static final int MAX_ERRORS = 20;

  private final JsonMapper mapper =
      JsonMapper.builder().enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build();
  private final Schema schema;
  private final JsonNode schemaNode;

  public SceneValidator() {
    try (InputStream in = SceneValidator.class.getResourceAsStream(SCHEMA_RESOURCE)) {
      if (in == null) throw new IllegalStateException("Missing classpath resource " + SCHEMA_RESOURCE);
      this.schemaNode = mapper.readTree(in);
      this.schema = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12)
          .getSchema(mapper.writeValueAsString(schemaNode), InputFormat.JSON);
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }

  /** Validated scene: its id and the canonical (re-serialized) JSON to store. */
  public record ValidScene(String id, byte[] json) {}

  public ValidScene validate(byte[] body) {
    JsonNode root;
    try {
      root = mapper.readTree(body);
    } catch (JacksonException e) {
      throw new SceneValidationException(List.of("Invalid JSON: " + e.getOriginalMessage()));
    }
    if (root == null || !root.isObject()) {
      throw new SceneValidationException(List.of("Scene must be a JSON object"));
    }

    List<Error> raw = schema.validate(root);
    // A node/effect/action is a union (oneOf by "type"). The validator reports every branch it tried;
    // keep only the errors of the branch the data actually declares, so the first message is useful.
    List<Error> relevant = raw.stream().filter(e -> !fromOtherBranch(e, root)).toList();
    List<String> errors = (relevant.isEmpty() ? raw : relevant).stream()
        .sorted(Comparator.comparingInt(SceneValidator::specificity)
            // among equals, the deepest location is the most precise
            .thenComparing(e -> -e.getInstanceLocation().toString().length()))
        .limit(MAX_ERRORS)
        .map(error -> describe(error, root))
        .collect(Collectors.toCollection(ArrayList::new));
    if (errors.isEmpty()) errors.addAll(semanticErrors(root));
    if (!errors.isEmpty()) throw new SceneValidationException(errors);

    return new ValidScene(root.get("id").asString(), mapper.writeValueAsBytes(root));
  }

  /**
   * Walks the evaluation path (/properties/nodes/items/oneOf/2/required) alongside the instance path
   * (/nodes/3). At each oneOf/anyOf branch it compares the branch's "type" const (or null-ness) with
   * the data; a mismatch means the error comes from a branch the data never claimed to be.
   */
  private boolean fromOtherBranch(Error error, JsonNode root) {
    String[] eval = segments(error.getEvaluationPath().toString());
    String[] inst = segments(error.getInstanceLocation().toString());
    JsonNode schemaAt = schemaNode;
    JsonNode dataAt = root;
    int instIndex = 0;

    for (int i = 0; i < eval.length && schemaAt != null; i++) {
      switch (eval[i]) {
        case "properties" -> {
          if (i + 1 >= eval.length) return false;
          String name = eval[++i];
          schemaAt = schemaAt.path("properties").path(name);
          dataAt = dataAt == null ? null : dataAt.get(name);
          instIndex++;
        }
        case "items" -> {
          schemaAt = schemaAt.path("items");
          if (instIndex >= inst.length || dataAt == null) return false;
          dataAt = dataAt.get(Integer.parseInt(inst[instIndex++]));
        }
        case "oneOf", "anyOf" -> {
          if (i + 1 >= eval.length) return false; // the summary error itself
          JsonNode branch = schemaAt.path(eval[i]).path(Integer.parseInt(eval[++i]));
          if (isOtherBranch(branch, dataAt)) return true;
          schemaAt = branch;
        }
        default -> {
          return false;
        }
      }
    }
    return false;
  }

  private static boolean isOtherBranch(JsonNode branch, JsonNode data) {
    boolean dataIsNull = data == null || data.isNull();
    boolean branchIsNull = "null".equals(branch.path("type").asString(""));
    if (branchIsNull != dataIsNull) return true;
    JsonNode expectedType = branch.path("properties").path("type").path("const");
    if (!expectedType.isMissingNode() && data != null && data.isObject()) {
      return !expectedType.equals(data.get("type"));
    }
    return false;
  }

  private static String[] segments(String path) {
    String trimmed = path.startsWith("/") ? path.substring(1) : path;
    return trimmed.isEmpty() ? new String[0] : trimmed.split("/");
  }

  /** Turns "must be valid to one and only one schema" on an unknown "type" into a readable message. */
  private String describe(Error error, JsonNode root) {
    String location = error.getInstanceLocation().toString();
    if ("oneOf".equals(error.getKeyword())) {
      JsonNode data = root.at(location);
      JsonNode branches = schemaNode.at(error.getEvaluationPath().toString());
      if (data.isObject() && data.has("type") && branches.isArray()) {
        List<String> allowed = new ArrayList<>();
        branches.forEach(b -> {
          JsonNode c = b.path("properties").path("type").path("const");
          if (c.isString()) allowed.add(c.asString());
        });
        String actual = data.get("type").asString("");
        if (!allowed.isEmpty() && !allowed.contains(actual)) {
          return location + "/type: unknown type \"" + actual + "\" (allowed: " + String.join(", ", allowed) + ")";
        }
      }
    }
    return (location.isEmpty() ? "/" : location) + ": " + error.getMessage();
  }

  private static int specificity(Error error) {
    String keyword = error.getKeyword();
    if ("oneOf".equals(keyword) || "anyOf".equals(keyword)) return 2;
    if ("const".equals(keyword) || "type".equals(keyword)) return 1;
    return 0;
  }

  /** Only called after the schema passed, so the structure is known to be correct. */
  private static List<String> semanticErrors(JsonNode root) {
    List<String> errors = new ArrayList<>();
    Set<String> ids = new HashSet<>();
    JsonNode nodes = root.get("nodes");

    for (int i = 0; i < nodes.size(); i++) {
      JsonNode node = nodes.get(i);
      String id = node.get("id").asString();
      if (!ids.add(id)) errors.add("/nodes/" + i + "/id: duplicate id \"" + id + "\"");

      Set<String> effectTypes = new HashSet<>();
      JsonNode effects = node.get("effects");
      for (int j = 0; j < effects.size(); j++) {
        String type = effects.get(j).get("type").asString();
        if (!effectTypes.add(type)) {
          errors.add("/nodes/" + i + "/effects/" + j + ": duplicate \"" + type + "\" effect");
        }
      }

      JsonNode params = node.path("action").path("params");
      if (params.isObject() && params.size() > 10) {
        errors.add("/nodes/" + i + "/action/params: max 10 params");
      }
    }
    return errors;
  }
}
