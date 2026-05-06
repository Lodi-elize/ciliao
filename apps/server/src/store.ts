import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  ChatMessage,
  Contact,
  MockSmsCode,
  PersistedState,
  Session,
  UserCredential,
  UserProfile,
  seedPassword,
  seedUsers
} from './types.js';

const defaultDataPath = resolve(process.cwd(), 'data', 'prototype-store.json');
const scrypt = promisify(scryptCallback);
const passwordPrefix = 'scrypt';
const passwordKeyLength = 64;
const mockSmsTtlMs = 10 * 60 * 1000;

type LegacyPersistedState = Partial<PersistedState> & {
  users?: Array<Partial<UserProfile> & { id: string; displayName: string; avatar: string }>;
};

export class JsonStore {
  private state: PersistedState;
  private saveQueue = Promise.resolve();

  constructor(private readonly filePath = process.env.NFC_CHAT_DATA_PATH ?? defaultDataPath) {
    this.state = createInitialState();
  }

  async load() {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      this.state = await normalizeState(JSON.parse(raw) as LegacyPersistedState);
      await this.save();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
      this.state = await createInitialStateWithCredentials();
      await this.save();
    }
  }

  snapshot() {
    return structuredClone(this.state);
  }

  listUsers() {
    return this.state.users;
  }

  getUser(userId: string) {
    return this.state.users.find((user) => user.id === userId) ?? null;
  }

  findUserByIdentifier(identifier: string) {
    const normalized = normalizeIdentifier(identifier);
    return (
      this.state.users.find((user) => user.username?.toLowerCase() === normalized) ??
      this.state.users.find((user) => user.phone === normalizePhone(identifier)) ??
      null
    );
  }

  async registerUsername(input: { username: string; password: string; displayName: string }) {
    const username = normalizeUsername(input.username);
    this.assertPassword(input.password);
    if (this.state.users.some((user) => user.username?.toLowerCase() === username)) {
      throw new StoreError('用户名已被注册。', 409, 'USERNAME_TAKEN');
    }

    const now = new Date().toISOString();
    const user = this.createUser({
      username,
      phoneVerified: false,
      displayName: input.displayName.trim(),
      now
    });
    await this.setPassword(user.id, input.password, now);
    const session = await this.createSession(user.id);
    return { token: session.token, user };
  }

  async requestMockSms(input: { phone: string; purpose: 'register' }) {
    const phone = normalizePhone(input.phone);
    if (this.state.users.some((user) => user.phone === phone)) {
      throw new StoreError('手机号已被注册。', 409, 'PHONE_TAKEN');
    }

    const code = randomDigits(6);
    const record: MockSmsCode = {
      phone,
      code,
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + mockSmsTtlMs).toISOString()
    };
    this.state.mockSmsCodes.push(record);
    await this.save();
    return { phone, code, expiresAt: record.expiresAt };
  }

  async registerPhone(input: { phone: string; code: string; password: string; displayName: string }) {
    const phone = normalizePhone(input.phone);
    this.assertPassword(input.password);
    if (this.state.users.some((user) => user.phone === phone)) {
      throw new StoreError('手机号已被注册。', 409, 'PHONE_TAKEN');
    }
    const smsCode = this.consumeMockSmsCode(phone, input.code, 'register');
    smsCode.consumedAt = new Date().toISOString();

    const now = new Date().toISOString();
    const user = this.createUser({
      phone,
      phoneVerified: true,
      displayName: input.displayName.trim(),
      now
    });
    await this.setPassword(user.id, input.password, now);
    const session = await this.createSession(user.id);
    await this.save();
    return { token: session.token, user };
  }

  async login(identifier: string, password: string) {
    const user = this.findUserByIdentifier(identifier);
    if (!user || !(await this.verifyPassword(user.id, password))) {
      throw new StoreError('账号或密码错误。', 401, 'INVALID_CREDENTIALS');
    }
    const session = await this.createSession(user.id);
    return { token: session.token, user };
  }

  getSession(token: string) {
    const session = this.state.sessions.find((item) => item.token === token && !item.revokedAt);
    if (!session) return null;
    const user = this.getUser(session.userId);
    if (!user) return null;
    return { session, user };
  }

  async logout(token: string) {
    const session = this.state.sessions.find((item) => item.token === token && !item.revokedAt);
    if (session) {
      session.revokedAt = new Date().toISOString();
      await this.save();
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    this.assertPassword(newPassword);
    if (!(await this.verifyPassword(userId, oldPassword))) {
      throw new StoreError('当前密码不正确。', 401, 'INVALID_OLD_PASSWORD');
    }
    await this.setPassword(userId, newPassword, new Date().toISOString());
    await this.save();
  }

  listContacts(ownerId: string) {
    const friendIds = this.state.contacts
      .filter((contact) => contact.ownerId === ownerId)
      .map((contact) => contact.friendId);

    return friendIds
      .map((friendId) => this.getUser(friendId))
      .filter((user): user is UserProfile => Boolean(user));
  }

  hasContact(ownerId: string, friendId: string) {
    return this.state.contacts.some((contact) => contact.ownerId === ownerId && contact.friendId === friendId);
  }

  async addContact(ownerId: string, friendId: string) {
    if (ownerId === friendId) {
      throw new StoreError('不能把自己添加为好友。', 400, 'SELF_CONTACT');
    }

    if (!this.getUser(ownerId) || !this.getUser(friendId)) {
      throw new StoreError('用户不存在。', 404, 'USER_NOT_FOUND');
    }

    const now = new Date().toISOString();
    this.ensureContact(ownerId, friendId, now);
    this.ensureContact(friendId, ownerId, now);
    await this.save();
    return this.listContacts(ownerId);
  }

  async addMessage(senderId: string, recipientId: string, text: string) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new StoreError('消息内容不能为空。', 400, 'EMPTY_MESSAGE');
    }

    if (!this.getUser(senderId) || !this.getUser(recipientId)) {
      throw new StoreError('用户不存在。', 404, 'USER_NOT_FOUND');
    }

    if (!this.hasContact(senderId, recipientId)) {
      throw new StoreError('请先添加对方为好友。', 403, 'CONTACT_REQUIRED');
    }

    const message: ChatMessage = {
      id: randomUUID(),
      conversationId: getConversationId(senderId, recipientId),
      senderId,
      recipientId,
      text: normalizedText,
      createdAt: new Date().toISOString()
    };

    this.state.messages.push(message);
    await this.save();
    return message;
  }

  listMessages(userA: string, userB: string) {
    const conversationId = getConversationId(userA, userB);
    return this.state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  private createUser(input: {
    username?: string;
    phone?: string;
    phoneVerified: boolean;
    displayName: string;
    now: string;
  }) {
    if (!input.displayName) {
      throw new StoreError('昵称不能为空。', 400, 'DISPLAY_NAME_REQUIRED');
    }

    const user: UserProfile = {
      id: createUserId(input.username ?? input.phone ?? input.displayName),
      username: input.username,
      phone: input.phone,
      phoneVerified: input.phoneVerified,
      displayName: input.displayName,
      avatar: input.displayName.slice(0, 1).toUpperCase(),
      createdAt: input.now,
      updatedAt: input.now
    };
    this.state.users.push(user);
    return user;
  }

  private async createSession(userId: string) {
    const session: Session = {
      token: randomBytes(32).toString('hex'),
      userId,
      createdAt: new Date().toISOString()
    };
    this.state.sessions.push(session);
    await this.save();
    return session;
  }

  private async setPassword(userId: string, password: string, passwordUpdatedAt: string) {
    const passwordHash = await hashPassword(password);
    const existing = this.state.credentials.find((credential) => credential.userId === userId);
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.passwordUpdatedAt = passwordUpdatedAt;
      return;
    }
    this.state.credentials.push({ userId, passwordHash, passwordUpdatedAt });
  }

  private async verifyPassword(userId: string, password: string) {
    const credential = this.state.credentials.find((item) => item.userId === userId);
    if (!credential) return false;
    return verifyPasswordHash(password, credential.passwordHash);
  }

  private consumeMockSmsCode(phone: string, code: string, purpose: 'register') {
    const record = [...this.state.mockSmsCodes]
      .reverse()
      .find((item) => item.phone === phone && item.purpose === purpose && !item.consumedAt);
    if (!record || record.code !== code.trim()) {
      throw new StoreError('验证码不正确。', 400, 'PHONE_CODE_INVALID');
    }
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw new StoreError('验证码已过期。', 400, 'PHONE_CODE_EXPIRED');
    }
    return record;
  }

  private assertPassword(password: string) {
    if (password.length < 8) {
      throw new StoreError('密码至少需要 8 位。', 400, 'PASSWORD_TOO_SHORT');
    }
  }

  private ensureContact(ownerId: string, friendId: string, createdAt: string) {
    const exists = this.state.contacts.some(
      (contact) => contact.ownerId === ownerId && contact.friendId === friendId
    );
    if (!exists) {
      this.state.contacts.push({ ownerId, friendId, createdAt });
    }
  }

  private async save() {
    const nextSave = this.saveQueue.catch(() => undefined).then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
      await writeFile(tempPath, `${JSON.stringify(this.state, null, 2)}\n`, 'utf8');
      await rename(tempPath, this.filePath);
    });
    this.saveQueue = nextSave.catch(() => undefined);
    await nextSave;
  }
}

