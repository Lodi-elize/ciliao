import cors from '@fastify/cors';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import {
  addContactSchema,
  changePasswordSchema,
  inviteSchema,
  loginSchema,
  messageSchema,
  registerPhoneSchema,
  registerUsernameSchema,
  requestMockSmsSchema
} from './schemas.js';
import { JsonStore, StoreError } from './store.js';
import { UserProfile } from './types.js';

type AuthContext = {
  token: string;
  user: UserProfile;
};

export async function buildServer(store = new JsonStore()) {
  await store.load();

  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ ok: true }));

  app.get('/', async () => ({
    name: '次聊 API',
    health: '/health',
    users: '/users',
    app: '请打开 8081 端口的 Expo Web 应用。'
  }));

  app.get('/users', async () => ({ users: store.listUsers() }));

  app.post('/auth/register/username', async (request, reply) => {
    const parsed = registerUsernameSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'REGISTER_USERNAME_INVALID');
    }
    try {
      return await store.registerUsername(parsed.data);
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.post('/auth/mock-sms/request', async (request, reply) => {
    const parsed = requestMockSmsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'MOCK_SMS_REQUEST_INVALID');
    }
    try {
      return await store.requestMockSms(parsed.data);
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.post('/auth/register/phone', async (request, reply) => {
    const parsed = registerPhoneSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'REGISTER_PHONE_INVALID');
    }
    try {
      return await store.registerPhone(parsed.data);
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'LOGIN_INVALID');
    }
    try {
      return await store.login(parsed.data.identifier, parsed.data.password);
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.get('/auth/me', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    return { user: auth.user };
  });

  app.post('/auth/logout', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    await store.logout(auth.token);
    return { ok: true };
  });

  app.post('/auth/change-password', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'CHANGE_PASSWORD_INVALID');
    }
    try {
      await store.changePassword(auth.user.id, parsed.data.oldPassword, parsed.data.newPassword);
      return { ok: true };
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  const io = attachSockets(app.server, store);

  app.get('/contacts', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    return { contacts: store.listContacts(auth.user.id) };
  });

  app.get('/users/:userId/contacts', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const { userId } = request.params as { userId: string };
    if (userId !== auth.user.id) {
      return reply.code(403).send({ error: '只能查看自己的通讯录。', code: 'FORBIDDEN_CONTACTS' });
    }
    return { contacts: store.listContacts(auth.user.id) };
  });

  app.get('/invites/:userId', async (request, reply) => {
    const parsed = inviteSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: '邀请无效。', code: 'INVITE_INVALID' });
    }

    const user = store.getUser(parsed.data.userId);
    if (!user) {
      return reply.code(404).send({ error: '邀请对象不存在。', code: 'USER_NOT_FOUND' });
    }

    return { user };
  });

  app.post('/contacts', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const parsed = addContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'CONTACT_REQUEST_INVALID');
    }

    try {
      const contacts = await store.addContact(auth.user.id, parsed.data.friendId);
      emitContactsUpdated(io, store, auth.user.id, parsed.data.friendId);
      return { contacts };
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  app.get('/messages/:contactId', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const { contactId } = request.params as { contactId: string };
    if (!store.getUser(contactId)) {
      return reply.code(404).send({ error: '用户不存在。', code: 'USER_NOT_FOUND' });
    }
    return { messages: store.listMessages(auth.user.id, contactId) };
  });

  app.get('/messages/:userA/:userB', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const { userA, userB } = request.params as { userA: string; userB: string };
    if (userA !== auth.user.id && userB !== auth.user.id) {
      return reply.code(403).send({ error: '只能查看自己的聊天记录。', code: 'FORBIDDEN_MESSAGES' });
    }
    const contactId = userA === auth.user.id ? userB : userA;
    return { messages: store.listMessages(auth.user.id, contactId) };
  });

  app.post('/messages', async (request, reply) => {
    const auth = requireAuth(request, reply, store);
    if (!auth) return;
    const parsed = messageSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'MESSAGE_INVALID');
    }

    try {
      const message = await store.addMessage(auth.user.id, parsed.data.recipientId, parsed.data.text);
      broadcastMessage(io, message);
      return { message };
    } catch (error) {
      return sendStoreError(reply, error);
    }
  });

  return app;
}

type ChatMessage = Awaited<ReturnType<JsonStore['addMessage']>>;

function attachSockets(server: HttpServer, store: JsonStore) {
  const io = new SocketServer(server, { cors: { origin: '*' } });
  Reflect.set(server, 'io', io);

  io.on('connection', (socket) => {
    const token = String(socket.handshake.auth.token ?? '');
    const auth = token ? store.getSession(token) : null;
    if (!auth) {
      socket.emit('error', { error: '请先登录。', code: 'AUTH_REQUIRED' });
      socket.disconnect(true);
      return;
    }

    socket.data.userId = auth.user.id;
    socket.join(auth.user.id);
    socket.emit('ready', { userId: auth.user.id });

    socket.on('message:send', async (payload, ack) => {
      const legacySenderId = typeof payload?.senderId === 'string' ? payload.senderId : null;
      if (legacySenderId && legacySenderId !== socket.data.userId) {
        ack?.({ ok: false, error: '发送者与当前聊天连接不一致。', code: 'SENDER_FORGED' });
        return;
      }

      const parsed = messageSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: '消息无效。', code: 'MESSAGE_INVALID' });
        return;
      }

      try {
        const message = await store.addMessage(socket.data.userId, parsed.data.recipientId, parsed.data.text);
        broadcastMessage(io, message);
        ack?.({ ok: true, message });
      } catch (error) {
        const body = errorToBody(error, '消息发送失败。');
        ack?.({ ok: false, ...body });
      }
    });
  });

  return io;
}

function requireAuth(request: FastifyRequest, reply: FastifyReply, store: JsonStore): AuthContext | null {
  const authorization = request.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) {
    reply.code(401).send({ error: '请先登录。', code: 'AUTH_REQUIRED' });
    return null;
  }
  const token = match[1];
  const auth = store.getSession(token);
  if (!auth) {
    reply.code(401).send({ error: '登录状态已失效。', code: 'SESSION_INVALID' });
    return null;
  }
  return { token, user: auth.user };
}

function broadcastMessage(io: SocketServer, message: ChatMessage) {
  io.to(message.senderId).to(message.recipientId).emit('message:new', message);
}

function emitContactsUpdated(io: SocketServer, store: JsonStore, ownerId: string, friendId: string) {
  io.to(ownerId).emit('contacts:updated', { contacts: store.listContacts(ownerId) });
  io.to(friendId).emit('contacts:updated', { contacts: store.listContacts(friendId) });
}

function sendValidationError(reply: FastifyReply, code: string) {
  return reply.code(400).send({ error: '请求参数无效。', code });
}

function sendStoreError(reply: FastifyReply, error: unknown) {
  if (error instanceof StoreError) {
    return reply.code(error.statusCode).send({ error: error.message, code: error.code });
  }
  throw error;
}

function errorToBody(error: unknown, fallback: string) {
  if (error instanceof StoreError) {
    return { error: error.message, code: error.code };
  }
  return { error: error instanceof Error ? error.message : fallback, code: 'UNKNOWN_ERROR' };
}
