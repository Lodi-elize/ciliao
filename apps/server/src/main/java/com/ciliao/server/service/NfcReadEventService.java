package com.ciliao.server.service;

import com.ciliao.server.api.Dto.RecordNfcReadEventRequest;
import com.ciliao.server.domain.NfcReadEventEntity;
import com.ciliao.server.repo.NfcReadEventRepository;
import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class NfcReadEventService {
  private final NfcReadEventRepository events;

  public NfcReadEventService(NfcReadEventRepository events) {
    this.events = events;
  }

  @Transactional
  public void record(String userId, RecordNfcReadEventRequest request) {
    if (request == null) {
      throw new AppException("NFC 读取事件不能为空。", 400, "NFC_EVENT_REQUIRED");
    }
    String status = normalizeStatus(request.status());
    NfcReadEventEntity event = new NfcReadEventEntity();
    event.setUserId(userId);
    event.setStatus(status);
    event.setRawPayload(limit(request.rawPayload(), 2000));
    event.setParsedUserId(limit(request.parsedUserId(), 64));
    event.setPayloadType(limit(request.payloadType(), 32));
    event.setErrorCode(limit(request.errorCode(), 64));
    event.setErrorMessage(limit(request.errorMessage(), 255));
    event.setCreatedAt(Instant.now());
    events.save(event);
  }

  private static String normalizeStatus(String status) {
    String value = status == null ? "" : status.trim().toUpperCase();
    if (!value.equals("SUCCESS") && !value.equals("FAILURE")) {
      throw new AppException("NFC 读取事件状态无效。", 400, "NFC_EVENT_STATUS_INVALID");
    }
    return value;
  }

  private static String limit(String value, int maxLength) {
    if (value == null) return null;
    String trimmed = value.trim();
    if (trimmed.isEmpty()) return null;
    return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
  }
}
