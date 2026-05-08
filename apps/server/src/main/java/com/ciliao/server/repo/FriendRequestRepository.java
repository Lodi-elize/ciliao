package com.ciliao.server.repo;

import com.ciliao.server.domain.FriendRequestEntity;
import com.ciliao.server.domain.FriendRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FriendRequestRepository extends JpaRepository<FriendRequestEntity, Long> {
  List<FriendRequestEntity> findByRecipientIdOrderByCreatedAtDesc(String recipientId);

  Optional<FriendRequestEntity> findByRequesterIdAndRecipientId(String requesterId, String recipientId);

  boolean existsByRequesterIdAndRecipientIdAndStatus(
      String requesterId, String recipientId, FriendRequestStatus status);
}
