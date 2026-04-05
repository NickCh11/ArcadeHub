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

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'offline';
  ecdhPublicKey?: string;
}
