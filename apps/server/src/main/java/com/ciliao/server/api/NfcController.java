package com.ciliao.server.api;

import com.ciliao.server.api.Dto.OkEnvelope;
import com.ciliao.server.api.Dto.RecordNfcReadEventRequest;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.service.NfcReadEventService;
import com.ciliao.server.service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NfcController {
  private final ChatService chatService;
  private final NfcReadEventService nfcEvents;

  public NfcController(ChatService chatService, NfcReadEventService nfcEvents) {
    this.chatService = chatService;
    this.nfcEvents = nfcEvents;
  }

  @PostMapping("/nfc/read-events")
  OkEnvelope recordReadEvent(HttpServletRequest request, @RequestBody RecordNfcReadEventRequest body) {
    UserEntity user = ApiSupport.requireAuth(request, chatService);
    nfcEvents.record(user.getId(), body);
    return new OkEnvelope(true);
  }
}
