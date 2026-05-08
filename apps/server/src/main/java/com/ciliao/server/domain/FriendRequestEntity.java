package com.ciliao.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
    name = "friend_requests",
    uniqueConstraints = @UniqueConstraint(columnNames = {"requester_id", "recipient_id"}))
public class FriendRequestEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "requester_id", nullable = false, length = 64)
  private String requesterId;

  @Column(name = "recipient_id", nullable = false, length = 64)
  private String recipientId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private FriendRequestStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "responded_at")
  private Instant respondedAt;

  public Long getId() {
    return id;
  }

  public String getRequesterId() {
    return requesterId;
  }

  public void setRequesterId(String requesterId) {
    this.requesterId = requesterId;
  }

  public String getRecipientId() {
    return recipientId;
  }

  public void setRecipientId(String recipientId) {
    this.recipientId = recipientId;
  }

  public FriendRequestStatus getStatus() {
    return status;
  }

  public void setStatus(FriendRequestStatus status) {
    this.status = status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getRespondedAt() {
    return respondedAt;
  }

  public void setRespondedAt(Instant respondedAt) {
    this.respondedAt = respondedAt;
  }
}
