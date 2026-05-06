package com.ciliao.server.repo;

import com.ciliao.server.domain.CredentialEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CredentialRepository extends JpaRepository<CredentialEntity, String> {}