export class StoreError extends Error {
  constructor(message: string, readonly statusCode: number, readonly code = 'STORE_ERROR') {
    super(message);
  }
}

export function getConversationId(userA: string, userB: string) {
  return [userA, userB].sort().join('__');
}

async function createInitialStateWithCredentials(): Promise<PersistedState> {
  const state = createInitialState();
  const now = new Date().toISOString();
  state.credentials = await Promise.all(
    state.users.map(async (user) => ({
      userId: user.id,
      passwordHash: await hashPassword(seedPassword),
      passwordUpdatedAt: now
    }))
  );
  return state;
}

function createInitialState(): PersistedState {
  return {
    users: structuredClone(seedUsers),
    credentials: [],
    sessions: [],
    mockSmsCodes: [],
    contacts: [],
    messages: []
  };
}

async function normalizeState(parsed: LegacyPersistedState): Promise<PersistedState> {
  const users = parsed.users?.length
    ? parsed.users.map((user) => normalizeUser(user))
    : structuredClone(seedUsers);
  const state: PersistedState = {
    users,
    credentials: parsed.credentials ?? [],
    sessions: parsed.sessions ?? [],
    mockSmsCodes: parsed.mockSmsCodes ?? [],
    contacts: parsed.contacts ?? [],
    messages: parsed.messages ?? []
  };

  const now = new Date().toISOString();
  for (const user of state.users) {
    if (!state.credentials.some((credential) => credential.userId === user.id)) {
      state.credentials.push({
        userId: user.id,
        passwordHash: await hashPassword(seedPassword),
        passwordUpdatedAt: now
      });
    }
  }
  return state;
}

