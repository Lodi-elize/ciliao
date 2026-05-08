package com.ciliao.server.service;

import com.ciliao.server.api.Dto.ChatMessage;
import com.ciliao.server.api.Dto.FriendRequest;
import com.ciliao.server.domain.FriendRequestEntity;
import com.ciliao.server.api.Dto.UserProfile;
import com.ciliao.server.domain.MessageEntity;
import com.ciliao.server.domain.UserEntity;

public final class Mapper {
  private Mapper() {}

  public static UserProfile toProfile(UserEntity user) {
    return new UserProfile(
        user.getId(),
        user.getUsername(),
        user.getPhone(),
        user.isPhoneVerified(),
        user.getDisplayName(),
        user.getAvatar(),
        user.getAvatarUrl(),
        user.getSignature(),
        user.getCreatedAt(),
        user.getUpdatedAt());
  }

  public static ChatMessage toMessage(MessageEntity message) {
    return new ChatMessage(
        message.getId(),
        message.getConversationId(),
        message.getSenderId(),
        message.getRecipientId(),
        message.getText(),
        message.getCreatedAt());
  }

  public static FriendRequest toFriendRequest(
      FriendRequestEntity request, UserEntity requester, UserEntity recipient) {
    return new FriendRequest(
        request.getId(),
        toProfile(requester),
        toProfile(recipient),
        request.getStatus().name(),
        request.getCreatedAt(),
        request.getRespondedAt());
  }
}
