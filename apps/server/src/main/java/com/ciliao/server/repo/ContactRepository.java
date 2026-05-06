package com.ciliao.server.repo;

import com.ciliao.server.domain.ContactEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<ContactEntity, Long> {
  List<ContactEntity> findByOwnerIdOrderByCreatedAtAsc(String ownerId);

  boolean existsByOwnerIdAndFriendId(String ownerId, String friendId);
}
