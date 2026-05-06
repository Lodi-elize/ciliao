import { z } from 'zod';

export const inviteSchema = z.object({
  userId: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/)
});

export const registerUsernameSchema = z.object({
  username: z.string().min(3).max(24),
  password: z.string().min(8),
  displayName: z.string().min(1).max(40)
});

export const requestMockSmsSchema = z.object({
  phone: z.string().min(6).max(24),
  purpose: z.literal('register').default('register')
});

export const registerPhoneSchema = z.object({
  phone: z.string().min(6).max(24),
  code: z.string().min(4).max(8),
  password: z.string().min(8),
  displayName: z.string().min(1).max(40)
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export const addContactSchema = z.object({
  friendId: z.string().min(1)
});

export const messageSchema = z.object({
  recipientId: z.string().min(1),
  text: z.string().min(1).max(2000)
});
