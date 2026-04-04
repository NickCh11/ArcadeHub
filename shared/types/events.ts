import type { EncryptedDMMessage, UserProfile } from './messages';

// ─── Client → Server ──────────────────────────────────────────────────────────

export interface JoinRoomPayload {
  roomId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
}

export interface SendPublicMessagePayload {
  roomId: string;
  messageId: string;
  text: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: string;
}

export interface SendDMPayload {
  message: EncryptedDMMessage;
}

export interface MarkReadPayload {
  messageId: string;
  conversationWith: string;
}

export interface UpdateStatusPayload {
  status: 'online' | 'away' | 'offline';
}

// ─── Server → Client ──────────────────────────────────────────────────────────

export interface NewDMPayload {
  message: EncryptedDMMessage;
}

export interface NewPublicMessagePayload {
  roomId: string;
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: string;
}

export interface PresenceUpdatePayload {
  userId: string;
  status: 'online' | 'away' | 'offline';
}

export interface UserJoinedRoomPayload {
  roomId: string;
  user: UserProfile;
}

export interface UserLeftRoomPayload {
  roomId: string;
  userId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ─── Event Name Constants ─────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SEND_PUBLIC_MESSAGE: 'send-public-message',
  SEND_DM: 'send-dm',
  MARK_READ: 'mark-read',
  UPDATE_STATUS: 'update-status',

  // Server → Client
  NEW_PUBLIC_MESSAGE: 'new-public-message',
  NEW_DM: 'new-dm',
  PRESENCE_UPDATE: 'presence-update',
  USER_JOINED_ROOM: 'user-joined-room',
  USER_LEFT_ROOM: 'user-left-room',
  ERROR: 'error',
} as const;
