package com.ciliao.server.repo;

import com.ciliao.server.domain.ConversationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversationRepository extends JpaRepository<ConversationEntity, String> {}
