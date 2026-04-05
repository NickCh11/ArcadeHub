import type { UserProfile } from '@/types';

export interface EncryptedDMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderName: string;
  senderAvatar?: string;
  ciphertextRecipient: string;
  ciphertextSender: string;
  ephemeralPublicKey: string;
  createdAt: string;
}

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

export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SEND_PUBLIC_MESSAGE: 'send-public-message',
  SEND_DM: 'send-dm',
  MARK_READ: 'mark-read',
  UPDATE_STATUS: 'update-status',
  NEW_PUBLIC_MESSAGE: 'new-public-message',
  NEW_DM: 'new-dm',
  PRESENCE_UPDATE: 'presence-update',
  USER_JOINED_ROOM: 'user-joined-room',
  USER_LEFT_ROOM: 'user-left-room',
  ERROR: 'error',
} as const;
