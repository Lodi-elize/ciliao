package com.ciliao.server.repo;

import com.ciliao.server.domain.SessionEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<SessionEntity, String> {
  Optional<SessionEntity> findByTokenAndRevokedAtIsNull(String token);
}
