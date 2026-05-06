package com.ciliao.server.api;

import com.ciliao.server.api.Dto.SendMessageRequest;
import com.ciliao.server.api.Dto.WsEnvelope;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.AppException;
import com.ciliao.server.service.ChatService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {
  private final ChatService service;
  private final RealtimeHub hub;
  private final ObjectMapper mapper;

  public ChatWebSocketHandler(ChatService service, RealtimeHub hub, ObjectMapper mapper) {
    this.service = service;
    this.hub = hub;
    this.mapper = mapper;
  }

  @Override
  public void afterConnectionEstablished(WebSocketSession session) {
    try {
      String token = tokenFrom(session.getUri());
      UserEntity user = service.authenticate(token);
      hub.register(user.getId(), session);
      hub.send(session, new WsEnvelope("ready", null, Map.of("userId", user.getId())));
    } catch (AppException error) {
      hub.send(session, new WsEnvelope("error", null, Map.of("error", error.getMessage(), "code", error.code())));
      closeQuietly(session, CloseStatus.NOT_ACCEPTABLE);
    }
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    JsonNode root = mapper.readTree(message.getPayload());
    String type = root.path("type").asText("");
    String requestId = root.path("requestId").asText(null);
    if (!"message:send".equals(type)) {
      hub.send(session, new WsEnvelope("ack", requestId, Map.of("ok", false, "error", "事件无效。", "code", "EVENT_INVALID")));
      return;
    }
    String senderId = (String) session.getAttributes().get("userId");
    if (senderId == null) {
      hub.send(session, new WsEnvelope("ack", requestId, Map.of("ok", false, "error", "请先登录。", "code", "AUTH_REQUIRED")));
      return;
    }
    SendMessageRequest body = mapper.treeToValue(root.path("payload"), SendMessageRequest.class);
    try {
      var chatMessage = service.addMessage(senderId, body.recipientId(), body.text());
      hub.sendMessage(chatMessage);
      hub.send(session, new WsEnvelope("ack", requestId, Map.of("ok", true, "message", chatMessage)));
    } catch (AppException error) {
      hub.send(session, new WsEnvelope("ack", requestId, Map.of("ok", false, "error", error.getMessage(), "code", error.code())));
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    hub.unregister(session);
  }

  private static String tokenFrom(URI uri) {
    if (uri == null) return "";
    return UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst("token");
  }

  private static void closeQuietly(WebSocketSession session, CloseStatus status) {
    try {
      session.close(status);
    } catch (Exception ignored) {
    }
  }
}
