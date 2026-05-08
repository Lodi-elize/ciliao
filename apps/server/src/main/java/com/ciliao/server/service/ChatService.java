package com.ciliao.server.service;

import com.ciliao.server.api.Dto.AuthResult;
import com.ciliao.server.api.Dto.ChatMessage;
import com.ciliao.server.api.Dto.FriendRequest;
import com.ciliao.server.api.Dto.MockSmsResult;
import com.ciliao.server.api.Dto.UserProfile;
import com.ciliao.server.domain.ContactEntity;
import com.ciliao.server.domain.ConversationEntity;
import com.ciliao.server.domain.CredentialEntity;
import com.ciliao.server.domain.FriendRequestEntity;
import com.ciliao.server.domain.FriendRequestStatus;
import com.ciliao.server.domain.MessageEntity;
import com.ciliao.server.domain.MockSmsCodeEntity;
import com.ciliao.server.domain.SessionEntity;
import com.ciliao.server.domain.UserEntity;
import com.ciliao.server.repo.ContactRepository;
import com.ciliao.server.repo.ConversationRepository;
import com.ciliao.server.repo.CredentialRepository;
import com.ciliao.server.repo.FriendRequestRepository;
import com.ciliao.server.repo.MessageRepository;
import com.ciliao.server.repo.MockSmsCodeRepository;
import com.ciliao.server.repo.SessionRepository;
import com.ciliao.server.repo.UserRepository;
import jakarta.transaction.Transactional;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final String SEED_PASSWORD = "password123";

  private final UserRepository users;
  private final CredentialRepository credentials;
  private final SessionRepository sessions;
  private final MockSmsCodeRepository smsCodes;
  private final ContactRepository contacts;
  private final FriendRequestRepository friendRequests;
  private final ConversationRepository conversations;
  private final MessageRepository messages;
  private final PasswordEncoder passwordEncoder;

  public ChatService(
      UserRepository users,
      CredentialRepository credentials,
      SessionRepository sessions,
      MockSmsCodeRepository smsCodes,
      ContactRepository contacts,
      FriendRequestRepository friendRequests,
      ConversationRepository conversations,
      MessageRepository messages,
      PasswordEncoder passwordEncoder) {
    this.users = users;
    this.credentials = credentials;
    this.sessions = sessions;
    this.smsCodes = smsCodes;
    this.contacts = contacts;
    this.friendRequests = friendRequests;
    this.conversations = conversations;
    this.messages = messages;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional
  public void seedIfEmpty() {
    if (users.count() > 0) return;
    createSeedUser("alice", "alice", "小爱 / 星野", "爱");
    createSeedUser("bob", "bob", "小波 / 月见", "波");
    createSeedUser("mika", "mika", "米卡 / 初音", "米");
  }

  public List<UserProfile> listUsers() {
    return users.findAll().stream()
        .sorted(Comparator.comparing(UserEntity::getCreatedAt))
        .map(Mapper::toProfile)
        .toList();
  }

  public UserEntity getUserEntity(String userId) {
    return users.findById(userId).orElseThrow(() -> new AppException("用户不存在。", 404, "USER_NOT_FOUND"));
  }

  public UserProfile getUser(String userId) {
    return Mapper.toProfile(getUserEntity(userId));
  }

  public UserProfile findUserForFriendSearch(String viewerId, String queryInput) {
    getUserEntity(viewerId);
    String query = queryInput == null ? "" : queryInput.trim();
    if (query.isBlank()) {
      throw new AppException("请输入账号、ID 或手机号。", 400, "FRIEND_QUERY_REQUIRED");
    }
    UserEntity user = users.findById(query)
        .or(() -> users.findByUsernameIgnoreCase(query.toLowerCase(Locale.ROOT)))
        .or(() -> users.findByPhone(normalizePhoneLenient(query)))
        .orElseThrow(() -> new AppException("没有找到这个用户。", 404, "FRIEND_USER_NOT_FOUND"));
    return Mapper.toProfile(user);
  }

  @Transactional
  public AuthResult registerUsername(String usernameInput, String password, String displayNameInput) {
    String username = normalizeUsername(usernameInput);
    assertPassword(password);
    if (users.existsByUsernameIgnoreCase(username)) {
      throw new AppException("用户名已被注册。", 409, "USERNAME_TAKEN");
    }
    UserEntity user = createUser(username, null, false, displayNameInput);
    savePassword(user.getId(), password);
    return createAuthResult(user);
  }

  @Transactional
  public MockSmsResult requestMockSms(String phoneInput, String purposeInput) {
    String phone = normalizePhone(phoneInput);
    String purpose = "register".equals(purposeInput) ? "register" : "register";
    if (users.existsByPhone(phone)) {
      throw new AppException("手机号已被注册。", 409, "PHONE_TAKEN");
    }
    MockSmsCodeEntity code = new MockSmsCodeEntity();
    code.setPhone(phone);
    code.setPurpose(purpose);
    code.setCode(randomDigits(6));
    code.setExpiresAt(Instant.now().plus(10, ChronoUnit.MINUTES));
    smsCodes.save(code);
    return new MockSmsResult(phone, code.getCode(), code.getExpiresAt());
  }

  @Transactional
  public AuthResult registerPhone(String phoneInput, String codeInput, String password, String displayNameInput) {
    String phone = normalizePhone(phoneInput);
    assertPassword(password);
    if (users.existsByPhone(phone)) {
      throw new AppException("手机号已被注册。", 409, "PHONE_TAKEN");
    }
    MockSmsCodeEntity code = smsCodes.findFirstByPhoneAndPurposeAndConsumedAtIsNullOrderByIdDesc(phone, "register")
        .orElseThrow(() -> new AppException("验证码不正确。", 400, "PHONE_CODE_INVALID"));
    if (!code.getCode().equals(codeInput == null ? "" : codeInput.trim())) {
      throw new AppException("验证码不正确。", 400, "PHONE_CODE_INVALID");
    }
    if (code.getExpiresAt().isBefore(Instant.now())) {
      throw new AppException("验证码已过期。", 400, "PHONE_CODE_EXPIRED");
    }
    code.setConsumedAt(Instant.now());
    smsCodes.save(code);
    UserEntity user = createUser(null, phone, true, displayNameInput);
    savePassword(user.getId(), password);
    return createAuthResult(user);
  }

  @Transactional
  public AuthResult login(String identifier, String password) {
    UserEntity user = findByIdentifier(identifier);
    CredentialEntity credential = credentials.findById(user.getId())
        .orElseThrow(() -> new AppException("账号或密码错误。", 401, "INVALID_CREDENTIALS"));
    if (!passwordEncoder.matches(password == null ? "" : password, credential.getPasswordHash())) {
      throw new AppException("账号或密码错误。", 401, "INVALID_CREDENTIALS");
    }
    return createAuthResult(user);
  }

  public UserEntity authenticate(String token) {
    if (token == null || token.isBlank()) {
      throw new AppException("请先登录。", 401, "AUTH_REQUIRED");
    }
    SessionEntity session = sessions.findByTokenAndRevokedAtIsNull(token)
        .orElseThrow(() -> new AppException("登录状态已失效。", 401, "SESSION_INVALID"));
    return getUserEntity(session.getUserId());
  }

  @Transactional
  public void logout(String token) {
    sessions.findByTokenAndRevokedAtIsNull(token).ifPresent(session -> {
      session.setRevokedAt(Instant.now());
      sessions.save(session);
    });
  }

  @Transactional
  public void changePassword(String userId, String oldPassword, String newPassword) {
    assertPassword(newPassword);
    CredentialEntity credential = credentials.findById(userId)
        .orElseThrow(() -> new AppException("当前密码不正确。", 401, "INVALID_OLD_PASSWORD"));
    if (!passwordEncoder.matches(oldPassword == null ? "" : oldPassword, credential.getPasswordHash())) {
      throw new AppException("当前密码不正确。", 401, "INVALID_OLD_PASSWORD");
    }
    credential.setPasswordHash(passwordEncoder.encode(newPassword));
    credential.setPasswordUpdatedAt(Instant.now());
    credentials.save(credential);
  }

  public List<UserProfile> listContacts(String ownerId) {
    return contacts.findByOwnerIdOrderByCreatedAtAsc(ownerId).stream()
        .map(contact -> users.findById(contact.getFriendId()).orElse(null))
        .filter(user -> user != null)
        .map(Mapper::toProfile)
        .toList();
  }

  @Transactional
  public List<UserProfile> addContact(String ownerId, String friendId) {
    if (ownerId.equals(friendId)) {
      throw new AppException("不能把自己添加为好友。", 400, "SELF_CONTACT");
    }
    getUserEntity(ownerId);
    getUserEntity(friendId);
    ensureContact(ownerId, friendId);
    ensureContact(friendId, ownerId);
    return listContacts(ownerId);
  }

  public List<FriendRequest> listIncomingFriendRequests(String userId) {
    getUserEntity(userId);
    return friendRequests.findByRecipientIdOrderByCreatedAtDesc(userId).stream()
        .map(this::toFriendRequest)
        .toList();
  }

  @Transactional
  public FriendRequest createFriendRequest(String requesterId, String recipientId) {
    if (requesterId.equals(recipientId)) {
      throw new AppException("不能给自己发送好友申请。", 400, "SELF_FRIEND_REQUEST");
    }
    getUserEntity(requesterId);
    getUserEntity(recipientId);
    if (contacts.existsByOwnerIdAndFriendId(requesterId, recipientId)) {
      throw new AppException("你们已经是好友了。", 409, "CONTACT_ALREADY_EXISTS");
    }
    if (friendRequests.existsByRequesterIdAndRecipientIdAndStatus(
        requesterId, recipientId, FriendRequestStatus.PENDING)) {
      throw new AppException("好友申请已发送，请等待对方处理。", 409, "FRIEND_REQUEST_PENDING");
    }
    if (friendRequests.existsByRequesterIdAndRecipientIdAndStatus(
        recipientId, requesterId, FriendRequestStatus.PENDING)) {
      throw new AppException("对方已经向你发送申请，请到申请列表处理。", 409, "INCOMING_FRIEND_REQUEST_PENDING");
    }
    FriendRequestEntity request = friendRequests
        .findByRequesterIdAndRecipientId(requesterId, recipientId)
        .orElseGet(FriendRequestEntity::new);
    request.setRequesterId(requesterId);
    request.setRecipientId(recipientId);
    request.setStatus(FriendRequestStatus.PENDING);
    request.setCreatedAt(Instant.now());
    request.setRespondedAt(null);
    return toFriendRequest(friendRequests.save(request));
  }

  @Transactional
  public FriendRequest acceptFriendRequest(String userId, Long requestId) {
    FriendRequestEntity request = getPendingRequestForRecipient(userId, requestId);
    request.setStatus(FriendRequestStatus.ACCEPTED);
    request.setRespondedAt(Instant.now());
    friendRequests.save(request);
    ensureContact(userId, request.getRequesterId());
    ensureContact(request.getRequesterId(), userId);
    return toFriendRequest(request);
  }

  @Transactional
  public FriendRequest rejectFriendRequest(String userId, Long requestId) {
    FriendRequestEntity request = getPendingRequestForRecipient(userId, requestId);
    request.setStatus(FriendRequestStatus.REJECTED);
    request.setRespondedAt(Instant.now());
    return toFriendRequest(friendRequests.save(request));
  }

  @Transactional
  public ChatMessage addMessage(String senderId, String recipientId, String textInput) {
    String text = textInput == null ? "" : textInput.trim();
    if (text.isBlank()) {
      throw new AppException("消息内容不能为空。", 400, "EMPTY_MESSAGE");
    }
    getUserEntity(senderId);
    getUserEntity(recipientId);
    if (!contacts.existsByOwnerIdAndFriendId(senderId, recipientId)) {
      throw new AppException("请先添加对方为好友。", 403, "CONTACT_REQUIRED");
    }
    ConversationEntity conversation = ensureConversation(senderId, recipientId);
    MessageEntity message = new MessageEntity();
    message.setId(UUID.randomUUID().toString());
    message.setConversationId(conversation.getId());
    message.setSenderId(senderId);
    message.setRecipientId(recipientId);
    message.setText(text);
    message.setCreatedAt(Instant.now());
    messages.save(message);
    conversation.setUpdatedAt(message.getCreatedAt());
    conversations.save(conversation);
    return Mapper.toMessage(message);
  }

  public List<ChatMessage> listMessages(String userA, String userB) {
    getUserEntity(userB);
    return messages.findByConversationIdOrderByCreatedAtAsc(getConversationId(userA, userB)).stream()
        .map(Mapper::toMessage)
        .toList();
  }

  @Transactional
  public UserProfile updateProfile(String userId, String displayNameInput, String signatureInput) {
    UserEntity user = getUserEntity(userId);
    if (displayNameInput != null) {
      String displayName = displayNameInput.trim();
      if (displayName.isBlank()) {
        throw new AppException("昵称不能为空。", 400, "DISPLAY_NAME_REQUIRED");
      }
      if (displayName.length() > 40) {
        throw new AppException("昵称不能超过 40 个字符。", 400, "DISPLAY_NAME_TOO_LONG");
      }
      user.setDisplayName(displayName);
      user.setAvatar(firstAvatar(displayName));
    }
    if (signatureInput != null) {
      String signature = signatureInput.trim();
      if (signature.length() > 80) {
        throw new AppException("个性签名不能超过 80 个字符。", 400, "SIGNATURE_TOO_LONG");
      }
      user.setSignature(signature);
    }
    user.setUpdatedAt(Instant.now());
    return Mapper.toProfile(users.save(user));
  }

  @Transactional
  public UserProfile updateAvatar(String userId, String avatarUrl) {
    UserEntity user = getUserEntity(userId);
    user.setAvatarUrl(avatarUrl);
    user.setUpdatedAt(Instant.now());
    return Mapper.toProfile(users.save(user));
  }

  public static String getConversationId(String userA, String userB) {
    return userA.compareTo(userB) <= 0 ? userA + "__" + userB : userB + "__" + userA;
  }

  private UserEntity createUser(String username, String phone, boolean phoneVerified, String displayNameInput) {
    String displayName = displayNameInput == null ? "" : displayNameInput.trim();
    if (displayName.isBlank()) {
      throw new AppException("昵称不能为空。", 400, "DISPLAY_NAME_REQUIRED");
    }
    if (displayName.length() > 40) {
      throw new AppException("昵称不能超过 40 个字符。", 400, "DISPLAY_NAME_TOO_LONG");
    }
    Instant now = Instant.now();
    UserEntity user = new UserEntity();
    user.setId(createUserId(username != null ? username : phone != null ? phone : displayName));
    user.setUsername(username);
    user.setPhone(phone);
    user.setPhoneVerified(phoneVerified);
    user.setDisplayName(displayName);
    user.setAvatar(firstAvatar(displayName));
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    return users.save(user);
  }

  private void savePassword(String userId, String password) {
    CredentialEntity credential = new CredentialEntity();
    credential.setUserId(userId);
    credential.setPasswordHash(passwordEncoder.encode(password));
    credential.setPasswordUpdatedAt(Instant.now());
    credentials.save(credential);
  }

  private AuthResult createAuthResult(UserEntity user) {
    SessionEntity session = new SessionEntity();
    session.setToken(randomToken());
    session.setUserId(user.getId());
    session.setCreatedAt(Instant.now());
    sessions.save(session);
    return new AuthResult(session.getToken(), Mapper.toProfile(user));
  }

  private UserEntity findByIdentifier(String identifierInput) {
    String identifier = identifierInput == null ? "" : identifierInput.trim();
    return users.findByUsernameIgnoreCase(identifier.toLowerCase(Locale.ROOT))
        .or(() -> users.findByPhone(normalizePhoneLenient(identifier)))
        .orElseThrow(() -> new AppException("账号或密码错误。", 401, "INVALID_CREDENTIALS"));
  }

  private void ensureContact(String ownerId, String friendId) {
    if (!contacts.existsByOwnerIdAndFriendId(ownerId, friendId)) {
      ContactEntity contact = new ContactEntity();
      contact.setOwnerId(ownerId);
      contact.setFriendId(friendId);
      contact.setCreatedAt(Instant.now());
      contacts.save(contact);
    }
  }

  private FriendRequestEntity getPendingRequestForRecipient(String userId, Long requestId) {
    if (requestId == null) {
      throw new AppException("好友申请不存在。", 404, "FRIEND_REQUEST_NOT_FOUND");
    }
    FriendRequestEntity request = friendRequests.findById(requestId)
        .orElseThrow(() -> new AppException("好友申请不存在。", 404, "FRIEND_REQUEST_NOT_FOUND"));
    if (!request.getRecipientId().equals(userId)) {
      throw new AppException("只能处理发给你的好友申请。", 403, "FRIEND_REQUEST_FORBIDDEN");
    }
    if (request.getStatus() != FriendRequestStatus.PENDING) {
      throw new AppException("这个好友申请已经处理过了。", 409, "FRIEND_REQUEST_ALREADY_HANDLED");
    }
    return request;
  }

  private FriendRequest toFriendRequest(FriendRequestEntity request) {
    return Mapper.toFriendRequest(
        request,
        getUserEntity(request.getRequesterId()),
        getUserEntity(request.getRecipientId()));
  }

  private ConversationEntity ensureConversation(String userA, String userB) {
    String id = getConversationId(userA, userB);
    return conversations.findById(id).orElseGet(() -> {
      Instant now = Instant.now();
      ConversationEntity conversation = new ConversationEntity();
      conversation.setId(id);
      if (userA.compareTo(userB) <= 0) {
        conversation.setUserAId(userA);
        conversation.setUserBId(userB);
      } else {
        conversation.setUserAId(userB);
        conversation.setUserBId(userA);
      }
      conversation.setCreatedAt(now);
      conversation.setUpdatedAt(now);
      return conversations.save(conversation);
    });
  }

  private void createSeedUser(String id, String username, String displayName, String avatar) {
    Instant now = Instant.parse("2026-05-01T00:00:00Z");
    UserEntity user = new UserEntity();
    user.setId(id);
    user.setUsername(username);
    user.setPhoneVerified(false);
    user.setDisplayName(displayName);
    user.setAvatar(avatar);
    user.setCreatedAt(now);
    user.setUpdatedAt(now);
    users.save(user);
    savePassword(user.getId(), SEED_PASSWORD);
  }

  private static String normalizeUsername(String usernameInput) {
    String username = usernameInput == null ? "" : usernameInput.trim().toLowerCase(Locale.ROOT);
    if (!username.matches("^[a-zA-Z0-9_-]{3,24}$")) {
      throw new AppException("用户名需要 3-24 位字母、数字、下划线或短横线。", 400, "USERNAME_INVALID");
    }
    return username;
  }

  private static String normalizePhone(String phoneInput) {
    String phone = normalizePhoneLenient(phoneInput);
    if (!phone.matches("^\\+?\\d{6,15}$")) {
      throw new AppException("手机号格式不正确。", 400, "PHONE_INVALID");
    }
    return phone;
  }

  private static String normalizePhoneLenient(String phoneInput) {
    return (phoneInput == null ? "" : phoneInput.trim()).replace(" ", "").replace("-", "");
  }

  private static void assertPassword(String password) {
    if (password == null || password.length() < 8) {
      throw new AppException("密码至少需要 8 位。", 400, "PASSWORD_TOO_SHORT");
    }
  }

  private static String firstAvatar(String displayName) {
    if (displayName == null || displayName.isBlank()) return "次";
    return displayName.substring(0, 1).toUpperCase(Locale.ROOT);
  }

  private static String createUserId(String seed) {
    String base = (seed == null ? "user" : seed)
        .trim()
        .toLowerCase(Locale.ROOT)
        .replaceAll("[^a-z0-9_-]", "")
        .substring(0, Math.min(20, (seed == null ? "user" : seed).trim().replaceAll("[^a-z0-9_-]", "").length()));
    if (base.isBlank()) base = "user";
    return base + "-" + randomHex(4);
  }

  private static String randomToken() {
    return randomHex(32);
  }

  private static String randomHex(int byteLength) {
    byte[] bytes = new byte[byteLength];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }

  private static String randomDigits(int length) {
    StringBuilder value = new StringBuilder();
    for (int i = 0; i < length; i += 1) {
      value.append(RANDOM.nextInt(10));
    }
    return value.toString();
  }
}
