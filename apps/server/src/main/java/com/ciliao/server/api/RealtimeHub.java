package com.ciliao.server.api;

import com.ciliao.server.api.Dto.ChatMessage;
import com.ciliao.server.api.Dto.UserProfile;
import com.ciliao.server.api.Dto.WsEnvelope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

@Component
public class RealtimeHub {
  private final ObjectMapper mapper;
  private final Map<String, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

  public RealtimeHub(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  public void register(String userId, WebSocketSession session) {
    session.getAttributes().put("userId", userId);
    sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
  }

  public void unregister(WebSocketSession session) {
    Object userId = session.getAttributes().get("userId");
    if (!(userId instanceof String id)) return;
    Set<WebSocketSession> sessions = sessionsByUser.get(id);
    if (sessions == null) return;
    sessions.remove(session);
    if (sessions.isEmpty()) {
      sessionsByUser.remove(id);
    }
  }

  public void sendMessage(ChatMessage message) {
    broadcast(message.senderId(), new WsEnvelope("message:new", null, message));
    broadcast(message.recipientId(), new WsEnvelope("message:new", null, message));
  }

  public void sendContactsUpdated(String userId, List<UserProfile> contacts) {
    broadcast(userId, new WsEnvelope("contacts:updated", null, Map.of("contacts", contacts)));
  }

  public void send(WebSocketSession session, WsEnvelope envelope) {
    if (!session.isOpen()) return;
    try {
      session.sendMessage(new TextMessage(mapper.writeValueAsString(envelope)));
    } catch (IOException ignored) {
      unregister(session);
    }
  }

  private void broadcast(String userId, WsEnvelope envelope) {
    Set<WebSocketSession> sessions = sessionsByUser.get(userId);
    if (sessions == null) return;
    for (WebSocketSession session : sessions) {
      send(session, envelope);
    }
  }
}
