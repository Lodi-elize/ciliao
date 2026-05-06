package com.ciliao.server.repo;

import com.ciliao.server.domain.MockSmsCodeEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MockSmsCodeRepository extends JpaRepository<MockSmsCodeEntity, Long> {
  Optional<MockSmsCodeEntity> findFirstByPhoneAndPurposeAndConsumedAtIsNullOrderByIdDesc(String phone, String purpose);
}
