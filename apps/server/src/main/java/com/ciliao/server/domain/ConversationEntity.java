package com.ciliao.server.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "conversations")
public class ConversationEntity {
  @Id
  private String id;

  @Column(name = "user_a_id")
  private String userAId;
  @Column(name = "user_b_id")
  private String userBId;
  @Column(name = "created_at")
  private Instant createdAt;
  @Column(name = "updated_at")
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getUserAId() {
    return userAId;
  }

  public void setUserAId(String userAId) {
    this.userAId = userAId;
  }

  public String getUserBId() {
    return userBId;
  }

  public void setUserBId(String userBId) {
    this.userBId = userBId;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(Instant createdAt) {
    this.createdAt = createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
  }
}
