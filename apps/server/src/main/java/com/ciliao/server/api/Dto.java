package com.ciliao.server.api;

import java.time.Instant;
import java.util.List;

public final class Dto {
  private Dto() {}

  public record UserProfile(
      String id,
      String username,
      String phone,
      boolean phoneVerified,
      String displayName,
      String avatar,
      String avatarUrl,
      String signature,
      Instant createdAt,
      Instant updatedAt) {}

  public record ChatMessage(
      String id,
      String conversationId,
      String senderId,
      String recipientId,
      String text,
      Instant createdAt) {}

  public record AuthResult(String token, UserProfile user) {}

  public record UserEnvelope(UserProfile user) {}

  public record UsersEnvelope(List<UserProfile> users) {}

  public record ContactsEnvelope(List<UserProfile> contacts) {}

  public record MessagesEnvelope(List<ChatMessage> messages) {}

  public record MessageEnvelope(ChatMessage message) {}

  public record OkEnvelope(boolean ok) {}

  public record ErrorEnvelope(String error, String code) {}

  public record MockSmsResult(String phone, String code, Instant expiresAt) {}

  public record RegisterUsernameRequest(String username, String password, String displayName) {}

  public record RequestMockSmsRequest(String phone, String purpose) {}

  public record RegisterPhoneRequest(String phone, String code, String password, String displayName) {}

  public record LoginRequest(String identifier, String password) {}

  public record ChangePasswordRequest(String oldPassword, String newPassword) {}

  public record AddContactRequest(String friendId) {}

  public record SendMessageRequest(String recipientId, String text) {}

  public record UpdateProfileRequest(String displayName, String signature) {}

  public record WsEnvelope(String type, String requestId, Object payload) {}
}
