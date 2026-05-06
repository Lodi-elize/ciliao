package com.ciliao.server.repo;

import com.ciliao.server.domain.UserEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, String> {
  Optional<UserEntity> findByUsernameIgnoreCase(String username);

  Optional<UserEntity> findByPhone(String phone);

  boolean existsByUsernameIgnoreCase(String username);

  boolean existsByPhone(String phone);
}
