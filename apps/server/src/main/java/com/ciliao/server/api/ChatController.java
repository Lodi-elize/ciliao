package com.ciliao.server.api;

import com.ciliao.server.api.Dto.AddContactRequest;
import com.ciliao.server.api.Dto.ContactsEnvelope;
import com.ciliao.server.api.Dto.CreateFriendRequestRequest;
import com.ciliao.server.api.Dto.FriendRequestEnvelope;
import com.ciliao.server.api.Dto.FriendRequestsEnvelope;
import com.ciliao.server.api.Dto.MessageEnvelope;
import com.ciliao.server.api.Dto.MessagesEnvelope;
import com.ciliao.server.api.Dto.SearchFriendRequest;
import com.ciliao.server.api.Dto.SendMessageRequest;
import com.ciliao.server.api.Dto.UserEnvelope;
import com.ciliao.server.api.Dto.UsersEnvelope;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {
  private final ChatService service;
  private final RealtimeHub realtimeHub;

  public ChatController(ChatService service, RealtimeHub realtimeHub) {
    this.service = service;
    this.realtimeHub = realtimeHub;
  }

  @GetMapping("/health")
  Map<String, Boolean> health() {
    return Map.of("ok", true);
  }

  @GetMapping("/")
  Map<String, String> root() {
    return Map.of("name", "次聊 API", "health", "/health", "users", "/users");
  }

  @GetMapping("/users")
  UsersEnvelope users() {
    return new UsersEnvelope(service.listUsers());
  }

  @GetMapping("/contacts")
  ContactsEnvelope contacts(HttpServletRequest request) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new ContactsEnvelope(service.listContacts(user.getId()));
  }

  @GetMapping("/users/{userId}/contacts")
  ContactsEnvelope userContacts(HttpServletRequest request, @PathVariable String userId) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    if (!user.getId().equals(userId)) {
      throw new com.ciliao.server.service.AppException("只能查看自己的通讯录。", 403, "FORBIDDEN_CONTACTS");
    }
    return new ContactsEnvelope(service.listContacts(user.getId()));
  }

  @GetMapping("/invites/{userId}")
  UserEnvelope invite(@PathVariable String userId) {
    return new UserEnvelope(service.getUser(userId));
  }

  @PostMapping("/friend-search")
  UserEnvelope searchFriend(HttpServletRequest request, @RequestBody SearchFriendRequest body) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new UserEnvelope(service.findUserForFriendSearch(user.getId(), body.query()));
  }

  @GetMapping("/friend-requests/incoming")
  FriendRequestsEnvelope incomingFriendRequests(HttpServletRequest request) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new FriendRequestsEnvelope(service.listIncomingFriendRequests(user.getId()));
  }

  @PostMapping("/friend-requests")
  FriendRequestEnvelope createFriendRequest(
      HttpServletRequest request, @RequestBody CreateFriendRequestRequest body) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new FriendRequestEnvelope(service.createFriendRequest(user.getId(), body.userId()));
  }

  @PostMapping("/friend-requests/{requestId}/accept")
  ContactsEnvelope acceptFriendRequest(HttpServletRequest request, @PathVariable Long requestId) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    var accepted = service.acceptFriendRequest(user.getId(), requestId);
    ContactsEnvelope result = new ContactsEnvelope(service.listContacts(user.getId()));
    realtimeHub.sendContactsUpdated(user.getId(), result.contacts());
    realtimeHub.sendContactsUpdated(accepted.requester().id(), service.listContacts(accepted.requester().id()));
    return result;
  }

  @PostMapping("/friend-requests/{requestId}/reject")
  FriendRequestEnvelope rejectFriendRequest(HttpServletRequest request, @PathVariable Long requestId) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new FriendRequestEnvelope(service.rejectFriendRequest(user.getId(), requestId));
  }

  @PostMapping("/contacts")
  ContactsEnvelope addContact(HttpServletRequest request, @RequestBody AddContactRequest body) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    ContactsEnvelope result = new ContactsEnvelope(service.addContact(user.getId(), body.friendId()));
    realtimeHub.sendContactsUpdated(user.getId(), result.contacts());
    realtimeHub.sendContactsUpdated(body.friendId(), service.listContacts(body.friendId()));
    return result;
  }

  @GetMapping("/messages/{contactId}")
  MessagesEnvelope messages(HttpServletRequest request, @PathVariable String contactId) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    return new MessagesEnvelope(service.listMessages(user.getId(), contactId));
  }

  @GetMapping("/messages/{userA}/{userB}")
  MessagesEnvelope messagesPair(HttpServletRequest request, @PathVariable String userA, @PathVariable String userB) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    if (!userA.equals(user.getId()) && !userB.equals(user.getId())) {
      throw new com.ciliao.server.service.AppException("只能查看自己的聊天记录。", 403, "FORBIDDEN_MESSAGES");
    }
    String contactId = userA.equals(user.getId()) ? userB : userA;
    return new MessagesEnvelope(service.listMessages(user.getId(), contactId));
  }

  @PostMapping("/messages")
  MessageEnvelope sendMessage(HttpServletRequest request, @RequestBody SendMessageRequest body) {
    UserEntity user = ApiSupport.requireAuth(request, service);
    var message = service.addMessage(user.getId(), body.recipientId(), body.text());
    realtimeHub.sendMessage(message);
    return new MessageEnvelope(message);
  }
}
