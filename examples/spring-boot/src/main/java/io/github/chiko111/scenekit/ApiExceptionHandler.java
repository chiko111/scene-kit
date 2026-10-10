package io.github.chiko111.scenekit;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Every error is {"error": "...", "details": [...]} — SceneEditor shows `error` to the user.
 * Scoped to this package so it doesn't change error handling elsewhere in your app.
 */
@RestControllerAdvice(basePackageClasses = ApiExceptionHandler.class)
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(SceneValidationException.class)
  ResponseEntity<Map<String, Object>> invalidScene(SceneValidationException e) {
    return body(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(), e.errors());
  }

  @ExceptionHandler(BadRequestException.class)
  ResponseEntity<Map<String, Object>> badRequest(BadRequestException e) {
    return body(HttpStatus.BAD_REQUEST, e.getMessage(), List.of());
  }

  @ExceptionHandler(MissingServletRequestPartException.class)
  ResponseEntity<Map<String, Object>> missingFile(MissingServletRequestPartException e) {
    return body(HttpStatus.BAD_REQUEST, "Missing file", List.of());
  }

  @ExceptionHandler({BackofficeSceneController.PayloadTooLargeException.class, MaxUploadSizeExceededException.class})
  ResponseEntity<Map<String, Object>> tooLarge(Exception e) {
    String message = e instanceof BackofficeSceneController.PayloadTooLargeException ? e.getMessage() : "File is too large";
    return body(HttpStatus.PAYLOAD_TOO_LARGE, message, List.of());
  }

  @ExceptionHandler(BackofficeSceneController.UnsupportedImageException.class)
  ResponseEntity<Map<String, Object>> unsupported(BackofficeSceneController.UnsupportedImageException e) {
    return body(HttpStatus.UNSUPPORTED_MEDIA_TYPE, e.getMessage(), List.of());
  }

  @ExceptionHandler(java.io.UncheckedIOException.class)
  ResponseEntity<Map<String, Object>> storageFailure(java.io.UncheckedIOException e) {
    log.error("scene-kit storage failure", e);
    return body(HttpStatus.INTERNAL_SERVER_ERROR, "Storage error", List.of());
  }

  private static ResponseEntity<Map<String, Object>> body(HttpStatus status, String error, List<String> details) {
    return ResponseEntity.status(status).body(Map.of("error", error, "details", details));
  }
}
