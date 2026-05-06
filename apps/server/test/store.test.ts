import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { JsonStore } from '../src/store.js';

let dir: string;
let store: JsonStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nfc-chat-store-'));
  store = new JsonStore(join(dir, 'store.json'));
  await store.load();
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('JsonStore auth and chat', () => {
  it('registers username users and verifies sessions', async () => {
    const result = await store.registerUsername({
      username: 'sora',
      password: 'password123',
      displayName: '空'
    });

    expect(result.token).toHaveLength(64);
    expect(result.user).toMatchObject({ username: 'sora', displayName: '空' });
    expect(store.getSession(result.token)?.user.id).toBe(result.user.id);
  });

  it('registers phone users with one-time mock SMS codes', async () => {
    const sms = await store.requestMockSms({ phone: '13800138000', purpose: 'register' });
    const result = await store.registerPhone({
      phone: sms.phone,
      code: sms.code,
      password: 'password123',
      displayName: '月'
    });

    expect(result.user.phone).toBe('13800138000');
    expect(result.user.phoneVerified).toBe(true);
    await expect(
      store.registerPhone({ phone: '13800138001', code: sms.code, password: 'password123', displayName: '重放' })
    ).rejects.toMatchObject({ code: 'PHONE_CODE_INVALID' });
  });

  it('changes passwords and rejects the old password', async () => {
    const registered = await store.registerUsername({
      username: 'ren',
      password: 'password123',
      displayName: '莲'
    });

    await store.changePassword(registered.user.id, 'password123', 'newpass123');

    await expect(store.login('ren', 'password123')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(store.login('ren', 'newpass123')).resolves.toMatchObject({ user: { id: registered.user.id } });
  });

  it('adds reciprocal contacts', async () => {
    const contacts = await store.addContact('alice', 'bob');
    expect(contacts.map((user) => user.id)).toContain('bob');
    expect(store.listContacts('bob').map((user) => user.id)).toContain('alice');
  });

  it('rejects self contact', async () => {
    await expect(store.addContact('alice', 'alice')).rejects.toMatchObject({ code: 'SELF_CONTACT' });
  });

  it('stores messages in chronological conversation history', async () => {
    await store.addContact('alice', 'bob');
    await store.addMessage('alice', 'bob', 'hello');
    await store.addMessage('bob', 'alice', 'hi');
    const messages = store.listMessages('alice', 'bob');
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.text)).toEqual(['hello', 'hi']);
  });

  it('persists auth, contacts, and messages across store reload', async () => {
    const registered = await store.registerUsername({
      username: 'persisted',
      password: 'password123',
      displayName: '存'
    });
    await store.addContact(registered.user.id, 'bob');
    await store.addMessage(registered.user.id, 'bob', 'saved');

    const reloaded = new JsonStore(join(dir, 'store.json'));
    await reloaded.load();

    expect(reloaded.getSession(registered.token)?.user.id).toBe(registered.user.id);
    expect(reloaded.listContacts(registered.user.id).map((user) => user.id)).toContain('bob');
    expect(reloaded.listMessages(registered.user.id, 'bob').map((message) => message.text)).toEqual(['saved']);
  });

  it('serializes overlapping message saves', async () => {
    await store.addContact('alice', 'bob');
    await Promise.all([
      store.addMessage('alice', 'bob', 'one'),
      store.addMessage('alice', 'bob', 'two'),
      store.addMessage('bob', 'alice', 'three')
    ]);

    const reloaded = new JsonStore(join(dir, 'store.json'));
    await reloaded.load();

    expect(reloaded.listMessages('alice', 'bob').map((message) => message.text).sort()).toEqual([
      'one',
      'three',
      'two'
    ]);
  });

  it('rejects messages between non-contacts', async () => {
    await expect(store.addMessage('alice', 'bob', 'hello')).rejects.toMatchObject({ code: 'CONTACT_REQUIRED' });
  });
});
