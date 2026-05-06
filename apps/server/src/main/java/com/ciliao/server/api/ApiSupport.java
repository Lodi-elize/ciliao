package com.ciliao.server.api;

import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.AppException;
import com.ciliao.server.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;

public final class ApiSupport {
  private ApiSupport() {}

  public static UserEntity requireAuth(HttpServletRequest request, ChatService service) {
    String header = request.getHeader("Authorization");
    if (header == null || !header.toLowerCase().startsWith("bearer ")) {
      throw new AppException("请先登录。", 401, "AUTH_REQUIRED");
    }
    return service.authenticate(header.substring(7).trim());
  }

  public static String requireToken(HttpServletRequest request) {
    String header = request.getHeader("Authorization");
    if (header == null || !header.toLowerCase().startsWith("bearer ")) {
      throw new AppException("请先登录。", 401, "AUTH_REQUIRED");
    }
    return header.substring(7).trim();
  }
}
