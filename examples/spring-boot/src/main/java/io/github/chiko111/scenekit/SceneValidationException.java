package io.github.chiko111.scenekit;

import java.util.List;

public class SceneValidationException extends RuntimeException {

  private final List<String> errors;

  public SceneValidationException(List<String> errors) {
    super(errors.isEmpty() ? "Invalid scene" : errors.get(0));
    this.errors = List.copyOf(errors);
  }

  public List<String> errors() {
    return errors;
  }
}
