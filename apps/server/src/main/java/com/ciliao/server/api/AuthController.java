package com.ciliao.server.api;

import com.ciliao.server.api.Dto.AuthResult;
import com.ciliao.server.api.Dto.ChangePasswordRequest;
import com.ciliao.server.api.Dto.LoginRequest;
import com.ciliao.server.api.Dto.MockSmsResult;
import com.ciliao.server.api.Dto.OkEnvelope;
import com.ciliao.server.api.Dto.RegisterPhoneRequest;
import com.ciliao.server.api.Dto.RegisterUsernameRequest;
import com.ciliao.server.api.Dto.UpdateProfileRequest;
import com.ciliao.server.api.Dto.UserEnvelope;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.ChatService;
import com.ciliao.server.service.Mapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
  private final ChatService service;

  public AuthController(ChatService service) {
    this.service = service;
  }

  @PostMapping("/register/username")
  AuthResult registerUsername(@RequestBody RegisterUsernameRequest request) {
    return service.registerUsername(request.username(), request.password(), request.displayName());
  }

  @PostMapping("/mock-sms/request")
  MockSmsResult requestMockSms(@RequestBody Dto.RequestMockSmsRequest request) {
    return service.requestMockSms(request.phone(), request.purpose());
  }

  @PostMapping("/register/phone")
  AuthResult registerPhone(@RequestBody RegisterPhoneRequest request) {
    return service.registerPhone(request.phone(), request.code(), request.password(), request.displayName());
  }

  @PostMapping("/login")
  AuthResult login(@RequestBody LoginRequest request) {
    return service.login(request.identifier(), request.password());
  }

  @GetMapping("/me")
  UserEnvelope me(HttpServletRequest request) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new UserEnvelope(Mapper.toProfile(user));
  }

  @PostMapping("/logout")
  OkEnvelope logout(HttpServletRequest request) {
    service.logout(ApiSupport.requireToken(request));
    return new OkEnvelope(true);
  }

  @PostMapping("/change-password")
  OkEnvelope changePassword(HttpServletRequest httpRequest, @RequestBody ChangePasswordRequest request) {
    UserEntity user = ApiSupport.requireAuth(httpRequest, service);
    service.changePassword(user.getId(), request.oldPassword(), request.newPassword());
    return new OkEnvelope(true);
  }

  @PatchMapping("/profile")
  UserEnvelope updateProfile(HttpServletRequest httpRequest, @RequestBody UpdateProfileRequest request) {
    UserEntity user = ApiSupport.requireAuth(httpRequest, service);
    return new UserEnvelope(service.updateProfile(user.getId(), request.displayName(), request.signature()));
  }
}