function normalizeUser(user: Partial<UserProfile> & { id: string; displayName: string; avatar: string }): UserProfile {
  const now = new Date().toISOString();
  return {
    id: user.id,
    username: user.username ?? (/^[a-zA-Z0-9_-]+$/.test(user.id) ? user.id : undefined),
    phone: user.phone,
    phoneVerified: user.phoneVerified ?? Boolean(user.phone),
    displayName: user.displayName,
    avatar: user.avatar,
    createdAt: user.createdAt ?? now,
    updatedAt: user.updatedAt ?? now
  };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, passwordKeyLength)) as Buffer;
  return `${passwordPrefix}:${salt}:${derived.toString('hex')}`;
}

async function verifyPasswordHash(password: string, encoded: string) {
  const [prefix, salt, hash] = encoded.split(':');
  if (prefix !== passwordPrefix || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function normalizeUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_-]{3,24}$/.test(normalized)) {
    throw new StoreError('用户名需要 3-24 位字母、数字、下划线或短横线。', 400, 'USERNAME_INVALID');
  }
  return normalized;
}

function normalizePhone(phone: string) {
  const normalized = phone.trim().replace(/[ -]/g, '');
  if (!/^\+?\d{6,15}$/.test(normalized)) {
    throw new StoreError('手机号格式不正确。', 400, 'PHONE_INVALID');
  }
  return normalized;
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

function createUserId(seed: string) {
  const base = seed
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 20);
  return `${base || 'user'}-${randomBytes(4).toString('hex')}`;
}

function randomDigits(length: number) {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += Math.floor(Math.random() * 10).toString();
  }
  return value;
}
