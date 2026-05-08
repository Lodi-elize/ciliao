CREATE TABLE friend_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  requester_id VARCHAR(64) NOT NULL,
  recipient_id VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP NULL,
  UNIQUE KEY uk_friend_requests_requester_recipient (requester_id, recipient_id),
  INDEX idx_friend_requests_recipient_status (recipient_id, status),
  INDEX idx_friend_requests_requester_status (requester_id, status),
  CONSTRAINT fk_friend_requests_requester FOREIGN KEY (requester_id) REFERENCES users(id),
  CONSTRAINT fk_friend_requests_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
);
