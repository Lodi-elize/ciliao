CREATE TABLE nfc_read_events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  raw_payload VARCHAR(2000) NULL,
  parsed_user_id VARCHAR(64) NULL,
  payload_type VARCHAR(32) NULL,
  error_code VARCHAR(64) NULL,
  error_message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL,
  INDEX idx_nfc_read_events_user_created (user_id, created_at),
  CONSTRAINT fk_nfc_read_events_user FOREIGN KEY (user_id) REFERENCES users(id)
);
