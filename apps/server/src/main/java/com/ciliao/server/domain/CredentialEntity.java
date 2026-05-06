package com.ciliao.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "credentials")
public class CredentialEntity {
  @Id
  @Column(name = "user_id", length = 64)
  private String userId;

  @Column(name = "password_hash", nullable = false)
  private String passwordHash;

  @Column(name = "password_updated_at", nullable = false)
  private Instant passwordUpdatedAt;

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public Instant getPasswordUpdatedAt() {
    return passwordUpdatedAt;
  }

  public void setPasswordUpdatedAt(Instant passwordUpdatedAt) {
    this.passwordUpdatedAt = passwordUpdatedAt;
  }
}
