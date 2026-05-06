import { useEffect } from 'react';
import { API_URL } from '../../api/config';
import { ChatMessage, UserProfile } from '../../api/types';
import { useAppStore } from '../../state/appStore';

type PendingSend = {
  resolve: (message: ChatMessage) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type SocketEnvelope = {
  type: string;
  requestId?: string;
  payload?: any;
};

let socket: WebSocket | null = null;
const pending = new Map<string, PendingSend>();

export function useChatSocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const token = useAppStore((state) => state.token);
  const addMessage = useAppStore((state) => state.addMessage);
  const setContacts = useAppStore((state) => state.setContacts);

  useEffect(() => {
    if (!currentUser || !token) return;

    socket?.close();
    socket = new WebSocket(`${toWebSocketUrl(API_URL)}/ws/chat?token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      const envelope = JSON.parse(event.data) as SocketEnvelope;
      if (envelope.type === 'message:new') {
        addMessage(envelope.payload as ChatMessage, currentUser.id);
      }
      if (envelope.type === 'contacts:updated') {
        setContacts((envelope.payload as { contacts: UserProfile[] }).contacts);
      }
      if (envelope.type === 'ack' && envelope.requestId) {
        const item = pending.get(envelope.requestId);
        if (!item) return;
        pending.delete(envelope.requestId);
        clearTimeout(item.timeout);
        if (envelope.payload?.ok && envelope.payload.message) {
          item.resolve(envelope.payload.message as ChatMessage);
        } else {
          item.reject(new Error(envelope.payload?.error ?? '消息发送失败。'));
        }
      }
    };
    socket.onclose = () => {
      pending.forEach((item) => {
        clearTimeout(item.timeout);
        item.reject(new Error('聊天连接已断开。'));
      });
      pending.clear();
    };

    return () => {
      socket?.close();
      socket = null;
    };
  }, [addMessage, currentUser, setContacts, token]);
}

export function sendSocketMessage(payload: { recipientId: string; text: string }) {
  return new Promise<ChatMessage>((resolve, reject) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      reject(new Error('聊天连接尚未建立。'));
      return;
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('消息发送超时。'));
    }, 5000);
    pending.set(requestId, { resolve, reject, timeout });
    socket.send(JSON.stringify({ type: 'message:send', requestId, payload }));
  });
}

function toWebSocketUrl(apiUrl: string) {
  return apiUrl.replace(/^http/i, 'ws');
}
