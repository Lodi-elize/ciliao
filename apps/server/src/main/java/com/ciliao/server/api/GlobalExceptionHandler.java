package com.ciliao.server.api;

import com.ciliao.server.api.Dto.ErrorEnvelope;
import com.ciliao.server.service.AppException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(AppException.class)
  ResponseEntity<ErrorEnvelope> handleAppException(AppException error) {
    return ResponseEntity.status(error.status()).body(new ErrorEnvelope(error.getMessage(), error.code()));
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, IllegalArgumentException.class})
  ResponseEntity<ErrorEnvelope> handleValidation(Exception error) {
    return ResponseEntity.badRequest().body(new ErrorEnvelope("请求参数无效。", "VALIDATION_ERROR"));
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<ErrorEnvelope> handleUploadSize(MaxUploadSizeExceededException error) {
    return ResponseEntity.badRequest().body(new ErrorEnvelope("头像文件不能超过 2MB。", "AVATAR_TOO_LARGE"));
  }
}
