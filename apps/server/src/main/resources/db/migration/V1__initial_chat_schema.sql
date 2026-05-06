CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(24) NULL UNIQUE,
  phone VARCHAR(32) NULL UNIQUE,
  phone_verified BOOLEAN NOT NULL,
  display_name VARCHAR(40) NOT NULL,
  avatar VARCHAR(16) NOT NULL,
  avatar_url VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE credentials (
  user_id VARCHAR(64) PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  password_updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_credentials_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE sessions (
  token VARCHAR(96) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  INDEX idx_sessions_user_id (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE mock_sms_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(32) NOT NULL,
  code VARCHAR(8) NOT NULL,
  purpose VARCHAR(32) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  INDEX idx_mock_sms_phone (phone)
);

CREATE TABLE contacts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  owner_id VARCHAR(64) NOT NULL,
  friend_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE KEY uk_contacts_owner_friend (owner_id, friend_id),
  INDEX idx_contacts_friend_id (friend_id),
  CONSTRAINT fk_contacts_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_contacts_friend FOREIGN KEY (friend_id) REFERENCES users(id)
);

CREATE TABLE conversations (
  id VARCHAR(140) PRIMARY KEY,
  user_a_id VARCHAR(64) NOT NULL,
  user_b_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_conversations_user_a FOREIGN KEY (user_a_id) REFERENCES users(id),
  CONSTRAINT fk_conversations_user_b FOREIGN KEY (user_b_id) REFERENCES users(id)
);

CREATE TABLE messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(140) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  recipient_id VARCHAR(64) NOT NULL,
  text VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  INDEX idx_messages_conversation_created (conversation_id, created_at),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
);
