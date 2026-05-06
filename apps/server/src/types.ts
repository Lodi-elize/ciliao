export type UserProfile = {
  id: string;
  username?: string;
  phone?: string;
  phoneVerified: boolean;
  displayName: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
};

export type UserCredential = {
  userId: string;
  passwordHash: string;
  passwordUpdatedAt: string;
};

export type Session = {
  token: string;
  userId: string;
  createdAt: string;
  revokedAt?: string;
};

export type MockSmsCode = {
  phone: string;
  code: string;
  purpose: 'register';
  expiresAt: string;
  consumedAt?: string;
};

export type Contact = {
  ownerId: string;
  friendId: string;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

export type PersistedState = {
  users: UserProfile[];
  credentials: UserCredential[];
  sessions: Session[];
  mockSmsCodes: MockSmsCode[];
  contacts: Contact[];
  messages: ChatMessage[];
};

export const seedUsers: UserProfile[] = [
  {
    id: 'alice',
    username: 'alice',
    phoneVerified: false,
    displayName: '小爱 / 星野',
    avatar: '爱',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z'
  },
  {
    id: 'bob',
    username: 'bob',
    phoneVerified: false,
    displayName: '小波 / 月见',
    avatar: '波',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z'
  },
  {
    id: 'mika',
    username: 'mika',
    phoneVerified: false,
    displayName: '米卡 / 初音',
    avatar: '米',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z'
  }
];

export const seedPassword = 'password123';
