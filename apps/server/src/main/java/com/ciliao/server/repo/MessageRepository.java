package com.ciliao.server.repo;

import com.ciliao.server.domain.MessageEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<MessageEntity, String> {
  List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}
