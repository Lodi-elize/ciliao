export type UserProfile = {
  id: string;
  username?: string;
  phone?: string;
  phoneVerified: boolean;
  displayName: string;
  avatar: string;
  avatarUrl?: string | null;
  signature?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

export type AuthResult = {
  token: string;
  user: UserProfile;
};

export type MockSmsResult = {
  phone: string;
  code: string;
  expiresAt: string;
};
